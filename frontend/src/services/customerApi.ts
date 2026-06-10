
//  ✅ [DOCUMENT UPLOAD]  :
//  Utilisation de expo-file-system/legacy avec uploadAsync()


//  Fonctions disponibles :
//  1. createCustomer()            → créer customer (MANUAL)
//  2. simulateEHouwiya()          → créer customer + token (E-HOUWIYA)
//  3. uploadDocument()            → uploader un document ✅ CORRIGÉ
//  4. saveDocuments()             → sauvegarder chemins documents
//  5. signContractWithEHouwiya()  → signer le contrat
//  6. getContractPdfBase64()      → PDF en base64
//  7. getEHouwiyaSignatureStatus() → statut signature
//  8. verifyEHouwiyaToken()       → valider le token
// ============================================================

// ✅ Import de l'API legacy (non dépréciée, fonctionne parfaitement)
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../config';
const BASE_URL = API_URL;

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const json = await response.json();

  if (!response.ok) {
    const message = Array.isArray(json.message)
      ? json.message.join(', ')
      : json.message || 'Une erreur est survenue';
    throw new Error(message);
  }
  return json;
}

// ══════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════

export interface CustomerCreatedResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    currentStep: number;
    status: string;
    identificationSource?: string;
  };
}

export interface OtpResponse {
  success: boolean;
  message: string;
  devOnly_otp?: string;
  expiresAt?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

export interface CustomerDataResponse {
  success: boolean;
  data: Record<string, any>;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] Types
// ══════════════════════════════════════════════════════════════

/**
 * Données retournées par E-Houwiya — toutes en LECTURE SEULE.
 * email et phoneNumber inclus — validés par TunTrust.
 * Le client NE PEUT PAS modifier ces données.
 */
export interface EHouwiyaData {
  // Identité
  lastName: string;
  firstName: string;
  lastNameArabic: string;
  firstNameArabic: string;
  gender: string;
  nationality: string;
  birthDate: string;
  birthPlace: string;
  countryOfBirth: string;
  countryOfResidence: string;
  idCardNumber: string;
  idIssueDate: string;
  // ✅ Contact certifié — aussi verrouillé
  phoneNumber: string;
  email: string;
}

export interface EHouwiyaSimulateResponse {
  success: boolean;
  message: string;
  customerId: string;
  eHouwiyaData: EHouwiyaData;
  token: string;
  tokenExpiresAt: string;
}

export interface EHouwiyaSignResponse {
  success: boolean;
  message: string;
  signatureId: string;
  signedAt: string;
  diagnosticData?: any;
}

export interface EHouwiyaSignatureStatus {
  isSigned: boolean;
  signatureId: string | null;
  signedAt: string | null;
  source: string;
  status: string;
}

export interface ContractPdfBase64Response {
  success: boolean;
  data: {
    base64: string;
    fileName: string;
    isSigned: boolean;
    signatureId?: string;
  };
}

export interface EmailOtpResponse { success: boolean; message: string; }
export interface VerifyEmailOtpResponse { success: boolean; message: string; }

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: {
    documentPath: string;
    customerId: string;
  };
}

// ══════════════════════════════════════════════════════════════
//  ÉTAPE 1 — Créer le customer (flux MANUEL)
// ══════════════════════════════════════════════════════════════
export async function createCustomer(
  data: {
    lastName: string; firstName: string;
    lastNameArabic: string; firstNameArabic: string;
    gender: string; nationality: string;
    birthDate: string; birthPlace: string;
    countryOfBirth: string; countryOfResidence: string;
    phoneNumber: string; email: string;
    idCardNumber: string; idIssueDate: string;
  },
  identificationSource: 'MANUAL' | 'E_HOUWIYA' = 'MANUAL',
): Promise<{ id: string; currentStep: number; status: string }> {
  const response = await apiCall<CustomerCreatedResponse>('/customer', 'POST', {
    ...data,
    identificationSource,
  });
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  OTP
// ══════════════════════════════════════════════════════════════
export async function requestOtp(customerId: string): Promise<OtpResponse> {
  return apiCall<OtpResponse>(`/customer/${customerId}/otp`, 'POST');
}

export async function verifyOtp(customerId: string, otpCode: string): Promise<VerifyOtpResponse> {
  return apiCall<VerifyOtpResponse>(`/customer/${customerId}/verify-otp`, 'POST', { otpCode });
}

// ══════════════════════════════════════════════════════════════
//  FATCA
// ══════════════════════════════════════════════════════════════
export async function saveFatca(
  customerId: string,
  data: {
    isUsCitizen: boolean; isUsResident: boolean; hasGreenCard: boolean;
    isUsTaxpayer: boolean; hasUsTransfers: boolean; hasUsPhone: boolean;
    hasUsProxy: boolean; isPoliticallyExposed: boolean;
  },
): Promise<{ id: string; currentStep: number; status: string }> {
  const response = await apiCall<CustomerCreatedResponse>(
    `/customer/${customerId}/fatca`, 'POST', data,
  );
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  DOCUMENTS
// ══════════════════════════════════════════════════════════════
export async function saveDocuments(
  customerId: string,
  data: {
    usePassport: boolean;
    idCardFrontPath: string | null;
    idCardBackPath: string | null;
    passportPath: string | null;
  },
): Promise<{ id: string; currentStep: number; status: string }> {
  const response = await apiCall<CustomerCreatedResponse>(
    `/customer/${customerId}/documents`, 'POST', data,
  );
  return response.data;
}

// ══════════════════════════════════════════════════════════════
// ✅ [DOCUMENT UPLOAD] Upload d'un document vers le serveur
// 
// Solution utilisant expo-file-system/legacy avec uploadAsync()
// Cette méthode est stable, non dépréciée, et fonctionne parfaitement
// ══════════════════════════════════════════════════════════════
export async function uploadDocument(
  customerId: string,
  docType: 'cinRecto' | 'cinVerso' | 'passport',
  uri: string,
  fileName: string,
): Promise<string> {
  try {
    console.log(`[uploadDocument] 📤 Début upload ${docType} pour customer ${customerId}`);
    console.log(`[uploadDocument] 📁 URI: ${uri}`);
    console.log(`[uploadDocument] 📄 Nom fichier: ${fileName}`);

    // 1. Vérifier que le fichier existe
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error(`Fichier introuvable: ${uri}`);
    }
    console.log(`[uploadDocument] ✅ Fichier trouvé, taille: ${fileInfo.size} bytes`);

    // 2. Récupérer le token d'authentification (optionnel)
    let token = null;
    try {
      token = await AsyncStorage.getItem('customer_token');
      if (token) console.log('[uploadDocument] 🔑 Token trouvé');
    } catch (e) {
      console.log('[uploadDocument] ⚠️ Pas de token trouvé, upload sans auth');
    }

    // 3. Upload direct vers le serveur avec uploadAsync
    const uploadResult = await FileSystem.uploadAsync(
      `${BASE_URL}/customer/${customerId}/upload-document`,
      uri,
      {
        fieldName: 'document',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        parameters: {
          docType: docType,
        },
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }
    );

    console.log(`[uploadDocument] 📡 Réponse status: ${uploadResult.status}`);

    // 4. Analyser la réponse
    if (uploadResult.status !== 200 && uploadResult.status !== 201) {
      throw new Error(`HTTP ${uploadResult.status}: ${uploadResult.body}`);
    }

    const response = JSON.parse(uploadResult.body);

    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }

    console.log(`[uploadDocument] ✅ Succès! Chemin serveur: ${response.data.documentPath}`);
    return response.data.documentPath;
  } catch (error: any) {
    console.error('[uploadDocument] ❌ Erreur détaillée:', error);
    throw new Error(error.message || 'Impossible d\'uploader le document');
  }
}

// ══════════════════════════════════════════════════════════════
//  FORMULAIRE PERSONNEL
// ══════════════════════════════════════════════════════════════
export async function savePersonalForm(
  customerId: string,
  data: {
    pays: string; gouvernorat: string; delegation: string; codePostal: string;
    adresse: string; adresseSuite?: string; situationProfessionnelle: string;
    profession?: string; posteActuel?: string; dateEmbauche?: string;
    entreprise?: string; revenuMensuel?: number;
    gouvernoratAgence: string; agence: string;
  },
): Promise<{ id: string; currentStep: number; status: string; submittedAt: string }> {
  const response = await apiCall<{
    success: boolean; message: string;
    data: { id: string; currentStep: number; status: string; submittedAt: string };
  }>(`/customer/${customerId}/personal-form`, 'POST', data);
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  LECTURE & MISE À JOUR
// ══════════════════════════════════════════════════════════════
export async function getCustomer(customerId: string): Promise<Record<string, any>> {
  const response = await apiCall<CustomerDataResponse>(`/customer/${customerId}`, 'GET');
  return response.data;
}

export async function findCustomerByEmail(email: string): Promise<Record<string, any> | null> {
  const response = await apiCall<CustomerDataResponse>(
    `/customer/by-email/${encodeURIComponent(email)}`, 'GET',
  );
  return response.success ? response.data : null;
}

export async function updateCustomer(
  customerId: string,
  data: Partial<Record<string, any>>,
): Promise<{ id: string; currentStep: number; status: string }> {
  const response = await apiCall<CustomerCreatedResponse>(
    `/customer/${customerId}`, 'PATCH', data,
  );
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  EMAIL OTP
// ══════════════════════════════════════════════════════════════
export async function requestEmailOtp(customerId: string, firstName?: string): Promise<EmailOtpResponse> {
  return apiCall<EmailOtpResponse>('/email-otp/request', 'POST', { customerId, firstName });
}

export async function verifyEmailOtp(customerId: string, code: string): Promise<VerifyEmailOtpResponse> {
  return apiCall<VerifyEmailOtpResponse>('/email-otp/verify', 'POST', { customerId, code });
}

// ══════════════════════════════════════════════════════════════
//  VÉRIFICATIONS
// ══════════════════════════════════════════════════════════════
export async function verifyOnboarding(customerId: string): Promise<VerificationResponse> {
  return apiCall<VerificationResponse>(`/customer/${customerId}/verify-onboarding`, 'POST');
}

export async function verifyRisk(customerId: string): Promise<VerificationResponse> {
  return apiCall<VerificationResponse>(`/customer/${customerId}/verify-risk`, 'POST');
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] API #1 — simulateEHouwiya
//
// Appel principal du flux E-Houwiya depuis HomeScreen.
// Retourne customerId + toutes les données E-Houwiya
// (identité + email + téléphone) toutes en lecture seule.
// ══════════════════════════════════════════════════════════════
export async function simulateEHouwiya(): Promise<EHouwiyaSimulateResponse> {
  return apiCall<EHouwiyaSimulateResponse>('/customer/ehouwiya/simulate', 'POST');
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] API #2 — signContractWithEHouwiya
//
// Signe le contrat ATB via TunTrust.
// Appelé depuis ContractScreen — bouton "Signer avec E-Houwiya".
// ══════════════════════════════════════════════════════════════
export async function signContractWithEHouwiya(
  customerId: string,
  documentBase64: string,
  eHouwiyaToken: string,
): Promise<EHouwiyaSignResponse> {
  return apiCall<EHouwiyaSignResponse>(
    `/customer/${customerId}/sign-contract`,
    'POST',
    { documentBase64, eHouwiyaToken },
  );
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] API #3 — getContractPdfBase64
//
// Récupère le PDF du contrat en base64.
// Utilisé par ContractScreen pour afficher + signer.
// ══════════════════════════════════════════════════════════════
export async function getContractPdfBase64(customerId: string): Promise<ContractPdfBase64Response> {
  return apiCall<ContractPdfBase64Response>(
    `/customer/${customerId}/contract/pdf-base64`, 'GET',
  );
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] API #4 — getEHouwiyaSignatureStatus
//
// Vérifie si le contrat est déjà signé.
// ══════════════════════════════════════════════════════════════
export async function getEHouwiyaSignatureStatus(
  customerId: string,
): Promise<EHouwiyaSignatureStatus> {
  const result = await apiCall<any>(`/customer/${customerId}/ehouwiya/status`, 'GET');

  // Cas 1: Le backend retourne directement { isSigned, signatureId, signedAt, source, status }
  if (result && typeof result.isSigned !== 'undefined') {
    return {
      isSigned: result.isSigned,
      signatureId: result.signatureId ?? null,
      signedAt: result.signedAt ?? null,
      source: result.source ?? '',
      status: result.status ?? ''
    };
  }

  // Cas 2: Le backend retourne { success, data: { isSigned, ... } }
  return {
    isSigned: result?.data?.isSigned ?? false,
    signatureId: result?.data?.signatureId ?? null,
    signedAt: result?.data?.signedAt ?? null,
    source: result?.data?.source ?? '',
    status: result?.data?.status ?? ''
  };
}

// ══════════════════════════════════════════════════════════════
// ✅ [E-HOUWIYA] API #5 — verifyEHouwiyaToken
//
// Vérifie la validité du token JWT dans AsyncStorage.
// ══════════════════════════════════════════════════════════════
export async function verifyEHouwiyaToken(
  customerId: string,
  token: string,
): Promise<{ success: boolean; message: string; payload?: any }> {
  return apiCall<{ success: boolean; message: string; payload?: any }>(
    `/customer/${customerId}/ehouwiya/verify-token`,
    'POST',
    { token },
  );
}