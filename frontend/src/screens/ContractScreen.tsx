
//  ✅ [E-HOUWIYA] Modifications apportées :
//  ─────────────────────────────────────────
//  1. Détection du flux E-Houwiya via identificationSource
//  2. Chargement du PDF via getContractPdfBase64() (JSON)
//     → fonctionne pour les deux flux (Manuel + E-Houwiya)
//  3. Bouton "Signer avec E-Houwiya" affiché si isEHouwiya
//     → Récupère le token depuis AsyncStorage
//     → Appelle signContractWithEHouwiya()
//     → Affiche le badge "Contrat signé" après succès
//  4. Bouton "Télécharger PDF" toujours présent pour les deux flux
//     → Manuel   : PDF non signé (à compléter en agence)
//     → E-Houwiya: PDF signé électroniquement
//  5. Badge de signature affiché si isContractSigned = true
//  6. Bouton "Quitter" inchangé
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, StatusBar, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { NavigationProp, RouteProp } from '../types/navigation';
import {
  getCustomer,
  getContractPdfBase64,
  signContractWithEHouwiya,
  getEHouwiyaSignatureStatus,
} from '../services/customerApi';
// ✅ [E-HOUWIYA] Clé AsyncStorage définie dans EHouwiyaScreen
import { EHOUWIYA_TOKEN_KEY } from './EHouwiyaScreen';

type Props = {
  navigation: NavigationProp<'ContractScreen'>;
  route:      RouteProp<'ContractScreen'>;
};

const BASE_URL = 'http://192.168.1.100:3000';

// ── Header ─────────────────────────────────────────────────
const Header: React.FC = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.logoGradient}>
        <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
      </LinearGradient>
      <View>
        <Text style={styles.bankName}>Arab Tunisian Bank</Text>
        <Text style={styles.bankSubtitle}>البنك العربي التونسي</Text>
      </View>
    </View>
    <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.digipackBadge}>
      <Text style={styles.digipackText}>DIGIPACK</Text>
    </LinearGradient>
  </View>
);

// ── PhaseIndicator ─────────────────────────────────────────
const PhaseIndicator: React.FC<{ isEHouwiya: boolean }> = ({ isEHouwiya }) => {
  const phases = [
    { id: 1, label: 'Données personnelles' },
    { id: 2, label: 'Documents justificatifs' },
    { id: 3, label: 'Résumé de la demande' },
    { id: 4, label: 'Envoi de la demande' },
    // ✅ [E-HOUWIYA] Phase 5 active si E-Houwiya
    { id: 5, label: 'Signature électronique' },
  ];
  // Phase courante : 4 (manuel) ou 5 (e-houwiya signant)
  const currentPhase = isEHouwiya ? 5 : 4;

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
            ]}>{phase.label}</Text>
          </View>
          {index < phases.length - 1 && <View style={styles.phaseConnector} />}
        </React.Fragment>
      ))}
    </View>
  );
};

// ── Composant principal ────────────────────────────────────
const ContractScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId } = route.params;

  const [pdfBase64,        setPdfBase64]        = useState<string | null>(null);
  const [isLoadingPdf,     setIsLoadingPdf]     = useState(true);
  const [loadError,        setLoadError]        = useState(false);
  const [hasRead,          setHasRead]          = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // ✅ [E-HOUWIYA] États liés à E-Houwiya
  const [isEHouwiya,       setIsEHouwiya]       = useState(false);
  const [isContractSigned, setIsContractSigned] = useState(false);
  const [signatureId,      setSignatureId]      = useState<string | null>(null);
  const [signedAt,         setSignedAt]         = useState<string | null>(null);
  const [isSigning,        setIsSigning]        = useState(false);

  const pdfDownloadUrl = `${BASE_URL}/customer/${customerId}/contract/pdf`;

  // ════════════════════════════════════════════════════════
  // ✅ [E-HOUWIYA] Chargement initial
  // 1. Récupérer les infos du customer pour détecter E-Houwiya
  // 2. Charger le PDF via getContractPdfBase64()
  // 3. Vérifier si le contrat est déjà signé
  // ════════════════════════════════════════════════════════
  useEffect(() => {
    loadContractData();
  }, [customerId]);

  const loadContractData = async () => {
    setIsLoadingPdf(true);
    setLoadError(false);
    setPdfBase64(null);

    try {
      // ── 1. Charger les infos du customer ─────────────
      const customer = await getCustomer(customerId);
      const ehouwiya = customer.identificationSource === 'E_HOUWIYA';
      setIsEHouwiya(ehouwiya);

      // ── 2. ✅ [E-HOUWIYA] Vérifier statut signature ──
      if (ehouwiya) {
  const status = await getEHouwiyaSignatureStatus(customerId);
  // status contient directement { isSigned, signatureId, signedAt, source, status }
  if (status.isSigned) {  // ✅
    setIsContractSigned(true);
    setSignatureId(status.signatureId);
    setSignedAt(status.signedAt);
    setHasRead(true);
  }
}

      // ── 3. Charger le PDF en base64 ──────────────────
      // ✅ [E-HOUWIYA] On utilise l'endpoint JSON base64
      // au lieu du fetch binaire pour les deux flux
      const pdfResponse = await getContractPdfBase64(customerId);
      setPdfBase64(pdfResponse.data.base64);

    } catch (err: any) {
      console.error('[ContractScreen] Erreur chargement:', err);
      setLoadError(true);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // HTML PDF.js identique à l'original
  const getPdfJsHtml = (base64: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #525659; overflow: hidden; }
    #pdf-container { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
    canvas { display: block; margin: 8px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.4); max-width: 100%; }
    #loading { color: white; text-align: center; padding: 40px; font-family: sans-serif; font-size: 14px; }
  </style>
</head>
<body>
  <div id="pdf-container"><div id="loading">Chargement du contrat...</div></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const base64 = '${base64}';
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
      document.getElementById('loading').remove();
      const container = document.getElementById('pdf-container');
      const totalPages = pdf.numPages;
      let pagesRendered = 0;
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        pdf.getPage(pageNum).then(function(page) {
          const viewport = page.getViewport({ scale: window.devicePixelRatio || 1.5 });
          const canvas   = document.createElement('canvas');
          canvas.width   = viewport.width; canvas.height = viewport.height;
          canvas.style.width = '100%'; canvas.style.height = 'auto';
          container.appendChild(canvas);
          page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function() {
            pagesRendered++;
            if (pagesRendered === totalPages && window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('PDF_LOADED');
            }
          });
        });
      }
    }).catch(function(err) {
      document.getElementById('loading').textContent = 'Erreur : ' + err.message;
    });
    document.getElementById('pdf-container').addEventListener('scroll', function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('PDF_SCROLLED');
    });
  </script>
</body>
</html>`;

  // ── Télécharger PDF ───────────────────────────────────
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const supported = await Linking.canOpenURL(pdfDownloadUrl);
      if (!supported) throw new Error("Impossible d'ouvrir ce lien.");
      await Linking.openURL(pdfDownloadUrl);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de télécharger.', [{ text: 'OK' }]);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // ✅ [E-HOUWIYA] Signer le contrat
  //
  // 1. Récupère le token depuis AsyncStorage
  // 2. Appelle signContractWithEHouwiya()
  // 3. Met à jour l'affichage avec le résultat
  // ════════════════════════════════════════════════════════
  const handleSignWithEHouwiya = async () => {
    if (!pdfBase64) {
      Alert.alert('Erreur', 'Le contrat n\'est pas encore chargé.');
      return;
    }

    // ── Récupérer le token E-Houwiya depuis AsyncStorage ─
    const token = await AsyncStorage.getItem(EHOUWIYA_TOKEN_KEY);
    if (!token) {
      Alert.alert(
        'Session expirée',
        'Votre token E-Houwiya est introuvable ou expiré.\nVeuillez recommencer depuis l\'accueil.',
        [{ text: 'OK', onPress: () => navigation.navigate('OnboardingHome') }],
      );
      return;
    }

    Alert.alert(
      'Signer le contrat',
      'Vous êtes sur le point de signer électroniquement votre contrat ATB via E-Houwiya (TunTrust).\n\nCette signature a la même valeur juridique qu\'une signature manuscrite.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signer maintenant',
          onPress: async () => {
            setIsSigning(true);
            try {
              const result = await signContractWithEHouwiya(
                customerId,
                pdfBase64,
                token,
              );

              if (result.success) {
                setIsContractSigned(true);
                setSignatureId(result.signatureId);
                setSignedAt(result.signedAt);

                // Nettoyer le token de AsyncStorage après signature
                await AsyncStorage.removeItem(EHOUWIYA_TOKEN_KEY);
                Alert.alert( 
                 '✓ Contrat signé avec succès !',
                  `Votre contrat a été signé électroniquement via E-Houwiya.\n\nID de signature : ${result.signatureId}\n\nVotre dossier est complet. Un conseiller ATB vous contactera sous 48h.`,
                  [{ text: 'OK' }],
                );
              }
            } catch (error: any) {
              Alert.alert(
                '✗ Erreur de signature',
                error.message || 'La signature E-Houwiya a échoué. Réessayez.',
                [{ text: 'OK' }],
              );
            } finally {
              setIsSigning(false);
            }
          },
        },
      ],
    );
  };

  // ── Messages WebView ──────────────────────────────────
  const handleWebViewMessage = (event: any) => {
    const msg = event.nativeEvent.data;
    if (msg === 'PDF_SCROLLED' || msg === 'PDF_LOADED') setHasRead(true);
  };

  // ── Quitter ───────────────────────────────────────────
  const handleQuit = () => {
    Alert.alert('Quitter', 'Voulez-vous vraiment quitter cette page ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => navigation.navigate('OnboardingHome') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />
      <Header />

      {/* Titre + Phase */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>Votre convention DIGIPACK</Text>
        <Text style={styles.subtitle}>
          {isEHouwiya
            ? 'Lisez votre contrat puis signez-le électroniquement via E-Houwiya.'
            : 'Lisez attentivement votre contrat avant de le télécharger.'}
        </Text>
        <PhaseIndicator isEHouwiya={isEHouwiya} />
      </View>

      {/* ✅ [E-HOUWIYA] Badge contrat signé */}
      {isContractSigned && (
        <View style={styles.signedBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#006042" />
          <View style={{ flex: 1 }}>
            <Text style={styles.signedBannerTitle}>Contrat signé électroniquement</Text>
            <Text style={styles.signedBannerText}>
              Via E-Houwiya · TunTrust · ID: {signatureId?.substring(0, 20)}...
            </Text>
          </View>
        </View>
      )}

      {/* Bandeau instruction */}
      {!isContractSigned && (
        <View style={styles.readBanner}>
          <Ionicons name="eye-outline" size={16} color={colors.atb.red} />
          <Text style={styles.readBannerText}>
            Faites défiler pour lire l'intégralité du contrat
            {isEHouwiya ? ' avant de signer' : ''}
          </Text>
        </View>
      )}

      {/* Zone contrat */}
      <View style={styles.webViewContainer}>
        {isLoadingPdf && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.atb.red} />
            <Text style={styles.centerText}>Préparation de votre contrat...</Text>
            <Text style={styles.centerSubText}>Cela peut prendre quelques secondes</Text>
          </View>
        )}

        {!isLoadingPdf && loadError && (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={52} color={colors.neutral.gray400} />
            <Text style={styles.errorTitle}>Impossible d'afficher le contrat</Text>
            <Text style={styles.errorText}>Vérifiez que le backend est démarré et réessayez.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadContractData}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoadingPdf && !loadError && pdfBase64 && (
          <WebView
            source={{ html: getPdfJsHtml(pdfBase64) }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled domStorageEnabled scrollEnabled
            originWhitelist={['*']}
          />
        )}
      </View>

      {/* Barre du bas */}
      <View style={styles.bottomBar}>

        {/* Hint scroll */}
        {!hasRead && !isLoadingPdf && !loadError && (
          <View style={styles.scrollHint}>
            <Ionicons name="arrow-down-outline" size={13} color={colors.neutral.gray500} />
            <Text style={styles.scrollHintText}>
              Faites défiler le contrat pour activer les boutons
            </Text>
          </View>
        )}

        <View style={styles.downloadRow}>

          {/* ✅ [E-HOUWIYA] Bouton "Signer avec E-Houwiya" */}
          {isEHouwiya && !isContractSigned && (
            <TouchableOpacity
              onPress={handleSignWithEHouwiya}
              style={styles.signButton}
              disabled={isSigning || !hasRead}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={hasRead && !isSigning
                  ? ['#059669', '#047857']
                  : ['#9ca3af', '#6b7280']
                }
                style={styles.signButtonGradient}
              >
                {isSigning ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.signButtonText}>Signature en cours...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-account" size={18} color="#fff" />
                    <Text style={styles.signButtonText}>Signer </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ✅ [E-HOUWIYA] Si déjà signé → bouton vert "Signé" */}
          {isEHouwiya && isContractSigned && (
            <View style={styles.signedButton}>
              <Ionicons name="checkmark-circle" size={18} color="#037a54" />
              <Text style={styles.signedButtonText}>Contrat signé ✓</Text>
            </View>
          )}

          {/* Bouton Télécharger PDF — présent pour les deux flux */}
          <TouchableOpacity
            onPress={handleDownloadPdf}
            style={[styles.downloadBtnPdf, isEHouwiya && { flex: 0.6 }]}
            disabled={isDownloadingPdf || !hasRead}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={hasRead ? [colors.atb.red, '#C41E3A'] : ['#ccc', '#aaa']}
              style={styles.downloadBtnGradient}
            >
              {isDownloadingPdf
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="document-outline" size={18} color="#fff" />
                    <Text style={styles.downloadBtnText}>
                      {isEHouwiya ? 'PDF' : 'Télécharger PDF'}
                    </Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Bouton Quitter */}
          <TouchableOpacity onPress={handleQuit} style={styles.quitButton} activeOpacity={0.85}>
            <View style={styles.quitButtonContent}>
              <Ionicons name="exit-outline" size={18} color={colors.atb.red} />
              <Text style={styles.quitButtonText}>Quitter</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* ✅ [E-HOUWIYA] Info flux manuel */}
        {!isEHouwiya && (
          <View style={styles.manualInfo}>
            <Ionicons name="information-circle-outline" size={13} color={colors.neutral.gray400} />
            <Text style={styles.manualInfoText}>
              Téléchargez et apportez ce contrat en agence pour finaliser l'ouverture de compte.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray300, backgroundColor: colors.neutral.gray100 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo:         { width: 38, height: 38 },
  logoGradient: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bankName:     { fontSize: 15, fontWeight: '700', color: colors.atb.red },
  bankSubtitle: { fontSize: 10, color: colors.neutral.gray500, marginTop: 2 },
  digipackBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  digipackText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 2 },

  titleSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  title:        { fontSize: 20, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 4 },
  subtitle:     { fontSize: 12, color: colors.neutral.gray600, marginBottom: 10 },

  phaseContainer:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 4 },
  phaseItem:            { alignItems: 'center', flex: 1 },
  phaseRadioOuter:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.neutral.gray400, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  phaseRadioInner:      { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  phaseRadioInnerActive:{ backgroundColor: colors.atb.red },
  phaseRadioActive:     { borderColor: colors.atb.red },
  phaseRadioCompleted:  { borderColor: colors.atb.red, backgroundColor: colors.atb.red },
  phaseRadioCheck:      { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  phaseLabel:           { fontSize: 9, color: colors.neutral.gray600, fontWeight: '500', textAlign: 'center' },
  phaseLabelActive:     { color: colors.atb.red, fontWeight: '700' },
  phaseLabelCompleted:  { color: colors.neutral.gray800, fontWeight: '600' },
  phaseConnector:       { width: 16, height: 2, backgroundColor: colors.neutral.gray300, alignSelf: 'center', marginTop: -8 },

  // ✅ [E-HOUWIYA] Bannière contrat signé
  signedBanner:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(5,150,105,0.08)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(5,150,105,0.2)' },
  signedBannerTitle: { fontSize: 13, fontWeight: '700', color: '#059669', marginBottom: 2 },
  signedBannerText:  { fontSize: 11, color: '#047857' },

  readBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(200,35,51,0.05)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(200,35,51,0.15)' },
  readBannerText: { flex: 1, fontSize: 12, color: colors.atb.red, fontWeight: '600' },

  webViewContainer: { flex: 1 },
  webView:          { flex: 1 },
  centerBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
  centerText:    { fontSize: 15, fontWeight: '600', color: colors.neutral.gray700 },
  centerSubText: { fontSize: 12, color: colors.neutral.gray500 },
  errorTitle:    { fontSize: 16, fontWeight: '700', color: colors.neutral.gray800 },
  errorText:     { fontSize: 13, color: colors.neutral.gray600, textAlign: 'center', lineHeight: 19 },
  retryButton:   { marginTop: 4, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: colors.atb.red, borderRadius: 8 },
  retryText:     { fontSize: 14, fontWeight: '700', color: '#fff' },

  bottomBar:      { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.neutral.gray200, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  scrollHint:     { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 8 },
  scrollHintText: { fontSize: 11, color: colors.neutral.gray500 },
  downloadRow:    { flexDirection: 'row', gap: 8 },

  // ✅ [E-HOUWIYA] Bouton signature
  signButton:         { flex: 1, borderRadius: 10, overflow: 'hidden' },
  signButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  signButtonText:     { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ✅ [E-HOUWIYA] Bouton déjà signé
  signedButton:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.05)' },
  signedButtonText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  downloadBtnPdf:     { flex: 1, borderRadius: 10, overflow: 'hidden' },
  downloadBtnGradient:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  downloadBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  quitButton:        { borderRadius: 10, borderWidth: 2, borderColor: colors.atb.red, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  quitButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  quitButtonText:    { fontSize: 13, fontWeight: '700', color: colors.atb.red },

  // ✅ [E-HOUWIYA] Info flux manuel
  manualInfo:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
  manualInfoText: { flex: 1, fontSize: 11, color: colors.neutral.gray400, lineHeight: 16 },
});

export default ContractScreen;