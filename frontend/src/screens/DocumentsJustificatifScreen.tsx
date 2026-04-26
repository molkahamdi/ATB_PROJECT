// ============================================================
//  frontend/screens/DocumentsJustificatifsScreen.tsx
//  ✅ CORRECTION : Upload réel du fichier vers le backend
//     au lieu de stocker l'URI locale
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView,
  Platform, StyleSheet, Alert, Image, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import colors from '../../constants/colors';
import { NavigationProp, RouteProp, OcrFormData } from '../types/navigation';
import { saveDocuments, uploadDocument } from '../services/customerApi'; // ✅ NOUVEAU: import uploadDocument
import { useOcrScan, OcrDocKey } from '../hooks/useOcrScan';
import { OcrResultBadge } from '../components/common/OcrResultBadge';
import { DocumentScanGuide } from '../components/common/DocumentScanGuide';

import type { DocType as OcrDocType, OcrScanResult } from '../services/ocrApi';

type Props = {
  navigation: NavigationProp<'DocumentsJustificatif'>;
  route: RouteProp<'DocumentsJustificatif'>;
};

interface UploadedDocument {
  name: string;
  size: number;
  type: string;
  uri: string | null;
  serverPath?: string; // ✅ NOUVEAU : chemin serveur après upload
}

type UploadType = 'cinRecto' | 'cinVerso' | 'passport';

const DOC_ASPECT: Record<UploadType, [number, number]> = {
  cinRecto: [85.6, 54],
  cinVerso: [85.6, 54],
  passport: [125,  88],
};

const UPLOAD_TO_OCR: Record<UploadType, OcrDocType> = {
  cinRecto: 'CIN_RECTO',
  cinVerso: 'CIN_VERSO',
  passport: 'PASSPORT',
};

// ── Compression ───────────────────────────────────────────────
const compressImage = async (uri: string): Promise<{
  uri: string; width: number; height: number; fileSize: number;
} | null> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    const estimatedSize = Math.round((result.width * result.height * 0.25) / 8);
    return { uri: result.uri, width: result.width, height: result.height, fileSize: estimatedSize };
  } catch (err) {
    console.error('[compressImage] Erreur:', err);
    return null;
  }
};

// ── PhaseIndicator ────────────────────────────────────────────
const PhaseIndicator: React.FC<{ currentPhase: number }> = ({ currentPhase }) => {
  const phases = [
    { id: 1, label: 'Données personnelles' },
    { id: 2, label: 'Documents justificatifs' },
    { id: 3, label: 'Résumer de la demande' },
    { id: 4, label: 'Envoi de la demande' },
    { id: 5, label: 'Signature éléctronique' },
  ];
  return (
    <View style={styles.phaseContainer}>
      {phases.map((phase, index) => (
        <React.Fragment key={phase.id}>
          <View style={styles.phaseItem}>
            <View style={[
              styles.phaseRadioOuter,
              phase.id < currentPhase && styles.phaseRadioCompleted,
              phase.id === currentPhase && styles.phaseRadioActive,
            ]}>
              {phase.id < currentPhase
                ? <Text style={styles.phaseRadioCheck}>✓</Text>
                : <View style={[styles.phaseRadioInner, phase.id === currentPhase && styles.phaseRadioInnerActive]} />
              }
            </View>
            <Text style={[
              styles.phaseLabel,
              phase.id === currentPhase && styles.phaseLabelActive,
              phase.id < currentPhase && styles.phaseLabelCompleted,
            ]}>
              {phase.label}
            </Text>
          </View>
          {index < phases.length - 1 && <View style={styles.phaseConnector} />}
        </React.Fragment>
      ))}
    </View>
  );
};

// ── Header ────────────────────────────────────────────────────
const Header: React.FC = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.logoContainer}>
        <LinearGradient colors={[colors.atb.red, '#C41E3A']} style={styles.logoGradient}>
          <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
        </LinearGradient>
      </View>
      <View>
        <Text style={styles.bankName}>Arab Tunisian Bank</Text>
        <Text style={styles.bankSubtitle}>البنك العربي التونسي</Text>
      </View>
    </View>
    <LinearGradient colors={[colors.atb.red, '#C41E3A']} style={styles.digipackBadge}>
      <Text style={styles.digipackText}>DIGIPACK</Text>
    </LinearGradient>
  </View>
);

// ── Footer ────────────────────────────────────────────────────
const Footer: React.FC = () => (
  <View style={styles.footer}>
    <View style={styles.footerLegal}>
      <Text style={styles.footerLegalText}>CONFIDENTIEL</Text>
      <Text style={styles.footerDivider}> • </Text>
      <Text style={styles.footerLegalText}>SÉCURISÉ</Text>
    </View>
    <Text style={styles.footerText}>© 2026 Arab Tunisian Bank · Tous droits réservés</Text>
    <Text style={styles.footerSubtext}>Service client : 71 143 000</Text>
  </View>
);

// ── UploadBox ─────────────────────────────────────────────────
const UploadBox: React.FC<{
  type: UploadType;
  label: string;
  document: UploadedDocument | null;
  borderColor: string;
  disabled?: boolean;
  onCamera: (type: UploadType) => void;
  onGallery: (type: UploadType) => void;
  onRemove: (type: UploadType) => void;
}> = ({ type, label, document, borderColor, disabled = false, onCamera, onGallery, onRemove }) => {
  const fmt = (b: number) =>
    b < 1024 ? `${b} B` :
    b < 1048576 ? `${(b / 1024).toFixed(1)} KB` :
    `${(b / 1048576).toFixed(1)} MB`;

  const activeBorderColor = disabled ? colors.neutral.gray300 : borderColor;

  return (
    <View style={styles.uploadContainer}>
      <View style={styles.uploadHeader}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <View style={styles.requiredIndicator}>
          <Text style={styles.requiredStar}>*</Text>
          <Text style={styles.requiredText}>Requis</Text>
        </View>
      </View>

      {document ? (
        <View style={[styles.uploadedFileCard, { borderColor: activeBorderColor }]}>
          <View style={styles.fileInfo}>
            <View style={styles.fileIconContainer}>
              {document.uri
                ? <Image source={{ uri: document.uri! }} style={styles.fileThumb} resizeMode="cover" />
                : <AntDesign name="file" size={24} color={activeBorderColor} />
              }
            </View>
            <View style={styles.fileDetails}>
              <View style={styles.fileHeader}>
                <Text style={styles.fileName} numberOfLines={1}>{document.name}</Text>
                <View style={styles.fileStatusBadge}>
                  <Feather name="check-circle" size={10} color={colors.status.success} />
                  <Text style={styles.fileStatusText}>Chargé</Text>
                </View>
              </View>
              <Text style={styles.fileSize}>{fmt(document.size)}</Text>
              {document.serverPath && (
                <Text style={{ fontSize: 9, color: colors.neutral.gray500, marginTop: 2 }}>✓ Sauvegardé</Text>
              )}
            </View>
          </View>
          {!disabled && (
            <TouchableOpacity onPress={() => onRemove(type)} style={styles.removeButton}>
              <Feather name="x" size={20} color={colors.neutral.gray500} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[
          styles.uploadBoxContainer,
          { borderColor: activeBorderColor + '80' },
          disabled && styles.uploadBoxDisabled,
        ]}>
          {disabled ? (
            <View style={styles.disabledOverlay}>
              <Text style={styles.disabledText}>🚫 Ajout de document désactivé</Text>
              <Text style={styles.disabledSubText}>Nombre maximal de tentatives atteint</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => onCamera(type)}
                style={[styles.uploadActionBtn, { backgroundColor: borderColor }]}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={20} color="#fff" />
                <Text style={styles.uploadActionBtnText}>Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onGallery(type)}
                style={[styles.uploadActionBtnSecondary, { borderColor }]}
                activeOpacity={0.8}
              >
                <Feather name="image" size={20} color={borderColor} />
                <Text style={[styles.uploadActionBtnSecondaryText, { color: borderColor }]}>Depuis la galerie</Text>
              </TouchableOpacity>
              <Text style={styles.uploadHint}>
                Cadre adapté au format {type === 'passport' ? 'passeport (125×88mm)' : 'CIN (85.6×54mm)'}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

// ── ProgressBar ───────────────────────────────────────────────
const ProgressBar: React.FC<{ count: number; total: number }> = ({ count, total }) => (
  <View style={styles.progressSection}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { flex: count / total }]} />
    </View>
    <View style={styles.progressLabels}>
      <Text style={styles.progressLabel}>{count === total ? 'Complète' : 'En cours'}</Text>
      <Text style={styles.progressCount}>{count} sur {total}</Text>
    </View>
  </View>
);

// ── Composant principal ───────────────────────────────────────
const DocumentsJustificatifsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId } = route.params;
  const formData: OcrFormData = route.params?.formData ? (route.params.formData as OcrFormData) : { lastNameArabic: undefined, firstNameArabic: undefined };

  // ── Documents ────────────────────────────────────────────
  const [cinRectoDocument, setCinRectoDocument] = useState<UploadedDocument | null>(null);
  const [cinVersoDocument, setCinVersoDocument] = useState<UploadedDocument | null>(null);
  const [passportDocument, setPassportDocument] = useState<UploadedDocument | null>(null);
  const [usePassport, setUsePassport]           = useState(false);
  const [uploadingDoc, setUploadingDoc]         = useState<UploadType | null>(null);

  // ── États UI ─────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);

  // ── OCR ──────────────────────────────────────────────────
  const { ocrState, attempts, maxAttempts, isBlocked, scanFile, resetOcr } = useOcrScan();
  const [ocrResults, setOcrResults] = useState<Record<string, OcrScanResult | null>>({
    cinRecto: null,
    passport: null,
  });

  // ── Permissions au montage ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cam.status !== 'granted' || lib.status !== 'granted') {
          Alert.alert(
            'Permissions nécessaires',
            "ATB DigiPack a besoin d'accéder à votre caméra et vos photos pour scanner vos documents d'identité.\n\nAllez dans Réglages > Expo Go pour les activer.",
            [{ text: 'Compris' }]
          );
        }
      } catch (err) {
        console.warn('[Permissions]', err);
      }
    })();
  }, []);

  // ✅ NOUVELLE FONCTION : Upload réel vers le backend
  const uploadFileToServer = async (
    type: UploadType,
    uri: string,
    fileName: string
  ): Promise<string | null> => {
    try {
      setUploadingDoc(type);
      console.log(`[Upload] Début upload ${type} vers serveur...`);
      
      const serverPath = await uploadDocument(customerId, type, uri, fileName);
      
      console.log(`[Upload] ✅ Succès ${type} → ${serverPath}`);
      return serverPath;
    } catch (err: any) {
      console.error(`[Upload] ❌ Erreur ${type}:`, err);
      Alert.alert('Erreur', `Impossible d'uploader le document: ${err.message}`);
      return null;
    } finally {
      setUploadingDoc(null);
    }
  };

  // ✅ NOUVELLE FONCTION : Traitement complet (compression + upload + OCR + BDD)
  const processAndUpload = useCallback(async (type: UploadType, rawUri: string) => {
    // 1. Compression
    const compressed = await compressImage(rawUri);
    const uri = compressed?.uri ?? rawUri;
    const fileSize = compressed?.fileSize ?? 0;
    const fileName = `atb_${type}_${Date.now()}.jpg`;

    // 2. Upload vers le serveur (obtient le chemin serveur)
    const serverPath = await uploadFileToServer(type, uri, fileName);
    if (!serverPath) return;

    // 3. Mise à jour locale
    const doc: UploadedDocument = {
      name: fileName,
      size: fileSize,
      type: 'image/jpeg',
      uri: uri,
      serverPath: serverPath,
    };
    
    if (type === 'cinRecto') setCinRectoDocument(doc);
    else if (type === 'cinVerso') setCinVersoDocument(doc);
    else setPassportDocument(doc);

    // 4. Sauvegarde silencieuse dans la BDD (met à jour les chemins)
    try {
      await saveDocuments(customerId, {
        usePassport,
        idCardFrontPath: type === 'cinRecto' ? serverPath : (cinRectoDocument?.serverPath ?? null),
        idCardBackPath:  type === 'cinVerso' ? serverPath : (cinVersoDocument?.serverPath ?? null),
        passportPath:    type === 'passport' ? serverPath : (passportDocument?.serverPath ?? null),
      });
      console.log(`[AutoSave] ✅ ${type} sauvegardé en BDD`);
    } catch (err) {
      console.warn(`[AutoSave] ⚠️ ${type}`, err);
    }

    // 5. Lancer OCR (sauf pour verso)
    if (type !== 'cinVerso') {
      await triggerOcr(type, uri, fileName);
    }
  }, [customerId, usePassport, cinRectoDocument, cinVersoDocument, passportDocument]);

  // ── canContinue ───────────────────────────────────────────
  const canContinue = (): boolean => {
    if (usePassport) {
      if (!passportDocument || !passportDocument.serverPath) return false;
      const r = ocrResults.passport;
      if (!r) return false;
      return r.matchStatus === 'MATCH' || (r.matchStatus === 'PARTIAL' && r.canProceed === true);
    }
    if (!cinRectoDocument?.serverPath || !cinVersoDocument?.serverPath) return false;
    const r = ocrResults.cinRecto;
    if (!r) return false;
    return r.matchStatus === 'MATCH' || (r.matchStatus === 'PARTIAL' && r.canProceed === true);
  };

  // ── OCR ───────────────────────────────────────────────────
  const triggerOcr = async (type: UploadType, uri: string, name: string) => {
    if (type === 'cinVerso') return;

    const key: OcrDocKey = type === 'passport' ? 'passport' : 'cinRecto';

    if (isBlocked(key)) {
      Alert.alert(
        '🚫 Vérification bloquée',
        'Vous avez dépassé le nombre maximal de tentatives pour ce document.\n\nVotre dossier a été signalé pour vérification manuelle.\n\nContactez-nous au 71 143 000.',
        [{ text: 'Compris' }]
      );
      return;
    }

    const result = await scanFile({
      uri, name, mimeType: 'image/jpeg',
      docType: UPLOAD_TO_OCR[type],
      formData, customerId,
    });

    if (result) {
      const resultKey = type === 'passport' ? 'passport' : 'cinRecto';
      setOcrResults(prev => ({ ...prev, [resultKey]: result }));

      const currentAttemptCount = attempts[key] + 1;
      const isValid = result.matchStatus === 'MATCH' ||
        (result.matchStatus === 'PARTIAL' && result.canProceed === true);

      if (currentAttemptCount >= maxAttempts && !isValid) {
        setTimeout(() => {
          Alert.alert(
            '🚫 Dossier signalé',
            "Vous avez atteint le nombre maximal de tentatives de vérification d'identité.\n\nVotre dossier a été signalé et sera examiné par notre équipe de conformité sous 24 à 48 heures.\n\nPour toute question : 71 143 000.",
            [{ text: 'Compris' }]
          );
        }, 700);
      }
    }
  };

  // ── Caméra ────────────────────────────────────────────────
  const openCamera = async (type: UploadType) => {
    const key: OcrDocKey = type === 'passport' ? 'passport' : 'cinRecto';
    if (type !== 'cinVerso' && isBlocked(key)) {
      Alert.alert('Vérification bloquée', 'Nombre maximal de tentatives atteint pour ce document.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Caméra non autorisée', "Allez dans Réglages > Expo Go > Caméra et activez l'accès.", [{ text: 'Compris' }]);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes:    ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect:        DOC_ASPECT[type],
        quality:       0.92,
        exif:          false,
      });
      if (result.canceled || !result.assets?.length) return;
      await processAndUpload(type, result.assets[0].uri);
    } catch (err: any) {
      console.error('[Camera]', err);
      Alert.alert('Erreur', 'Impossible de prendre la photo. Réessayez.');
    }
  };

  // ── Galerie ────────────────────────────────────────────────
  const openGallery = async (type: UploadType) => {
    const key: OcrDocKey = type === 'passport' ? 'passport' : 'cinRecto';
    if (type !== 'cinVerso' && isBlocked(key)) {
      Alert.alert('Vérification bloquée', 'Nombre maximal de tentatives atteint pour ce document.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Galerie non autorisée', "Allez dans Réglages > Expo Go > Photos et activez l'accès.", [{ text: 'Compris' }]);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:     ImagePicker.MediaTypeOptions.Images,
        allowsEditing:  true,
        aspect:         DOC_ASPECT[type],
        quality:        0.92,
        selectionLimit: 1,
        exif:           false,
      });
      if (result.canceled || !result.assets?.length) return;
      await processAndUpload(type, result.assets[0].uri);
    } catch (err: any) {
      console.error('[Gallery]', err);
      Alert.alert('Erreur', "Impossible d'accéder à la galerie. Réessayez.");
    }
  };

  // ── Suppression document ──────────────────────────────────
  const removeDocument = (type: UploadType) => {
    if (type === 'cinRecto') {
      setCinRectoDocument(null);
      setOcrResults(p => ({ ...p, cinRecto: null }));
    } else if (type === 'cinVerso') {
      setCinVersoDocument(null);
    } else {
      setPassportDocument(null);
      setOcrResults(p => ({ ...p, passport: null }));
    }
    resetOcr();
  };

  // ── Soumission finale ─────────────────────────────────────
  const handleContinue = async () => {
    if (!canContinue()) {
      Alert.alert('Documents manquants', usePassport
        ? 'Ajoutez votre passeport et attendez la vérification.'
        : 'Ajoutez les deux faces de votre CIN et attendez la vérification.');
      return;
    }
    setIsLoading(true);
    try {
      // Sauvegarde finale avec les chemins serveur
      await saveDocuments(customerId, {
        usePassport,
        idCardFrontPath: cinRectoDocument?.serverPath ?? null,
        idCardBackPath:  cinVersoDocument?.serverPath ?? null,
        passportPath:    passportDocument?.serverPath ?? null,
      });
      navigation.navigate('Personaldataform', { customerId });
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />
      <View style={styles.flex}>
        <Header />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>

              {/* Titre */}
              <View style={styles.titleSection}>
                <Text style={styles.title}>Documents d'identité</Text>
                <Text style={styles.subtitle}>Veuillez fournir une pièce d'identité valide.</Text>
                <View style={styles.phaseIndicatorWrapper}>
                  <PhaseIndicator currentPhase={2} />
                </View>
              </View>

              {/* Intro */}
              <View style={[styles.card, styles.introCard]}>
                <View style={styles.introHeader}>
                  <LinearGradient colors={[colors.atb.red, '#C41E3A']} style={styles.introIconContainer}>
                    <MaterialIcons name="verified-user" size={20} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.introTitle}>Vérification d'identité</Text>
                    <Text style={styles.introSubtitle}>Conformité réglementaire</Text>
                  </View>
                </View>
                <Text style={styles.introText}>
                  Pour finaliser votre inscription, nous avons besoin de vérifier votre identité.
                  Cette étape est obligatoire pour se conformer aux réglementations bancaires.
                </Text>
              </View>

              {/* Section document */}
              <View style={styles.card}>
                <View style={styles.documentSection}>
                  <View style={styles.sectionHeader}>
                    <LinearGradient
                      colors={usePassport
                        ? [colors.neutral.gray600, colors.neutral.gray700]
                        : [colors.atb.red, '#C41E3A']
                      }
                      style={styles.sectionNumber}
                    >
                      <Text style={styles.sectionNumberText}>1</Text>
                    </LinearGradient>
                    <Text style={styles.sectionTitle}>
                      {usePassport ? 'Passeport' : "Carte d'Identité Nationale"}
                    </Text>
                  </View>

                  <View style={styles.reservedNotice}>
                    <Text style={styles.reservedText}>
                      {usePassport
                        ? "Photographiez la page principale de votre passeport (page avec votre photo)."
                        : "Photographiez les deux côtés de votre Carte Nationale d'Identité."}
                    </Text>
                    <Text style={styles.instructionText}>
                      Le cadre de recadrage s'adapte automatiquement au format exact du document.
                    </Text>
                  </View>

                  {!usePassport ? (
                    <>
                      {!cinRectoDocument && <DocumentScanGuide docType="cin" />}
                      <UploadBox
                        type="cinRecto"
                        label="Face avant (Recto)"
                        document={cinRectoDocument}
                        borderColor={colors.atb.red}
                        disabled={isBlocked('cinRecto')}
                        onCamera={openCamera}
                        onGallery={openGallery}
                        onRemove={removeDocument}
                      />
                      <OcrResultBadge
                        isScanning={ocrState.isScanning && ocrState.currentScanType === 'CIN_RECTO'}
                        result={ocrResults.cinRecto}
                        attemptCount={attempts.cinRecto}
                        maxAttempts={maxAttempts}
                      />

                      <View style={styles.separator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>+ Face arrière</Text>
                        <View style={styles.separatorLine} />
                      </View>

                      <UploadBox
                        type="cinVerso"
                        label="Face arrière (Verso)"
                        document={cinVersoDocument}
                        borderColor={colors.atb.red}
                        onCamera={openCamera}
                        onGallery={openGallery}
                        onRemove={removeDocument}
                      />
                      <ProgressBar
                        count={(cinRectoDocument ? 1 : 0) + (cinVersoDocument ? 1 : 0)}
                        total={2}
                      />
                    </>
                  ) : (
                    <>
                      {!passportDocument && <DocumentScanGuide docType="passport" />}
                      <UploadBox
                        type="passport"
                        label="Page principale du passeport"
                        document={passportDocument}
                        borderColor={colors.neutral.gray600}
                        disabled={isBlocked('passport')}
                        onCamera={openCamera}
                        onGallery={openGallery}
                        onRemove={removeDocument}
                      />
                      <OcrResultBadge
                        isScanning={ocrState.isScanning && ocrState.currentScanType === 'PASSPORT'}
                        result={ocrResults.passport}
                        attemptCount={attempts.passport}
                        maxAttempts={maxAttempts}
                      />
                    </>
                  )}

                  {/* Toggle CIN / Passeport */}
                  <TouchableOpacity
                    style={styles.alternativeOption}
                    onPress={() => setUsePassport(p => !p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.alternativeIcon}>
                      <Ionicons name="swap-horizontal" size={20} color={colors.neutral.gray600} />
                    </View>
                    <View style={styles.alternativeContent}>
                      <Text style={styles.alternativeTitle}>
                        {usePassport ? 'Utiliser une CIN' : 'Utiliser un passeport'}
                      </Text>
                      <Text style={styles.alternativeSubtitle}>
                        Vos photos déjà ajoutées restent enregistrées
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.neutral.gray400} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Boutons navigation */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    navigation.navigate('FATCA', { customerId, fromRecap: false });
                  }}
                >
                  <Feather name="arrow-left" size={18} color={colors.neutral.gray700} />
                  <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.continueButton, !canContinue() && styles.continueButtonDisabled]}
                  onPress={handleContinue}
                  disabled={!canContinue() || isLoading || uploadingDoc !== null}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={canContinue() && uploadingDoc === null
                      ? [colors.atb.red, '#C41E3A']
                      : [colors.neutral.gray300, colors.neutral.gray400]
                    }
                    style={styles.continueGradient}
                  >
                    {isLoading || uploadingDoc
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Text style={styles.continueButtonText}>Vérifier et continuer</Text>
                          <Feather name="arrow-right" size={18} color="#fff" />
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Footer />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

// Styles (inchangés, identiques à ceux du code original)
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.neutral.white },
  flex:          { flex: 1 },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray300, backgroundColor: colors.neutral.gray100 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  logo:          { width: 40, height: 40 },
  logoGradient:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bankName:      { fontSize: 16, fontWeight: '700', color: colors.atb.red, letterSpacing: 0.3 },
  bankSubtitle:  { fontSize: 11, color: colors.neutral.gray500, marginTop: 2 },
  digipackBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  digipackText:  { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 2 },

  scrollContent: { flexGrow: 1 },
  content:       { padding: 24 },

  phaseIndicatorWrapper:  { marginTop: 5 },
  phaseContainer:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8 },
  phaseItem:              { alignItems: 'center', flex: 1 },
  phaseRadioOuter:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.neutral.gray400, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  phaseRadioInner:        { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  phaseRadioInnerActive:  { backgroundColor: colors.atb.red },
  phaseRadioActive:       { borderColor: colors.atb.red },
  phaseRadioCompleted:    { borderColor: colors.atb.red, backgroundColor: colors.atb.red },
  phaseRadioCheck:        { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  phaseLabel:             { fontSize: 10, color: colors.neutral.gray600, fontWeight: '500', textAlign: 'center' },
  phaseLabelActive:       { color: colors.atb.red, fontWeight: '700' },
  phaseLabelCompleted:    { color: colors.neutral.gray800, fontWeight: '600' },
  phaseConnector:         { width: 20, height: 2, backgroundColor: colors.neutral.gray300, alignSelf: 'center', marginTop: -10 },

  titleSection: { marginBottom: 12 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 6, letterSpacing: -0.3 },
  subtitle:     { fontSize: 13, color: colors.neutral.gray600, lineHeight: 19, marginBottom: 8 },

  card:      { backgroundColor: colors.neutral.white, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  introCard: { padding: 20, marginBottom: 12 },

  introHeader:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  introIconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  introTitle:         { fontSize: 16, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 2 },
  introSubtitle:      { fontSize: 12, color: colors.neutral.gray500 },
  introText:          { fontSize: 13, color: colors.neutral.gray700, lineHeight: 20 },

  documentSection:   { padding: 20 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionNumber:     { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sectionNumberText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sectionTitle:      { fontSize: 18, fontWeight: '700', color: colors.neutral.gray900 },

  reservedNotice:  { marginBottom: 16, backgroundColor: colors.neutral.offWhite, padding: 16, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.atb.red },
  reservedText:    { fontSize: 14, color: colors.neutral.gray800, fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  instructionText: { fontSize: 12, color: colors.neutral.gray600, lineHeight: 18 },

  separator:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.neutral.gray200 },
  separatorText: { fontSize: 11, fontWeight: '600', color: colors.neutral.gray400 },

  uploadContainer:             { marginBottom: 12 },
  uploadHeader:                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  uploadLabel:                 { fontSize: 15, color: colors.neutral.gray800, fontWeight: '600' },
  requiredIndicator:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requiredStar:                { color: colors.atb.red, fontSize: 16, fontWeight: 'bold' },
  requiredText:                { fontSize: 12, color: colors.neutral.gray500 },
  uploadHint:                  { fontSize: 12, color: colors.neutral.gray400, textAlign: 'center', lineHeight: 17, marginTop: 8 },
  uploadBoxContainer:          { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 16, backgroundColor: colors.neutral.offWhite, gap: 10 },
  uploadBoxDisabled:           { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  disabledOverlay:             { alignItems: 'center', paddingVertical: 20, gap: 6 },
  disabledText:                { fontSize: 14, fontWeight: '700', color: '#6d28d9' },
  disabledSubText:             { fontSize: 12, color: '#7c3aed' },
  uploadActionBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20 },
  uploadActionBtnText:         { fontSize: 15, fontWeight: '700', color: '#fff' },
  uploadActionBtnSecondary:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1.5, backgroundColor: colors.neutral.white },
  uploadActionBtnSecondaryText:{ fontSize: 14, fontWeight: '600' },

  uploadedFileCard:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.neutral.offWhite, borderWidth: 1.5, borderRadius: 10, padding: 16 },
  fileInfo:          { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileIconContainer: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.neutral.white, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: colors.neutral.gray200 },
  fileThumb:         { width: 40, height: 40, borderRadius: 6 },
  fileDetails:       { flex: 1 },
  fileHeader:        { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fileName:          { fontSize: 14, fontWeight: '600', color: colors.neutral.gray900, flex: 1, marginRight: 8 },
  fileStatusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.status.success + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  fileStatusText:    { fontSize: 10, fontWeight: '600', color: colors.status.success },
  fileSize:          { fontSize: 12, color: colors.neutral.gray600 },
  removeButton:      { padding: 4 },

  progressSection: { marginTop: 16, marginBottom: 20 },
  progressBar:     { height: 6, backgroundColor: colors.neutral.gray200, borderRadius: 3, marginBottom: 8, overflow: 'hidden', flexDirection: 'row' },
  progressFill:    { height: '100%', backgroundColor: colors.atb.red, borderRadius: 3 },
  progressLabels:  { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:   { fontSize: 13, color: colors.neutral.gray700, fontWeight: '600' },
  progressCount:   { fontSize: 12, color: colors.neutral.gray500 },

  alternativeOption:   { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: colors.neutral.gray300, borderRadius: 10, backgroundColor: colors.neutral.white, marginTop: 12 },
  alternativeIcon:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral.gray100, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  alternativeContent:  { flex: 1 },
  alternativeTitle:    { fontSize: 14, fontWeight: '600', color: colors.neutral.gray900, marginBottom: 2 },
  alternativeSubtitle: { fontSize: 12, color: colors.neutral.gray600 },

  buttonContainer:        { flexDirection: 'row', gap: 12, marginBottom: 32 },
  backButton:             { flex: 1, height: 52, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  backButtonText:         { fontSize: 14, fontWeight: '700', color: colors.neutral.gray700 },
  continueButton:         { flex: 1, borderRadius: 8, overflow: 'hidden', shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  continueButtonDisabled: { shadowColor: colors.neutral.gray400 },
  continueGradient:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingHorizontal: 24, gap: 8 },
  continueButtonText:     { fontSize: 14, fontWeight: '700', color: '#fff' },

  footer:          { alignItems: 'center', paddingTop: 20 },
  footerLegal:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  footerLegalText: { fontSize: 10, color: colors.neutral.gray400, fontWeight: '600', letterSpacing: 0.5 },
  footerDivider:   { fontSize: 10, color: colors.neutral.gray400 },
  footerText:      { fontSize: 11, color: colors.neutral.gray500, marginBottom: 4 },
  footerSubtext:   { fontSize: 10, color: colors.neutral.gray400 },
});

export default DocumentsJustificatifsScreen;