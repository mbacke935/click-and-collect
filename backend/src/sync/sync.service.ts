import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvenementSync, SyncAction, SyncStatut } from './entities/evenement-sync.entity';
import { SyncEventDto } from './dto/sync-batch.dto';
import { CommandesService } from '../commandes/commandes.service';
import { CommandeStatut } from '../commandes/entities/commande.entity';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(EvenementSync) private readonly syncRepository: Repository<EvenementSync>,
    private readonly commandesService: CommandesService,
    private readonly metricsService: MetricsService,
  ) {}

  async processBatch(events: SyncEventDto[], userId: string, userRole: string): Promise<EvenementSync[]> {
    const results: EvenementSync[] = [];
    for (const evt of events) {
      // Idempotence : on saute si cet identifiant d'événement (généré côté appareil) a déjà
      // été traité — robuste au rejeu, contrairement à une clé composite basée sur l'horodatage.
      const existing = await this.syncRepository.findOne({ where: { clientEventId: evt.eventId } });
      if (existing) { this.logger.log(`Événement déjà traité : ${existing.id}`); results.push(existing); continue; }

      const record = this.syncRepository.create({
        clientEventId: evt.eventId,
        action: evt.action, commande_id: evt.commande_id, billet_id: evt.billet_id,
        payload: evt.payload, horodatageLocal: new Date(evt.horodatageLocal),
        user_id: userId, statut: SyncStatut.PENDING,
      });

      try {
        // Le rôle vient du JWT vérifié côté serveur, jamais du payload fourni par le client
        // (un payload.userRole falsifié permettrait sinon de contourner le contrôle de propriété).
        if (evt.action === SyncAction.RETRAIT_VALIDE) {
          await this.commandesService.updateStatut(evt.commande_id, { statut: CommandeStatut.RECUPEREE }, userId, userRole);
        } else if (evt.action === SyncAction.STATUT_CHANGE && evt.payload.statut) {
          await this.commandesService.updateStatut(evt.commande_id, { statut: evt.payload.statut }, userId, userRole);
        }
        record.statut = SyncStatut.SYNCED;
      } catch (error) {
        this.logger.error(`Échec sync: ${error.message}`);
        record.statut = SyncStatut.FAILED;
        record.payload = { ...record.payload, error: error.message };
      }
      // Le retrait validé au scan (RETRAIT_VALIDE) est la seule action qui correspond à une
      // validation de billet QR Code sur le terminal commerçant — voir §5.4 anti-rejeu.
      if (evt.action === SyncAction.RETRAIT_VALIDE) {
        this.metricsService.qrValidationsTotal.inc({
          resultat: record.statut === SyncStatut.SYNCED ? 'succes' : 'echec',
        });
      }
      results.push(await this.syncRepository.save(record));
    }
    return results;
  }

  findAll(): Promise<EvenementSync[]> {
    return this.syncRepository.find({ order: { dateReception: 'DESC' }, take: 100 });
  }

  findPending(): Promise<EvenementSync[]> {
    return this.syncRepository.find({
      where: [{ statut: SyncStatut.PENDING }, { statut: SyncStatut.FAILED }],
      order: { dateReception: 'ASC' },
    });
  }

  async getStats(): Promise<{ synced: number; pending: number; failed: number }> {
    const [synced, pending, failed] = await Promise.all([
      this.syncRepository.count({ where: { statut: SyncStatut.SYNCED } }),
      this.syncRepository.count({ where: { statut: SyncStatut.PENDING } }),
      this.syncRepository.count({ where: { statut: SyncStatut.FAILED } }),
    ]);
    return { synced, pending, failed };
  }
}
