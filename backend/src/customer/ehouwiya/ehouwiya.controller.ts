// ============================================================



//  ──────────────────────────────────────────────────────────
//  1. POST /customer/ehouwiya/simulate
//     → Vérifie maintenant que la CIN n'est pas déjà finalisée
//     → Retourne un ConflictException (409) si CIN déjà SUBMITTED/APPROVED
//        (géré dans EHouwiyaService.simulateEHouwiya)
//
//  2. GET /customer/:id/signature-status
//     → Retourne maintenant le champ `status` du customer
//     → Permet au frontend de savoir si le client est SUBMITTED
//
//  3. Aucun autre endpoint ajouté — la vérification VerifPID
//     est déjà appelée depuis OnboardingPersonalDataScreen
//     via POST /customer/:id/verify-onboarding
//     (géré dans OnboardingVerificationService)
// ============================================================

import {
  Controller, Post, Get, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { EHouwiyaService } from './ehouwiya.service';
import { SignContractDto } from '../dto/customer.dto';

@Controller('customer')
export class EHouwiyaController {

  constructor(private readonly eHouwiyaService: EHouwiyaService) {}

  // ── POST /customer/ehouwiya/simulate ────────────────────
  // Simule l'appel API E-Houwiya (TunTrust)
  // ✅ Lève 409 ConflictException si la CIN est déjà finalisée
  @Post('ehouwiya/simulate')
  @HttpCode(HttpStatus.OK)
  async simulateEHouwiya() {
    return this.eHouwiyaService.simulateEHouwiya();
  }

  // ── POST /customer/ehouwiya/verify-token ────────────────
  // Vérifie la validité du token JWT E-Houwiya
  @Post('ehouwiya/verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Body() body: { customerId: string; token: string },
  ) {
    return this.eHouwiyaService.verifyToken(body.customerId, body.token);
  }

  // ── POST /customer/:id/sign-contract ────────────────────
  // Signe le contrat via TunTrust
  // ✅ Met maintenant le statut à SUBMITTED après signature réussie
  @Post(':id/sign-contract')
  @HttpCode(HttpStatus.OK)
  async signContract(
    @Param('id') id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.eHouwiyaService.signContract(id, dto);
  }

  // ── GET /customer/:id/signature-status ──────────────────
  // Route d'origine — conservée pour compatibilité
  @Get(':id/signature-status')
  async getSignatureStatus(@Param('id') id: string) {
    return this.eHouwiyaService.getSignatureStatus(id);
  }

  // ── GET /customer/:id/ehouwiya/status ───────────────────
  // ✅ AJOUTÉE — route appelée par ContractScreen
  // via getEHouwiyaSignatureStatus() dans customerApi.ts
  // Même handler que /signature-status
  @Get(':id/ehouwiya/status')
  async getEHouwiyaStatus(@Param('id') id: string) {
    return this.eHouwiyaService.getSignatureStatus(id);
  }
}