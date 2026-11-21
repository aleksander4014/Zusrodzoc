import type {
  CalculationResult,
  CalculatorInput,
  DocumentChecklistItem,
  LegalConfig,
  PayoutVariant,
  RiskAlert,
  TimelineSegment,
} from './types.ts';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getMaternityWeeksForCount(count: number, config: LegalConfig): number {
  if (count <= 1) return config.maternityWeeksByChildren.one;
  if (count === 2) return config.maternityWeeksByChildren.two;
  if (count === 3) return config.maternityWeeksByChildren.three;
  if (count === 4) return config.maternityWeeksByChildren.four;
  return config.maternityWeeksByChildren.fivePlus;
}

export function calculateBenefits(
  input: CalculatorInput,
  config: LegalConfig
): CalculationResult {
  const risks: RiskAlert[] = [];
  const documents: DocumentChecklistItem[] = [];
  const timeline: TimelineSegment[] = [];

  // 1. Payer routing (art. 61 ust. 1 pkt 1 ustawy zasiłkowej)
  const employerPays =
    (input.employmentType === 'uop' || input.employmentType === 'zlecenie') &&
    input.employerInsuredCount > config.employerPayerThreshold;

  // 2. Waiting period & insurance eligibility
  const requiredWaitingDays =
    input.employmentType === 'uop'
      ? config.waitingPeriodMandatoryDays
      : input.employmentType === 'zlecenie' || input.employmentType === 'jdg'
      ? config.waitingPeriodVoluntaryDays
      : 9999;

  const isSpecialPostEmploymentAllowance =
    input.specialSituation === 'upadlosc_pracodawcy' ||
    input.specialSituation === 'wyrok_sadu';

  // Maternity allowance has NO waiting period (unlike sickness allowance!)
  const hasMaternityRight =
    (input.hasSicknessInsurance && input.employmentType !== 'brak') ||
    isSpecialPostEmploymentAllowance;

  const hasPregnancySicknessRight =
    input.hasSicknessInsurance &&
    input.employmentType !== 'brak' &&
    input.insuranceDaysContinuous >= requiredWaitingDays;

  // 3. Financial basis (gross minus 13.71% employee social contributions)
  const deductionMultiplier = 1 - config.socialContributionDeductionRate / 100;
  const motherBasis = round2(Math.max(0, input.monthlyGrossBasis) * deductionMultiplier);
  const motherDaily100 = round2(motherBasis / 30);

  const fatherBasis = round2(Math.max(0, input.fatherMonthlyGrossBasis) * deductionMultiplier);
  const fatherDaily100 = round2(fatherBasis / 30);

  // Check JDG arrears risk
  if (input.employmentType === 'jdg' && input.hasZUSArrears && input.arrearsAmountPln > 0) {
    risks.push({
      id: 'risk-arrears',
      severity: 'error',
      title: `Zadłużenie ze składek ZUS (${input.arrearsAmountPln.toFixed(2)} zł)`,
      description:
        'Dla osób prowadzących pozarolniczą działalność gospodarczą zaległość z tytułu składek przekraczająca 1% minimalnego wynagrodzenia powoduje wstrzymanie wypłaty zasiłku chorobowego i macierzyńskiego do czasu spłaty (maks. 6 miesięcy od dnia powstania prawa).',
      legalBasis: 'Art. 2a ustawy zasiłkowej (Dz.U. z 2026 r. poz. 854)',
    });
  }

  // Check waiting period for pregnancy sickness
  if (
    input.hasSicknessInsurance &&
    input.employmentType !== 'brak' &&
    input.insuranceDaysContinuous < requiredWaitingDays
  ) {
    risks.push({
      id: 'risk-waiting-period',
      severity: 'warning',
      title: `Nieukończony okres wyczekiwania na zasiłek chorobowy (${input.insuranceDaysContinuous} z ${requiredWaitingDays} dni)`,
      description: `Dla ${
        input.employmentType === 'uop'
          ? 'obowiązkowego ubezpieczenia (UoP)'
          : 'dobrowolnego ubezpieczenia (zlecenie / JDG)'
      } prawo do zasiłku chorobowego w ciąży powstaje co do zasady po ${requiredWaitingDays} dniach nieprzerwanego ubezpieczenia. Uwaga: zasiłek macierzyński po porodzie przysługuje bez okresu wyczekiwania.`,
      legalBasis: 'Art. 4 ust. 1 ustawy zasiłkowej',
    });
  }

  if (!input.hasSicknessInsurance && !isSpecialPostEmploymentAllowance) {
    risks.push({
      id: 'risk-no-insurance',
      severity: 'error',
      title: 'Brak podlegania ubezpieczeniu chorobowemu',
      description:
        'Na dzień porodu lub powstania niezdolności do pracy musisz podlegać ubezpieczeniu chorobowemu. Jeśli wykonujesz umowę zlecenia lub JDG bez zgłoszenia do dobrowolnego chorobowego, zasiłek z ZUS nie przysługuje (sprawdź świadczenie rodzicielskie w gminie).',
      legalBasis: 'Art. 1 ust. 1 oraz art. 29 ust. 1 ustawy zasiłkowej',
    });
  }

  if (input.recentBasisIncreaseInPregnancy) {
    risks.push({
      id: 'risk-basis-increase',
      severity: 'warning',
      title: 'Ryzyko postępowania wyjaśniającego ZUS (podwyższenie podstawy w ciąży)',
      description:
        'Podwyższenie wynagrodzenia lub podstawy składek w okresie ciąży może zostać skontrolowane przez ZUS. Jeśli ZUS uzna, że zmiana miała wyłącznie na celu uzyskanie wyższego zasiłku lub umowa była pozorna, może wydać decyzję obniżającą podstawę albo wyłączającą z ubezpieczeń.',
      legalBasis: 'Art. 83 i art. 68 ustawy o systemie ubezpieczeń społecznych',
    });
  }

  if (input.contractEndsBeforeDelivery) {
    if (
      input.employmentType === 'uop' &&
      (input.contractTypeDetail === 'czas_okreslony' ||
        input.contractTypeDetail === 'probny_ponad_miesiac') &&
      input.pregnancyMonthAtContractEnd >= 3
    ) {
      risks.push({
        id: 'risk-contract-extended',
        severity: 'info',
        title: 'Umowa o pracę ulega automatycznemu przedłużeniu do dnia porodu',
        description:
          'Umowa na czas określony albo na okres próbny przekraczający 1 miesiąc, która rozwiązałaby się po upływie 3. miesiąca ciąży, zostaje z mocy prawa przedłużona do dnia porodu — zachowujesz pełne prawo do zasiłku macierzyńskiego (wypłaci go ZUS po ustaniu zatrudnienia).',
        legalBasis: 'Art. 177 § 3 Kodeksu pracy',
      });
    } else if (input.employmentType !== 'uop') {
      risks.push({
        id: 'risk-non-uop-end',
        severity: 'error',
        title: 'Zakończenie zlecenia lub JDG przed porodem = utrata prawa do zasiłku',
        description:
          'Szczególna ochrona z Kodeksu pracy (przedłużenie umowy do dnia porodu) NIE dotyczy umów zlecenia ani działalności gospodarczej. Wyrejestrowanie z ubezpieczenia chorobowego przed porodem pozbawia prawa do zasiłku macierzyńskiego.',
        legalBasis: 'Art. 177 Kodeksu pracy oraz art. 29 ustawy zasiłkowej',
      });
    } else if (input.pregnancyMonthAtContractEnd < 3 && !isSpecialPostEmploymentAllowance) {
      risks.push({
        id: 'risk-contract-before-3m',
        severity: 'error',
        title: 'Rozwiązanie umowy przed upływem 3. miesiąca ciąży',
        description:
          'Jeśli umowa na czas określony kończy się przed upływem 3. miesiąca ciąży, nie ulega automatycznemu przedłużeniu do dnia porodu. Zasiłek macierzyński po ustaniu zatrudnienia przysługuje jedynie w szczególnych przypadkach (np. upadłość/likwidacja pracodawcy).',
        legalBasis: 'Art. 177 § 3 Kodeksu pracy oraz art. 30 ustawy zasiłkowej',
      });
    }
  }

  // 4. Pregnancy sickness section
  const sicknessRate = input.hasCodeB ? config.sicknessPregnancyRate : 80;
  const employerSickDays =
    input.employmentType === 'uop'
      ? input.ageOver50
        ? config.employerSicknessDaysOver50
        : config.employerSicknessDaysUnder50
      : 0;
  const remainingSickDays = Math.max(0, config.sicknessMaxDaysPregnancy - input.ezlaDaysUsed);
  const pregnancyMonthly = round2(motherDaily100 * 30 * (sicknessRate / 100));

  if (input.scenario === 'ciaza' && !input.hasCodeB) {
    risks.push({
      id: 'risk-no-code-b',
      severity: 'warning',
      title: 'Brak kodu literowego „B” na zwolnieniu e-ZLA',
      description:
        'Aby zasiłek chorobowy w ciąży wynosił 100% podstawy wymiaru (zamiast 80%) oraz przysługiwał do 270 dni (zamiast 182 dni), lekarz musi wpisać kod literowy „B” na e-ZLA lub wydać odrębne zaświadczenie o stanie ciąży.',
      legalBasis: 'Art. 11 ust. 2 pkt 1 oraz art. 8 ustawy zasiłkowej',
    });
  }

  // 5. Adoption / Foster care age limits check
  let adoptionAgeExceeded = false;
  let adoptionAgeCap = 99;
  if (input.scenario === 'adopcja') {
    adoptionAgeCap = config.adoptionAgeLimit;
    if (input.childAgeYears >= adoptionAgeCap) {
      adoptionAgeExceeded = true;
      risks.push({
        id: 'risk-adoption-age',
        severity: 'error',
        title: `Wiek dziecka (${input.childAgeYears} lat) przekracza limit dla przysposobienia (${adoptionAgeCap} lat)`,
        description: `Urlop na warunkach urlopu macierzyńskiego oraz zasiłek macierzyński przy wniosku o przysposobienie przysługuje wyłącznie do ukończenia przez dziecko ${adoptionAgeCap}. roku życia.`,
        legalBasis: 'Art. 183 § 1 i § 4 Kodeksu pracy',
      });
    }
  } else if (input.scenario === 'rodzina_zastepcza') {
    adoptionAgeCap = input.schoolDeferred
      ? config.fosterCareDeferredAgeLimit
      : config.fosterCareAgeLimit;
    if (input.childAgeYears >= adoptionAgeCap) {
      adoptionAgeExceeded = true;
      risks.push({
        id: 'risk-foster-age',
        severity: 'error',
        title: `Wiek dziecka (${input.childAgeYears} lat) przekracza limit dla rodziny zastępczej (${adoptionAgeCap} lat)`,
        description: `Dla niezawodowej rodziny zastępczej uprawnienie przysługuje do ukończenia przez dziecko ${config.fosterCareAgeLimit}. roku życia (lub ${config.fosterCareDeferredAgeLimit}. roku życia w razie odroczenia obowiązku szkolnego).`,
        legalBasis: 'Art. 183 § 1 Kodeksu pracy',
      });
    }
  }

  // 6. Compute Leave Dimensions (weeks)
  let maternityWeeksTotal = 0;
  let motherMaternityWeeks = 0;
  let fatherMaternityWeeks = 0;
  let supplementaryWeeks = 0;
  let parentalPoolTotal = 0;
  let motherParentalWeeks = 0;
  let fatherParentalWeeks = 0;
  let forfeitedNonTransferableWeeks = 0;
  let extendedParentalBonusWeeks = 0;
  let paternityWeeks = 0;

  const isTragicLoss =
    input.specialSituation === 'martwe_urodzenie' ||
    input.specialSituation === 'zgon_przed_8_tyg' ||
    input.specialSituation === 'zgon_po_8_tyg';

  if (hasMaternityRight && !adoptionAgeExceeded) {
    if (isSpecialPostEmploymentAllowance) {
      // Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu + po porodzie macierzyński
      maternityWeeksTotal = getMaternityWeeksForCount(input.childrenCount, config);
      motherMaternityWeeks = maternityWeeksTotal;
      parentalPoolTotal =
        input.childrenCount === 1 ? config.parentalWeeksSingle : config.parentalWeeksMultiple;
      motherParentalWeeks = Math.max(0, parentalPoolTotal - config.nonTransferableParentWeeks);
      forfeitedNonTransferableWeeks = input.includeFather && input.fatherHasSicknessInsurance
        ? 0
        : config.nonTransferableParentWeeks;
      fatherParentalWeeks =
        input.includeFather && input.fatherHasSicknessInsurance
          ? config.nonTransferableParentWeeks
          : 0;
    } else if (isTragicLoss) {
      if (input.childrenCount > 1 && input.survivingChildrenCount > 0) {
        maternityWeeksTotal = getMaternityWeeksForCount(input.survivingChildrenCount, config);
        motherMaternityWeeks = maternityWeeksTotal;
        parentalPoolTotal =
          input.survivingChildrenCount === 1
            ? config.parentalWeeksSingle
            : config.parentalWeeksMultiple;
        motherParentalWeeks = Math.max(0, parentalPoolTotal - config.nonTransferableParentWeeks);
        fatherParentalWeeks =
          input.includeFather && input.fatherHasSicknessInsurance
            ? config.nonTransferableParentWeeks
            : 0;
        forfeitedNonTransferableWeeks =
          fatherParentalWeeks === 0 ? config.nonTransferableParentWeeks : 0;
      } else if (
        input.specialSituation === 'martwe_urodzenie' ||
        input.specialSituation === 'zgon_przed_8_tyg'
      ) {
        maternityWeeksTotal = config.stillbirthWeeks;
        motherMaternityWeeks = config.stillbirthWeeks;
      } else {
        // zgon po 8 tygodniach -> zachowane prawo przez 7 dni (1 tydzień)
        maternityWeeksTotal = Math.ceil(config.deathGraceDays / 7);
        motherMaternityWeeks = maternityWeeksTotal;
      }
    } else {
      // Standard birth, premature, Za życiem, adoption, foster care, early father takeover
      maternityWeeksTotal = getMaternityWeeksForCount(input.childrenCount, config);

      // Adoption/foster approaching age limit still guarantees minimum 9 weeks
      if (
        (input.scenario === 'adopcja' || input.scenario === 'rodzina_zastepcza') &&
        adoptionAgeCap - input.childAgeYears <= 0.4
      ) {
        maternityWeeksTotal = Math.max(9, Math.min(maternityWeeksTotal, 9));
      }

      if (input.specialSituation === 'przejecie_ojciec_szczegolne') {
        // Father takes over earlier than 14 weeks (e.g., mother hospitalized/deceased/unable to care)
        const clampedTransfer = Math.min(
          maternityWeeksTotal,
          Math.max(1, input.fatherTakesMaternityTransferWeeks || maternityWeeksTotal - 4)
        );
        fatherMaternityWeeks = clampedTransfer;
        motherMaternityWeeks = maternityWeeksTotal - fatherMaternityWeeks;
      } else if (input.includeFather && input.fatherHasSicknessInsurance) {
        const maxTransferable = Math.max(
          0,
          maternityWeeksTotal - config.motherMandatoryMaternityWeeks
        );
        fatherMaternityWeeks = Math.min(
          maxTransferable,
          Math.max(0, input.fatherTakesMaternityTransferWeeks)
        );
        motherMaternityWeeks = maternityWeeksTotal - fatherMaternityWeeks;
      } else {
        motherMaternityWeeks = maternityWeeksTotal;
        fatherMaternityWeeks = 0;
      }

      // Supplementary maternity leave (2025/2026 amendment for premature / hospitalized newborns)
      if (
        input.specialSituation === 'wczesniak_hospitalizacja' &&
        input.prematureCategory !== 'brak'
      ) {
        const cap =
          input.prematureCategory === 'ponizej_28_lub_1000g'
            ? config.supplementaryMaxWeeksExtreme
            : config.supplementaryMaxWeeksStandard;
        supplementaryWeeks = Math.min(cap, Math.max(1, input.hospitalWeeks));
      }

      // Parental leave pool
      const isZaZyciem =
        input.hasZaZyciemCertificate || input.specialSituation === 'za_zyciem';
      if (isZaZyciem) {
        parentalPoolTotal =
          input.childrenCount === 1
            ? config.parentalWeeksZaZyciemSingle
            : config.parentalWeeksZaZyciemMultiple;
      } else {
        parentalPoolTotal =
          input.childrenCount === 1
            ? config.parentalWeeksSingle
            : config.parentalWeeksMultiple;
      }

      const maxSingleParentParental = Math.max(
        0,
        parentalPoolTotal - config.nonTransferableParentWeeks
      );

      if (input.includeFather && input.fatherHasSicknessInsurance) {
        const requestedFatherParental = Math.min(
          maxSingleParentParental,
          Math.max(0, input.fatherTakesParentalWeeks)
        );
        fatherParentalWeeks = requestedFatherParental;
        motherParentalWeeks = Math.min(
          maxSingleParentParental,
          Math.max(0, parentalPoolTotal - fatherParentalWeeks)
        );
        const totalUsedParental = motherParentalWeeks + fatherParentalWeeks;
        forfeitedNonTransferableWeeks = Math.max(0, parentalPoolTotal - totalUsedParental);
      } else {
        motherParentalWeeks = maxSingleParentParental;
        fatherParentalWeeks = 0;
        forfeitedNonTransferableWeeks = config.nonTransferableParentWeeks;
      }

      if (forfeitedNonTransferableWeeks > 0) {
        risks.push({
          id: 'risk-non-transferable',
          severity: 'info',
          title: `Niewykorzystana część nieprzenoszalna urlopu rodzicielskiego (${forfeitedNonTransferableWeeks} tyg.)`,
          description: `Każdemu z rodziców przysługuje wyłączne, nieprzenoszalne ${config.nonTransferableParentWeeks} tygodni z puli ${parentalPoolTotal} tygodni urlopu rodzicielskiego. Jeśli drugi rodzic nie skorzysta ze swojej części, te tygodnie przepadają.`,
          legalBasis: 'Art. 182[1a] § 4–5 Kodeksu pracy',
        });
      }

      // Combining parental leave with work (only for UoP employees, max 0.5 FTE)
      if (
        input.combineWithWork &&
        input.employmentType === 'uop' &&
        input.workFraction > 0 &&
        motherParentalWeeks > 0
      ) {
        const combinedWeeks = Math.min(motherParentalWeeks, Math.max(1, input.workCombinedWeeks));
        const rawExtension = Math.round(combinedWeeks * input.workFraction);
        const isZaZyciemCap =
          input.hasZaZyciemCertificate || input.specialSituation === 'za_zyciem';
        const maxExtendedTotal = isZaZyciemCap
          ? input.childrenCount === 1
            ? config.maxPartTimeZaZyciemSingle
            : config.maxPartTimeZaZyciemMultiple
          : input.childrenCount === 1
          ? config.maxPartTimeParentalSingle
          : config.maxPartTimeParentalMultiple;
        const maxBonusAllowed = Math.max(0, maxExtendedTotal - parentalPoolTotal);
        extendedParentalBonusWeeks = Math.min(maxBonusAllowed, rawExtension);
      } else if (input.combineWithWork && input.employmentType !== 'uop') {
        risks.push({
          id: 'risk-work-combine-non-uop',
          severity: 'info',
          title: 'Łączenie urlopu rodzicielskiego z pracą (wydłużenie) dotyczy pracowników na UoP',
          description:
            'Proporcjonalne wydłużenie urlopu rodzicielskiego przy pracy do 1/2 etatu reguluje Kodeks pracy dla pracowników. Osoby na JDG/zleceniu pobierają zasiłek bez formalnego urlopu i mogą prowadzić działalność w czasie pobierania zasiłku macierzyńskiego bez jego obniżania.',
          legalBasis: 'Art. 182[1e] Kodeksu pracy',
        });
      }

      // Paternity leave (urlop ojcowski — exclusive right of father, 14 calendar days = 2 weeks)
      if (input.includeFather && input.fatherHasSicknessInsurance && input.fatherTakesPaternityLeave) {
        paternityWeeks = config.paternityWeeks;
      }
    }
  }

  // 7. Financial calculations (Variant A: 100% + 70% vs Variant B: 81.5%)
  const canUse815 =
    input.filedWithin21Days &&
    !isTragicLoss &&
    !isSpecialPostEmploymentAllowance &&
    motherParentalWeeks > 0;

  const motherMatRateSelected =
    input.payoutVariant === '81_5' && canUse815
      ? config.parentalAveragedRate
      : config.maternityRate;

  const motherParRateSelected =
    input.payoutVariant === '81_5' && canUse815
      ? config.parentalAveragedRate
      : config.parentalStandardRate;

  // Father's non-transferable 9 weeks are ALWAYS 70% even when mother chose 81.5%
  const fatherParRate = config.parentalStandardRate;

  // Minimum monthly benefit top-up (1000 zł netto guarantee)
  const applyMinTopUp = (monthlyAmt: number): { amount: number; toppedUp: boolean } => {
    if (monthlyAmt <= 0) return { amount: 0, toppedUp: false };
    if (monthlyAmt < config.minMonthlyBenefitNet) {
      return { amount: config.minMonthlyBenefitNet, toppedUp: true };
    }
    return { amount: monthlyAmt, toppedUp: false };
  };

  const motherMatMonthlyRaw = round2(motherDaily100 * 30 * (motherMatRateSelected / 100));
  const motherMatCheck = applyMinTopUp(motherMatMonthlyRaw);

  // If combining parental leave with part-time work, benefit is reduced proportionally by workFraction
  const workBenefitFactor =
    input.combineWithWork && input.employmentType === 'uop' && input.workFraction > 0
      ? 1 - input.workFraction
      : 1;

  const motherParMonthlyRaw = round2(
    motherDaily100 * 30 * (motherParRateSelected / 100) * workBenefitFactor
  );
  const motherParCheck =
    workBenefitFactor < 1
      ? { amount: motherParMonthlyRaw, toppedUp: false }
      : applyMinTopUp(motherParMonthlyRaw);

  const motherMonthlyCombinedWorkSalaryEstimate =
    input.combineWithWork && input.employmentType === 'uop' && input.workFraction > 0
      ? round2(input.monthlyGrossBasis * input.workFraction * deductionMultiplier)
      : 0;

  const fatherParMonthlyRaw = round2(fatherDaily100 * 30 * (fatherParRate / 100));
  const fatherParCheck = applyMinTopUp(fatherParMonthlyRaw);

  const minBenefitTopUpApplied =
    hasMaternityRight &&
    (motherMatCheck.toppedUp || motherParCheck.toppedUp || fatherParCheck.toppedUp);

  // Compare total payouts Variant 100/70 vs 81.5
  const calcVariantTotal = (variant: PayoutVariant): number => {
    if (!hasMaternityRight || adoptionAgeExceeded) return 0;
    const matRate =
      variant === '81_5' && !isTragicLoss && motherParentalWeeks > 0
        ? config.parentalAveragedRate
        : config.maternityRate;
    const parRate =
      variant === '81_5' && !isTragicLoss && motherParentalWeeks > 0
        ? config.parentalAveragedRate
        : config.parentalStandardRate;

    const mMat = round2(motherDaily100 * (motherMaternityWeeks * 7) * (matRate / 100));
    const mSupp = round2(
      motherDaily100 * (supplementaryWeeks * 7) * (config.supplementaryMaternityRate / 100)
    );
    const fMat = round2(
      fatherDaily100 * (fatherMaternityWeeks * 7) * (config.maternityRate / 100)
    );

    // Note: when combining parental with work, the total entitlement days of benefit remain equivalent
    // (lower rate across extended weeks), so we compute on base motherParentalWeeks
    const mPar = round2(motherDaily100 * (motherParentalWeeks * 7) * (parRate / 100));
    const fPar = round2(fatherDaily100 * (fatherParentalWeeks * 7) * (fatherParRate / 100));
    const fPat = round2(
      fatherDaily100 * (paternityWeeks * 7) * (config.paternityRate / 100)
    );
    return round2(mMat + mSupp + fMat + mPar + fPar + fPat);
  };

  const variant100_70Total = calcVariantTotal('100_70');
  const variant81_5Total = calcVariantTotal('81_5');
  const selectedVariantTotal =
    input.payoutVariant === '81_5' && canUse815 ? variant81_5Total : variant100_70Total;
  const recommendedVariant: PayoutVariant =
    variant81_5Total >= variant100_70Total && !isTragicLoss ? '81_5' : '100_70';

  const fatherPaternityTotal = round2(
    fatherDaily100 * (paternityWeeks * 7) * (config.paternityRate / 100)
  );

  // 8. Build visual timeline segments
  let cursorWeek = input.preBirthMaternityWeeks > 0 ? -input.preBirthMaternityWeeks : 0;

  if (input.scenario === 'ciaza' && hasPregnancySicknessRight) {
    timeline.push({
      id: 'seg-pregnancy-sick',
      parent: 'Matka / Wnioskodawca',
      label: `Zasiłek chorobowy w ciąży (${input.hasCodeB ? 'kod B' : 'bez kodu B'})`,
      leaveType: 'chorobowy',
      startWeek: 0,
      durationWeeks: Math.min(38, Math.ceil(remainingSickDays / 7)),
      ratePercent: sicknessRate,
      monthlyNetEstimate: pregnancyMonthly,
      dailyGrossBasisAmount: round2(motherDaily100 * (sicknessRate / 100)),
      totalEstimatedNet: round2(motherDaily100 * remainingSickDays * (sicknessRate / 100)),
      note:
        employerSickDays > 0
          ? `Pierwsze ${employerSickDays} dni w roku płaci pracodawca (wynagrodzenie chorobowe), potem zasiłek z FUS.`
          : 'Zasiłek chorobowy wypłacany od 1. dnia niezdolności do pracy.',
    });
  }

  if (hasMaternityRight && !adoptionAgeExceeded) {
    if (isSpecialPostEmploymentAllowance) {
      timeline.push({
        id: 'seg-special-pre',
        parent: 'Matka / Wnioskodawca',
        label: 'Zasiłek w wysokości zasiłku macierzyńskiego (do porodu)',
        leaveType: 'szczegolny',
        startWeek: -8,
        durationWeeks: 8,
        ratePercent: config.maternityRate,
        monthlyNetEstimate: motherMatCheck.amount,
        dailyGrossBasisAmount: motherDaily100,
        totalEstimatedNet: round2(motherDaily100 * 56),
        note: 'Wypłacany przez ZUS po ustaniu zatrudnienia aż do dnia porodu.',
      });
    }

    if (motherMaternityWeeks > 0) {
      const matLabel =
        input.scenario === 'adopcja' || input.scenario === 'rodzina_zastepcza'
          ? 'Urlop na warunkach urlopu macierzyńskiego'
          : isTragicLoss
          ? 'Skrócony urlop macierzyński (sytuacja szczególna)'
          : 'Urlop macierzyński (część matki)';
      timeline.push({
        id: 'seg-mother-mat',
        parent: 'Matka / Wnioskodawca',
        label: matLabel,
        leaveType: 'macierzynski',
        startWeek: cursorWeek,
        durationWeeks: motherMaternityWeeks,
        ratePercent: motherMatRateSelected,
        monthlyNetEstimate: motherMatCheck.amount,
        dailyGrossBasisAmount: round2(motherDaily100 * (motherMatRateSelected / 100)),
        totalEstimatedNet: round2(
          motherDaily100 * motherMaternityWeeks * 7 * (motherMatRateSelected / 100)
        ),
        note:
          !isTragicLoss && input.scenario === 'porod'
            ? `Pierwsze ${config.motherMandatoryMaternityWeeks} tyg. po porodzie matka wykorzystuje obowiązkowo.`
            : undefined,
      });
      cursorWeek += motherMaternityWeeks;
    }

    if (fatherMaternityWeeks > 0) {
      timeline.push({
        id: 'seg-father-mat',
        parent: 'Ojciec / Drugi rodzic',
        label: 'Przejęta część urlopu macierzyńskiego',
        leaveType: 'macierzynski',
        startWeek: cursorWeek,
        durationWeeks: fatherMaternityWeeks,
        ratePercent: config.maternityRate,
        monthlyNetEstimate: round2(fatherDaily100 * 30),
        dailyGrossBasisAmount: fatherDaily100,
        totalEstimatedNet: round2(fatherDaily100 * fatherMaternityWeeks * 7),
        note: 'Rozpoczyna się bezpośrednio po części wykorzystanej przez matkę.',
      });
      cursorWeek += fatherMaternityWeeks;
    }

    if (supplementaryWeeks > 0) {
      timeline.push({
        id: 'seg-supplementary',
        parent: 'Matka / Wnioskodawca',
        label: 'Uzupełniający urlop macierzyński (wcześniak / szpital)',
        leaveType: 'uzupelniajacy',
        startWeek: cursorWeek,
        durationWeeks: supplementaryWeeks,
        ratePercent: config.supplementaryMaternityRate,
        monthlyNetEstimate: round2(motherDaily100 * 30),
        dailyGrossBasisAmount: motherDaily100,
        totalEstimatedNet: round2(motherDaily100 * supplementaryWeeks * 7),
        note: 'Udzielany jednorazowo bezpośrednio po urlopie macierzyńskim, bez podziału na części (100%).',
      });
      cursorWeek += supplementaryWeeks;
    }

    const motherParentalCalendarWeeks = motherParentalWeeks + extendedParentalBonusWeeks;
    const parentalStartWeek = cursorWeek;

    if (motherParentalCalendarWeeks > 0) {
      timeline.push({
        id: 'seg-mother-par',
        parent: 'Matka / Wnioskodawca',
        label:
          extendedParentalBonusWeeks > 0
            ? `Urlop rodzicielski + praca ${input.workFraction * 100}% etatu (wydłużony o ${extendedParentalBonusWeeks} tyg.)`
            : 'Urlop rodzicielski (część matki)',
        leaveType: 'rodzicielski',
        startWeek: parentalStartWeek,
        durationWeeks: motherParentalCalendarWeeks,
        ratePercent: motherParRateSelected,
        monthlyNetEstimate: motherParCheck.amount,
        dailyGrossBasisAmount: round2(
          motherDaily100 * (motherParRateSelected / 100) * workBenefitFactor
        ),
        totalEstimatedNet: round2(
          motherDaily100 * motherParentalWeeks * 7 * (motherParRateSelected / 100)
        ),
        note:
          extendedParentalBonusWeeks > 0
            ? `Szacowane wynagrodzenie z pracy: +${motherMonthlyCombinedWorkSalaryEstimate.toFixed(0)} zł/mies. obok obniżonego zasiłku.`
            : `Można podzielić na maks. ${config.maxParentalParts} części do końca roku ukończenia 6 lat przez dziecko.`,
      });
      cursorWeek += motherParentalCalendarWeeks;
    }

    if (fatherParentalWeeks > 0) {
      const fatherStart = input.parentsSimultaneousParental
        ? parentalStartWeek
        : cursorWeek;
      timeline.push({
        id: 'seg-father-par',
        parent: 'Ojciec / Drugi rodzic',
        label:
          fatherParentalWeeks <= config.nonTransferableParentWeeks
            ? 'Urlop rodzicielski ojca (część nieprzenoszalna)'
            : 'Urlop rodzicielski ojca (w tym 9 tyg. nieprzenoszalnych)',
        leaveType: 'rodzicielski',
        startWeek: fatherStart,
        durationWeeks: fatherParentalWeeks,
        ratePercent: fatherParRate,
        monthlyNetEstimate: fatherParCheck.amount,
        dailyGrossBasisAmount: round2(fatherDaily100 * (fatherParRate / 100)),
        totalEstimatedNet: round2(
          fatherDaily100 * fatherParentalWeeks * 7 * (fatherParRate / 100)
        ),
        note: 'Wyłączne 9 tygodni drugiego rodzica zawsze rozliczane wg stawki 70%.',
      });
      if (!input.parentsSimultaneousParental) {
        cursorWeek += fatherParentalWeeks;
      }
    }

    if (paternityWeeks > 0) {
      timeline.push({
        id: 'seg-paternity',
        parent: 'Ojciec / Drugi rodzic',
        label: input.paternitySplitTwoParts
          ? 'Urlop ojcowski (2 części po 7 dni)'
          : 'Urlop ojcowski (jednorazowo 14 dni)',
        leaveType: 'ojcowski',
        startWeek: 0,
        durationWeeks: paternityWeeks,
        ratePercent: config.paternityRate,
        monthlyNetEstimate: round2(fatherDaily100 * 30),
        dailyGrossBasisAmount: fatherDaily100,
        totalEstimatedNet: fatherPaternityTotal,
        note:
          input.scenario === 'adopcja'
            ? 'Do wykorzystania w ciągu 12 mies. od uprawomocnienia przysposobienia (maks. do 14. roku życia dziecka).'
            : 'Do wykorzystania do ukończenia przez dziecko 12. miesiąca życia (niezależnie od urlopu matki).',
      });
    }
  }

  const grandTotalCalendarWeeks = Math.max(
    0,
    cursorWeek - (input.preBirthMaternityWeeks > 0 ? -input.preBirthMaternityWeeks : 0)
  );

  // 9. Dynamic Document Checklist (including Oct 24, 2026 ZAM consolidation!)
  const primaryRecipient: DocumentChecklistItem['recipient'] = employerPays
    ? 'Pracodawca (płatnik składek)'
    : 'ZUS (PUE/eZUS lub placówka)';

  if (input.scenario === 'ciaza') {
    documents.push({
      code: 'e-ZLA (kod B)',
      title: 'Zaświadczenie lekarskie z kodem literowym „B”',
      recipient: 'ZUS (PUE/eZUS lub placówka)',
      deadline: 'Wystawiane elektronicznie przez lekarza — trafia automatycznie do ZUS i na PUE pracodawcy',
      required: true,
      note: 'Pracownica na UoP powinna dodatkowo poinformować pracodawcę o nieobecności.',
    });
    if (input.employmentType === 'uop' && !employerPays) {
      documents.push({
        code: 'Z-3 / ZAS-12',
        title: 'Zaświadczenie płatnika składek Z-3 (lub ZAS-12 na dalszy okres)',
        recipient: 'ZUS (PUE/eZUS lub placówka)',
        deadline: 'Przekazuje pracodawca niezwłocznie po otrzymaniu e-ZLA',
        required: true,
        note: 'Wymagane, ponieważ pracodawca zgłasza ≤ 20 ubezpieczonych i zasiłek wypłaca ZUS.',
      });
    } else if (input.employmentType === 'zlecenie' && !employerPays) {
      documents.push({
        code: 'Z-3a',
        title: 'Zaświadczenie płatnika składek Z-3a',
        recipient: 'ZUS (PUE/eZUS lub placówka)',
        deadline: 'Przekazuje zleceniodawca do ZUS',
        required: true,
        note: 'Potwierdza okres podlegania i przychody z umowy zlecenia.',
      });
    } else if (input.employmentType === 'jdg') {
      documents.push({
        code: 'ZAS-53',
        title: 'Wniosek o zasiłek chorobowy (ZAS-53)',
        recipient: 'ZUS (PUE/eZUS lub placówka)',
        deadline: 'Po wystawieniu e-ZLA (przez PUE/eZUS)',
        required: true,
        note: 'Osoba prowadząca JDG składa wniosek samodzielnie do ZUS i powstrzymuje się od pracy.',
      });
    }
  } else {
    // Maternity / parental / adoption / special
    documents.push({
      code: 'Odpis USC',
      title: 'Skrócony odpis aktu urodzenia dziecka (lub odpis z adnotacją o martwym urodzeniu)',
      recipient: 'Urząd Stanu Cywilnego (USC)',
      deadline: 'W ciągu 21 dni od sporządzenia karty urodzenia (można online na gov.pl)',
      required: true,
      note: 'Niezbędny załącznik do ustalenia prawa do zasiłku macierzyńskiego.',
    });

    if (input.employmentType === 'uop') {
      documents.push({
        code: 'Wniosek urlopowy',
        title:
          input.payoutVariant === '81_5'
            ? 'Wniosek do pracodawcy o urlop macierzyński i rodzicielski (wariant 81,5%)'
            : 'Wniosek do pracodawcy o udzielenie urlopu macierzyńskiego / rodzicielskiego',
        recipient: 'Pracodawca (płatnik składek)',
        deadline:
          input.payoutVariant === '81_5'
            ? `Nie później niż ${config.applicationDeadline21Days} dni po porodzie`
            : 'Przed rozpoczęciem urlopu (dla rodzicielskiego min. 21 dni przed)',
        required: true,
        note: employerPays
          ? 'Pracodawca zgłasza > 20 ubezpieczonych — sam ustala prawo i wypłaca zasiłek.'
          : 'Pracodawca udziela urlopu i przesyła wniosek wraz z Z-3 do ZUS (wypłata przez ZUS).',
      });
      if (!employerPays) {
        documents.push({
          code: 'Z-3',
          title: 'Zaświadczenie płatnika składek Z-3',
          recipient: 'ZUS (PUE/eZUS lub placówka)',
          deadline: 'Przekazuje pracodawca do ZUS',
          required: true,
          note: 'Pracodawca przekazuje Z-3 z danymi o wynagrodzeniu z 12 miesięcy i okresach urlopu.',
        });
      }
    } else if (input.employmentType === 'jdg' || input.employmentType === 'zlecenie') {
      documents.push({
        code: 'ZAM',
        title: 'Wniosek o zasiłek macierzyński (ZAM)',
        recipient: primaryRecipient,
        deadline:
          input.payoutVariant === '81_5'
            ? `Nie później niż ${config.applicationDeadline21Days} dni po porodzie (dla 81,5%)`
            : 'Po dniu porodu / przed okresem pobierania zasiłku',
        required: true,
        note: 'Uwaga: od 24 października 2026 r. formularze ZUR i ZAO zostały zlikwidowane i włączone do jednego wniosku ZAM (zlikwidowano też Z-3b).',
      });
      if (input.employmentType === 'zlecenie' && !employerPays) {
        documents.push({
          code: 'Z-3a',
          title: 'Zaświadczenie płatnika składek Z-3a',
          recipient: 'ZUS (PUE/eZUS lub placówka)',
          deadline: 'Przekazuje zleceniodawca do ZUS',
          required: true,
          note: 'Niezbędne, gdy zleceniodawca zgłasza ≤ 20 ubezpieczonych.',
        });
      }
    }

    if (supplementaryWeeks > 0) {
      documents.push({
        code: 'Zaświadczenie szpitala',
        title: 'Zaświadczenie szpitalne do uzupełniającego urlopu macierzyńskiego',
        recipient: primaryRecipient,
        deadline: 'Najpóźniej 21 dni przed końcem urlopu macierzyńskiego',
        required: true,
        note: 'Musi określać tydzień ciąży, masę urodzeniową oraz okres pobytu dziecka w szpitalu.',
      });
    }

    if (input.hasZaZyciemCertificate || input.specialSituation === 'za_zyciem') {
      documents.push({
        code: 'Zaświadczenie „Za życiem”',
        title: 'Zaświadczenie lekarskie wydane na podstawie art. 4 ust. 3 ustawy „Za życiem”',
        recipient: primaryRecipient,
        deadline: 'Dołączane do wniosku o wydłużony urlop rodzicielski (65/67 tyg.)',
        required: true,
        note: 'Wystawia lekarz specjalista II st. lub z tytułem specjalisty (m.in. położnik, neonatolog, neurolog dziecięcy).',
      });
    }

    if (input.scenario === 'adopcja' || input.scenario === 'rodzina_zastepcza') {
      documents.push({
        code: 'Dokument sądu / PCPR',
        title:
          input.scenario === 'adopcja'
            ? 'Zaświadczenie sądu opiekuńczego o wszczęciu postępowania o przysposobienie'
            : 'Orzeczenie sądu o umieszczeniu dziecka w rodzinie zastępczej niezawodowej',
        recipient: primaryRecipient,
        deadline: 'Dołączane do wniosku o urlop na warunkach urlopu macierzyńskiego',
        required: true,
        note: 'Wraz z oświadczeniem o dacie przyjęcia dziecka na wychowanie.',
      });
    }

    if (input.includeFather && (fatherParentalWeeks > 0 || paternityWeeks > 0)) {
      documents.push({
        code: 'Wniosek ojca / ZAM',
        title: 'Wniosek ojca o urlop ojcowski (7 dni przed) i/lub rodzicielski (21 dni przed)',
        recipient: 'Pracodawca (płatnik składek)',
        deadline: 'Min. 7 dni przed urlopem ojcowskim; min. 21 dni przed urlopem rodzicielskim',
        required: true,
        note: 'Dla osób niebędących pracownikami służy zunifikowany formularz ZAM w ZUS.',
      });
    }
  }

  // 10. Labor Code Protection status
  const isLaborProtected = input.employmentType === 'uop';
  const contractExtendedToBirth =
    isLaborProtected &&
    input.contractEndsBeforeDelivery &&
    (input.contractTypeDetail === 'czas_okreslony' ||
      input.contractTypeDetail === 'probny_ponad_miesiac') &&
    input.pregnancyMonthAtContractEnd >= 3;

  const laborProtectionSummary = isLaborProtected
    ? 'Jako pracownica/pracownik na umowie o pracę podlegasz szczególnej ochronie Kodeksu pracy: w ciąży, w trakcie urlopów rodzicielskich oraz od dnia złożenia wniosku pracodawca nie może przygotowywać ani wręczać wypowiedzenia (poza dyscyplinarnym za zgodą związków lub likwidacją/upadłością).'
    : 'Szczególna ochrona przed wypowiedzeniem z Kodeksu pracy nie obejmuje umów cywilnoprawnych (zlecenie) ani osób prowadzących pozarolniczą działalność gospodarczą (JDG).';

  // 11. Overall eligibility headline
  const eligible =
    input.scenario === 'ciaza'
      ? hasPregnancySicknessRight || isSpecialPostEmploymentAllowance
      : hasMaternityRight && !adoptionAgeExceeded;

  let eligibilityHeadline = 'Przysługuje prawo do świadczeń z ZUS';
  let eligibilityReason =
    'Spełniasz warunki objęcia ubezpieczeniem chorobowym i możesz skorzystać z pełnej ścieżki urlopów oraz zasiłków.';

  if (!eligible) {
    eligibilityHeadline = 'Brak prawa do wybranego świadczenia z ZUS';
    if (!input.hasSicknessInsurance && !isSpecialPostEmploymentAllowance) {
      eligibilityReason =
        'Nie podlegasz ubezpieczeniu chorobowemu. W przypadku narodzin dziecka sprawdź świadczenie rodzicielskie (1000 zł/mies.) w urzędzie gminy/MOPS.';
    } else if (adoptionAgeExceeded) {
      eligibilityReason = `Wiek przyjętego dziecka (${input.childAgeYears} lat) przekracza ustawową granicę ${adoptionAgeCap} lat dla tego trybu opieki.`;
    } else if (input.scenario === 'ciaza' && !hasPregnancySicknessRight) {
      eligibilityReason = `Trwa okres wyczekiwania na zasiłek chorobowy (${input.insuranceDaysContinuous}/${requiredWaitingDays} dni). Prawo do chorobowego nabędziesz po ${requiredWaitingDays} dniach ciągłego ubezpieczenia, natomiast zasiłek macierzyński po porodzie przysługuje bez okresu wyczekiwania.`;
    }
  } else if (input.employmentType === 'jdg' && input.hasZUSArrears) {
    eligibilityHeadline = 'Prawo istnieje — wypłata wstrzymana do spłaty zaległości ZUS';
    eligibilityReason = `Masz opłacane dobrowolne ubezpieczenie chorobowe, ale wykazana zaległość (${input.arrearsAmountPln.toFixed(
      2
    )} zł) blokuje wypłatę świadczenia do czasu jej uregulowania w ciągu 6 miesięcy.`;
  }

  const payerEntity: CalculationResult['payerEntity'] = !eligible
    ? 'Brak wypłaty (brak uprawnień)'
    : employerPays && !isSpecialPostEmploymentAllowance && !contractExtendedToBirth
    ? 'Pracodawca (płatnik składek)'
    : 'Zakład Ubezpieczeń Społecznych (ZUS)';

  const payerExplanation = !eligible
    ? 'Brak podstaw do wypłaty zasiłku z Funduszu Ubezpieczeń Społecznych dla obecnych parametrów.'
    : payerEntity === 'Pracodawca (płatnik składek)'
    ? `Twój płatnik zgłasza powyżej ${config.employerPayerThreshold} ubezpieczonych (${input.employerInsuredCount} osób wg stanu na 30 listopada), dlatego zgodnie z art. 61 ust. 1 pkt 1 ustawy zasiłkowej prawo ustala i zasiłek wypłaca bezpośrednio pracodawca.`
    : isSpecialPostEmploymentAllowance || contractExtendedToBirth
    ? 'Po ustaniu tytułu zatrudnienia (przedłużenie umowy do dnia porodu lub upadłość/likwidacja pracodawcy) zasiłek wypłaca bezpośrednio ZUS.'
    : input.employmentType === 'jdg'
    ? 'Osobom prowadzącym działalność gospodarczą zasiłki ustala i wypłaca bezpośrednio ZUS na podstawie wniosku ZAS-53 / ZAM.'
    : `Płatnik składek zgłasza nie więcej niż ${config.employerPayerThreshold} ubezpieczonych (${input.employerInsuredCount} osób), dlatego dokumenty (Z-3 / Z-3a) trafiają do ZUS, który ustala i wypłaca zasiłek.`;

  return {
    eligible,
    eligibilityHeadline,
    eligibilityReason,
    payerEntity,
    payerExplanation,
    motherBasisAfterDeduction: motherBasis,
    motherDaily100,
    fatherBasisAfterDeduction: fatherBasis,
    fatherDaily100,
    pregnancySickness: {
      eligible: hasPregnancySicknessRight,
      ratePercent: sicknessRate,
      maxDays: config.sicknessMaxDaysPregnancy,
      remainingDays: remainingSickDays,
      employerPaidDays: employerSickDays,
      zusPaidFromDay: employerSickDays + 1,
      estimatedMonthlyAmount: hasPregnancySicknessRight ? pregnancyMonthly : 0,
      rehabBenefitInfo:
        'Jeżeli po wyczerpaniu 270 dni okresu zasiłkowego nadal będziesz niezdolna do pracy, a dalsze leczenie rokuje odzyskanie zdolności (lub do dnia porodu), możesz złożyć wniosek o świadczenie rehabilitacyjne (100% podstawy w ciąży).',
    },
    dimensions: {
      maternityWeeksTotal,
      motherMaternityWeeks,
      fatherMaternityWeeks,
      supplementaryWeeks,
      parentalPoolTotal,
      motherParentalWeeks,
      fatherParentalWeeks,
      forfeitedNonTransferableWeeks,
      extendedParentalBonusWeeks,
      paternityWeeks,
      grandTotalCalendarWeeks,
    },
    financialSummary: {
      selectedVariantTotal,
      variant100_70Total,
      variant81_5Total,
      recommendedVariant,
      motherMonthlyMaternity: motherMatCheck.amount,
      motherMonthlyParental: motherParCheck.amount,
      motherMonthlyCombinedWorkSalaryEstimate,
      fatherMonthlyParental: fatherParCheck.amount,
      fatherPaternityTotal,
      minBenefitTopUpApplied,
    },
    timeline,
    documents,
    risks,
    laborCodeProtection: {
      protected: isLaborProtected,
      summary: laborProtectionSummary,
      contractExtendedToBirth,
    },
  };
}
