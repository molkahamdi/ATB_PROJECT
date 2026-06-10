
// ✅ Le front envoie la photo à NestJS :3000
// ✅ NestJS transmet à Python :8001 en local (localhost)
// ✅ PASSPORT : comparaison latin ↔ latin (lastNameLatin / firstNameLatin)
// ✅ CIN_RECTO : comparaison arabe ↔ arabe (lastNameArabic / firstNameArabic)

import { API_URL } from '../config';
const BASE_URL = API_URL;

export type DocType     = 'CIN_RECTO' | 'CIN_VERSO' | 'PASSPORT';
export type MatchStatus = 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNVERIFIED';
export interface OcrFormData {
  // CIN — champs arabes
  lastName?:      string;   // ← contient lastNameArabic
  firstName?:     string;   // ← contient firstNameArabic
  // PASSPORT — champs latins
  lastNameLatin?:  string;  // ← contient lastName (français)
  firstNameLatin?: string;  // ← contient firstName (français)
  // Commun
  idCardNumber?:  string;
  birthDate?:     string;
  idIssueDate?:   string;
  gender?:        string;
  nationality?:   string;
  birthPlace?:    string;
  countryOfBirth?: string;
  countryOfResidence?: string;
   phoneNumber?: string;
  email?:       string;
}

export interface OcrScanResult {
  success:       boolean;
  ocrDocumentId: string;
  parsedData: {
    lastName?:        string;
    firstName?:       string;
    lastNameArabic?:  string;
    firstNameArabic?: string;
    idCardNumber?:    string;
    nationalId?:      string;
    birthDate?:       string;
    idIssueDate?:     string;
    gender?:          string;
  };
  matchStatus:  MatchStatus;
  matchScore:   number;
  matchDetails: Record<string, boolean>;
  confidence:   number;
  issues:       string[];
  canProceed:   boolean;
}

function fetchWithTimeout(url: string, options: RequestInit, ms = 120_000): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai dépassé (${ms / 1000}s). Vérifiez la connexion réseau.`));
    }, ms);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

export async function scanDocument(
  documentUri:  string,
  documentName: string,
  mimeType:     string,
  docType:      DocType,
  formData:     OcrFormData,
  customerId?:  string,
): Promise<OcrScanResult> {

  console.log(`[OCR] → ${docType} via NestJS ${BACKEND_URL}`);

  const body = new FormData();
  body.append('document', {
    uri:  documentUri,
    name: documentName.replace(/\.[^.]+$/, '') + '.jpg',
    type: 'image/jpeg',
  } as any);
  body.append('docType', docType);

  const t0 = Date.now();
  let ocrRes: Response;
  try {
    ocrRes = await fetchWithTimeout(
      `${BACKEND_URL}/customer/${customerId || 'unknown'}/ocr/scan`,
      { method: 'POST', body },
      120_000,
    );
    console.log(`[OCR] Réponse en ${((Date.now() - t0) / 1000).toFixed(1)}s — HTTP ${ocrRes.status}`);
  } catch (err: any) {
    console.log(`[OCR] ❌ Erreur après ${((Date.now() - t0) / 1000).toFixed(1)}s : ${err.message}`);
    throw err;
  }

  if (!ocrRes.ok) {
    const err = await ocrRes.json().catch(() => ({})) as any;
    throw new Error(err.message || `Erreur serveur OCR (${ocrRes.status})`);
  }

  const ocrData    = await ocrRes.json() as any;
  const comparison = compareLocally(ocrData.parsedData, formData, docType);

  console.log(`[OCR] parsedData:`, JSON.stringify(ocrData.parsedData, null, 2));
  console.log(`[OCR] ${comparison.matchStatus} ${Math.round(comparison.matchScore * 100)}%`);
  if (comparison.issues.length) console.log(`[OCR] issues:`, comparison.issues);

  return {
    success:       ocrData.success,
    ocrDocumentId: ocrData.ocrDocumentId,
    parsedData:    ocrData.parsedData,
    confidence:    ocrData.confidence,
    ...comparison,
  };
}

// ── Comparaison locale ────────────────────────────────────────
function compareLocally(parsed: any, form: OcrFormData, docType: DocType) {
  const issues:       string[]                = [];
  const matchDetails: Record<string, boolean> = {};
  let   totalScore = 0, totalWeight = 0;

  for (const { pk, fk, w, label } of getChecks(docType)) {
    const pv = parsed?.[pk];
    const fv = (form as any)?.[fk];
    if (!pv && !fv) continue;
    if (!pv) { matchDetails[fk] = false; issues.push(`${label} : non détecté`);   totalWeight += w; continue; }
    if (!fv) { matchDetails[fk] = false; issues.push(`${label} : non renseigné`); totalWeight += w; continue; }
    const sim = similarity(String(pv), String(fv), pk);
    matchDetails[fk] = sim >= 0.80;
    totalScore  += sim * w;
    totalWeight += w;
    if (sim < 0.80) issues.push(`${label} : "${String(fv)}" ≠ "${String(pv)}" (${Math.round(sim * 100)}%)`);
  }

  const matchScore  = totalWeight > 0 ? totalScore / totalWeight : 0;
  const matchStatus: MatchStatus =
    matchScore >= 0.80 ? 'MATCH' : matchScore >= 0.50 ? 'PARTIAL' : 'MISMATCH';
  const canProceed =
    matchStatus === 'MATCH' ||
    (matchStatus === 'PARTIAL' && matchDetails['idCardNumber'] === true);

  return { matchStatus, matchScore, matchDetails, issues, canProceed };
}

// ── Définition des checks par type de document ────────────────
function getChecks(docType: DocType) {
  if (docType === 'CIN_RECTO') return [
    { pk: 'idCardNumber',    fk: 'idCardNumber', w: 3, label: 'Numéro CIN'        },
    // CIN : OCR extrait arabe → on compare avec champs arabes du formulaire
    { pk: 'lastNameArabic',  fk: 'lastName',     w: 2, label: 'Nom'               },
    { pk: 'firstNameArabic', fk: 'firstName',    w: 2, label: 'Prénom'            },
    { pk: 'birthDate',       fk: 'birthDate',    w: 2, label: 'Date de naissance' },
  ];
  if (docType === 'PASSPORT') return [
    { pk: 'nationalId',  fk: 'idCardNumber',  w: 3, label: 'N° CIN (passeport)'  },
    // PASSPORT : OCR extrait latin → on compare avec champs latins du formulaire
    { pk: 'lastName',    fk: 'lastNameLatin',  w: 2, label: 'Nom'                 },
    { pk: 'firstName',   fk: 'firstNameLatin', w: 2, label: 'Prénom'              },
    { pk: 'birthDate',   fk: 'birthDate',      w: 2, label: 'Date de naissance'   },
  ];
  return [];
}

// ── Normalisation ─────────────────────────────────────────────
function normalize(val: string, field: string): string {
  let v = val.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (field === 'birthDate' || field === 'idIssueDate')   return v.replace(/\D/g, '');
  if (field === 'idCardNumber' || field === 'nationalId')  return v.replace(/\D/g, '');
  if (field === 'gender') return v[0] || '';
  // Pour les noms latins : garder seulement A-Z et espaces
  if (!hasArabic(val)) return v.replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
  // Pour les noms arabes : garder les caractères arabes et espaces
  return val.trim().replace(/\s+/g, ' ').trim();
}

function hasArabic(val: string): boolean {
  return /[\u0600-\u06FF]/.test(val);
}

function similarity(a: string, b: string, field: string): number {
  const na = normalize(a, field), nb = normalize(b, field);
  if (na === nb) return 1.0;
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 1.0 : Math.max(0, 1 - levenshtein(na, nb) / max);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

export function getMatchStatusInfo(status: MatchStatus) {
  switch (status) {
    case 'MATCH':    return { label: 'Identité vérifiée',      color: '#16a34a', icon: '✅' };
    case 'PARTIAL':  return { label: 'Vérification partielle', color: '#d97706', icon: '⚠️' };
    case 'MISMATCH': return { label: 'Données non conformes',  color: '#dc2626', icon: '❌' };
    default:         return { label: 'Non vérifié',            color: '#6b7280', icon: '⏳' };
  }
}