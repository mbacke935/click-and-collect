import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

// Pas de guard JWT : un scraper Prometheus n'a pas de session applicative. En production,
// cet endpoint doit être restreint au niveau réseau (VPC/ingress) plutôt qu'authentifié.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.metricsService.registry.metrics();
  }
}
