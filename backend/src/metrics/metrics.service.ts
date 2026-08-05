import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// Registre dédié (plutôt que le registre global de prom-client) pour que les tests
// unitaires puissent instancier plusieurs fois ce service sans collision de métriques.
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly ordersTotal = new Counter({
    name: 'orders_total',
    help: 'Nombre total de commandes enregistrées.',
    registers: [this.registry],
  });

  // Verrou pessimiste en base : des buckets fins permettent de détecter une contention
  // anormale sur la réservation de créneaux avant qu'elle ne devienne visible côté client.
  readonly creneauReservationDuration = new Histogram({
    name: 'creneau_reservation_duration_seconds',
    help: 'Temps de réservation d\'un créneau de retrait.',
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  readonly qrValidationsTotal = new Counter({
    name: 'qr_validations_total',
    help: 'Validations de billet QR Code sur le terminal commerçant, par résultat.',
    labelNames: ['resultat'] as const,
    registers: [this.registry],
  });

  readonly commandesRecupereesTotal = new Counter({
    name: 'commandes_recuperees_total',
    help: 'Commandes marquées récupérées, par créneau horaire.',
    labelNames: ['heure_creneau'] as const,
    registers: [this.registry],
  });

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Nombre total de requêtes HTTP traitées.',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Temps de traitement des requêtes HTTP.',
    labelNames: ['method', 'route'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}
