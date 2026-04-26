// src/services/adminApi.ts
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function api<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Erreur serveur');
  return json;
}

// ── Types ──────────────────────────────────────────────────
export interface AdminInfo     { id: string; username: string; fullName: string }
export interface LoginResponse { token: string; expiresAt: string; admin: AdminInfo }

export interface DossierSummary {
  id: string; firstName: string; lastName: string;
  firstNameArabic: string; lastNameArabic: string;
  email: string; phoneNumber: string; idCardNumber: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  identificationSource: 'MANUAL' | 'E_HOUWIYA';
  isContractSigned: boolean; submittedAt: string | null;
  accountNumber: string | null;
  hasIdCardFront: boolean; hasIdCardBack: boolean; hasPassport: boolean;
  usePassport: boolean; eHouwiyaSignatureId: string | null;
}

export interface DossierDetail extends DossierSummary {
  gender: string; nationality: string; birthDate: string;
  birthPlace: string; countryOfBirth: string; idIssueDate: string;
  accountCreatedAt: string | null;
  isUsCitizen: boolean | null; isUsResident: boolean | null;
  hasGreenCard: boolean | null; isUsTaxpayer: boolean | null;
  hasUsTransfers: boolean | null; hasUsPhone: boolean | null;
  hasUsProxy: boolean | null; isPoliticallyExposed: boolean | null;
  idCardFrontPath: string | null; idCardBackPath: string | null; passportPath: string | null;
  eHouwiyaSignedAt: string | null;
  pays: string | null; gouvernorat: string | null; delegation: string | null;
  codePostal: string | null; adresse: string | null;
  situationProfessionnelle: string | null; profession: string | null;
  posteActuel: string | null; entreprise: string | null;
  revenuMensuel: number | null; gouvernoratAgence: string | null; agence: string | null;
}

export interface PaginatedDossiers { data: DossierSummary[]; total: number; page: number; totalPages: number }

export interface AdminStats {
  totalSoumis: number; totalApprouves: number; totalRejetes: number;
  tauxApprobation: number; tauxRejet: number;
  totalManual: number; totalEhouwiya: number;
  totalContratsSigenes: number; dossiersAujourdHui: number;
  dailyVolume: { date: string; soumis: number; approuves: number; rejetes: number }[];
}

export interface GetDossiersParams {
  search?: string; status?: string; source?: string;
  dateFrom?: string; dateTo?: string;
  page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC';
}

// ── Fonctions ──────────────────────────────────────────────
export const adminLogin = (username: string, password: string) =>
  api<LoginResponse>('/admin/login', 'POST', { username, password });

export const getDossiers = (params: GetDossiersParams = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
  return api<PaginatedDossiers>(`/admin/dossiers?${qs}`);
};

export const getDossierById = (id: string) =>
  api<DossierDetail>(`/admin/dossiers/${id}`);

export const approveDossier = (id: string) =>
  api<any>(`/admin/dossiers/${id}/approve`, 'PATCH');

export const rejectDossier = (id: string, reason: string) =>
  api<any>(`/admin/dossiers/${id}/reject`, 'PATCH', { reason });

export const getStats = () =>
  api<AdminStats>('/admin/stats');

// ── ✅ URL document avec token dans le header ──────────────
// Le composant DocViewer utilise cette URL + fetch avec Authorization
export const getDocumentUrl = (customerId: string, docType: 'cinFront' | 'cinBack' | 'passport') =>
  `${BASE}/admin/dossiers/${customerId}/document/${docType}`;

// ── Contrat PDF ────────────────────────────────────────────
export const getContractPdfBase64 = (customerId: string) =>
  api<{ data: { base64: string; fileName: string; isSigned: boolean } }>(
    `/customer/${customerId}/contract/pdf-base64`,
  );



// src/services/adminApi.ts
// Ajouter à la fin du fichier

export interface Notification {
  id: string;
  title: string;
  message: string;
  customerId: string;
  customerName: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

export const getNotifications = () =>
  api<NotificationsResponse>('/admin/notifications');

export const markNotificationAsRead = (id: string) =>
  api<any>(`/admin/notifications/${id}/read`, 'PATCH');

export const markAllNotificationsAsRead = () =>
  api<any>('/admin/notifications/read-all', 'PATCH');


// ── Audit Logs ─────────────────────────────────────────────

export interface AuditLogEntry {
  id:            string;
  adminId:       string;
  adminUsername: string;
  action:        string;
  customerId:    string | null;
  customerName:  string | null;
  metadata:      Record<string, any> | null;
  ipAddress:     string | null;
  userAgent:     string | null;
  success:       boolean;
  errorMessage:  string | null;
  createdAt:     string;
}

export interface AuditLogsResponse {
  data:       AuditLogEntry[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface AuditStats {
  totalActions:   number;
  totalApprouves: number;
  totalRejetes:   number;
  totalLogins:    number;
  recentActivity: AuditLogEntry[];
}

export const getAuditLogs = (params: {
  page?: number; limit?: number;
  action?: string; adminId?: string;
  dateFrom?: string; dateTo?: string;
} = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
  return api<AuditLogsResponse>(`/admin/audit-logs?${qs}`);
};

export const getAuditStats = () =>
  api<AuditStats>('/admin/audit-logs/stats');