"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const customer_entity_1 = require("./entities/customer.entity");
const customer_controller_1 = require("./customer.controller");
const customer_service_1 = require("./customer.service");
const contract_service_1 = require("./contract/contract.service");
const contract_controller_1 = require("./contract/contract.controller");
const onboarding_verification_controller_1 = require("./onboarding-verification.controller");
const onboarding_verification_service_1 = require("./onboarding-verification.service");
const ehouwiya_controller_1 = require("./ehouwiya/ehouwiya.controller");
const ehouwiya_service_1 = require("./ehouwiya/ehouwiya.service");
const notifications_module_1 = require("../notifications/notifications.module");
let CustomerModule = class CustomerModule {
};
exports.CustomerModule = CustomerModule;
exports.CustomerModule = CustomerModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([customer_entity_1.Customer]),
            notifications_module_1.NotificationsModule,],
        controllers: [customer_controller_1.CustomerController, contract_controller_1.ContractController, onboarding_verification_controller_1.OnboardingVerificationController, ehouwiya_controller_1.EHouwiyaController],
        providers: [customer_service_1.CustomerService, contract_service_1.ContractService, onboarding_verification_service_1.OnboardingVerificationService, ehouwiya_service_1.EHouwiyaService],
        exports: [customer_service_1.CustomerService, ehouwiya_service_1.EHouwiyaService],
    })
], CustomerModule);
//# sourceMappingURL=customer.module.js.map