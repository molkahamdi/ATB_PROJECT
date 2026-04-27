
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
  Dimensions, Image, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import OtpInput           from '../components/common/OtpInput';
import colors             from '../../constants/colors';
import { NavigationProp, RouteProp } from '../types/navigation';
import {
  requestOtp, verifyOtp,
  requestEmailOtp, verifyEmailOtp,
} from '../services/customerApi';

type Props = {
  navigation: NavigationProp<'OtpVerification'>;
  route:      RouteProp<'OtpVerification'>;
};

const { width } = Dimensions.get('window');
const isSmall   = width < 375;
const s         = (n: number, sm: number) => (isSmall ? sm : n);

// ── Header ────────────────────────────────────────────────────
const Header: React.FC = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <LinearGradient colors={[colors.atb.red, '#C41E3A']} style={styles.logoGradient}>
        <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
      </LinearGradient>
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

// ── PhaseIndicator ────────────────────────────────────────────
const PhaseIndicator: React.FC = () => {
  const phases = [
    'Données personnelles',
    'Documents justificatifs',
    'Résumé de la demande',
    'Envoi de la demande',
    'Signature électronique',
  ];
  return (
    <View style={styles.phaseContainer}>
      {phases.map((label, index) => (
        <React.Fragment key={index}>
          <View style={styles.phaseItem}>
            <View style={[
              styles.phaseRadioOuter,
              index === 0 && styles.phaseRadioActive,
            ]}>
              <View style={[
                styles.phaseRadioInner,
                index === 0 && styles.phaseRadioInnerActive,
              ]} />
            </View>
            <Text style={[styles.phaseLabel, index === 0 && styles.phaseLabelActive]}>
              {label}
            </Text>
          </View>
          {index < phases.length - 1 && <View style={styles.phaseConnector} />}
        </React.Fragment>
      ))}
    </View>
  );
};

// ── Footer ────────────────────────────────────────────────────
const Footer: React.FC = () => (
  <View style={styles.footer}>
    <View style={styles.footerDivider} />
    <Text style={styles.footerText}>© 2026 Arab Tunisian Bank · Tous droits réservés</Text>
    <Text style={styles.footerSubtext}>Service client : 71 143 000</Text>
  </View>
);

// ── Écran principal ───────────────────────────────────────────
const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId } = route.params;
  const mode           = (route.params as any)?.mode ?? 'sms';
  const formData       = route.params?.formData;
  const firstName      = formData?.firstName ?? '';
  const isSms          = mode === 'sms';

  // ✅ OTP commence toujours vide — jamais partagé entre pages
  const [otp,       setOtp]       = useState('');
  const [timer,     setTimer]     = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const [codeSent,  setCodeSent]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = {
    title:       isSms
      ? 'Vérification du numéro de téléphone'
      : "Vérification de l'adresse Email",
    subtitle:    isSms
      ? 'Saisissez le code reçu par SMS sur votre téléphone.'
      : 'Saisissez le code envoyé à votre adresse email.',
    sectionDesc: isSms
      ? 'Code affiché dans la fenêtre pop-up'
      : 'Consultez votre boîte de réception',
    resendLabel: isSms ? 'Générer un nouveau code' : "Renvoyer l'email",
    actionLabel: isSms ? 'Continuer' : 'Valider',
  };

  // ── Timer ────────────────────────────────────────────────
  const startTimer = () => {
    setTimer(30);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Envoi SMS ────────────────────────────────────────────
  const sendSmsOtp = async (isResend = false) => {
    setIsSending(true);
    setCodeSent(false);
    try {
      const res  = await requestOtp(customerId);
      const code = res.devOnly_otp ?? '------';
      setCodeSent(true);
      Alert.alert(
        isResend ? '🔄 Nouveau code généré' : 'Code de vérification',
        `Votre code OTP est :\n\n${code}\n\nValide 10 minutes.`,
        [{ text: "OK, j'ai compris" }],
        { cancelable: false },
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le code. Réessayez.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Envoi Email ──────────────────────────────────────────
  // ✅ Appelé automatiquement au montage de la page email
  const sendEmailOtp = async (isResend = false) => {
    setIsSending(true);
    setCodeSent(false);
    try {
      await requestEmailOtp(customerId, firstName);
      setCodeSent(true);
      if (isResend) {
        Alert.alert(
          '📧 Email renvoyé',
          'Un nouveau code a été envoyé.\nVérifiez votre boîte de réception.',
          [{ text: 'OK' }],
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'envoyer l'email.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Init au montage ──────────────────────────────────────
  // ✅ Chaque page est indépendante — OTP vide, envoi automatique
 useEffect(() => {
  setOtp('');
  if (isSms) {
    sendSmsOtp(false);
    startTimer();
  } else {
    // ✅ Email déjà envoyé depuis handleContinue SMS
    // On affiche juste "envoyé" sans renvoyer
    setIsSending(false);
    setCodeSent(true);
    startTimer();
  }
}, []);
  // ── Renvoyer ─────────────────────────────────────────────
  const handleResend = async () => {
    setOtp('');
    if (isSms) await sendSmsOtp(true);
    else        await sendEmailOtp(true);
    startTimer();
  };

  // ── Continuer / Valider ──────────────────────────────────
 const handleContinue = async () => {
  if (otp.length !== 6) {
    Alert.alert('Erreur', 'Veuillez entrer les 6 chiffres du code.');
    return;
  }
  setIsLoading(true);
  try {
    if (isSms) {
      await verifyOtp(customerId, otp);
      // ✅ Envoyer l'email ICI avant de naviguer — garanti !
      await requestEmailOtp(customerId, firstName);
      // @ts-ignore
      navigation.navigate('OtpVerification', { customerId, formData, mode: 'email' });
    } else {
      await verifyEmailOtp(customerId, otp);
      // @ts-ignore
      navigation.navigate('FATCA', { customerId, formData });
    }
  } catch (error: any) {
    Alert.alert(
      isSms ? '❌ Code SMS invalide' : '❌ Code Email invalide',
      error.message || 'Le code saisi est incorrect. Réessayez.',
    );
    setOtp('');
  } finally {
    setIsLoading(false);
  }
};

  // ── Retour ───────────────────────────────────────────────
  const handleBack = () => {
  if (isSms) {
    // @ts-ignore
    navigation.navigate('OnboardingPersonalData', {
      customerId,
      // ✅ isEHouwiya transmis pour maintenir le mode verrouillé si applicable
      isEHouwiya:  (route.params as any)?.isEHouwiya  ?? false,
      eHouwiyaData: (route.params as any)?.eHouwiyaData ?? null,
      prefillData: {
        // ── Noms latin ──────────────────────────────────────
        // Dans otpFormData : lastNameLatin = nom français, firstNameLatin = prénom français
        lastNameLatin:   formData?.lastNameLatin  ?? formData?.lastName  ?? '',
        firstNameLatin:  formData?.firstNameLatin ?? formData?.firstName ?? '',
        // ── Noms arabes ──────────────────────────────────────
        // Dans otpFormData : lastName = arabe, firstName = arabe
        lastName:        formData?.lastName  ?? '',
        firstName:       formData?.firstName ?? '',
        lastNameArabic:  formData?.lastNameArabic ?? '',
        firstNameArabic: formData?.firstNameArabic ?? '',
        // ── Identité ─────────────────────────────────────────
        idCardNumber:    formData?.idCardNumber  ?? '',
        birthDate:       formData?.birthDate     ?? '',
        idIssueDate:     formData?.idIssueDate   ?? '',    // ✅ AJOUTÉ
        gender:          formData?.gender        ?? '',    // ✅ AJOUTÉ
        nationality:     formData?.nationality   ?? 'Tunisie', // ✅ AJOUTÉ
        birthPlace:      formData?.birthPlace    ?? 'Tunis',   // ✅ AJOUTÉ
        countryOfBirth:     formData?.countryOfBirth     ?? 'Tunisie', // ✅ AJOUTÉ
        countryOfResidence: formData?.countryOfResidence ?? 'Tunisie', // ✅ AJOUTÉ
        // ── Contact ──────────────────────────────────────────
        email:           formData?.email       ?? '',
        phoneNumber:     formData?.phoneNumber ?? '',      // ✅ AJOUTÉ
      },
    });
  } else {
    // @ts-ignore
    navigation.navigate('OtpVerification', { customerId, formData, mode: 'sms' });
  }
};

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />
      <Header />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>

            {/* ── Titre ── */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
              <View style={{ marginTop: 10 }}>
                <PhaseIndicator />
              </View>
            </View>

            {/* ── Carte OTP ── */}
            <View style={styles.card}>

              {/* En-tête section */}
              <View style={styles.sectionHeader}>
                <LinearGradient colors={[colors.atb.red, '#C41E3A']} style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{isSms ? '1' : '2'}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Code de vérification</Text>
                  <Text style={styles.sectionDesc}>{config.sectionDesc}</Text>
                </View>
              </View>

              {/* Statut envoi */}
              <View style={styles.statusRow}>
                {isSending ? (
                  <>
                    <ActivityIndicator color={colors.neutral.gray400} size="small" />
                    <Text style={styles.statusText}>
                      {isSms ? 'Génération du code...' : "Envoi de l'email en cours..."}
                    </Text>
                  </>
                ) : codeSent ? (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                    <Text style={[styles.statusText, { color: '#16a34a' }]}>
                      {isSms ? 'Code généré avec succès' : 'Email envoyé avec succès'}
                    </Text>
                  </>
                ) : null}
              </View>

              {/* Hint email uniquement */}
              {!isSms && codeSent && (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.neutral.gray500} />
                  <Text style={styles.hintText}>
                    Vérifiez votre boîte de réception et vos spams.
                  </Text>
                </View>
              )}

              {/* Saisie OTP */}
<View style={styles.otpWrapper}>
  <OtpInput
    key={mode}              // ✅ reset du composant à chaque changement de mode
    length={6}
    onChangeOtp={setOtp}
    onComplete={(code: string) => setOtp(code)}
  />
</View>

              {/* Revoir le code — SMS uniquement */}
              {isSms && (
                <TouchableOpacity
                  style={styles.showCodeBtn}
                  onPress={() => sendSmsOtp(false)}
                  disabled={isSending}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-outline" size={15} color={colors.atb.red} />
                  <Text style={styles.showCodeText}>Revoir le code</Text>
                </TouchableOpacity>
              )}

              {/* Timer / Renvoyer */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity
                    onPress={handleResend}
                    style={styles.resendBtn}
                    disabled={isSending}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={15} color={colors.atb.red} />
                    <Text style={styles.resendText}>{config.resendLabel}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={15} color={colors.neutral.gray400} />
                    <Text style={styles.timerText}>Nouveau code dans {timer}s</Text>
                  </View>
                )}
              </View>

              {/* ✅ Info box — rouge */}
              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.atb.red} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Informations importantes</Text>
                  <Text style={styles.infoItem}>• Code valide pendant 10 minutes</Text>
                  <Text style={styles.infoItem}>• 3 tentatives autorisées</Text>
                  <Text style={styles.infoItem}>• Ne partagez jamais ce code</Text>
                </View>
              </View>

            </View>

            {/* ── Boutons centrés ── */}
            <View style={styles.btnContainer}>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={[styles.btn, styles.backBtn]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleContinue}
                  style={[
                    styles.continueBtn,
                    (otp.length !== 6 || isLoading) && { opacity: 0.5 },
                  ]}
                  disabled={otp.length !== 6 || isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.atb.red, '#C41E3A']}
                    style={styles.continueGradient}
                  >
                    {isLoading
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Text style={styles.continueBtnText}>{config.actionLabel}</Text>
                          <View style={styles.arrowRight} />
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <Footer />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.neutral.white },
  flex:          { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content:       { padding: s(24, 16) },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(24, 16), paddingVertical: s(16, 12), borderBottomWidth: 1, borderBottomColor: colors.neutral.gray300, backgroundColor: colors.neutral.gray100 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: s(12, 8) },
  logo:         { width: s(38, 34), height: s(38, 34) },
  logoGradient: { width: s(42, 38), height: s(42, 38), borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bankName:     { fontSize: s(15, 13), fontWeight: '700', color: colors.atb.red },
  bankSubtitle: { fontSize: s(10, 9), color: colors.neutral.gray500, marginTop: 1 },
  digipackBadge:{ paddingHorizontal: s(10, 8), paddingVertical: s(4, 3), borderRadius: 4 },
  digipackText: { fontSize: s(10, 9), fontWeight: '800', color: '#fff', letterSpacing: 2 },

  phaseContainer:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 6 },
  phaseItem:             { alignItems: 'center', flex: 1 },
  phaseRadioOuter:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.neutral.gray300, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  phaseRadioInner:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  phaseRadioInnerActive: { backgroundColor: colors.atb.red },
  phaseRadioActive:      { borderColor: colors.atb.red },
  phaseLabel:            { fontSize: 9, color: colors.neutral.gray400, fontWeight: '500', textAlign: 'center' },
  phaseLabelActive:      { color: colors.atb.red, fontWeight: '700' },
  phaseConnector:        { width: 16, height: 1.5, backgroundColor: colors.neutral.gray200, alignSelf: 'center', marginTop: -9 },

  titleSection: { marginBottom: s(20, 16) },
  title:        { fontSize: s(21, 17), fontWeight: '700', color: colors.neutral.gray900, marginBottom: 4 },
  subtitle:     { fontSize: s(13, 12), color: colors.neutral.gray500, lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, padding: s(20, 16), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: colors.neutral.gray200 },

  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  sectionBadge:     { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  sectionBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  sectionTitle:     { fontSize: s(15, 13), fontWeight: '700', color: colors.neutral.gray900 },
  sectionDesc:      { fontSize: 11, color: colors.neutral.gray400, marginTop: 2 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, minHeight: 22 },
  statusText: { fontSize: 12, color: colors.neutral.gray400, fontWeight: '500' },

  hintBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  hintText: { fontSize: 12, color: colors.neutral.gray400, flex: 1, lineHeight: 17 },

  otpWrapper:  { paddingVertical: s(18, 14), paddingHorizontal: s(8, 4), backgroundColor: colors.neutral.gray100, borderRadius: 10, marginBottom: 14, alignItems: 'center' },

  showCodeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, marginBottom: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral.gray200 },
  showCodeText: { fontSize: 12, color: colors.atb.red, fontWeight: '600' },

  resendRow: { alignItems: 'center', marginBottom: 18 },
  resendBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.atb.red },
  resendText: { fontSize: s(13, 12), fontWeight: '600', color: colors.atb.red },
  timerRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerText:  { fontSize: s(13, 12), color: colors.neutral.gray400 },

  // ✅ Info box rouge
  infoBox:   { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: 'rgba(200,35,51,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,35,51,0.15)', alignItems: 'flex-start' },
  infoTitle: { fontSize: s(12, 11), fontWeight: '700', color: colors.atb.red, marginBottom: 5 },
  infoItem:  { fontSize: s(11, 10), color: colors.atb.red, lineHeight: 19 },

  // ✅ Boutons centrés et ajustés
  btnContainer: { 
    alignItems: 'center', 
    marginBottom: s(32, 24) 
  },
  btnRow: { 
    flexDirection: 'row', 
    gap: s(12, 10), 
    justifyContent: 'center',
    alignItems: 'center'
  },
  btn: { 
    height: s(50, 46), 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: s(20, 16), 
    minWidth: s(110, 95)
  },
  backBtn: { 
    borderColor: colors.neutral.gray300 
  },
  backBtnText: { 
    fontSize: s(14, 13), 
    fontWeight: '600', 
    color: colors.neutral.gray600 
  },
  continueBtn: { 
    borderRadius: 10, 
    overflow: 'hidden', 
    shadowColor: colors.atb.red, 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 6, 
    elevation: 3, 
    minWidth: s(120, 105)
  },
  continueGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: s(50, 46), 
    paddingHorizontal: s(20, 16), 
    gap: 8 
  },
  continueBtnText: { 
    fontSize: s(14, 13), 
    fontWeight: '700', 
    color: '#fff' 
  },
  arrowRight: { 
    width: 6, 
    height: 6, 
    borderRightWidth: 2, 
    borderTopWidth: 2, 
    borderColor: '#fff', 
    transform: [{ rotate: '45deg' }] 
  },

  footer:        { alignItems: 'center', paddingTop: s(20, 16), paddingBottom: 8 },
  footerDivider: { width: 40, height: 1.5, backgroundColor: colors.neutral.gray200, borderRadius: 1, marginBottom: 8 },
  footerText:    { fontSize: s(11, 10), color: colors.neutral.gray400, marginBottom: 3, textAlign: 'center' },
  footerSubtext: { fontSize: s(10, 9), color: colors.neutral.gray300, textAlign: 'center' },
});

export default OtpVerificationScreen;