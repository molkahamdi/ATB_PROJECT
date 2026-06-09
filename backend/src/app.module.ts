import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Customer } from './customer/entities/customer.entity';
import { CustomerModule } from './customer/customer.module';
import { OcrModule } from './ocr/ocr.module';
import { EmailOtpModule } from './email-otp/email-otp.module';
import { AdminUser } from './admin/entities/admin-user.entity';
import { AdminModule }    from './admin/admin.module'; 
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLog } from './admin/entities/audit-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule,
        PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,   // CPU, mémoire, event loop automatiques
      },
    }),
      ],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get<string>('POSTGRES_HOST'),
        port:     cfg.get<number>('POSTGRES_PORT'),
        username: cfg.get<string>('POSTGRES_USER'),
        password: String(cfg.get<string>('POSTGRES_PASSWORD') || ''),
        database: cfg.get<string>('POSTGRES_DB'),
        entities: [Customer,AdminUser, AuditLog ],
        synchronize: true, // ca veut dire que TypeORM va automatiquement créer/synchroniser les tables en fonction des entités. À utiliser uniquement en développement !
        logging: ['error'],
      }),
    }),

    CustomerModule,
    OcrModule,
     EmailOtpModule,
     AdminModule,
     NotificationsModule,
  ],
  controllers: [AppController,  MetricsController],
  providers: [AppService],
})
export class AppModule {}