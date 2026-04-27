
//
//  [E-HOUWIYA] Endpoint ajouté :
//  GET /customer/:id/contract/pdf-base64
//    → Retourne le PDF en base64 (JSON)
//    → Utilisé par ContractScreen pour :
//      1. Afficher le PDF dans la WebView
//      2. Envoyer le PDF à TunTrust pour signature E-Houwiya

// ============================================================
import {
  Controller,
  Get,
  Param,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ContractService } from './contract.service';

@Controller('customer')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // ── Télécharger le contrat Word (.docx) ───────────────────
  @Get(':id/contract/docx')
  async downloadDocx(
    @Param('id') customerId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.contractService.generateContractDocx(customerId, res);
  }

  // ── Télécharger le contrat PDF (stream) ──────────────────
  // Utilisé par le flux manuel (téléchargement direct)
  @Get(':id/contract/pdf')
  async downloadPdf(
    @Param('id') customerId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.contractService.generateContractPdf(customerId, res);
  }

  // ──────────────────────────────────────────────────────────
  // ✅ [E-HOUWIYA] GET /customer/:id/contract/pdf-base64
  //
  // Retourne le PDF du contrat encodé en base64 (format JSON).
  // Utilisé par ContractScreen pour :
  //   1. Charger et afficher le PDF dans la WebView PDF.js
  //   2. Préparer le document à envoyer à TunTrust pour signature
  //
  // Différence avec /contract/pdf :
  //   - /contract/pdf       → stream binaire (téléchargement direct)
  //   - /contract/pdf-base64 → JSON avec base64 (pour WebView + signature)
  //
  // Exemple de réponse :
  // {
  //   "success": true,
  //   "data": {
  //     "base64": "JVBERi0xLjQg...",
  //     "fileName": "ATB_DIGIPACK_Contrat_xxx.pdf",
  //     "isSigned": false,
  //     "signatureId": null
  //   }
  // }
  // ──────────────────────────────────────────────────────────
  @Get(':id/contract/pdf-base64')
  @HttpCode(HttpStatus.OK)
  async getPdfBase64(@Param('id') customerId: string) {
    const result = await this.contractService.generateContractPdfBase64(customerId);
    return {
      success: true,
      data:    result,
    };
  }
}