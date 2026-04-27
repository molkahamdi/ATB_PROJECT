
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, Image, StyleSheet,
  Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomDropdown from '../components/common/CustomDropdown';
import colors from '../../constants/colors';
import {
  savePersonalForm,
  updateCustomer,
  getCustomer,
  verifyRisk,
} from '../services/customerApi';

type NavigationProp = { goBack: () => void; navigate: (screen: string, params?: object) => void; };
type PersonalDataFormProps = {
  navigation: NavigationProp;
  route: { params: { customerId: string; fromRecap?: boolean } };
};
type FormData = {
  pays: string; gouvernorat: string; delegation: string; codePostal: string;
  adresse: string; adresseSuite: string; situationProfessionnelle: string;
  profession: string; posteActuel: string; dateEmbauche: string;
  employeur: string; entreprise: string; revenuMensuel: string;
  agenceDattachement: string; gouvernoratAgence: string; agence: string;
};
type DropdownOption = { label: string; value: string };

const GOUVERNORATS: DropdownOption[] = [
  'Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte','Béja',
  'Jendouba','Kef','Siliana','Kairouan','Kasserine','Sidi Bouzid','Sousse',
  'Monastir','Mahdia','Sfax','Gafsa','Tozeur','Kebili','Gabès','Medenine','Tataouine',
].map(g => ({ label: g, value: g }));

const DELEGATIONS: Record<string, string[]> = {
  'Tunis': ['Carthage','La Médina','Le Bardo','Le Kram','La Goulette','Sidi Bou Said'],
  'Ariana': ['Ariana Ville','Ettadhamen','Mnihla','Raoued','Kalâat el-Andalous','Soukra'],
  'Ben Arous': ['Ben Arous','El Mourouj','Hammam Lif','Hammam Chott','Mohamedia'],
  'Manouba': ['Manouba','Djedeida','Douar Hicher','Oued Ellil','Tebourba'],
  'Nabeul': ['Nabeul','Dar Chaabane','El Haouaria','Grombalia','Hammamet','Kélibia'],
};

const SITUATIONS_PROFESSIONNELLES: DropdownOption[] = [
  'Etudiant','Femme au foyer','Freelance','Retraité',
  'Salarié du secteur privé','Salarié du secteur public','Sans emploi',
].map(s => ({ label: s, value: s }));

const PROFESSIONS: DropdownOption[] = [
  'Retraité',"En recherche d'emploi",'Développeur','Ingénieur','Commercial',
  'Cadre Administratif','Technicien','Consultant','Designer','Fonctionnaire',
  'Enseignant','Médecin','Avocat','Architecte','Comptable','Infirmier',
  'Pharmacien','Journaliste','Artisan','Agriculteur','Autre',
].map(p => ({ label: p, value: p }));

const CODES_POSTAUX: DropdownOption[] = [
  '1000','1001','1002','1003','1004','1005','1006','1007','1008','1009',
  '2000','2001','2002','2009','2010','2011','2020','2021','2022','2023',
].map(c => ({ label: c, value: c }));

const AGENCES: DropdownOption[] = [
  'Agence Centrale Tunis','Agence Lac','Agence Lafayette','Agence Menzah',
].map(a => ({ label: a, value: a }));

const SITUATIONS_SANS_PROFESSION = ['Etudiant','Femme au foyer','Sans emploi'];
const SITUATIONS_SANS_EMPLOI     = ['Etudiant','Femme au foyer','Retraité','Sans emploi'];
const WEEK_DAYS = ['Lu','Ma','Me','Je','Ve','Sa','Di'];
const MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const INITIAL_FORM: FormData = {
  pays: 'Tunisie', gouvernorat: '', delegation: '', codePostal: '',
  adresse: '', adresseSuite: '', situationProfessionnelle: '',
  profession: '', posteActuel: '', dateEmbauche: '',
  employeur: '', entreprise: '', revenuMensuel: '',
  agenceDattachement: '', gouvernoratAgence: '', agence: '',
};

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
            <View style={[styles.phaseRadioOuter, phase.id < currentPhase && styles.phaseRadioCompleted, phase.id === currentPhase && styles.phaseRadioActive]}>
              {phase.id < currentPhase
                ? <Text style={styles.phaseRadioCheck}>✓</Text>
                : <View style={[styles.phaseRadioInner, phase.id === currentPhase && styles.phaseRadioInnerActive]} />}
            </View>
            <Text style={[styles.phaseLabel, phase.id === currentPhase && styles.phaseLabelActive, phase.id < currentPhase && styles.phaseLabelCompleted]}>
              {phase.label}
            </Text>
          </View>
          {index < phases.length - 1 && <View style={styles.phaseConnector} />}
        </React.Fragment>
      ))}
    </View>
  );
};

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

const SectionHeader: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionNumberWrapper}><Text style={styles.sectionNumber}>{number}</Text></View>
    <View style={styles.sectionTitleWrapper}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  </View>
);

const FieldHeader: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; required?: boolean; optional?: boolean }> =
  ({ icon, label, required = false, optional = false }) => (
  <View style={styles.fieldHeader}>
    <Ionicons name={icon} size={14} color={required ? colors.atb.red : colors.neutral.gray500} />
    <Text style={[styles.fieldLabel, optional && styles.optionalLabel]}>{label}</Text>
    {required && <View style={styles.requiredIndicator} />}
  </View>
);

const Footer: React.FC = () => (
  <View style={styles.footer}>
    <View style={styles.footerDivider} />
    <Text style={styles.footerText}>© 2026 Arab Tunisian Bank · Tous droits réservés</Text>
    <Text style={styles.footerSubtext}>Service client : 71 143 000</Text>
  </View>
);

const PersonalDataForm: React.FC<PersonalDataFormProps> = ({ navigation, route }) => {
  const { customerId } = route.params;
  const fromRecap = route.params?.fromRecap ?? false;

  const [isLoading, setIsLoading]   = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [formData, setFormData]     = useState<FormData>(INITIAL_FORM);
  const [showProfessionalFields, setShowProfessionalFields] = useState(false);
  const [showProfessionField, setShowProfessionField]       = useState(true);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay,   setSelectedDay]   = useState(new Date().getDate());

  useEffect(() => {
    if (fromRecap) {
      setIsFetching(true);
      getCustomer(customerId)
        .then((data: any) => {
          const situation = data.situationProfessionnelle || '';
          setFormData({
            pays: data.pays || 'Tunisie', gouvernorat: data.gouvernorat || '',
            delegation: data.delegation || '', codePostal: data.codePostal || '',
            adresse: data.adresse || '', adresseSuite: data.adresseSuite || '',
            situationProfessionnelle: situation, profession: data.profession || '',
            posteActuel: data.posteActuel || '', dateEmbauche: data.dateEmbauche || '',
            employeur: data.employeur || '', entreprise: data.entreprise || '',
            revenuMensuel: data.revenuMensuel ? String(data.revenuMensuel) : '',
            agenceDattachement: data.agenceDattachement || '',
            gouvernoratAgence: data.gouvernoratAgence || '', agence: data.agence || '',
          });
          setShowProfessionField(!SITUATIONS_SANS_PROFESSION.includes(situation));
          setShowProfessionalFields(!SITUATIONS_SANS_EMPLOI.includes(situation));
        })
        .catch(() => Alert.alert('Erreur', 'Impossible de charger vos données.'))
        .finally(() => setIsFetching(false));
    }
  }, []);

  const formatDate = (d: number, m: number, y: number) =>
    `${d.toString().padStart(2,'0')}/${(m+1).toString().padStart(2,'0')}/${y}`;

  const openDatePicker = () => {
    const ex = formData.dateEmbauche;
    if (ex) {
      const [d, m, y] = ex.split('/');
      const p = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
      if (!isNaN(p.getTime())) {
        setSelectedDay(parseInt(d)); setSelectedMonth(parseInt(m)-1); setSelectedYear(parseInt(y));
        setDatePickerVisible(true); return;
      }
    }
    const t = new Date();
    setSelectedDay(t.getDate()); setSelectedMonth(t.getMonth()); setSelectedYear(t.getFullYear());
    setDatePickerVisible(true);
  };

  const applyDate = () => {
    updateFormData('dateEmbauche', formatDate(selectedDay, selectedMonth, selectedYear));
    setDatePickerVisible(false);
  };

  const changeMonth = (dir: 'prev'|'next') => {
    if (dir === 'prev') {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y-1); }
      else setSelectedMonth(m => m-1);
    } else {
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); }
      else setSelectedMonth(m => m+1);
    }
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const adj = firstDay === 0 ? 6 : firstDay - 1;
    const dim = new Date(selectedYear, selectedMonth+1, 0).getDate();
    const prev = new Date(selectedYear, selectedMonth, 0).getDate();
    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
    for (let i = 0; i < adj; i++) { const d = prev-adj+i+1; days.push({ day: d, isCurrentMonth: false, date: new Date(selectedYear, selectedMonth-1, d) }); }
    for (let i = 1; i <= dim; i++) days.push({ day: i, isCurrentMonth: true, date: new Date(selectedYear, selectedMonth, i) });
    const rem = 42 - days.length;
    for (let i = 1; i <= rem; i++) days.push({ day: i, isCurrentMonth: false, date: new Date(selectedYear, selectedMonth+1, i) });
    return days;
  };
  const calendarDays = generateCalendarDays();

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'situationProfessionnelle') {
      setShowProfessionField(!SITUATIONS_SANS_PROFESSION.includes(value));
      setShowProfessionalFields(!SITUATIONS_SANS_EMPLOI.includes(value));
      setFormData(prev => ({ ...prev, [field]: value, profession: '', posteActuel: '', dateEmbauche: '', employeur: '', entreprise: '', revenuMensuel: '' }));
      if (SITUATIONS_SANS_PROFESSION.includes(value)) {
        const auto = value === 'Sans emploi' ? "En recherche d'emploi" : value;
        setFormData(prev => ({ ...prev, [field]: value, profession: auto }));
      }
    }
  };

  const getDelegationOptions = (): DropdownOption[] => {
    if (!formData.gouvernorat) return [];
    return (DELEGATIONS[formData.gouvernorat] || []).map(d => ({ label: d, value: d }));
  };

  const validateForm = (): boolean => {
    const required: (keyof FormData)[] = ['gouvernorat','delegation','codePostal','adresse','situationProfessionnelle'];
    if (showProfessionField) required.push('profession');
    if (showProfessionalFields) required.push('posteActuel','dateEmbauche','entreprise','revenuMensuel');
    required.push('gouvernoratAgence','agence');
    if (required.some(f => !formData[f])) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires (*).');
      return false;
    }
    return true;
  };

  // ── handleContinue — flux complet ────────────────────────
  const handleContinue = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const payload = {
        pays: formData.pays, gouvernorat: formData.gouvernorat,
        delegation: formData.delegation, codePostal: formData.codePostal,
        adresse: formData.adresse, adresseSuite: formData.adresseSuite,
        situationProfessionnelle: formData.situationProfessionnelle,
        profession: formData.profession, posteActuel: formData.posteActuel,
        dateEmbauche: formData.dateEmbauche, employeur: formData.employeur,
        entreprise: formData.entreprise,
        revenuMensuel: formData.revenuMensuel ? parseFloat(formData.revenuMensuel) : undefined,
        gouvernoratAgence: formData.gouvernoratAgence, agence: formData.agence,
      };

      // ── MODE MODIFICATION ─────────────────────────────────
      if (fromRecap) {
        setLoadingStep('Sauvegarde...');
        await updateCustomer(customerId, payload);
        Alert.alert('✅ Données mises à jour', 'Vos informations ont été sauvegardées.', [
          { text: 'Retour au récapitulatif', onPress: () => navigation.navigate('Recapitulatif', { customerId }) },
        ]);
        return;
      }

      // ── ÉTAPE 1 : sauvegarder le formulaire personnel ─────
      setLoadingStep('Enregistrement de vos données...');
      const result = await savePersonalForm(customerId, payload);

      // ── ÉTAPE 2 : évaluation du risque (FCM RISK) ─────────
      // Toujours riskStatus=LR en mode statique → passe toujours
      setLoadingStep('Évaluation du profil...');
      const riskCheck = await verifyRisk(customerId);

      if (!riskCheck.success) {
        Alert.alert(
          'Demande non autorisée',
          riskCheck.message,
          [{ text: 'Compris' }],
        );
        return;
      }

      // ── ÉTAPE 3 : récapitulatif ────────────────────────────
      setLoadingStep('Finalisation...');
      navigation.navigate('Recapitulatif', { customerId: result.id });

    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message || 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top']}>
        <ActivityIndicator size="large" color={colors.atb.red} />
        <Text style={styles.loadingText}>Chargement de vos données...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.white} />

      <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.monthNavButton} onPress={() => changeMonth('prev')}><Text style={styles.monthNavText}>←</Text></TouchableOpacity>
              <Text style={styles.monthYearText}>{MONTHS[selectedMonth]} {selectedYear}</Text>
              <TouchableOpacity style={styles.monthNavButton} onPress={() => changeMonth('next')}><Text style={styles.monthNavText}>→</Text></TouchableOpacity>
            </View>
            <View style={styles.weekDaysContainer}>
              {WEEK_DAYS.map((day, i) => <Text key={i} style={styles.weekDayText}>{day}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isSelected = day.isCurrentMonth && day.day === selectedDay && day.date.getMonth() === selectedMonth && day.date.getFullYear() === selectedYear;
                const isToday = day.date.toDateString() === new Date().toDateString();
                return (
                  <TouchableOpacity key={index}
                    style={[styles.calendarDay, !day.isCurrentMonth && styles.calendarDayOtherMonth, isSelected && styles.calendarDaySelected, isToday && styles.calendarDayToday]}
                    onPress={() => { if (day.isCurrentMonth) setSelectedDay(day.day); }}>
                    <Text style={[styles.calendarDayText, !day.isCurrentMonth && styles.calendarDayTextOtherMonth, isSelected && styles.calendarDayTextSelected, isToday && !isSelected && styles.calendarDayTextToday]}>
                      {day.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.calendarActions}>
              <TouchableOpacity style={styles.calendarCancelButton} onPress={() => setDatePickerVisible(false)}>
                <Text style={styles.calendarCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarApplyButton} onPress={applyDate}>
                <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.calendarApplyGradient}>
                  <Text style={styles.calendarApplyText}>Appliquer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Header />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            <View style={styles.titleSection}>
              <Text style={styles.title}>{fromRecap ? "Modifier l'adresse & profession" : 'Données personnelles'}</Text>
              <Text style={styles.subtitle}>Complétez vos informations personnelles et choisissez votre agence</Text>
              <View style={styles.phaseIndicatorWrapper}><PhaseIndicator currentPhase={1} /></View>
            </View>

            {fromRecap && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>Mode modification — Vos données précédentes sont pré-remplies.</Text>
              </View>
            )}

            {/* SECTION 1 : Adresse */}
            <View style={styles.sectionCard}>
              <SectionHeader number="1" title="Adresse de résidence" description="Votre adresse actuelle en Tunisie" />
              <View style={styles.formGrid}>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="flag-outline" label="Pays" />
                  <CustomDropdown label="" value={formData.pays} options={[{ label: 'Tunisie', value: 'Tunisie' }]} onSelect={v => updateFormData('pays', v)} required={false} />
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="location-outline" label="Gouvernorat" required />
                  <CustomDropdown label="" value={formData.gouvernorat} options={GOUVERNORATS} onSelect={v => updateFormData('gouvernorat', v)} required={false} placeholder="Sélectionner" />
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="map-outline" label="Délégation" required />
                  <CustomDropdown label="" value={formData.delegation} options={getDelegationOptions()} onSelect={v => updateFormData('delegation', v)} required={false} placeholder="Sélectionner" />
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="mail-outline" label="Code postal" required />
                  <CustomDropdown label="" value={formData.codePostal} options={CODES_POSTAUX} onSelect={v => updateFormData('codePostal', v)} required={false} placeholder="Sélectionner" />
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="home-outline" label="Adresse complète" required />
                  <View style={styles.textInputContainer}>
                    <TextInput style={styles.textInput} placeholder="Numéro, rue, appartement..."
                      placeholderTextColor={colors.neutral.gray400} value={formData.adresse}
                      onChangeText={v => updateFormData('adresse', v)} selectionColor={colors.atb.red} />
                  </View>
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="add-circle-outline" label="Complément d'adresse" optional />
                  <View style={styles.textInputContainer}>
                    <TextInput style={styles.textInput} placeholder="Bâtiment, étage, porte..."
                      placeholderTextColor={colors.neutral.gray400} value={formData.adresseSuite}
                      onChangeText={v => updateFormData('adresseSuite', v)} selectionColor={colors.atb.red} />
                  </View>
                </View>
              </View>
            </View>

            {/* SECTION 2 : Profession */}
            <View style={styles.sectionCard}>
              <SectionHeader number="2" title="Situation professionnelle" description="Informations sur votre activité" />
              <View style={styles.formGrid}>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="briefcase-outline" label="Situation actuelle" required />
                  <CustomDropdown label="" value={formData.situationProfessionnelle} options={SITUATIONS_PROFESSIONNELLES}
                    onSelect={v => updateFormData('situationProfessionnelle', v)} required={false} placeholder="Sélectionner votre situation" />
                </View>
                {showProfessionField && (
                  <View style={[styles.fieldGroup, styles.fullWidth]}>
                    <FieldHeader icon="school-outline" label="Profession" required />
                    <CustomDropdown label="" value={formData.profession} options={PROFESSIONS}
                      onSelect={v => updateFormData('profession', v)} required={false} placeholder="Sélectionner votre profession" />
                  </View>
                )}
                {showProfessionalFields && (
                  <>
                    <View style={[styles.fieldGroup, styles.fullWidth]}>
                      <FieldHeader icon="person-outline" label="Poste actuel" required />
                      <View style={styles.textInputContainer}>
                        <TextInput style={styles.textInput} placeholder="Ex: Développeur Full Stack"
                          placeholderTextColor={colors.neutral.gray400} value={formData.posteActuel}
                          onChangeText={v => updateFormData('posteActuel', v)} selectionColor={colors.atb.red} />
                      </View>
                    </View>
                    <View style={[styles.fieldGroup, styles.fullWidth]}>
                      <FieldHeader icon="calendar-outline" label="Date d'embauche" required />
                      <TouchableOpacity style={styles.dateInputTouchable} onPress={openDatePicker} activeOpacity={0.7}>
                        <View style={styles.dateInputContainer}>
                          <Text style={[styles.dateInputText, !formData.dateEmbauche && styles.dateInputPlaceholder]}>
                            {formData.dateEmbauche || 'JJ/MM/AAAA'}
                          </Text>
                          <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.calendarIconContainer}>
                            <Text style={styles.calendarIcon}>📅</Text>
                          </LinearGradient>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.fieldGroup, styles.fullWidth]}>
                      <FieldHeader icon="business-outline" label="Entreprise" required />
                      <View style={styles.textInputContainer}>
                        <TextInput style={styles.textInput} placeholder="Nom de l'entreprise"
                          placeholderTextColor={colors.neutral.gray400} value={formData.entreprise}
                          onChangeText={v => updateFormData('entreprise', v)} selectionColor={colors.atb.red} />
                      </View>
                    </View>
                    <View style={[styles.fieldGroup, styles.fullWidth]}>
                      <FieldHeader icon="cash-outline" label="Revenu mensuel net" required />
                      <View style={styles.currencyInputContainer}>
                        <Text style={styles.currencySymbol}>DT</Text>
                        <TextInput style={styles.currencyInput} placeholder="0,00"
                          placeholderTextColor={colors.neutral.gray400} value={formData.revenuMensuel}
                          onChangeText={v => updateFormData('revenuMensuel', v)}
                          keyboardType="numeric" selectionColor={colors.atb.red} />
                      </View>
                    </View>
                  </>
                )}
                {!showProfessionalFields && formData.situationProfessionnelle && (
                  <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.atb.red} />
                    <Text style={styles.infoText}>
                      {formData.situationProfessionnelle === 'Etudiant' ? "Vous êtes étudiant. Les champs d'emploi ne sont pas requis."
                        : formData.situationProfessionnelle === 'Femme au foyer' ? "Vous êtes femme au foyer. Les champs d'emploi ne sont pas requis."
                        : formData.situationProfessionnelle === 'Retraité' ? "Vous êtes retraité. Les champs d'emploi ne sont pas requis."
                        : "Vous êtes en recherche d'emploi. Les champs d'emploi ne sont pas requis."}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 3 : Agence */}
            <View style={styles.sectionCard}>
              <SectionHeader number="3" title="Agence de rattachement" description="Votre agence ATB de référence" />
              <View style={styles.formGrid}>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="business-outline" label="Gouvernorat de l'agence" required />
                  <CustomDropdown label="" value={formData.gouvernoratAgence} options={GOUVERNORATS}
                    onSelect={v => updateFormData('gouvernoratAgence', v)} required={false} placeholder="Sélectionner le gouvernorat" />
                </View>
                <View style={[styles.fieldGroup, styles.fullWidth]}>
                  <FieldHeader icon="ban-outline" label="Agence ATB" required />
                  <CustomDropdown label="" value={formData.agence} options={AGENCES}
                    onSelect={v => updateFormData('agence', v)} required={false} placeholder="Sélectionner votre agence" />
                </View>
              </View>
              <View style={styles.securityCard}>
                <View style={styles.securityHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.atb.red} />
                  <Text style={styles.securityTitle}>Confidentialité garantie</Text>
                </View>
                <Text style={styles.securityText}>ATB protège vos données personnelles conformément à la réglementation sur la protection des données.</Text>
              </View>
            </View>

            {/* Boutons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={() => fromRecap ? navigation.navigate('Recapitulatif', { customerId }) : navigation.goBack()}
                style={styles.backButton}>
                <Ionicons name="arrow-back" size={18} color={colors.atb.red} />
                <Text style={styles.backButtonText}>{fromRecap ? 'Annuler' : 'Retour'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleContinue} style={[styles.continueButton, isLoading && { opacity: 0.7 }]} disabled={isLoading}>
                <LinearGradient colors={[colors.atb.red, colors.atb.red]} style={styles.continueGradient}>
                  {isLoading && <ActivityIndicator size="small" color={colors.neutral.white} style={{ marginRight: 8 }} />}
                  <Text style={styles.continueButtonText}>
                    {isLoading ? (loadingStep || 'Traitement...') : (fromRecap ? 'Sauvegarder' : 'Continuer')}
                  </Text>
                  {!isLoading && !fromRecap && <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  content: { padding: 20 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.white },
  loadingText: { marginTop: 16, fontSize: 15, color: colors.neutral.gray600 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray300, backgroundColor: colors.neutral.gray100 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  logo: { width: 40, height: 40 },
  logoGradient: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bankName: { fontSize: 16, fontWeight: '700', color: colors.atb.red },
  bankSubtitle: { fontSize: 11, color: colors.neutral.gray500, marginTop: 2 },
  digipackBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  digipackText: { fontSize: 10, fontWeight: '800', color: colors.neutral.white, letterSpacing: 2 },
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
  titleSection: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.neutral.gray600, lineHeight: 20, marginBottom: 10 },
  editBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(200,35,51,0.07)', borderWidth: 1, borderColor: 'rgba(200,35,51,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 },
  editBannerText: { flex: 1, fontSize: 13, color: colors.atb.red, fontWeight: '500' },
  sectionCard: { backgroundColor: colors.neutral.white, borderRadius: 16, marginBottom: 16, padding: 20, shadowColor: colors.neutral.gray900, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: colors.neutral.beige },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.beige },
  sectionNumberWrapper: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.atb.red, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionNumber: { fontSize: 14, fontWeight: '700', color: colors.neutral.white },
  sectionTitleWrapper: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral.gray900, marginBottom: 2 },
  sectionDescription: { fontSize: 12, color: colors.neutral.gray500 },
  formGrid: { gap: 10 },
  fieldGroup: { flex: 1 },
  fullWidth: { flexBasis: '100%' },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.neutral.gray700 },
  optionalLabel: { color: colors.neutral.gray500 },
  requiredIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.atb.red, marginLeft: 2 },
  textInputContainer: { height: 48, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  textInput: { fontSize: 14, color: colors.neutral.gray900, fontWeight: '500', padding: 0 },
  currencyInputContainer: { height: 48, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 14, fontWeight: '600', color: colors.neutral.gray600, marginRight: 8 },
  currencyInput: { flex: 1, fontSize: 14, color: colors.neutral.gray900, fontWeight: '500', padding: 0 },
  dateInputTouchable: { width: '100%' },
  dateInputContainer: { height: 50, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInputText: { fontSize: 14, color: colors.neutral.gray900, fontWeight: '600', flex: 1 },
  dateInputPlaceholder: { color: colors.neutral.gray400, fontWeight: '400' },
  calendarIconContainer: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  calendarIcon: { fontSize: 18 },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(200,35,51,0.05)', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,35,51,0.1)', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: colors.neutral.gray700, fontWeight: '500', lineHeight: 18 },
  securityCard: { marginTop: 15, padding: 16, backgroundColor: colors.neutral.offWhite, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.beige },
  securityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  securityTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral.gray800 },
  securityText: { fontSize: 12, color: colors.neutral.gray600, lineHeight: 18 },
  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24, marginTop: 8 },
  backButton: { flex: 1, height: 52, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.neutral.gray300, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  backButtonText: { fontSize: 15, fontWeight: '600', color: colors.atb.red },
  continueButton: { flex: 1, borderRadius: 12, overflow: 'hidden', shadowColor: colors.atb.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  continueGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingHorizontal: 24, gap: 8 },
  continueButtonText: { fontSize: 15, fontWeight: '700', color: colors.neutral.white },
  footer: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  footerDivider: { width: 40, height: 2, backgroundColor: colors.neutral.gray300, borderRadius: 1, marginBottom: 16 },
  footerText: { fontSize: 11, color: colors.neutral.gray500, marginBottom: 4 },
  footerSubtext: { fontSize: 10, color: colors.neutral.gray400 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: colors.neutral.white, borderRadius: 16, padding: 20, shadowColor: colors.neutral.gray900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  monthNavButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.gray100 },
  monthNavText: { fontSize: 16, fontWeight: '600', color: colors.atb.red },
  monthYearText: { fontSize: 18, fontWeight: '700', color: colors.neutral.gray900 },
  weekDaysContainer: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 5 },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.neutral.gray600, paddingVertical: 8 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarDayOtherMonth: { opacity: 0.3 },
  calendarDaySelected: { backgroundColor: colors.atb.red },
  calendarDayToday: { borderWidth: 1, borderColor: colors.atb.red },
  calendarDayText: { fontSize: 15, fontWeight: '500', color: colors.neutral.gray900 },
  calendarDayTextOtherMonth: { color: colors.neutral.gray500 },
  calendarDayTextSelected: { color: colors.neutral.white, fontWeight: '700' },
  calendarDayTextToday: { color: colors.atb.red, fontWeight: '700' },
  calendarActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  calendarCancelButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.neutral.gray300, borderRadius: 8 },
  calendarCancelText: { fontSize: 15, fontWeight: '600', color: colors.neutral.gray700 },
  calendarApplyButton: { flex: 1, height: 48, borderRadius: 8, overflow: 'hidden' },
  calendarApplyGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  calendarApplyText: { fontSize: 15, fontWeight: '700', color: colors.neutral.white },
});

export default PersonalDataForm;