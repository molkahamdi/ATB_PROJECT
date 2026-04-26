
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { ContractService }    from './contract/contract.service';
import { ContractController } from './contract/contract.controller';
import { OnboardingVerificationController } from './onboarding-verification.controller';
import { OnboardingVerificationService } from './onboarding-verification.service';
import { EHouwiyaController } from './ehouwiya/ehouwiya.controller';
import { EHouwiyaService } from './ehouwiya/ehouwiya.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]),
NotificationsModule,],
  controllers: [CustomerController,ContractController,OnboardingVerificationController,EHouwiyaController],
  providers: [CustomerService,ContractService,OnboardingVerificationService,EHouwiyaService],
  exports: [CustomerService,EHouwiyaService],
})
export class CustomerModule {}