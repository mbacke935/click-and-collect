import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';

// Global : MetricsService est injecté depuis des modules métier indépendants
// (commandes, créneaux, sync) sans avoir à réimporter MetricsModule partout.
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  // Applique le middleware HTTP à toute l'application (pas seulement aux routes de ce
  // module) — c'est le comportement standard de `forRoutes('*')` avec MiddlewareConsumer.
  // /metrics est exclu pour ne pas polluer les métriques avec le scraping Prometheus lui-même.
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .exclude({ path: 'metrics', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
