// src/pages/DossierDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDossierById, approveDossier, rejectDossier,
  getContractPdfBase64, type DossierDetail,
} from '../services/adminApi';
import { DocViewer } from '../components/DocViewer';
import { StatusBadge, SourceBadge, Spinner, InfoRow } from '../components/ui';
import { Layout } from '../components/Layout';

// ── Couleurs raffinées (identique au code 1) ─────────────────────────────
const COLORS = {
  bgPage:      '#f4f6fa',
  white:       '#ffffff',
  borderLight: '#e9edf2',
  borderMed:   '#dfe3e9',
  textMain:    '#1a2634',
  textSub:     '#5f6c84',
  textLabel:   '#6e7b96',
  accentBlue:  '#1a5c8c',
  accentBlueHover: '#134b73',
  success:     '#278a5c',
  successBg:   '#eaf5ef',
  danger:      '#bc3f33',
  dangerBg:    '#fdf0ee',
  gold:        '#9e7f4c',
};

// ── Modal rejet raffinée (identique au code 1) ───────────────────────────
const RejectModal: React.FC<{
  onConfirm: (reason: string) => void;
  onClose:   () => void;
  loading:   boolean;
}> = ({ onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('');
  const MOTIFS = [
    'Documents illisibles ou expirés',
    'Informations incohérentes avec les documents fournis',
    'Pièce d\'identité non valide ou périmée',
    'Restriction bancaire détectée (SED)',
    'Profil à risque élevé (FCM Risk)',
    'Doublon — compte ATB déjà existant',
    'Informations incomplètes ou incorrectes',
  ];
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(26, 38, 52, 0.5)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: COLORS.white,
        borderRadius: 20,
        padding: 32,
        width: 500,
        boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            background: COLORS.dangerBg,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            marginBottom: 16,
          }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: COLORS.textMain, margin: '0 0 6px' }}>
            Rejeter le dossier
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textSub, margin: 0 }}>
            Cette action est irréversible et sera enregistrée dans l'audit log.
          </p>
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.textLabel, marginBottom: 6 }}>
          Motif du rejet
        </label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{
            width: '100%',
            height: 44,
            border: `1px solid ${COLORS.borderMed}`,
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 13,
            marginBottom: 28,
            background: COLORS.white,
            outline: 'none',
            color: COLORS.textMain,
          }}
        >
          <option value="">Sélectionner un motif</option>
          {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: 44,
              background: COLORS.white,
              border: `1px solid ${COLORS.borderMed}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.textSub,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accentBlue; e.currentTarget.style.color = COLORS.accentBlue; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.borderMed; e.currentTarget.style.color = COLORS.textSub; }}
          >
            Annuler
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason || loading}
            style={{
              flex: 1,
              height: 44,
              background: (!reason || loading) ? COLORS.borderMed : COLORS.danger,
              color: COLORS.white,
              border: 'none',
              borderRadius: 10,
              cursor: (!reason || loading) ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Traitement...' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Composant DetailCard raffiné (identique au code 1) ───────────────────
const DetailCard: React.FC<{
  title: string;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, children, badge }) => (
  <div style={{
    background: COLORS.white,
    borderRadius: 16,
    marginBottom: 24,
    border: `1px solid ${COLORS.borderLight}`,
    overflow: 'hidden',
  }}>
    <div style={{
      padding: '14px 22px',
      background: COLORS.white,
      borderBottom: `1px solid ${COLORS.borderLight}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <h3 style={{
        fontSize: 12,
        fontWeight: 600,
        color: COLORS.textLabel,
        margin: 0,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}>
        {title}
      </h3>
      {badge && (
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          background: COLORS.successBg,
          color: COLORS.success,
          padding: '3px 12px',
          borderRadius: 30,
        }}>
          {badge}
        </span>
      )}
    </div>
    <div style={{ padding: '20px 22px' }}>
      {children}
    </div>
  </div>
);

// ── Composant document manquant ─────────────────────────────────────────
const MissingDoc: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{
      aspectRatio: '1.6',
      background: COLORS.dangerBg,
      border: `2px solid ${COLORS.danger}`,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    }}>
      <span style={{ fontSize: 28, color: COLORS.danger }}>✗</span>
    </div>
    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.danger }}>{label}</div>
    <div style={{ fontSize: 11, color: COLORS.textSub }}>Non fourni</div>
  </div>
);

// ── Page principale ─────────────────────────────────────────────────────
export const DossierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<DossierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDossierById(id)
      .then(d => setDossier(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = async () => {
    if (!id) return;
    const d = await getDossierById(id);
    setDossier(d);
  };

  const handleApprove = async () => {
    if (!id) return;
    setActionLoad(true);
    setActionMsg(null);
    try {
      await approveDossier(id);
      setActionMsg({ type: 'ok', msg: 'Dossier approuvé avec succès. Le compte bancaire a été créé.' });
      await refresh();
    } catch (e: any) {
      setActionMsg({ type: 'err', msg: e.message });
    } finally { setActionLoad(false); }
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    setActionLoad(true);
    setActionMsg(null);
    try {
      await rejectDossier(id, reason);
      setShowReject(false);
      setActionMsg({ type: 'ok', msg: `Dossier rejeté — motif : ${reason}` });
      await refresh();
    } catch (e: any) {
      setActionMsg({ type: 'err', msg: e.message });
    } finally { setActionLoad(false); }
  };

  const handleViewContract = async () => {
    if (!id) return;
    setPdfLoading(true);
    setPdfError('');
    try {
      const res = await getContractPdfBase64(id);
      setPdfBase64(res.data.base64);
      setShowPdf(true);
    } catch (e: any) {
      setPdfError('Impossible de charger le contrat : ' + e.message);
    } finally { setPdfLoading(false); }
  };

  if (loading) return (
    <Layout>
      <div style={{ background: COLORS.bgPage, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size={32} />
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div style={{ background: COLORS.bgPage, minHeight: '100vh', padding: 60, color: COLORS.danger }}>{error}</div>
    </Layout>
  );

  if (!dossier) return null;

  const canApprove = dossier.status === 'SUBMITTED';
  const canReject = dossier.status === 'SUBMITTED';

  return (
    <Layout>
      {showReject && <RejectModal onConfirm={handleReject} onClose={() => setShowReject(false)} loading={actionLoad} />}

      <div style={{ background: COLORS.bgPage, minHeight: '100vh', padding: '32px 40px' }}>

        {/* Fil d'Ariane */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span
              style={{ color: COLORS.accentBlue, cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/dossiers')}
            >
              Dossiers
            </span>
            <span style={{ color: COLORS.textLabel }}>/</span>
            <span style={{ color: COLORS.textMain, fontWeight: 500 }}>
              {dossier.firstName} {dossier.lastName}
            </span>
          </div>
        </div>

        {/* En-tête client */}
        <div style={{
          background: COLORS.white,
          borderRadius: 20,
          padding: '24px 32px',
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          border: `1px solid ${COLORS.borderLight}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #e8edf4 0%, #dfe4ec 100%)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.accentBlue,
            }}>
              {dossier.firstName?.[0]}{dossier.lastName?.[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 6px', color: COLORS.textMain, letterSpacing: '-0.3px' }}>
                {dossier.firstName} {dossier.lastName}
              </h1>
              <div style={{ fontSize: 13, color: COLORS.textSub, marginBottom: 10 }}>
                {dossier.firstNameArabic} {dossier.lastNameArabic}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <StatusBadge status={dossier.status} />
                <SourceBadge source={dossier.identificationSource} />
                {dossier.isContractSigned && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    background: COLORS.successBg,
                    color: COLORS.success,
                    padding: '4px 12px',
                    borderRadius: 30,
                  }}>
                    Contrat signé
                  </span>
                )}
                {dossier.accountNumber && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    background: COLORS.successBg,
                    color: COLORS.success,
                    padding: '4px 12px',
                    borderRadius: 30,
                  }}>
                    Compte : {dossier.accountNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleViewContract}
              disabled={pdfLoading}
              style={{
                height: 42,
                padding: '0 24px',
                background: COLORS.white,
                color: COLORS.accentBlue,
                border: `1px solid ${COLORS.borderMed}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!pdfLoading) {
                  e.currentTarget.style.borderColor = COLORS.accentBlue;
                  e.currentTarget.style.background = COLORS.bgPage;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLORS.borderMed;
                e.currentTarget.style.background = COLORS.white;
              }}
            >
              {pdfLoading ? 'Chargement...' : 'Consulter le contrat'}
            </button>
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={actionLoad}
                style={{
                  height: 42,
                  padding: '0 28px',
                  background: actionLoad ? COLORS.borderMed : COLORS.success,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: actionLoad ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!actionLoad) e.currentTarget.style.background = '#1f714a'; }}
                onMouseLeave={e => { if (!actionLoad) e.currentTarget.style.background = COLORS.success; }}
              >
                Approuver
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowReject(true)}
                disabled={actionLoad}
                style={{
                  height: 42,
                  padding: '0 28px',
                  background: actionLoad ? COLORS.borderMed : COLORS.white,
                  color: actionLoad ? COLORS.textSub : COLORS.danger,
                  border: `1px solid ${actionLoad ? COLORS.borderMed : COLORS.danger}`,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: actionLoad ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!actionLoad) {
                    e.currentTarget.style.background = COLORS.danger;
                    e.currentTarget.style.color = COLORS.white;
                  }
                }}
                onMouseLeave={e => {
                  if (!actionLoad) {
                    e.currentTarget.style.background = COLORS.white;
                    e.currentTarget.style.color = COLORS.danger;
                  }
                }}
              >
                Rejeter
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {actionMsg && (
          <div style={{
            background: actionMsg.type === 'ok' ? COLORS.successBg : COLORS.dangerBg,
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 24,
            fontSize: 13,
            color: actionMsg.type === 'ok' ? COLORS.success : COLORS.danger,
            border: `1px solid ${actionMsg.type === 'ok' ? '#c5e0d2' : '#f0cfca'}`,
          }}>
            {actionMsg.msg}
          </div>
        )}
        {pdfError && (
          <div style={{
            background: COLORS.dangerBg,
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 24,
            fontSize: 13,
            color: COLORS.danger,
            border: `1px solid #f0cfca`,
          }}>
            {pdfError}
          </div>
        )}

        {/* Visionneuse PDF */}
        {showPdf && pdfBase64 && (
          <div style={{
            background: COLORS.white,
            borderRadius: 16,
            marginBottom: 28,
            overflow: 'hidden',
            border: `1px solid ${COLORS.borderLight}`,
          }}>
            <div style={{
              padding: '14px 24px',
              borderBottom: `1px solid ${COLORS.borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMain }}>
                Contrat {dossier.isContractSigned ? '(Signé électroniquement)' : '(Non signé)'}
              </span>
              <button
                onClick={() => setShowPdf(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: COLORS.textSub,
                }}
              >
                ×
              </button>
            </div>
            <iframe
              src={`data:application/pdf;base64,${pdfBase64}`}
              style={{ width: '100%', height: 580, border: 'none' }}
              title="Contrat client"
            />
          </div>
        )}

        {/* Grille 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Colonne gauche */}
          <div>
            <DetailCard 
              title="Identité" 
              badge={dossier.identificationSource === 'E_HOUWIYA' ? 'Certifié E-Houwiya' : undefined}
            >
              <InfoRow label="Nom complet" value={`${dossier.firstName} ${dossier.lastName}`} />
              <InfoRow label="Nom en arabe" value={`${dossier.firstNameArabic} ${dossier.lastNameArabic}`} />
              <InfoRow label="Genre" value={dossier.gender === 'M' ? 'Monsieur' : 'Madame'} />
              <InfoRow label="Nationalité" value={dossier.nationality} />
              <InfoRow label="Date de naissance" value={dossier.birthDate} />
              <InfoRow label="Lieu de naissance" value={dossier.birthPlace} />
              <InfoRow label="Adresse e-mail" value={dossier.email} />
              <InfoRow label="Téléphone" value={`+216 ${dossier.phoneNumber}`} />
              <InfoRow label="Numéro CIN" value={dossier.idCardNumber} />
              <InfoRow label="Date d'émission CIN" value={dossier.idIssueDate} />
              {dossier.submittedAt && <InfoRow label="Date de soumission" value={new Date(dossier.submittedAt).toLocaleString('fr-TN')} />}
            </DetailCard>

            {/* ✅ Documents justificatifs avec DocViewer (fonctionnalité du code 2) */}
            <DetailCard title="Documents justificatifs">
              <div style={{ fontSize: 12, color: COLORS.textSub, background: COLORS.bgPage, padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
                Type : <strong>{dossier.usePassport ? 'Passeport' : 'Carte Nationale d\'Identité'}</strong>
                {' — '}Cliquer sur l'image pour l'agrandir
              </div>

              {dossier.usePassport ? (
                <div style={{ maxWidth: 260, margin: '0 auto' }}>
                  {dossier.hasPassport ? (
                    <DocViewer customerId={dossier.id} docType="passport" label="Passeport" />
                  ) : (
                    <MissingDoc label="Passeport" />
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {dossier.hasIdCardFront ? (
                    <DocViewer customerId={dossier.id} docType="cinFront" label="CIN recto" />
                  ) : (
                    <MissingDoc label="CIN recto" />
                  )}
                  {dossier.hasIdCardBack ? (
                    <DocViewer customerId={dossier.id} docType="cinBack" label="CIN verso" />
                  ) : (
                    <MissingDoc label="CIN verso" />
                  )}
                </div>
              )}
            </DetailCard>

            {dossier.isContractSigned && (
              <DetailCard title="Signature électronique">
                <InfoRow label="Prestataire" value="E-Houwiya / TunTrust" />
                <InfoRow label="Identifiant signature" value={dossier.eHouwiyaSignatureId} />
                <InfoRow label="Date de signature" value={dossier.eHouwiyaSignedAt ? new Date(dossier.eHouwiyaSignedAt).toLocaleString('fr-TN') : null} />
              </DetailCard>
            )}
          </div>

          {/* Colonne droite */}
          <div>
            <DetailCard title="Déclaration FATCA">
              <div style={{
                fontSize: 11,
                color: COLORS.textSub,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px solid ${COLORS.borderLight}`,
              }}>
                Déclaration fiscale américaine — remplie par le client
              </div>
              <InfoRow label="Citoyen américain" value={dossier.isUsCitizen} />
              <InfoRow label="Résident fiscal américain" value={dossier.isUsResident} />
              <InfoRow label="Détenteur de Green Card" value={dossier.hasGreenCard} />
              <InfoRow label="Contribuable américain" value={dossier.isUsTaxpayer} />
              <InfoRow label="Transferts vers les États-Unis" value={dossier.hasUsTransfers} />
              <InfoRow label="Numéro de téléphone américain" value={dossier.hasUsPhone} />
              <InfoRow label="Procuration américaine" value={dossier.hasUsProxy} />
              <InfoRow label="Personne politiquement exposée (PEP)" value={dossier.isPoliticallyExposed} />
            </DetailCard>

            <DetailCard title="Adresse et agence">
              <InfoRow label="Gouvernorat" value={dossier.gouvernorat} />
              <InfoRow label="Délégation" value={dossier.delegation} />
              <InfoRow label="Code postal" value={dossier.codePostal} />
              <InfoRow label="Adresse complète" value={dossier.adresse} />
              <InfoRow label="Agence ATB" value={dossier.agence} />
              <InfoRow label="Gouvernorat de l'agence" value={dossier.gouvernoratAgence} />
            </DetailCard>

            <DetailCard title="Situation professionnelle">
              <InfoRow label="Situation" value={dossier.situationProfessionnelle} />
              <InfoRow label="Profession" value={dossier.profession} />
              <InfoRow label="Poste actuel" value={dossier.posteActuel} />
              <InfoRow label="Employeur / Entreprise" value={dossier.entreprise} />
              <InfoRow label="Revenu mensuel" value={dossier.revenuMensuel ? `${dossier.revenuMensuel} DT` : 'Non renseigné'} />
            </DetailCard>
          </div>
        </div>
      </div>
    </Layout>
  );
};