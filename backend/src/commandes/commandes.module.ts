import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commande } from './entities/commande.entity';
import { BilletRetrait } from './entities/billet-retrait.entity';
import { CommandesService } from './commandes.service';
import { CommandesController } from './commandes.controller';
import { PaniersModule } from '../paniers/paniers.module';
import { CreneauxModule } from '../creneaux/creneaux.module';
import { BoutiquesModule } from '../boutiques/boutiques.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commande, BilletRetrait]),
    PaniersModule, CreneauxModule, BoutiquesModule, RealtimeModule,
  ],
  providers: [CommandesService],
  controllers: [CommandesController],
  exports: [CommandesService],
})
export class CommandesModule {}
