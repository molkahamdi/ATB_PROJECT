
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView,
  Platform, StyleSheet, Image, StatusBar, Alert, ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { NavigationProp, RouteProp } from '../types/navigation';
import { saveFatca, updateCustomer, getCustomer } from '../services/customerApi';

// ── Types ────────────────────────────────────────────────────
type Props = {
  navigation: NavigationProp<'FATCA'>;
  route: RouteProp<'FATCA'>;
};

interface FATCAQuestion {
  id: string; question: string; value: boolean | null; category: string;
}

// ── Questions ────────────────────────────────────────────────
const BASE_QUESTIONS: FATCAQuestion[] = [
  { id: '1', question: 'Vous êtes un citoyen américain', value: null, category: 'Identification' },
  { id: '2', question: 'Êtes-vous résident aux États-Unis ?', value: null, category: 'Identification' },
  { id: '3', question: 'Possédez-vous la Green Card américaine ?', value: null, category: 'Statut légal' },
  { id: '4', question: 'Êtes-vous un contribuable américain ?', value: null, category: 'Fiscalité' },
  { id: '5', question: 'Émettez-vous des transferts permanents à destination des États-Unis ?', value: null, category: 'Opérations financières' },
  { id: '6', question: 'Avez-vous un numéro de téléphone américain ?', value: null, category: 'Coordonnées' },
  { id: '7', question: 'Avez-vous mis en place une procuration pour une personne ayant une adresse aux États-Unis ?', value: null, category: 'Représentation' },
  { id: '8', question: 'Êtes-vous ou un de vos proches/associés politiquement exposé(e) ?', value: null, category: 'Conformité PEP' },
];

// ── IDs → clés BDD ────────────────────────────────────────────
const ID_TO_KEY: Record<string, string> = {
  '1': 'isUsCitizen', '2': 'isUsResident', '3': 'hasGreenCard',
  '4': 'isUsTaxpayer', '5': 'hasUsTransfers', '6': 'hasUsPhone',
  '7': 'hasUsProxy', '8': 'isPoliticallyExposed',
};

// ── PhaseIndicator HORIZONTAL ─────────────────────────────────
const PhaseIndicator: React.FC<{ currentPhase: number }> = ({ currentPhase }) => {
  const phases = [
    { id: 1, label: 'Données personnelles' },
    { id: 2, label: 'Documents justificatifs' },
    { id: 3, label: 'Résumer de la demande' },
    { id: 4, label: 'Envoi de la demande' },
    { id: 5, label: 'Signature électronique' },
  ];

  return (
    <View style={styles.phaseContainer}>
      {phases.map((phase, index) => (
        <React.Fragment key={phase.id}>
          <View style={styles.phaseItem}>
            <View style={[
              styles.phaseRadioOuter,
              phase.id < currentPhase && styles.phaseRadioCompleted,
              phase.id === currentPhase && styles.phaseRadioActive
            ]}>
              {phase.id < currentPhase ? (
                <Text style={styles.phaseRadioCheck}>✓</Text>
              ) : (
                <View style={[
                  styles.phaseRadioInner,
                  phase.id === currentPhase && styles.phaseRadioInnerActive
                ]} />
              )}
            </View>
            <Text style={[
              styles.phaseLabel,
              phase.id === currentPhase && styles.phaseLabelActive,
              phase.id < currentPhase && styles.phaseLabelCompleted
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

// ── Sous-composants ──────────────────────────────────────────
const Header: React.FC = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.logoContainer}>
        <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.logoGradient}>
          <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
        </LinearGradient>
      </View>
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

const Footer: React.FC = () => (
  <View style={styles.footer}>
    <View style={styles.footerLegal}>
      <Ionicons name="shield" size={12} color={colors.neutral.gray400} />
      <Text style={styles.footerLegalText}> CONFIDENTIEL</Text>
      <Text style={styles.footerDividerChar}> • </Text>
      <Ionicons name="lock-closed" size={12} color={colors.neutral.gray400} />
      <Text style={styles.footerLegalText}> SÉCURISÉ</Text>
    </View>
    <Text style={styles.footerText}>© 2026 Arab Tunisian Bank · Tous droits réservés</Text>
    <Text style={styles.footerSubtext}>Service client : 71 143 000</Text>
  </View>
);

// ── Composant principal ──────────────────────────────────────
const FATCAScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId } = route.params;
  const fromRecap = route.params?.fromRecap ?? false;
  const formData = route.params?.formData;

  const currentPhase = 1;

  const [isLoading, setIsLoading]   = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [questions, setQuestions]   = useState<FATCAQuestion[]>(BASE_QUESTIONS);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  // ── Chargement données existantes ────────────────────────
  useEffect(() => {
    if (fromRecap) {
      setIsFetching(true);
      getCustomer(customerId)
        .then((data: any) => {
          setQuestions(prev => prev.map(q => {
            const key = ID_TO_KEY[q.id];
            const val = data[key];
            return { ...q, value: typeof val === 'boolean' ? val : null };
          }));
        })
        .catch(() => Alert.alert('Erreur', 'Impossible de charger vos réponses FATCA.'))
        .finally(() => setIsFetching(false));
    }
  }, []);

  // ── Vérification FATCA ──────────────────────────────────────
  // ✅ BLOQUE TOUTES LES QUESTIONS (1 à 8) si réponse "Oui"
  const hasFatcaViolation = (): boolean => {
    // Toutes les questions sont sensibles maintenant
    const allQuestions = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return questions.some(q => allQuestions.includes(q.id) && q.value === true);
  };

  // ── Calculs dérivés ──────────────────────────────────────
  const questionsByCategory = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, FATCAQuestion[]>);

  const categories = Object.keys(questionsByCategory);
  const allQuestionsAnswered = questions.every(q => q.value !== null);
  const answeredCount = questions.filter(q => q.value !== null).length;
  const yesCount = questions.filter(q => q.value === true).length;
  const pendingCount = questions.length - answeredCount;

  // ── Gestion des réponses ──────────────────────────────────────
  const handleAnswer = (id: string, answer: boolean) => {
    // Mettre à jour la question
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, value: answer } : q));
    
    // ✅ SI la réponse est "Oui" POUR N'IMPORTE QUELLE QUESTION (1 à 8)
    // Afficher IMMÉDIATEMENT le popup de blocage
    if (answer === true) {
      setBlockModalVisible(true);
    }
  };

  // ── Soumission ───────────────────────────────────────────
  const handleContinue = async () => {
    // Si violation FATCA, ne pas continuer
    if (hasFatcaViolation()) {
      setBlockModalVisible(true);
      return;
    }
    
    if (!allQuestionsAnswered) return;
    
    setIsLoading(true);
    try {
      const payload = {
        isUsCitizen:          questions.find(q => q.id === '1')?.value ?? false,
        isUsResident:         questions.find(q => q.id === '2')?.value ?? false,
        hasGreenCard:         questions.find(q => q.id === '3')?.value ?? false,
        isUsTaxpayer:         questions.find(q => q.id === '4')?.value ?? false,
        hasUsTransfers:       questions.find(q => q.id === '5')?.value ?? false,
        hasUsPhone:           questions.find(q => q.id === '6')?.value ?? false,
        hasUsProxy:           questions.find(q => q.id === '7')?.value ?? false,
        isPoliticallyExposed: questions.find(q => q.id === '8')?.value ?? false,
      };

      if (fromRecap) {
        await updateCustomer(customerId, payload);
        Alert.alert('✅ Déclaration mise à jour', 'Vos réponses FATCA ont été sauvegardées.', [
          { text: 'Retour au récapitulatif', onPress: () => {
            // @ts-ignore
            navigation.navigate('Recapitulatif', { customerId });
          }},
        ]);
      } else {
        await saveFatca(customerId, payload);
        // @ts-ignore
        navigation.navigate('DocumentsJustificatif', {
          customerId,
          formData: route.params?.formData,
        });
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la sauvegarde FATCA.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Gestion du retour vers l'accueil ──────────────────────────
  const handleGoToHome = () => {
    // @ts-ignore
    navigation.navigate('Home');
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top']}>
        <ActivityIndicator size="large" color={colors.atb.red} />
        <Text style={styles.loadingText}>Chargement de vos réponses FATCA...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />
      
      {/* ✅ Modal de blocage FATCA - Redirection vers l'accueil */}
      <Modal
        visible={blockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="alert-circle" size={32} color={colors.atb.red} />
              </View>
              <Text style={styles.modalTitle}>Déclaration FATCA</Text>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalMessage}>
                Conformément à la réglementation FATCA (Foreign Account Tax Compliance Act), nous ne sommes pas en mesure de poursuivre votre demande d'ouverture de compte en ligne.
              </Text>
              
              <Text style={styles.modalSubMessage}>
                Les informations que vous avez fournies indiquent un lien avec les États-Unis ou une situation nécessitant une vérification approfondie.
              </Text>
              
              <View style={styles.modalInfoBox}>
                <Text style={styles.modalInfoTitle}>Pour toute assistance :</Text>
                <View style={styles.modalContactRow}>
                  <Ionicons name="call-outline" size={16} color={colors.atb.red} />
                  <Text style={styles.modalContactText}> 71 143 000</Text>
                </View>
                <View style={styles.modalContactRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.atb.red} />
                  <Text style={styles.modalContactText}> serviceclient@atb.com.tn</Text>
                </View>
                <View style={styles.modalContactRow}>
                  <Ionicons name="business-outline" size={16} color={colors.atb.red} />
                  <Text style={styles.modalContactText}> Agences ATB les plus proches</Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setBlockModalVisible(false);
                handleGoToHome();
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.atb.red, colors.atb.red]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>Retour à l'accueil</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Header />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* Titre */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{fromRecap ? 'Modifier la déclaration FATCA' : 'Déclaration FATCA'}</Text>
              <Text style={styles.subtitle}>Formulaire de conformité réglementaire</Text>
              
              <View style={styles.phaseIndicatorWrapper}>
                <PhaseIndicator currentPhase={currentPhase} />
              </View>
            </View>

            {/* Bannière modification */}
            {fromRecap && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>
                  Mode modification — Vos réponses précédentes sont pré-remplies.
                </Text>
              </View>
            )}

            {/* Introduction */}
            <View style={[styles.card, styles.introCard]}>
              <View style={styles.introHeader}>
                <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.introIconContainer}>
                  <Ionicons name="information-circle" size={20} color={colors.neutral.white} />
                </LinearGradient>
                <View>
                  <Text style={styles.introTitle}>À propos du FATCA</Text>
                  <Text style={styles.introSubtitle}>Foreign Account Tax Compliance Act</Text>
                </View>
              </View>
              <Text style={styles.introText}>
                Cette déclaration est obligatoire pour identifier les personnes ayant des liens avec les États-Unis conformément à la réglementation américaine de transparence fiscale.
              </Text>
            </View>

            {/* Questions par catégorie */}
            <View style={styles.formContainer}>
              {categories.map((category, catIndex) => (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryHeaderLeft}>
                      <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.categoryNumber}>
                        <Text style={styles.categoryNumberText}>{catIndex + 1}</Text>
                      </LinearGradient>
                      <Text style={styles.categoryTitle}>{category}</Text>
                    </View>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryStatsText}>
                        {questionsByCategory[category].filter(q => q.value !== null).length}/{questionsByCategory[category].length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.questionsList}>
                    {questionsByCategory[category].map((question, qIndex) => (
                      <View
                        key={question.id}
                        style={[styles.questionItem, qIndex === questionsByCategory[category].length - 1 && { borderBottomWidth: 0 }]}
                      >
                        <View style={styles.questionContent}>
                          <View style={styles.questionNumberContainer}>
                            <Text style={styles.questionNumber}>{qIndex + 1}</Text>
                          </View>
                          <Text style={styles.questionText}>{question.question}</Text>
                        </View>
                        <View style={styles.answerContainer}>
                          <TouchableOpacity 
                            style={styles.radioButton} 
                            onPress={() => handleAnswer(question.id, false)} 
                            activeOpacity={0.7}
                            disabled={hasFatcaViolation()}
                          >
                            <View style={styles.radioOuter}>
                              <View style={[styles.radioInner, question.value === false && styles.radioInnerSelected]}>
                                {question.value === false && <View style={styles.radioDot} />}
                              </View>
                            </View>
                            <Text style={[styles.radioLabel, question.value === false && styles.radioLabelSelected]}>Non</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.radioButton} 
                            onPress={() => handleAnswer(question.id, true)} 
                            activeOpacity={0.7}
                            disabled={hasFatcaViolation()}
                          >
                            <View style={styles.radioOuter}>
                              <View style={[styles.radioInner, question.value === true && styles.radioInnerSelected]}>
                                {question.value === true && <View style={styles.radioDot} />}
                              </View>
                            </View>
                            <Text style={[styles.radioLabel, question.value === true && styles.radioLabelSelected]}>Oui</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Synthèse */}
            <View style={[styles.card, styles.summaryCard]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleContainer}>
                  <Ionicons name="stats-chart" size={18} color={colors.atb.red} />
                  <Text style={styles.summaryTitle}>Synthèse</Text>
                </View>
                <View style={styles.summaryProgress}>
                  <Text style={styles.summaryProgressText}>{answeredCount}/{questions.length}</Text>
                </View>
              </View>
              <View style={styles.summaryCompact}>
                {[
                  { label: 'Oui', count: yesCount, dotStyle: styles.summaryDotYes },
                  { label: 'Non', count: questions.filter(q => q.value === false).length, dotStyle: styles.summaryDotNo },
                  { label: 'En attente', count: pendingCount, dotStyle: styles.summaryDotPending, valueStyle: styles.summaryItemValuePending },
                ].map(({ label, count, dotStyle, valueStyle }) => (
                  <View key={label} style={styles.summaryItemCompact}>
                    <View style={styles.summaryItemHeader}>
                      <View style={[styles.summaryDot, dotStyle]} />
                      <Text style={styles.summaryItemLabel}>{label}</Text>
                    </View>
                    <Text style={[styles.summaryItemValue, valueStyle]}>{count}</Text>
                  </View>
                ))}
              </View>
              {hasFatcaViolation() ? (
                <View style={[styles.statusBadge, styles.statusBadgeBlocked]}>
                  <Ionicons name="close-circle" size={14} color={colors.atb.red} />
                  <Text style={[styles.statusBadgeText, styles.statusBadgeTextBlocked]}>
                    ❌ Non-conformité détectée - Demande bloquée
                  </Text>
                </View>
              ) : !allQuestionsAnswered ? (
                <View style={[styles.statusBadge, styles.statusBadgeInfo]}>
                  <Ionicons name="time" size={14} color={colors.status.info} />
                  <Text style={styles.statusBadgeText}>Veuillez répondre à toutes les questions.</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
                  <Text style={styles.statusBadgeText}>Formulaire complet - Aucune non-conformité détectée</Text>
                </View>
              )}
            </View>

            {/* Boutons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (fromRecap) {
                    // @ts-ignore
                    navigation.navigate('Recapitulatif', { customerId });
                  } else {
                    // @ts-ignore
                    navigation.navigate('OnboardingPersonalData', {
                      customerId,
                      prefillData: formData,
                    });
                  }
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color={colors.neutral.gray700} />
                <Text style={styles.backButtonText}>{fromRecap ? 'Annuler' : 'Retour'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleContinue}
                style={styles.continueButton}
                disabled={!allQuestionsAnswered || isLoading || hasFatcaViolation()}
              >
                <LinearGradient
                  colors={allQuestionsAnswered && !isLoading && !hasFatcaViolation() ? [colors.atb.red, colors.atb.red] : [colors.neutral.gray300, colors.neutral.gray400]}
                  style={styles.continueGradient}
                >
                  <Ionicons name="document-text" size={18} color={colors.neutral.white} />
                  <Text style={styles.continueButtonText}>
                    {hasFatcaViolation() ? ' Demande bloquée' : isLoading ? 'Envoi...' : fromRecap ? ' Sauvegarder' : allQuestionsAnswered ? 'Soumettre et continuer' : 'Continuer'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  flex: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.white },
  loadingText: { marginTop: 16, fontSize: 15, color: colors.neutral.gray600 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray300, backgroundColor: colors.neutral.gray100 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  logo: { width: 40, height: 40 },
  logoGradient: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bankName: { fontSize: 16, fontWeight: '700', color: colors.atb.red, letterSpacing: 0.3 },
  bankSubtitle: { fontSize: 11, color: colors.neutral.gray500, marginTop: 2, fontWeight: '500' },
  digipackBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  digipackText: { fontSize: 10, fontWeight: '800', color: colors.neutral.white, letterSpacing: 2 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 24 }, 

  phaseIndicatorWrapper: { marginTop: 2 },
  phaseContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8 },
  phaseItem: { alignItems: 'center', flex: 1 },
  phaseRadioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.neutral.gray400, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  phaseRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  phaseRadioInnerActive: { backgroundColor: colors.atb.red },
  phaseRadioActive: { borderColor: colors.atb.red },
  phaseRadioCompleted: { borderColor: colors.atb.red, backgroundColor: colors.atb.red },
  phaseRadioCheck: { fontSize: 12, color: colors.neutral.white, fontWeight: 'bold' },
  phaseLabel: { fontSize: 10, color: colors.neutral.gray600, fontWeight: '500', textAlign: 'center' },
  phaseLabelActive: { color: colors.atb.red, fontWeight: '700' },
  phaseLabelCompleted: { color: colors.neutral.gray800, fontWeight: '600' },
  phaseConnector: { width: 20, height: 2, backgroundColor: colors.neutral.gray300, alignSelf: 'center', marginTop: -10 },

  titleSection: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.neutral.gray600, fontWeight: '400', lineHeight: 19, marginBottom: 8 },

  editBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(200,35,51,0.07)', borderWidth: 1, borderColor: 'rgba(200,35,51,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 },
  editBannerText: { flex: 1, fontSize: 13, color: colors.atb.red, fontWeight: '500' },
  
  card: { backgroundColor: colors.neutral.white, borderRadius: 12, marginBottom: 16, shadowColor: colors.neutral.gray900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  introCard: { padding: 20, marginBottom: 15 },
  introHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  introIconContainer: { width: 25, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  introTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 2 },
  introSubtitle: { fontSize: 12, color: colors.neutral.gray500, fontWeight: '500' },
  introText: { fontSize: 13, color: colors.neutral.gray700, lineHeight: 20, fontWeight: '400' },
  formContainer: { gap: 16 },
  categorySection: { marginBottom: 5 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryNumber: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  categoryNumberText: { fontSize: 12, fontWeight: '800', color: colors.neutral.white },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral.gray900 },
  categoryStats: { backgroundColor: colors.neutral.beige, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  categoryStatsText: { fontSize: 11, fontWeight: '600', color: colors.neutral.gray700 },
  questionsList: { backgroundColor: colors.neutral.white, borderRadius: 10, borderWidth: 1.5, borderColor: colors.neutral.gray200 },
  questionItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionContent: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 16 },
  questionNumberContainer: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutral.gray100, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  questionNumber: { fontSize: 11, fontWeight: '700', color: colors.neutral.gray600 },
  questionText: { flex: 1, fontSize: 14, color: colors.neutral.gray800, fontWeight: '500', lineHeight: 20 },
  answerContainer: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  radioButton: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: { marginRight: 8 },
  radioInner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.neutral.gray400, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.white },
  radioInnerSelected: { borderColor: colors.atb.red },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.atb.red },
  radioLabel: { fontSize: 14, fontWeight: '500', color: colors.neutral.gray700 },
  radioLabelSelected: { color: colors.atb.red, fontWeight: '600' },
  summaryCard: { padding: 16, marginBottom: 24 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.neutral.gray900, marginLeft: 8 },
  summaryProgress: { backgroundColor: colors.neutral.beige, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  summaryProgressText: { fontSize: 12, fontWeight: '700', color: colors.atb.red },
  summaryCompact: { marginBottom: 16 },
  summaryItemCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  summaryItemHeader: { flexDirection: 'row', alignItems: 'center' },
  summaryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  summaryDotYes: { backgroundColor: colors.atb.red },
  summaryDotNo: { backgroundColor: colors.neutral.gray400 },
  summaryDotPending: { backgroundColor: colors.neutral.gray300 },
  summaryItemLabel: { fontSize: 13, color: colors.neutral.gray700, fontWeight: '500' },
  summaryItemValue: { fontSize: 15, fontWeight: '700', color: colors.atb.red },
  summaryItemValuePending: { color: colors.neutral.gray500 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8 },
  statusBadgeWarning: { backgroundColor: colors.status.warningLight },
  statusBadgeInfo: { backgroundColor: colors.status.infoLight },
  statusBadgeSuccess: { backgroundColor: colors.status.successLight },
  statusBadgeBlocked: { backgroundColor: 'rgba(200,35,51,0.08)', borderWidth: 1, borderColor: 'rgba(200,35,51,0.3)' },
  statusBadgeText: { fontSize: 12, fontWeight: '500', marginLeft: 6, color: colors.neutral.gray700 },
  statusBadgeTextBlocked: { color: colors.atb.red, fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  backButton: { flex: 1, height: 52, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '700', color: colors.neutral.gray700, marginLeft: 8 },
  continueButton: { flex: 1, borderRadius: 8, overflow: 'hidden', shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  continueGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingHorizontal: 24 },
  continueButtonText: { fontSize: 14, fontWeight: '700', color: colors.neutral.white, marginLeft: 8 },
  footer: { alignItems: 'center', paddingTop: 20 },
  footerLegal: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  footerLegalText: { fontSize: 10, color: colors.neutral.gray400, fontWeight: '600', letterSpacing: 0.5 },
  footerDividerChar: { fontSize: 10, color: colors.neutral.gray400 },
  footerText: { fontSize: 11, color: colors.neutral.gray500, fontWeight: '500', marginBottom: 4 },
  footerSubtext: { fontSize: 10, color: colors.neutral.gray400, fontWeight: '400' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { width: '100%', maxWidth: 360, backgroundColor: colors.neutral.white, borderRadius: 20, overflow: 'hidden', shadowColor: colors.neutral.gray900, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  modalHeader: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24 },
  modalIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(200,35,51,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.atb.red, letterSpacing: -0.3 },
  modalDivider: { height: 1, backgroundColor: colors.neutral.gray200, marginVertical: 16 },
  modalScroll: { maxHeight: 400, paddingHorizontal: 24 },
  modalMessage: { fontSize: 15, fontWeight: '500', color: colors.neutral.gray900, lineHeight: 22, marginBottom: 12, textAlign: 'center' },
  modalSubMessage: { fontSize: 13, color: colors.neutral.gray600, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  modalInfoBox: { backgroundColor: colors.neutral.gray50, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.neutral.gray200 },
  modalInfoTitle: { fontSize: 13, fontWeight: '700', color: colors.neutral.gray800, marginBottom: 12 },
  modalContactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalContactText: { fontSize: 13, color: colors.neutral.gray700, marginLeft: 8 },
  modalButton: { margin: 20, borderRadius: 12, overflow: 'hidden' },
  modalButtonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '700', color: colors.neutral.white },
});

export default FATCAScreen;