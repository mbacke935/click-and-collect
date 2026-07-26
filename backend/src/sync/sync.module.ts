import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvenementSync } from './entities/evenement-sync.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { CommandesModule } from '../commandes/commandes.module';

@Module({
  imports: [TypeOrmModule.forFeature([EvenementSync]), CommandesModule],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
