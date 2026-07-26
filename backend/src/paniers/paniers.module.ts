import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Panier } from './entities/panier.entity';
import { LignePanier } from './entities/ligne-panier.entity';
import { PaniersService } from './paniers.service';
import { PaniersController } from './paniers.controller';
import { ProduitsModule } from '../produits/produits.module';

@Module({
  imports: [TypeOrmModule.forFeature([Panier, LignePanier]), ProduitsModule],
  providers: [PaniersService],
  controllers: [PaniersController],
  exports: [PaniersService],
})
export class PaniersModule {}
