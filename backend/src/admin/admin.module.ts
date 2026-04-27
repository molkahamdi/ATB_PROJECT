import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Customer } from '../customer/entities/customer.entity';
import { AdminUser } from './entities/admin-user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { AuditLogModule } from './audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, AdminUser]),
    NotificationsModule,
    EmailModule ,
    AuditLogModule,
  ],
  controllers: [AdminController],
  providers:   [AdminService],
  exports:     [AdminService],
})
export class AdminModule {}

// ============================================================
//  INSTRUCTIONS D'INTÉGRATION dans app.module.ts :
//
//  1. Importer AdminModule :
//     import { AdminModule } from './admin/admin.module';
//
//  2. L'ajouter dans imports[] de AppModule :
//     imports: [
//       TypeOrmModule.forRoot({ ... entities: [..., AdminUser, AuditLog] }),
//       CustomerModule,
//       AdminModule,   // ← AJOUTER ICI
//       ...
//     ]
//
//  3. Activer CORS dans main.ts pour le dashboard React :
//     app.enableCors({
//       origin: ['http://localhost:5173', 'http://localhost:3001'],
//       methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
//       allowedHeaders: ['Content-Type', 'Authorization'],
//       credentials: true,
//     });

//
//  5. Compte admin par défaut (auto-créé au démarrage) :
//     username : admin
//     password : Admin@2026!
//     → CHANGER après le premier déploiement !
// ============================================================