import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import configuration from './config/configuration';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BoutiquesModule } from './boutiques/boutiques.module';
import { ProduitsModule } from './produits/produits.module';
import { CreneauxModule } from './creneaux/creneaux.module';
import { PaniersModule } from './paniers/paniers.module';
import { CommandesModule } from './commandes/commandes.module';
import { SyncModule } from './sync/sync.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', load: [configuration, databaseConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database'),
    }),
    UsersModule, AuthModule, BoutiquesModule, ProduitsModule,
    CreneauxModule, PaniersModule, CommandesModule,
    SyncModule, PaymentsModule, AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
