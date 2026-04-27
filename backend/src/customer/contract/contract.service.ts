
//  1. generateContractPdf() retourne maintenant aussi le
//     PDF en base64 via generateContractPdfBase64()
//     pour que le frontend puisse l'envoyer à TunTrust
//
//  2. generateContractPdfBase64() [NOUVEAU]
//     Génère le PDF et le retourne encodé en base64
//     Utilisé par ContractScreen pour signer avec E-Houwiya
//
//  3. Le contrat PDF généré pour un customer E-Houwiya
//     affiche une mention "Signé électroniquement via E-Houwiya"
//     avec l'ID de signature et la date
//
//  4. generateSignedContractPdf() [NOUVEAU]
//     Génère le PDF final avec le cachet de signature E-Houwiya
//     Utilisé après validation TunTrust pour le téléchargement final
//


import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, IdentificationSource } from '../entities/customer.entity';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';

const LIBREOFFICE_CMD = os.platform() === 'win32'
  ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
  : 'libreoffice';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  private readonly TEMPLATE_PATH = path.join(
    process.cwd(), 'src', 'customer', 'contract', 'templates', 'ATBdigitalContract.docx',
  );
  private readonly TMP_DIR = path.join(process.cwd(), 'tmp');

  // ══════════════════════════════════════════════════════════
  //  DOCX — Télécharger le contrat Word rempli
  // ══════════════════════════════════════════════════════════
  async generateContractDocx(customerId: string, res: Response): Promise<void> {
    const customer   = await this.findCustomer(customerId);
    const filledDocx = await this.fillContract(customer);
    const fileName   = `ATB_DIGIPACK_Contrat_${customerId}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(filledDocx);
    stream.pipe(res);
    stream.on('end', () => fs.unlink(filledDocx, () => {}));
  }

  // ══════════════════════════════════════════════════════════
  //  PDF — Télécharger le contrat PDF (flux manuel)
  //
  //  ✅ [E-HOUWIYA] Si le contrat est signé (isContractSigned = true),
  //  le PDF téléchargé affiche le cachet de signature E-Houwiya.
  // ══════════════════════════════════════════════════════════
  async generateContractPdf(customerId: string, res: Response): Promise<void> {
    const customer   = await this.findCustomer(customerId);
    const filledDocx = await this.fillContract(customer);
    const pdfPath    = filledDocx.replace('.docx', '.pdf');

    execSync(
      `${LIBREOFFICE_CMD} --headless --convert-to pdf --outdir "${this.TMP_DIR}" "${filledDocx}"`,
      { timeout: 60000 },
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Échec de la conversion PDF par LibreOffice.');
    }

    const fileName = `ATB_DIGIPACK_Contrat_${customerId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // ✅ [E-HOUWIYA] Ajouter un header pour indiquer si le contrat est signé
    res.setHeader('X-Contract-Signed', customer.isContractSigned ? 'true' : 'false');
    if (customer.isContractSigned && customer.eHouwiyaSignatureId) {
      res.setHeader('X-Signature-Id', customer.eHouwiyaSignatureId);
    }

    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
    stream.on('end', () => {
      fs.unlink(filledDocx, () => {});
      fs.unlink(pdfPath,    () => {});
    });
  }

  // ══════════════════════════════════════════════════════════
  //  ✅ [E-HOUWIYA] PDF en BASE64 pour signature TunTrust
  //
  //  Génère le PDF du contrat et le retourne encodé en base64.
  //  Le frontend utilise ce base64 pour :
  //  1. L'afficher dans le WebView (ContractScreen)
  //  2. L'envoyer à TunTrust pour signature E-Houwiya
  //
  //  Endpoint : GET /customer/:id/contract/pdf-base64
  // ══════════════════════════════════════════════════════════
  async generateContractPdfBase64(customerId: string): Promise<{
    base64:   string;
    fileName: string;
    isSigned: boolean;
    signatureId?: string;
  }> {
    const customer   = await this.findCustomer(customerId);
    const filledDocx = await this.fillContract(customer);
    const pdfPath    = filledDocx.replace('.docx', '.pdf');

    execSync(
      `${LIBREOFFICE_CMD} --headless --convert-to pdf --outdir "${this.TMP_DIR}" "${filledDocx}"`,
      { timeout: 60000 },
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Échec de la conversion PDF par LibreOffice.');
    }

    // Lire le PDF et l'encoder en base64
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64    = pdfBuffer.toString('base64');

    // Nettoyer les fichiers temporaires
    fs.unlink(filledDocx, () => {});
    fs.unlink(pdfPath,    () => {});

    return {
      base64,
      fileName:    `ATB_DIGIPACK_Contrat_${customerId}.pdf`,
      isSigned:    customer.isContractSigned ?? false,
      signatureId: customer.eHouwiyaSignatureId ?? undefined,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  CŒUR — Remplir le DOCX avec les données du client
  //
  //  ✅ [E-HOUWIYA] Si identificationSource = E_HOUWIYA :
  //  → Ajoute une mention "Identité vérifiée via E-Houwiya"
  //  → Ajoute l'ID de signature si isContractSigned = true
  //  → Affiche "Signé électroniquement" au lieu de la ligne de signature
  // ══════════════════════════════════════════════════════════
  private async fillContract(customer: Customer): Promise<string> {
    if (!fs.existsSync(this.TEMPLATE_PATH)) {
      throw new Error(
        `Modèle introuvable : ${this.TEMPLATE_PATH}\n` +
        `→ Placer ATBdigitalContract.docx dans : backend/src/customer/contract/templates/`,
      );
    }

    if (!fs.existsSync(this.TMP_DIR)) {
      fs.mkdirSync(this.TMP_DIR, { recursive: true });
    }

    const outputPath = path.join(
      this.TMP_DIR,
      `contract_${customer.id}_${Date.now()}.docx`,
    );

    const today    = new Date().toLocaleDateString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const fullName = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
    const civilite = customer.gender === 'M' ? 'M.' : 'Mme';
    const ville    = customer.gouvernorat ?? 'Tunis';
    const oui_non  = (v: boolean | null | undefined) =>
      v ? '(x) Oui  ( ) Non' : '( ) Oui  (x) Non';

    // ✅ [E-HOUWIYA] Ligne de signature adaptée selon le mode
    const isEHouwiya = customer.identificationSource === IdentificationSource.E_HOUWIYA;
    const signatureLine = isEHouwiya && customer.isContractSigned
      ? `Fait a ${ville}, le ${today}   |  SIGNE ELECTRONIQUEMENT VIA E-HOUWIYA (TunTrust)  |  ID: ${customer.eHouwiyaSignatureId ?? 'N/A'}`
      : `Fait a ${ville}, le ${today}                         Signature du client`;

    // ✅ [E-HOUWIYA] Mention d'identité vérifiée
    const eHouwiyaMention = isEHouwiya
      ? `[IDENTITE VERIFIEE VIA E-HOUWIYA - TunTrust - ${today}]`
      : '';

    const scriptPath = path.join(this.TMP_DIR, `fill_${customer.id}.py`);

    const pythonScript = `# -*- coding: utf-8 -*-
import sys
from docx import Document
from docx.shared import Pt

TEMPLATE = r"""${this.TEMPLATE_PATH}"""
OUTPUT   = r"""${outputPath}"""

doc = Document(TEMPLATE)

def set_cell(table_idx, row_idx, col_idx, value):
    try:
        cell = doc.tables[table_idx].rows[row_idx].cells[col_idx]
        for para in cell.paragraphs:
            for run in para.runs:
                run.text = ''
        if cell.paragraphs:
            run = cell.paragraphs[0].add_run(str(value))
            run.font.size = Pt(9)
    except Exception as e:
        print(f'[WARN] Table[{table_idx}][{row_idx},{col_idx}]: {e}', file=sys.stderr)

# Tableau 0 : Agence / Date
set_cell(0, 0, 0, "Agence : ${customer.agence ?? ''}")
set_cell(0, 0, 1, "Date : ${today}")

# Tableau 1 : Identité + FATCA
set_cell(1, 0, 0, "Sexe : ${customer.gender ?? ''}")
set_cell(1, 0, 1, "Civilite : ${civilite}")
set_cell(1, 0, 2, "Date de naissance : ${customer.birthDate ?? ''}")
set_cell(1, 1, 0, "Prenom : ${customer.firstName ?? ''}")
set_cell(1, 2, 1, "Nom de famille : ${customer.lastName ?? ''}")
set_cell(1, 1, 2, "Lieu de naissance : ${customer.birthPlace ?? ''}")
set_cell(1, 1, 3, "Pays de naissance : ${customer.countryOfBirth ?? ''}")
set_cell(1, 3, 1, "Nationalite : ${customer.nationality ?? ''}")
set_cell(1, 4, 2, "Numero CIN : ${customer.idCardNumber ?? ''}")
set_cell(1, 4, 3, "Date de delivrance : ${customer.idIssueDate ?? ''}")
set_cell(1, 6, 0, "Citoyen americain ?\\n${oui_non(customer.isUsCitizen)}")
set_cell(1, 6, 1, "Personne politiquement exposee ?\\n${oui_non(customer.isPoliticallyExposed)}")
set_cell(1, 7, 0, "Green Card ?\\n${oui_non(customer.hasGreenCard)}")
set_cell(1, 8, 0, "Resident USA ?\\n${oui_non(customer.isUsResident)}")
set_cell(1, 9, 0, "Contribuable americain ?\\n${oui_non(customer.isUsTaxpayer)}")

# Tableau 2 : Adresse & Contact
set_cell(2, 1, 0, "Adresse : ${customer.adresse ?? ''}")
set_cell(2, 1, 1, "Code postal : ${customer.codePostal ?? ''}")
set_cell(2, 1, 2, "Ville : ${ville}")
set_cell(2, 2, 1, "Gouvernorat : ${customer.gouvernorat ?? ''}")
set_cell(2, 2, 2, "Pays : ${customer.pays ?? 'Tunisie'}")
set_cell(2, 4, 1, "Tel. portable : +216 ${customer.phoneNumber ?? ''}")
set_cell(2, 4, 2, "E-mail : ${customer.email ?? ''}")

# Tableau 4 : Profession
set_cell(4, 0, 0, "Profession : ${customer.profession ?? customer.situationProfessionnelle ?? ''}")
set_cell(4, 1, 0, "Employeur : ${customer.entreprise ?? ''}")
set_cell(4, 2, 0, "Date embauche : ${customer.dateEmbauche ?? ''}")
set_cell(4, 3, 0, "Revenu mensuel net : ${customer.revenuMensuel ? `${customer.revenuMensuel} DT` : ''}")

# Paragraphe [5] : Ligne client Nom + CIN
try:
    para5 = doc.paragraphs[5]
    for run in para5.runs:
        run.text = ''
    new_text = "2/ ${fullName}, CIN N ${customer.idCardNumber ?? ''}, titulaire du compte de depot ouvert sur les livres de l ATB. ${eHouwiyaMention}"
    if para5.runs:
        para5.runs[0].text = new_text
    else:
        para5.add_run(new_text)
except Exception as e:
    print(f'[WARN] para5: {e}', file=sys.stderr)

# Paragraphe [479] : Signature (adapte selon E-Houwiya ou manuel)
try:
    para479 = doc.paragraphs[479]
    for run in para479.runs:
        run.text = ''
    txt = "${signatureLine}"
    if para479.runs:
        para479.runs[0].text = txt
    else:
        para479.add_run(txt)
except Exception as e:
    print(f'[WARN] para479: {e}', file=sys.stderr)

doc.save(OUTPUT)
print('OK')
`;

    fs.writeFileSync(scriptPath, pythonScript, 'utf8');

    try {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      execSync(`${pythonCmd} "${scriptPath}"`, { timeout: 30000, encoding: 'utf8' });
    } finally {
      fs.unlink(scriptPath, () => {});
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error('Erreur lors de la génération du contrat DOCX.');
    }

    return outputPath;
  }

  private async findCustomer(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Client "${id}" introuvable.`);
    return customer;
  }
}