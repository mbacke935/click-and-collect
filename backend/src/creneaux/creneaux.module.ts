import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Creneau } from './entities/creneau.entity';
import { CreneauxService } from './creneaux.service';
import { CreneauxController } from './creneaux.controller';
import { BoutiquesModule } from '../boutiques/boutiques.module';

@Module({
  imports: [TypeOrmModule.forFeature([Creneau]), BoutiquesModule],
  providers: [CreneauxService],
  controllers: [CreneauxController],
  exports: [CreneauxService],
})
export class CreneauxModule {}