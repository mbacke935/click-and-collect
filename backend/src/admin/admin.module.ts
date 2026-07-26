import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Boutique } from '../boutiques/entities/boutique.entity';
import { Commande } from '../commandes/entities/commande.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Boutique, Commande]), SyncModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
