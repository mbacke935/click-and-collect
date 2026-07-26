import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './entities/produit.entity';
import { ProduitsService } from './produits.service';
import { ProduitsController } from './produits.controller';
import { BoutiquesModule } from '../boutiques/boutiques.module';

@Module({
  imports: [TypeOrmModule.forFeature([Produit]), BoutiquesModule],
  providers: [ProduitsService],
  controllers: [ProduitsController],
  exports: [ProduitsService],
})
export class ProduitsModule {}
