export type EmploymentType = 'uop' | 'zlecenie' | 'jdg' | 'brak';

export type ScenarioType =
  | 'ciaza'
  | 'porod'
  | 'adopcja'
  | 'rodzina_zastepcza'
  | 'szczegolne';

export type SpecialSituationType =
  | 'brak'
  | 'wczesniak_hospitalizacja'
  | 'za_zyciem'
  | 'martwe_urodzenie'
  | 'zgon_przed_8_tyg'
  | 'zgon_po_8_tyg'
  | 'upadlosc_pracodawcy'
  | 'wyrok_sadu'
  | 'przejecie_ojciec_szczegolne';

export type PrematureCategory =
  | 'brak'
  | 'ponizej_28_lub_1000g'
  | 'od_28_do_36'
  | 'o_czasie_hospitalizacja';

export type PayoutVariant = '100_70' | '81_5';

export interface LegalConfig {
  versionLabel: string;
  updatedAt: string;
  sicknessPregnancyRate: number; // 100
  maternityRate: number; // 100
  supplementaryMaternityRate: number; // 100
  paternityRate: number; // 100
  parentalStandardRate: number; // 70
  parentalAveragedRate: number; // 81.5
  sicknessMaxDaysPregnancy: number; // 270
  waitingPeriodMandatoryDays: number; // 30
  waitingPeriodVoluntaryDays: number; // 90
  employerSicknessDaysUnder50: number; // 33
  employerSicknessDaysOver50: number; // 14
  employerPayerThreshold: number; // 20
  socialContributionDeductionRate: number; // 13.71
  minMonthlyBenefitNet: number; // 1000
  maternityWeeksByChildren: {
    one: number; // 20
    two: number; // 31
    three: number; // 33
    four: number; // 35
    fivePlus: number; // 37
  };
  motherMandatoryMaternityWeeks: number; // 14
  maxPreBirthMaternityWeeks: number; // 6
  parentalWeeksSingle: number; // 41
  parentalWeeksMultiple: number; // 43
  parentalWeeksZaZyciemSingle: number; // 65
  parentalWeeksZaZyciemMultiple: number; // 67
  nonTransferableParentWeeks: number; // 9
  maxParentalParts: number; // 5
  paternityWeeks: number; // 2
  supplementaryMaxWeeksExtreme: number; // 15
  supplementaryMaxWeeksStandard: number; // 8
  stillbirthWeeks: number; // 8
  deathGraceDays: number; // 7
  fosterCareAgeLimit: number; // 7
  fosterCareDeferredAgeLimit: number; // 10
  adoptionAgeLimit: number; // 14
  maxPartTimeParentalSingle: number; // 82
  maxPartTimeParentalMultiple: number; // 86
  maxPartTimeZaZyciemSingle: number; // 130
  maxPartTimeZaZyciemMultiple: number; // 134
  applicationDeadline21Days: number; // 21
}

export interface EzlaCertificate {
  id: string;
  series: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  code: 'B' | 'brak';
  doctorName: string;
  status: 'Zatwierdzone w ZUS' | 'Wypłacone' | 'W trakcie weryfikacji';
  payer: 'Pracodawca' | 'ZUS';
}

export interface InsuredProfile {
  id: string;
  fullName: string;
  peselMasked: string;
  roleLabel: string;
  email: string;
  employmentType: EmploymentType;
  hasSicknessInsurance: boolean;
  insuranceDaysContinuous: number;
  employerInsuredCount: number; // > 20 pays employer, <= 20 pays ZUS
  ageOver50: boolean;
  monthlyGrossBasis: number;
  fatherMonthlyGrossBasis: number;
  fatherHasSicknessInsurance: boolean;
  hasZUSArrears: boolean;
  arrearsAmountPln: number;
  arrearsCertificateNumber: string;
  recentBasisIncreaseInPregnancy: boolean;
  contractEndsBeforeDelivery: boolean;
  contractTypeDetail: 'czas_nieokreslony' | 'czas_okreslony' | 'probny_ponad_miesiac' | 'zlecenie' | 'jdg' | 'brak';
  pregnancyMonthAtContractEnd: number;
  ezlaHistory: EzlaCertificate[];
  source: 'mObywatel_ZUS' | 'manual' | 'test_case' | 'pdf_ai';
}

export interface CalculatorInput {
  scenario: ScenarioType;
  employmentType: EmploymentType;
  hasSicknessInsurance: boolean;
  insuranceDaysContinuous: number;
  employerInsuredCount: number;
  ageOver50: boolean;
  monthlyGrossBasis: number;
  hasZUSArrears: boolean;
  arrearsAmountPln: number;
  recentBasisIncreaseInPregnancy: boolean;
  contractEndsBeforeDelivery: boolean;
  contractTypeDetail: InsuredProfile['contractTypeDetail'];
  pregnancyMonthAtContractEnd: number;

  // Birth / Adoption parameters
  dueOrBirthDate: string; // YYYY-MM-DD
  childrenCount: 1 | 2 | 3 | 4 | 5;
  preBirthMaternityWeeks: number; // 0..6
  childAgeYears: number; // for adoption/foster
  schoolDeferred: boolean; // foster care up to 10 years

  // Special situations
  specialSituation: SpecialSituationType;
  prematureCategory: PrematureCategory;
  hospitalWeeks: number;
  survivingChildrenCount: number; // for tragic multiple birth scenarios
  hasZaZyciemCertificate: boolean;

  // Pregnancy sickness
  ezlaDaysUsed: number;
  hasCodeB: boolean;

  // Both parents sharing
  includeFather: boolean;
  fatherHasSicknessInsurance: boolean;
  fatherMonthlyGrossBasis: number;
  fatherTakesMaternityTransferWeeks: number;
  fatherTakesParentalWeeks: number;
  fatherTakesPaternityLeave: boolean;
  paternitySplitTwoParts: boolean;
  parentsSimultaneousParental: boolean;

  // Part-time work during parental leave
  combineWithWork: boolean;
  workFraction: 0 | 0.25 | 0.5;
  workCombinedWeeks: number;

  // Payout rate choice
  payoutVariant: PayoutVariant;
  filedWithin21Days: boolean;
}

export interface TimelineSegment {
  id: string;
  parent: 'Matka / Wnioskodawca' | 'Ojciec / Drugi rodzic';
  label: string;
  leaveType:
    | 'chorobowy'
    | 'macierzynski'
    | 'uzupelniajacy'
    | 'rodzicielski'
    | 'ojcowski'
    | 'szczegolny';
  startWeek: number;
  durationWeeks: number;
  ratePercent: number;
  monthlyNetEstimate: number;
  dailyGrossBasisAmount: number;
  totalEstimatedNet: number;
  note?: string;
}

export interface DocumentChecklistItem {
  code: string;
  title: string;
  recipient: 'Pracodawca (płatnik składek)' | 'ZUS (PUE/eZUS lub placówka)' | 'Urząd Stanu Cywilnego (USC)';
  deadline: string;
  required: boolean;
  note: string;
}

export interface RiskAlert {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  legalBasis: string;
}

export interface CalculationResult {
  eligible: boolean;
  eligibilityHeadline: string;
  eligibilityReason: string;
  payerEntity: 'Pracodawca (płatnik składek)' | 'Zakład Ubezpieczeń Społecznych (ZUS)' | 'Brak wypłaty (brak uprawnień)';
  payerExplanation: string;

  // Basis metrics
  motherBasisAfterDeduction: number;
  motherDaily100: number;
  fatherBasisAfterDeduction: number;
  fatherDaily100: number;

  // Pregnancy sickness summary
  pregnancySickness: {
    eligible: boolean;
    ratePercent: number;
    maxDays: number;
    remainingDays: number;
    employerPaidDays: number;
    zusPaidFromDay: number;
    estimatedMonthlyAmount: number;
    rehabBenefitInfo: string;
  };

  // Leave dimensions (weeks)
  dimensions: {
    maternityWeeksTotal: number;
    motherMaternityWeeks: number;
    fatherMaternityWeeks: number;
    supplementaryWeeks: number;
    parentalPoolTotal: number;
    motherParentalWeeks: number;
    fatherParentalWeeks: number;
    forfeitedNonTransferableWeeks: number;
    extendedParentalBonusWeeks: number;
    paternityWeeks: number;
    grandTotalCalendarWeeks: number;
  };

  // Financial comparison Variant A (100/70) vs Variant B (81.5)
  financialSummary: {
    selectedVariantTotal: number;
    variant100_70Total: number;
    variant81_5Total: number;
    recommendedVariant: PayoutVariant;
    motherMonthlyMaternity: number;
    motherMonthlyParental: number;
    motherMonthlyCombinedWorkSalaryEstimate: number;
    fatherMonthlyParental: number;
    fatherPaternityTotal: number;
    minBenefitTopUpApplied: boolean;
  };

  timeline: TimelineSegment[];
  documents: DocumentChecklistItem[];
  risks: RiskAlert[];
  laborCodeProtection: {
    protected: boolean;
    summary: string;
    contractExtendedToBirth: boolean;
  };
}

export interface TestCaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  shortDescription: string;
  expectedDecision: 'Przyznano' | 'Odmowa' | 'Przyznano z uwagami';
  decisionSummary: string;
  documentsInPack: string[];
  applicantName: string;
  input: CalculatorInput;
  legalNote: string;
}

export interface PdfAnalysisResult {
  documentType: string;
  applicantName: string;
  insuranceVerified: boolean;
  insuranceStatusSummary: string;
  payerInfo: string;
  detectedRisks: string[];
  recommendedNextSteps: string[];
  extractedInput: Partial<CalculatorInput>;
  rawSummary: string;
  aiModel: string;
}

export interface SubmittedApplication {
  upoNumber: string;
  submittedAt: string;
  formType: 'URLOP_PRACODAWCA' | 'ZAM_ZUS' | 'ODPIS_USC';
  recipient: string;
  applicantName: string;
  summary: string;
  status: 'Przyjęto — wygenerowano UPO (symulacja)';
}

export interface CharityOrganization {
  id: string;
  name: string;
  category: 'wczesniaki' | 'strata_poronienie' | 'ciezka_choroba' | 'telefon_kryzysowy';
  categoryLabel: string;
  description: string;
  supportTypes: string[];
  phone?: string;
  website: string;
  krs?: string;
  freeOfCharge: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
