"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const customer_entity_1 = require("./customer/entities/customer.entity");
const customer_module_1 = require("./customer/customer.module");
const ocr_module_1 = require("./ocr/ocr.module");
const email_otp_module_1 = require("./email-otp/email-otp.module");
const admin_user_entity_1 = require("./admin/entities/admin-user.entity");
const admin_module_1 = require("./admin/admin.module");
const notifications_module_1 = require("./notifications/notifications.module");
const audit_log_entity_1 = require("./admin/entities/audit-log.entity");
const typeorm_1 = require("@nestjs/typeorm");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    host: cfg.get('POSTGRES_HOST'),
                    port: cfg.get('POSTGRES_PORT'),
                    username: cfg.get('POSTGRES_USER'),
                    password: String(cfg.get('POSTGRES_PASSWORD') || ''),
                    database: cfg.get('POSTGRES_DB'),
                    entities: [customer_entity_1.Customer, admin_user_entity_1.AdminUser, audit_log_entity_1.AuditLog],
                    synchronize: true,
                    logging: ['error'],
                }),
            }),
            customer_module_1.CustomerModule,
            ocr_module_1.OcrModule,
            email_otp_module_1.EmailOtpModule,
            admin_module_1.AdminModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map