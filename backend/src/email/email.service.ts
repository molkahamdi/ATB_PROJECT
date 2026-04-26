// ============================================================
//  backend/src/email/email.service.ts
//  ✅ Resend API via fetch natif Node 20
//  ✅ OTP + Approval + Rejection emails
// ============================================================
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger     = new Logger(EmailService.name);
  private readonly RESEND_URL = 'https://api.resend.com/emails';

  // ──────────────────────────────────────────────────────────
  //  Méthode privée commune pour envoyer un email
  // ──────────────────────────────────────────────────────────
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const response = await fetch(this.RESEND_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'ATB Digipack <onboarding@resend.dev>',
        to:      [to],
        subject,
        html:    htmlContent,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(`❌ Échec envoi email — status ${response.status}`, JSON.stringify(err));
      throw new InternalServerErrorException(
        "Impossible d'envoyer l'email. Réessayez.",
      );
    }

    this.logger.log(`✅ Email envoyé à ${to}`);
  }

  // ──────────────────────────────────────────────────────────
  //  Email OTP (existant)
  // ──────────────────────────────────────────────────────────
  async sendOtpEmail(otpCode: string, firstName?: string): Promise<void> {
    const displayName = firstName?.trim() || 'Client';
    const toEmail     = process.env.FIXED_RECEIVER_EMAIL!;

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATB - Code de vérification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #ffffff;">
          <tr>
            <td style="padding: 0 0 30px 0;">
              <span style="font-size: 20px; font-weight: 400; color: #000000; letter-spacing: -0.3px;">ARAB TUNISIAN BANK</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table width="60" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height: 2px; background-color: #8a1002; width: 60px;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 20px 0;">
              <span style="font-size: 14px; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">SÉCURITÉ · CODE DE VÉRIFICATION</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 25px 0;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">Bonjour ${displayName},</p>
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Vous avez demandé un code de vérification pour finaliser votre demande d'ouverture de compte Digipack.
              </p>
              <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6;">Voici votre code à usage unique :</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 30px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 400; color: #000000; letter-spacing: 8px;">${otpCode}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 30px 0;">
              <p style="margin: 0; font-size: 15px; color: #666666;">
                Ce code est valable <span style="color: #000000;">10 minutes</span>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 0; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #999999; padding-right: 10px;">—</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #666666;">Ne partagez jamais ce code</td>
                </tr>
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #999999; padding-right: 10px;">—</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #666666;">ATB ne vous le demandera jamais par téléphone</td>
                </tr>
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #999999; padding-right: 10px;">—</td>
                  <td style="font-size: 14px; color: #666666;">3 tentatives maximum</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 0 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 13px; color: #999999; line-height: 1.5;">
                    Arab Tunisian Bank<br>71 143 000 · www.atb.com.tn
                  </td>
                  <td align="right" style="font-size: 12px; color: #cccccc;">© 2026</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 20px; font-size: 12px; color: #cccccc;">
                    Ce message vous est adressé automatiquement.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendEmail(toEmail, 'Votre code de vérification ATB Digipack', htmlContent);
  }

  // ──────────────────────────────────────────────────────────
  //  Email APPROBATION — envoyé au client
  // ──────────────────────────────────────────────────────────
  async sendApprovalEmail(
    toEmail: string,
    firstName: string,
    accountNumber: string,
  ): Promise<void> {
    const displayName = firstName?.trim() || 'Client';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATB - Demande approuvée</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #ffffff;">

          <!-- En-tête -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <span style="font-size: 20px; font-weight: 400; color: #000000; letter-spacing: -0.3px;">ARAB TUNISIAN BANK</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table width="60" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height: 2px; background-color: #278a5c; width: 60px;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Badge statut -->
          <tr>
            <td style="padding: 0 0 20px 0;">
              <span style="font-size: 14px; color: #278a5c; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                ✓ DEMANDE ACCEPTÉE
              </span>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 0 0 25px 0;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Bonjour ${displayName},
              </p>
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Nous avons le plaisir de vous informer que votre demande d'ouverture de compte <strong>Digipack</strong> a été examinée et <strong style="color: #278a5c;">approuvée</strong>.
              </p>
              <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Votre numéro de compte est :
              </p>
            </td>
          </tr>

          <!-- Numéro de compte -->
          <tr>
            <td style="padding: 10px 0 30px 0;">
              <div style="display: inline-block; background-color: #f0f9f4; border: 1px solid #278a5c; border-radius: 8px; padding: 14px 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 600; color: #278a5c; letter-spacing: 4px;">
                  ${accountNumber}
                </span>
              </div>
            </td>
          </tr>

          <!-- Prochaines étapes -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #333333; font-weight: 500;">Prochaines étapes :</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 30px 0; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 16px 0;">
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #278a5c; padding-right: 10px; padding-top: 12px;">—</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #666666; padding-top: 12px;">Votre carte bancaire sera prête sous 5 à 7 jours ouvrables</td>
                </tr>
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #278a5c; padding-right: 10px;">—</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #666666;">Vous recevrez un SMS dès que votre carte sera disponible en agence</td>
                </tr>
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #278a5c; padding-right: 10px;">—</td>
                  <td style="font-size: 14px; color: #666666;">Présentez-vous muni de votre CIN à l'agence choisie pour retirer votre carte</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message de confiance -->
          <tr>
            <td style="padding: 30px 0 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6;">
                Nous vous remercions de votre confiance et sommes ravis de vous accueillir parmi nos clients.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 13px; color: #999999; line-height: 1.5;">
                    Arab Tunisian Bank<br>71 143 000 · www.atb.com.tn
                  </td>
                  <td align="right" style="font-size: 12px; color: #cccccc;">© 2026</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 20px; font-size: 12px; color: #cccccc;">
                    Ce message vous est adressé automatiquement.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendEmail(
      process.env.FIXED_RECEIVER_EMAIL ?? toEmail,
      'Votre compte ATB Digipack a été approuvé ',
      htmlContent,
    );
    this.logger.log(`✅ Email approbation envoyé — client: ${displayName}`);
  }

  // ──────────────────────────────────────────────────────────
  //  Email REJET — envoyé au client
  // ──────────────────────────────────────────────────────────
  async sendRejectionEmail(
    toEmail: string,
    firstName: string,
    rejectionReason: string,
  ): Promise<void> {
    const displayName = firstName?.trim() || 'Client';
    const reason      = rejectionReason?.trim() || 'Dossier non conforme aux conditions d éligibilité.';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATB - Décision sur votre dossier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #ffffff;">

          <!-- En-tête -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <span style="font-size: 20px; font-weight: 400; color: #000000; letter-spacing: -0.3px;">ARAB TUNISIAN BANK</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table width="60" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height: 2px; background-color: #8a1002; width: 60px;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Badge statut -->
          <tr>
            <td style="padding: 0 0 20px 0;">
              <span style="font-size: 14px; color: #b33a2c; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                DÉCISION SUR VOTRE DOSSIER
              </span>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 0 0 25px 0;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Bonjour ${displayName},
              </p>
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Après examen attentif de votre dossier d'ouverture de compte <strong>Digipack</strong>, nous sommes au regret de vous informer que votre demande n'a pas pu être acceptée à ce stade.
              </p>
            </td>
          </tr>

          <!-- Motif du rejet -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999999; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;">
                Motif
              </p>
              <div style="background-color: #fdf5f4; border-left: 3px solid #b33a2c; padding: 14px 18px; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; font-size: 15px; color: #5a2020; line-height: 1.6;">
                  ${reason}
                </p>
              </div>
            </td>
          </tr>

          <!-- Recours -->
          <tr>
            <td style="padding: 0 0 30px 0; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 16px 0;">
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #999999; padding-right: 10px; padding-top: 12px;">—</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #666666; padding-top: 12px;">
                    Vous pouvez vous rapprocher de votre agence ATB pour plus d'informations
                  </td>
                </tr>
                <tr>
                  <td width="16" valign="top" style="font-size: 14px; color: #999999; padding-right: 10px;">—</td>
                  <td style="font-size: 14px; color: #666666;">
                    Appelez le <span style="color: #000000;">71 143 000</span> pour être accompagné dans vos démarches
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message de clôture -->
          <tr>
            <td style="padding: 30px 0 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6;">
                Nous nous excusons pour la gêne occasionnée et restons à votre disposition pour toute question.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 13px; color: #999999; line-height: 1.5;">
                    Arab Tunisian Bank<br>71 143 000 · www.atb.com.tn
                  </td>
                  <td align="right" style="font-size: 12px; color: #cccccc;">© 2026</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 20px; font-size: 12px; color: #cccccc;">
                    Ce message vous est adressé automatiquement.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendEmail(
      process.env.FIXED_RECEIVER_EMAIL ?? toEmail,
      'Décision concernant votre demande ATB Digipack',
      htmlContent,
    );
    this.logger.log(`✅ Email rejet envoyé — client: ${displayName}`);
  }
}