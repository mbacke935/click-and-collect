import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boutique } from './entities/boutique.entity';
import { BoutiquesService } from './boutiques.service';
import { BoutiquesController } from './boutiques.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Boutique])],
  providers: [BoutiquesService],
  controllers: [BoutiquesController],
  exports: [BoutiquesService],
})
export class BoutiquesModule {}