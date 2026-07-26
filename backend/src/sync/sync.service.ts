import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvenementSync, SyncAction, SyncStatut } from './entities/evenement-sync.entity';
import { SyncEventDto } from './dto/sync-batch.dto';
import { CommandesService } from '../commandes/commandes.service';
import { CommandeStatut } from '../commandes/entities/commande.entity';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(EvenementSync) private readonly syncRepository: Repository<EvenementSync>,
    private readonly commandesService: CommandesService,
  ) {}

  async processBatch(events: SyncEventDto[], userId: string): Promise<EvenementSync[]> {
    const results: EvenementSync[] = [];
    for (const evt of events) {
      // Idempotence : on saute si déjà traité
      const existing = await this.syncRepository.findOne({
        where: { commande_id: evt.commande_id, action: evt.action, horodatageLocal: new Date(evt.horodatageLocal) },
      });
      if (existing) { this.logger.log(`Événement déjà traité : ${existing.id}`); results.push(existing); continue; }

      const record = this.syncRepository.create({
        action: evt.action, commande_id: evt.commande_id, billet_id: evt.billet_id,
        payload: evt.payload, horodatageLocal: new Date(evt.horodatageLocal),
        user_id: userId, statut: SyncStatut.PENDING,
      });

      try {
        if (evt.action === SyncAction.RETRAIT_VALIDE) {
          await this.commandesService.updateStatut(evt.commande_id, { statut: CommandeStatut.RECUPEREE }, userId, evt.payload.userRole || 'commercant');
        } else if (evt.action === SyncAction.STATUT_CHANGE && evt.payload.statut) {
          await this.commandesService.updateStatut(evt.commande_id, { statut: evt.payload.statut }, userId, evt.payload.userRole || 'commercant');
        }
        record.statut = SyncStatut.SYNCED;
      } catch (error) {
        this.logger.error(`Échec sync: ${error.message}`);
        record.statut = SyncStatut.FAILED;
        record.payload = { ...record.payload, error: error.message };
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
