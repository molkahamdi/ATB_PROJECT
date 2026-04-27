
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { simulateEHouwiya } from '../services/customerApi';
import { NavigationProp, RouteProp } from '../types/navigation';

type Props = {
  navigation: NavigationProp<'EHouwiyaScreen'>;
  route:      RouteProp<'EHouwiyaScreen'>;
};

// ✅ [E-HOUWIYA] Clé AsyncStorage pour le token
export const EHOUWIYA_TOKEN_KEY    = 'ehouwiya_token';
export const EHOUWIYA_CUSTOMER_KEY = 'ehouwiya_customer_id';

// ── Header ─────────────────────────────────────────────────
// ✅ [FIX] Le bouton retour appelle navigation.replace('Home') au lieu de goBack()
const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <LinearGradient colors={[colors.atb.primary, colors.atb.primaryDark]} style={styles.logoGradient}>
        <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
      </LinearGradient>
      <View>
        <Text style={styles.bankName}>Arab Tunisian Bank</Text>
        <Text style={styles.bankSubtitle}>البنك العربي التونسي</Text>
      </View>
    </View>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <Feather name="arrow-left" size={22} color={colors.atb.primary} />
    </TouchableOpacity>
  </View>
);

// ── Étape visuelle ────────────────────────────────────────
const StepItem: React.FC<{
  number: string;
  title:  string;
  desc:   string;
  icon:   keyof typeof Ionicons.glyphMap;
  locked: boolean;
}> = ({ number, title, desc, icon, locked }) => (
  <View style={styles.stepItem}>
    <LinearGradient
      colors={locked ? ['#6b7280', '#4b5563'] : [colors.atb.red, '#C41E3A']}
      style={styles.stepIcon}
    >
      <Ionicons name={icon} size={18} color="#fff" />
    </LinearGradient>
    <View style={styles.stepContent}>
      <View style={styles.stepTitleRow}>
        <Text style={styles.stepNumber}>{number}</Text>
        <Text style={styles.stepTitle}>{title}</Text>
        {locked && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={10} color="#6b7280" />
            <Text style={styles.lockedText}>Auto</Text>
          </View>
        )}
      </View>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  </View>
);

// ── Composant principal ───────────────────────────────────
const EHouwiyaScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // ✅ [FIX] Fonction pour gérer le retour vers Home
  const handleGoBack = () => {
    // Retour direct vers l'écran d'accueil
    navigation.replace('Home');
  };

  // ════════════════════════════════════════════════════════
  // ✅ [E-HOUWIYA] Appel API principal
  // ════════════════════════════════════════════════════════
  const handleCallEHouwiya = async () => {
    setIsLoading(true);
    setLoadingStep('Connexion à E-Houwiya...');

    try {
      setLoadingStep('Authentification TunTrust...');
      const result = await simulateEHouwiya();

      setLoadingStep('Sécurisation du token...');
      await AsyncStorage.setItem(EHOUWIYA_TOKEN_KEY,    result.token);
      await AsyncStorage.setItem(EHOUWIYA_CUSTOMER_KEY, result.customerId);

      setLoadingStep('Chargement de vos données...');

      // @ts-ignore
      navigation.navigate('OnboardingPersonalData', {
        customerId:      result.customerId,
        isEHouwiya:      true,
        eHouwiyaData:    result.eHouwiyaData,
        tokenExpiresAt:  result.tokenExpiresAt,
      });

    } catch (error: any) {
      Alert.alert(
        'Erreur E-Houwiya',
        error.message || 'Impossible de contacter le service E-Houwiya. Réessayez.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />

      {/* ✅ [FIX] Utilisation de handleGoBack au lieu de navigation.goBack() */}
      <Header onBack={handleGoBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero E-Houwiya ── */}
        <LinearGradient
          colors={[colors.atb.primary, colors.atb.primaryDark]}
          style={styles.hero}
        >
          <View style={styles.heroIconWrapper}>
            <MaterialCommunityIcons name="shield-account" size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Identification via E-Houwiya</Text>
          <Text style={styles.heroSubtitle}>
            Votre identité numérique nationale certifiée par TunTrust
          </Text>

          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.atb.accent} />
            <Text style={styles.trustBadgeText}>Certifié TunTrust · Sécurisé · Officiel</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* ── Explication du processus ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={20} color={colors.atb.red} />
              <Text style={styles.cardTitle}>Comment ça fonctionne ?</Text>
            </View>
            <Text style={styles.cardDesc}>
              En utilisant E-Houwiya, vos données personnelles sont récupérées
              automatiquement depuis votre identité numérique nationale.
              Elles sont certifiées par TunTrust et ne peuvent pas être modifiées.
            </Text>
          </View>

          {/* ── Étapes du processus ── */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Étapes du processus</Text>

            <StepItem
              number="1"
              title="Récupération des données"
              desc="Nom, prénom, CIN, date de naissance, email et téléphone — tous certifiés"
              icon="person-circle-outline"
              locked={true}
            />
            <View style={styles.stepConnector} />
            <StepItem
              number="2"
              title="Vérification OTP"
              desc="Code envoyé sur votre numéro certifié E-Houwiya"
              icon="phone-portrait-outline"
              locked={true}
            />
            <View style={styles.stepConnector} />
            <StepItem
              number="3"
              title="Compléter votre dossier"
              desc="Adresse, situation professionnelle et agence ATB à saisir"
              icon="document-text-outline"
              locked={false}
            />
            <View style={styles.stepConnector} />
            <StepItem
              number="4"
              title="Signature électronique"
              desc="Contrat signé juridiquement via TunTrust"
              icon="create-outline"
              locked={false}
            />
          </View>

          {/* ── Bouton principal ── */}
          <TouchableOpacity
            style={styles.mainButton}
            onPress={handleCallEHouwiya}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isLoading
                ? [colors.neutral.gray400, colors.neutral.gray500]
                : [colors.atb.accent, colors.atb.gold]
              }
              style={styles.mainButtonGradient}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.mainButtonText}>{loadingStep || 'Connexion...'}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="shield-account" size={22} color="#fff" />
                  <Text style={styles.mainButtonText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Bouton alternatif ── */}
          <TouchableOpacity
            style={styles.altButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('EligibilityConditions');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color={colors.neutral.gray600} />
            <Text style={styles.altButtonText}>Continuer sans E-Houwiya</Text>
          </TouchableOpacity>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>© 2026 Arab Tunisian Bank · Tous droits réservés</Text>
            <Text style={styles.footerSubtext}>Service client : 71 143 000</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles (inchangés) ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.neutral.white },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray200, backgroundColor: colors.neutral.gray100 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo:         { width: 38, height: 38 },
  logoGradient: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bankName:     { fontSize: 15, fontWeight: '700', color: colors.atb.red },
  bankSubtitle: { fontSize: 10, color: colors.neutral.gray500, marginTop: 2 },
  backBtn:      { padding: 8 },

  hero:            { paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
  heroIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle:       { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  heroSubtitle:    { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  trustBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trustBadgeText:  { fontSize: 12, color: colors.atb.accent, fontWeight: '600' },

  content: { padding: 20 },

  card:       { backgroundColor: colors.neutral.white, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: colors.neutral.gray900 },
  cardDesc:   { fontSize: 13, color: colors.neutral.gray600, lineHeight: 20 },

  stepsCard:    { backgroundColor: colors.neutral.white, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stepsTitle:   { fontSize: 15, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 16 },
  stepItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stepContent:  { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  stepNumber:   { fontSize: 11, fontWeight: '700', color: colors.atb.red },
  stepTitle:    { fontSize: 13, fontWeight: '700', color: colors.neutral.gray900, flex: 1 },
  stepDesc:     { fontSize: 12, color: colors.neutral.gray500, lineHeight: 17 },
  stepConnector:{ width: 2, height: 16, backgroundColor: colors.neutral.gray200, marginLeft: 17, marginVertical: 4 },
  lockedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lockedText:   { fontSize: 9, color: '#6b7280', fontWeight: '600' },

  lockedInfoCard:   { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  lockedInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lockedInfoTitle:  { fontSize: 14, fontWeight: '700', color: '#374151' },
  lockedInfoText:   { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  lockedFieldsList: { gap: 6 },
  lockedFieldItem:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedFieldText:  { fontSize: 12, color: '#4b5563', fontWeight: '500' },

  mainButton:         { borderRadius: 14, overflow: 'hidden', marginBottom: 12, shadowColor: colors.atb.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  mainButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, paddingHorizontal: 24 },
  mainButtonText:     { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

  altButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral.gray300, backgroundColor: colors.neutral.white, marginBottom: 24 },
  altButtonText: { fontSize: 14, color: colors.neutral.gray600, fontWeight: '600' },

  footer:        { alignItems: 'center', paddingTop: 8 },
  footerDivider: { width: 40, height: 1.5, backgroundColor: colors.neutral.gray200, borderRadius: 1, marginBottom: 10 },
  footerText:    { fontSize: 11, color: colors.neutral.gray500, marginBottom: 3 },
  footerSubtext: { fontSize: 10, color: colors.neutral.gray400 },
});

export default EHouwiyaScreen;