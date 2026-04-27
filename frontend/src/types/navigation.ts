
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';

// Type partagé pour les données du formulaire OCR / E-Houwiya
export type OcrFormData = {
  lastNameArabic: string | undefined;
  firstNameArabic: string | undefined;
  lastName?:           string; // arabe pour CIN
  firstName?:          string; // arabe pour CIN
  lastNameLatin?:      string;// latin pour PASSPORT
  firstNameLatin?:     string;// latin pour PASSPORT
  idCardNumber?:       string;
  birthDate?:          string;
  idIssueDate?:        string;
  gender?:             string;
  nationality?:        string;
  birthPlace?:         string;
  countryOfBirth?:     string;
  countryOfResidence?: string;
  phoneNumber?:        string;
  email?:              string;
};

// ✅ [E-HOUWIYA] Type pour les données retournées par E-Houwiya
// Tous les champs sont requis car certifiés par TunTrust
// et non modifiables par le client
export type EHouwiyaData = {
  lastName:           string;
  firstName:          string;
  lastNameArabic:     string;
  firstNameArabic:    string;
  gender:             string;
  nationality:        string;
  birthDate:          string;
  birthPlace:         string;
  countryOfBirth:     string;
  countryOfResidence: string;
  idCardNumber:       string;
  idIssueDate:        string;
  // ✅ Email et téléphone aussi certifiés — non modifiables
  phoneNumber:        string;
  email:              string;
};

export type RootStackParamList = {
  Home:                  undefined;
  EligibilityConditions: undefined;
  OnboardingHome:        undefined;

  OnboardingPersonalData: {
    customerId?:     string;
    fromRecap?:      boolean;
    prefillData?:    OcrFormData;
    // ✅ [E-HOUWIYA] Paramètres E-Houwiya
    isEHouwiya?:     boolean;        // true = flux E-Houwiya, champs verrouillés
    eHouwiyaData?:   EHouwiyaData;   // Données certifiées TunTrust — non modifiables
    tokenExpiresAt?: string;         // Info expiration du token (affichage)
    // Ancien paramètre générique conservé pour compatibilité
    data?:           any;
  } | undefined;

  OtpVerification: {
    customerId:  string;
    formData?:   OcrFormData;
    mode?:       'sms' | 'email';
    isEHouwiya?: boolean;
  };

  FATCA: {
    customerId: string;
    fromRecap?: boolean;
    formData?:  OcrFormData;
  };

  DocumentsJustificatif: {
    customerId: string;
    fromRecap?: boolean;
    formData?:  OcrFormData;
  };

  Personaldataform: {
    customerId: string;
    fromRecap?: boolean;
  };

  Recapitulatif: {
    customerId: string;
  };

  ContractScreen: {
    customerId: string;
  };

  // ✅ [E-HOUWIYA] EHouwiyaScreen — PAS de customerId requis à l'entrée
  // Le customerId est créé DANS cet écran via simulateEHouwiya()
  // C'est pourquoi il est optionnel (undefined par défaut) 
  EHouwiyaScreen: undefined;

  DigigoScreen:         { customerId: string };
  OnboardingDocuments:  undefined;
  OnboardingSummary:    undefined;
  OnboardingSend:       undefined;
  OnboardingSignature:  undefined;
  ResumeRequest:        undefined;
  ResumewithReference:  undefined;
  IdentityVerification: undefined;
  ForgetPassword:       undefined;
  NewPassword:          undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type RouteProp<T extends keyof RootStackParamList> =
  RNRouteProp<RootStackParamList, T>;