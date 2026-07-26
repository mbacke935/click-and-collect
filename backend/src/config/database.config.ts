import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    autoLoadEntities: true,
    // synchronize: true est pratique en dev (les entités créent/mettent à jour
    // les tables automatiquement) mais NE DOIT JAMAIS être activé en production
    // (risque de perte de données) — on utilisera des migrations à la place.
    synchronize: process.env.NODE_ENV !== 'production',
  }),
);