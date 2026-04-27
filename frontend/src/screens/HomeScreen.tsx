import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Animated as RNAnimated,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';
import {
  AntDesign,
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  FontAwesome,
  Feather,
  MaterialCommunityIcons,
  Entypo,
} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

type FAQItem = {
  id: number;
  question: string;
  answer: string;
  isOpen: boolean;
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [fadeAnim]  = useState(new RNAnimated.Value(0));
  const [slideAnim] = useState(new RNAnimated.Value(50));
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    { id: 1, question: "Qu'est-ce qu'E-Houwiya et comment l'obtenir ?", answer: "E-Houwiya est votre identité numérique nationale officielle. Pour l'obtenir :\n1. Rendez-vous sur le site officiel e-houwiya.tn\n2. Remplissez le formulaire en ligne\n3. Validez votre identité via votre carte d'identité\n4. Recevez votre code d'activation par SMS", isOpen: false },
    { id: 2, question: "Comment accéder à mes services bancaires après l'ouverture ?", answer: "Après ouverture de compte, vous recevrez :\n• Vos identifiants ATB Net par email\n• Votre code PIN par SMS\n• Votre carte bancaire sous 5 jours ouvrables\nVous pouvez immédiatement utiliser ATB Mobile avec vos identifiants", isOpen: false },
    { id: 3, question: "Quels justificatifs dois-je fournir ?", answer: "Pour ouvrir un compte, vous aurez besoin de :\n✓ Carte d'identité nationale valide\n✓ Justificatif de domicile (moins de 3 mois)\n✓ Relevé d'identité bancaire (RIB) si transfert\n✓ Photo d'identité récente\nTous les documents peuvent être téléchargés via l'application", isOpen: false },
    { id: 4, question: "Je rencontre un souci technique, que faire ?", answer: "Nous sommes là pour vous aider :\n Support technique : 70 026 267 (24/7)\n Email : support@atb.tn\n Chat en ligne : Disponible sur ATB Net\n Agence : Rendez-vous dans l'agence la plus proche\nTemps de réponse moyen : moins de 2 heures", isOpen: false },
  ]);

  const quotes = [
    "Simplifiez vos démarches, maximisez votre temps",
    "Ouvrez votre compte en ligne, en quelques minutes seulement",
    "La banque à portée de main, où que vous soyez",
    "Votre liberté bancaire commence par un clic",
  ];

  const steps = [
    { id: 1, title: 'Renseignement\ndes données',       icon: 'edit'         as const },
    { id: 2, title: 'Téléchargement\ndes justificatifs', icon: 'upload'       as const },
    { id: 3, title: 'Résumé et\nvalidation',             icon: 'check-circle' as const },
    { id: 4, title: 'Envoi de\nla demande',              icon: 'right-circle' as const },
  ];

  const services = [
    { id: 1, title: 'ATB Mobile',  description: 'Votre banque mobile',  icon: 'mobile'      as const },
    { id: 2, title: 'ATB Net',     description: 'Banque en ligne',       icon: 'laptop'      as const },
    { id: 3, title: 'ATB PAY',     description: 'Paiement mobile',       icon: 'credit-card' as const },
    { id: 4, title: 'E-Houwiya',   description: 'Identité numérique',    icon: 'idcard'      as const },
  ];

  const atbPayFeatures = ['Paiement en magasin', 'Règlement de factures', "Transfert d'argent"];

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 4000);

    return () => clearInterval(quoteInterval);
  }, []);

  const toggleFAQ = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFaqItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isOpen: !item.isOpen } : { ...item, isOpen: false },
      ),
    );
  };

  const navigateToEligibility = () => {
    // @ts-ignore
    navigation.navigate('EligibilityConditions');
  };

  const handleGoBack = () => {
    // @ts-ignore
    navigation.navigate('OnboardingHome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.gray100} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={[colors.atb.primary, colors.atb.primaryDark]} style={styles.logoGradient}>
              <Image source={require('../assets/atb.png')} style={styles.logo} resizeMode="contain" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.bankName}>Arab Tunisian Bank</Text>
            <Text style={styles.bankSubtitle}>البنك العربي التونسي</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.atb.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <RNAnimated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[colors.atb.primary, colors.atb.primaryDark]} style={styles.heroGradient}>
            <View style={styles.heroContent}>
              <View style={styles.quoteContainer}>
                <Entypo name="quote" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.quoteText}>{quotes[currentQuoteIndex]}</Text>
                <View style={styles.quoteDots}>
                  {quotes.map((_, index) => (
                    <View key={index} style={[styles.dot, index === currentQuoteIndex && styles.dotActive]} />
                  ))}
                </View>
              </View>

              <Text style={styles.heroTitle}>Facilitez votre entrée en relation avec ATB</Text>
              <Text style={styles.heroSubtitle}>Une expérience simple et sécurisée, où que vous soyez</Text>

              <View style={styles.buttonContainer}>
                {/* ✅ [E-HOUWIYA] Navigation vers EHouwiyaScreen */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.9}
                  onPress={() => {
                    // ✅ [E-HOUWIYA] Naviguer vers EHouwiyaScreen
                    // (anciennement EHouwiyaWebView)
                    // @ts-ignore
                    navigation.navigate('EHouwiyaScreen');
                  }}
                >
                  <LinearGradient colors={[colors.atb.accent, colors.atb.gold]} style={styles.primaryButtonGradient}>
                    <MaterialCommunityIcons name="shield-account" size={20} color={colors.neutral.white} />
                    <Text style={styles.primaryButtonText}>Commencer avec E-Houwiya</Text>
                    <AntDesign name="arrow-right" size={16} color={colors.neutral.white} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7} onPress={navigateToEligibility}>
                  <MaterialIcons name="person-outline" size={18} color={colors.atb.red} />
                  <Text style={styles.secondaryButtonText}>Client sans E-Houwiya</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </RNAnimated.View>

        {/* Section E-Houwiya */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}><MaterialCommunityIcons name="shield-account" size={22} color={colors.neutral.white} /></View>
            <View><Text style={styles.sectionTitle}>E-Houwiya</Text><Text style={styles.sectionSubtitle}>Identité Numérique Nationale</Text></View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              E-Houwiya est votre identité numérique nationale, reconnue officiellement par l'État tunisien. Créez votre identité numérique pour accéder en toute sécurité à tous les services.
            </Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.status.successLight }]}><Ionicons name="shield-checkmark" size={20} color={colors.status.success} /></View>
                <Text style={styles.featureTitle}>Sécurisé</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.status.infoLight }]}><MaterialIcons name="speed" size={20} color={colors.status.info} /></View>
                <Text style={styles.featureTitle}>Rapide</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: 'rgba(197, 165, 114, 0.15)' }]}><FontAwesome5 name="mobile-alt" size={18} color={colors.atb.accent} /></View>
                <Text style={styles.featureTitle}>Mobile</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Comment obtenir E-Houwiya</Text>
              <Feather name="chevron-right" size={16} color={colors.atb.red} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Étapes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleCenter}>Votre souscription simple, rapide et sécurisée!</Text>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <View style={[styles.stepNumber, index === 0 && styles.stepNumberActive]}>
                    <AntDesign name={step.icon} size={18} color={index === 0 ? colors.neutral.white : colors.atb.red} />
                  </View>
                  {index < steps.length - 1 && <View style={styles.stepLine} />}
                </View>
                <Text style={[styles.stepText, index === 0 && styles.stepTextActive]}>{step.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nos Services</Text>
          <View style={styles.servicesGrid}>
            {services.map(service => (
              <TouchableOpacity key={service.id} style={styles.serviceCard} activeOpacity={0.8}>
                <View style={styles.serviceIconContainer}><AntDesign name={service.icon} size={22} color={colors.atb.red} /></View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.featuresCard}>
            <View style={styles.featuresHeader}><FontAwesome name="bank" size={18} color={colors.atb.red} /><Text style={styles.featuresTitle}>Services Digitaux ATB</Text></View>
            <View style={styles.featuresList}>
              {['Consultation temps réel', 'Virements instantanés 24/7', 'Suivi cartes et prêts', 'Relevés sécurisés'].map((item, idx) => (
                <View key={idx} style={styles.checklistItem}><Feather name="check" size={16} color={colors.status.success} /><Text style={styles.checklistText}>{item}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* ATB PAY */}
        <View style={styles.section}>
          <LinearGradient colors={[colors.atb.primaryDark, '#4A0B1E']} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={styles.atbPayCard}>
            <View style={styles.atbPayBgDecoration} />
            <View style={styles.atbPayHeader}>
              <View><Text style={styles.atbPayBrand}>ATB PAY</Text><Text style={styles.atbPaySlogan}>Le portefeuille qui facilite vos paiement partout</Text></View>
              <MaterialCommunityIcons name="contactless-payment" size={32} color={colors.atb.accent} />
            </View>
            <View style={styles.atbPayFeaturesList}>
              {atbPayFeatures.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.payFeatureRow}><MaterialIcons name="check-circle" size={16} color={colors.atb.accent} /><Text style={styles.payFeatureText}>{feature}</Text></View>
              ))}
            </View>
            <View style={styles.atbPayFooter}><Text style={styles.atbPayFooterText}>Découvrir maintenant</Text><AntDesign name="arrow-right" size={16} color={colors.atb.accent} /></View>
          </LinearGradient>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions Fréquentes</Text>
          <View style={styles.faqContainer}>
            {faqItems.map((faq, index) => (
              <View key={faq.id} style={[styles.faqItem, index === faqItems.length - 1 && styles.lastFaqItem]}>
                <TouchableOpacity style={styles.faqHeader} activeOpacity={0.7} onPress={() => toggleFAQ(faq.id)}>
                  <Text style={[styles.faqQuestion, faq.isOpen && styles.faqQuestionActive]}>{faq.question}</Text>
                  <View style={[styles.faqIcon, faq.isOpen && styles.faqIconActive]}><Feather name={faq.isOpen ? "minus" : "plus"} size={18} color={faq.isOpen ? colors.neutral.white : colors.neutral.gray500} /></View>
                </TouchableOpacity>
                {faq.isOpen && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    {faq.id === 4 && (
                      <TouchableOpacity style={styles.supportButton}><Feather name="phone" size={14} color={colors.atb.red} /><Text style={styles.supportButtonText}>Appeler le 70 026 267</Text></TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Télécharger l'application ATB Mobile</Text>
          <View style={styles.storeButtons}>
            <TouchableOpacity style={styles.storeButton} onPress={() => Linking.openURL('https://apps.apple.com/fr/app/connect/id6756798670')}>
              <FontAwesome name="apple" size={20} color={colors.neutral.white} />
              <View style={styles.storeButtonTextContainer}><Text style={styles.storeButtonSmallText}>Télécharger sur</Text><Text style={styles.storeButtonText}>App Store</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.storeButton} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.atb.atbconnect')}>
              <FontAwesome5 name="google-play" size={18} color={colors.neutral.white} />
              <View style={styles.storeButtonTextContainer}><Text style={styles.storeButtonSmallText}>Disponible sur</Text><Text style={styles.storeButtonText}>Google Play</Text></View>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopyright}>© 2026 Arab Tunisian Bank. Tous droits réservés.</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles (identiques à l'original) ─────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray200, backgroundColor: colors.neutral.gray100 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  logo: { width: 40, height: 40 },
  logoGradient: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bankName: { fontSize: 16, fontWeight: '700', color: colors.atb.red, letterSpacing: 0.3 },
  bankSubtitle: { fontSize: 11, color: colors.neutral.gray500, marginTop: 2, fontWeight: '500' },
  backButton: { paddingHorizontal: 8 },
  scrollContent: { paddingBottom: 40 },
  heroSection: { marginTop: 0 },
  heroGradient: { paddingVertical: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroContent: { alignItems: 'center' },
  quoteContainer: { backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: 16, borderRadius: 16, marginBottom: 24, width: '100%' },
  quoteText: { fontSize: 18, color: colors.neutral.white, fontStyle: 'italic', lineHeight: 24, marginTop: 8, marginBottom: 12 },
  quoteDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.4)', marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.atb.accent, width: 8, height: 8 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: 12, lineHeight: 32 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  buttonContainer: { width: '100%', gap: 16 },
  primaryButton: { borderRadius: 16, overflow: 'hidden', shadowColor: colors.atb.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 24 },
  primaryButtonText: { color: colors.neutral.white, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.white, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.atb.red },
  secondaryButtonText: { color: colors.atb.primary, fontSize: 15, fontWeight: '600', marginLeft: 8 },
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.atb.red, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.neutral.gray900 },
  sectionSubtitle: { fontSize: 14, color: colors.neutral.gray600, marginTop: 2 },
  sectionTitleCenter: { fontSize: 22, fontWeight: '700', color: colors.neutral.gray900, textAlign: 'center', marginBottom: 32, lineHeight: 28 },
  card: { backgroundColor: colors.neutral.white, borderRadius: 20, padding: 24, shadowColor: colors.neutral.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardDescription: { fontSize: 15, color: colors.neutral.gray700, lineHeight: 24, marginBottom: 24 },
  featuresGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  featureItem: { alignItems: 'center', flex: 1 },
  featureIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral.gray800 },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.gray50, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.gray200 },
  linkButtonText: { fontSize: 15, fontWeight: '600', color: colors.atb.red, marginRight: 8 },
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepNumberContainer: { alignItems: 'center', marginBottom: 12, position: 'relative' },
  stepNumber: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.neutral.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.neutral.gray200, zIndex: 2 },
  stepNumberActive: { backgroundColor: colors.atb.red, borderColor: colors.atb.primary },
  stepLine: { position: 'absolute', top: 26, left: '50%', right: -50, height: 2, backgroundColor: colors.neutral.gray200, zIndex: 1 },
  stepText: { fontSize: 12, color: colors.neutral.gray600, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  stepTextActive: { color: colors.atb.red, fontWeight: '600' },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  serviceCard: { width: (width - 52) / 2, backgroundColor: colors.neutral.white, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: colors.neutral.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: 'center' },
  serviceIconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.neutral.gray50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 4, textAlign: 'center' },
  serviceDescription: { fontSize: 13, color: colors.neutral.gray600, textAlign: 'center' },
  featuresCard: { backgroundColor: colors.neutral.cream, borderRadius: 16, padding: 24 },
  featuresHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  featuresTitle: { fontSize: 18, fontWeight: '700', color: colors.atb.red, marginLeft: 12 },
  featuresList: { gap: 16 },
  checklistItem: { flexDirection: 'row', alignItems: 'center' },
  checklistText: { fontSize: 15, color: colors.neutral.gray700, marginLeft: 12 },
  atbPayCard: { borderRadius: 24, padding: 25, overflow: 'hidden', minHeight: 180, justifyContent: 'space-between' },
  atbPayBgDecoration: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  atbPayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  atbPayBrand: { fontSize: 24, fontWeight: '800', color: colors.neutral.white, letterSpacing: 1 },
  atbPaySlogan: { fontSize: 12, color: colors.atb.accent, marginTop: 4 },
  atbPayFeaturesList: { marginBottom: 20 },
  payFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  payFeatureText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', marginLeft: 10 },
  atbPayFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  atbPayFooterText: { fontSize: 12, fontWeight: '700', color: colors.atb.accent, marginRight: 6, textTransform: 'uppercase' },
  faqContainer: { backgroundColor: colors.neutral.white, borderRadius: 20, overflow: 'hidden', shadowColor: colors.neutral.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  lastFaqItem: { borderBottomWidth: 0 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 },
  faqQuestion: { fontSize: 15, fontWeight: '500', color: colors.neutral.gray800, flex: 1, marginRight: 16, lineHeight: 22 },
  faqQuestionActive: { color: colors.atb.red, fontWeight: '600' },
  faqIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral.gray100, justifyContent: 'center', alignItems: 'center' },
  faqIconActive: { backgroundColor: colors.atb.red },
  faqAnswerContainer: { paddingHorizontal: 24, paddingBottom: 24 },
  faqAnswer: { fontSize: 14, color: colors.neutral.gray600, lineHeight: 22, marginBottom: 16 },
  supportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 21, 56, 0.05)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  supportButtonText: { fontSize: 13, fontWeight: '600', color: colors.atb.red, marginLeft: 8 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  storeButtons: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  storeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.black, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginHorizontal: 6, minWidth: 130 },
  storeButtonTextContainer: { marginLeft: 10 },
  storeButtonSmallText: { fontSize: 9, color: colors.neutral.white, opacity: 0.8 },
  storeButtonText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
  footerCopyright: { fontSize: 12, color: colors.neutral.gray400 },
  footerTitle: { color: colors.neutral.black, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
});

export default HomeScreen;