import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

// Middleware plutôt qu'interceptor : `res.on('finish')` se déclenche une fois la réponse
// réellement envoyée (y compris après un filtre d'exception), donc `res.statusCode` y est
// toujours fiable — contrairement à un interceptor, dont le `tap()` s'exécute avant que
// le statut d'erreur ne soit posé par le filtre global.
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const arreterChrono = this.metricsService.httpRequestDuration.startTimer();
    res.on('finish', () => {
      // req.route.path est le motif de route templaté par Express (ex.
      // "/boutiques/:boutiqueId/produits/:id"), pas l'URL brute — cardinalité bornée
      // côté Prometheus, contrairement à req.originalUrl.
      const route = req.route?.path ?? req.path;
      const labels = { method: req.method, route };
      this.metricsService.httpRequestsTotal.inc({ ...labels, status_code: String(res.statusCode) });
      arreterChrono(labels);
    });
    next();
  }
}
