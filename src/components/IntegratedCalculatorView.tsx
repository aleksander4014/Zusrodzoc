import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  Briefcase,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Info,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type {
  CalculationResult,
  CalculatorInput,
  EmploymentType,
  LegalConfig,
  PrematureCategory,
  ScenarioType,
  SpecialSituationType,
} from '../shared/types';

interface IntegratedCalculatorViewProps {
  input: CalculatorInput;
  onChange: (next: CalculatorInput) => void;
  result: CalculationResult;
  config: LegalConfig;
  onOpenApplications: () => void;
  onOpenCharities: () => void;
}

const SCENARIO_TABS: Array<{ id: ScenarioType; label: string }> = [
  { id: 'porod', label: 'Poród (rodzice biologiczni)' },
  { id: 'ciaza', label: 'Ciąża (chorobowe e-ZLA)' },
  { id: 'adopcja', label: 'Adopcja (przysposobienie)' },
  { id: 'rodzina_zastepcza', label: 'Rodzina zastępcza' },
  { id: 'szczegolne', label: 'Sytuacje szczególne' },
];

const LEAVE_BAR_COLORS: Record<string, string> = {
  chorobowy: 'bg-[#0369A1]',
  macierzynski: 'bg-[#007834]',
  uzupelniajacy: 'bg-[#0D9488]',
  rodzicielski: 'bg-[#2E7D32]/80',
  ojcowski: 'bg-[#B45309]',
  szczegolny: 'bg-[#475569]',
};

export const IntegratedCalculatorView: React.FC<IntegratedCalculatorViewProps> = ({
  input,
  onChange,
  result,
  config,
  onOpenApplications,
  onOpenCharities,
}) => {
  const update = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const maxTransferableMat = Math.max(
    0,
    result.dimensions.maternityWeeksTotal - config.motherMandatoryMaternityWeeks
  );
  const maxFatherParental = Math.max(
    0,
    result.dimensions.parentalPoolTotal - config.nonTransferableParentWeeks
  );

  const isTragicScenario =
    input.specialSituation === 'martwe_urodzenie' ||
    input.specialSituation === 'zgon_przed_8_tyg' ||
    input.specialSituation === 'zgon_po_8_tyg';

  // Timeline scaling
  const minWeek = result.timeline.reduce((min, s) => Math.min(min, s.startWeek), 0);
  const maxWeek = Math.max(
    1,
    result.timeline.reduce((max, s) => Math.max(max, s.startWeek + s.durationWeeks), 1)
  );
  const totalSpan = Math.max(1, maxWeek - minWeek);

  return (
    <div className="space-y-6">
      {/* Header & Integrated Scenario Switcher */}
      <div className="rounded-xl border border-[#DCE3DF] bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111C18]">
              Zintegrowany kalkulator zasiłku chorobowego i macierzyńskiego
            </h1>
            <p className="text-sm text-[#4B5E55] mt-1">
              Jedno narzędzie łączące wszystkie scenariusze: ciąża, poród, podział opieki między
              obojga rodziców, łączenie urlopu rodzicielskiego z pracą, adopcja oraz sytuacje
              szczególne.
            </p>
          </div>
          <div className="text-xs text-[#4B5E55] md:text-right shrink-0">
            <p className="font-medium text-[#111C18]">{config.versionLabel}</p>
            <p className="font-mono tabular-nums">
              Stawki: {config.maternityRate}% / {config.parentalAveragedRate}% /{' '}
              {config.parentalStandardRate}%
            </p>
          </div>
        </div>

        {/* Scenario segmented controls */}
        <div className="mt-5 flex flex-wrap gap-1.5 rounded-lg bg-[#F0F4F2] p-1.5">
          {SCENARIO_TABS.map((tab) => {
            const active = input.scenario === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const next: CalculatorInput = { ...input, scenario: tab.id };
                  if (tab.id === 'szczegolne' && input.specialSituation === 'brak') {
                    next.specialSituation = 'wczesniak_hospitalizacja';
                    next.prematureCategory = 'ponizej_28_lub_1000g';
                    next.hospitalWeeks = 10;
                  } else if (tab.id !== 'szczegolne' && isTragicScenario) {
                    next.specialSituation = 'brak';
                  }
                  onChange(next);
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#007834] shadow-xs'
                    : 'text-[#4B5E55] hover:text-[#111C18]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-column Calculator Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Interactive Configuration Form */}
        <div className="xl:col-span-7 space-y-6">
          {/* Block 1: Insurance, Employment & Financial Basis */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6ECE9] pb-3">
              <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#007834]" />
                1. Ubezpieczenie chorobowe, płatnik i podstawa wymiaru
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                  Forma zatrudnienia / tytuł ubezpieczenia
                </label>
                <select
                  value={input.employmentType}
                  onChange={(e) => {
                    const emp = e.target.value as EmploymentType;
                    onChange({
                      ...input,
                      employmentType: emp,
                      hasSicknessInsurance: emp === 'uop' ? true : emp === 'brak' ? false : input.hasSicknessInsurance,
                      employerInsuredCount: emp === 'jdg' ? 1 : input.employerInsuredCount,
                    });
                  }}
                  className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 text-sm text-[#111C18] focus:border-[#007834] focus:outline-none"
                >
                  <option value="uop">Umowa o pracę (obowiązkowe chorobowe)</option>
                  <option value="zlecenie">Umowa zlecenie (dobrowolne chorobowe)</option>
                  <option value="jdg">Działalność gospodarcza — JDG (dobrowolne)</option>
                  <option value="brak">Brak zatrudnienia / brak ubezpieczenia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                  Podleganie ubezpieczeniu chorobowemu
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('hasSicknessInsurance', true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      input.hasSicknessInsurance
                        ? 'border-[#007834] bg-[#EDF7F1] text-[#005E28]'
                        : 'border-[#CBD5D0] bg-white text-[#4B5E55]'
                    }`}
                  >
                    Tak — ubezpieczona
                  </button>
                  <button
                    type="button"
                    onClick={() => update('hasSicknessInsurance', false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      !input.hasSicknessInsurance
                        ? 'border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B]'
                        : 'border-[#CBD5D0] bg-white text-[#4B5E55]'
                    }`}
                  >
                    Nie podlega
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="calc-gross-basis"
                  className="block text-xs font-semibold text-[#111C18] mb-1.5"
                >
                  Średnie wynagrodzenie brutto (12 mies.) lub podstawa JDG (zł)
                </label>
                <input
                  id="calc-gross-basis"
                  type="number"
                  min={0}
                  max={100000}
                  step={100}
                  value={input.monthlyGrossBasis}
                  onChange={(e) => update('monthlyGrossBasis', Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm text-[#111C18] tabular-nums focus:border-[#007834] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#4B5E55] tabular-nums">
                  Podstawa po odliczeniu {config.socialContributionDeductionRate}% składek:{' '}
                  <strong>{result.motherBasisAfterDeduction.toFixed(2)} zł</strong> (
                  {result.motherDaily100.toFixed(2)} zł/dzień)
                </p>
              </div>

              <div>
                <label
                  htmlFor="calc-insured-days"
                  className="block text-xs font-semibold text-[#111C18] mb-1.5"
                >
                  Nieprzerwany staż ubezpieczenia chorobowego (dni)
                </label>
                <input
                  id="calc-insured-days"
                  type="number"
                  min={0}
                  max={10000}
                  value={input.insuranceDaysContinuous}
                  onChange={(e) =>
                    update('insuranceDaysContinuous', Math.max(0, Number(e.target.value)))
                  }
                  className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm text-[#111C18] tabular-nums focus:border-[#007834] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#4B5E55]">
                  Wyczekiwanie na chorobowe: {config.waitingPeriodMandatoryDays} dni (UoP) /{' '}
                  {config.waitingPeriodVoluntaryDays} dni (dobrowolne)
                </p>
              </div>

              {input.employmentType !== 'jdg' && input.employmentType !== 'brak' && (
                <div>
                  <label
                    htmlFor="calc-employer-size"
                    className="block text-xs font-semibold text-[#111C18] mb-1.5"
                  >
                    Liczba ubezpieczonych u płatnika (na 30 listopada)
                  </label>
                  <input
                    id="calc-employer-size"
                    type="number"
                    min={1}
                    max={50000}
                    value={input.employerInsuredCount}
                    onChange={(e) =>
                      update('employerInsuredCount', Math.max(1, Number(e.target.value)))
                    }
                    className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm text-[#111C18] tabular-nums focus:border-[#007834] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#4B5E55]">
                    Powyżej {config.employerPayerThreshold} osób → wypłaca pracodawca; ≤{' '}
                    {config.employerPayerThreshold} → wypłaca ZUS
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="calc-due-date"
                  className="block text-xs font-semibold text-[#111C18] mb-1.5"
                >
                  Planowana lub faktyczna data porodu / przyjęcia dziecka
                </label>
                <input
                  id="calc-due-date"
                  type="date"
                  value={input.dueOrBirthDate}
                  onChange={(e) => update('dueOrBirthDate', e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm text-[#111C18] focus:border-[#007834] focus:outline-none"
                />
              </div>
            </div>

            {/* Risk checkboxes */}
            <div className="pt-2 border-t border-[#EEF2F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {input.employmentType === 'jdg' && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.hasZUSArrears}
                    onChange={(e) =>
                      onChange({
                        ...input,
                        hasZUSArrears: e.target.checked,
                        arrearsAmountPln: e.target.checked
                          ? Math.max(500, input.arrearsAmountPln)
                          : 0,
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded accent-[#007834]"
                  />
                  <span className="text-[#111C18]">
                    Zaległość składkowa ZUS (JDG)
                    {input.hasZUSArrears && (
                      <input
                        type="number"
                        min={1}
                        step={50}
                        value={input.arrearsAmountPln}
                        onChange={(e) =>
                          update('arrearsAmountPln', Math.max(0, Number(e.target.value)))
                        }
                        className="ml-2 w-24 rounded border border-[#CBD5D0] px-2 py-0.5 font-mono text-xs tabular-nums"
                      />
                    )}
                  </span>
                </label>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.recentBasisIncreaseInPregnancy}
                  onChange={(e) => update('recentBasisIncreaseInPregnancy', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[#007834]"
                />
                <span className="text-[#111C18]">
                  Podwyższono podstawę składek w okresie ciąży (test ryzyka kontroli ZUS)
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.contractEndsBeforeDelivery}
                  onChange={(e) =>
                    onChange({
                      ...input,
                      contractEndsBeforeDelivery: e.target.checked,
                      contractTypeDetail: e.target.checked
                        ? input.employmentType === 'uop'
                          ? 'czas_okreslony'
                          : input.employmentType === 'zlecenie'
                          ? 'zlecenie'
                          : 'jdg'
                        : 'czas_nieokreslony',
                      pregnancyMonthAtContractEnd: e.target.checked ? 5 : 0,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded accent-[#007834]"
                />
                <span className="text-[#111C18]">
                  Umowa kończy się przed planowanym terminem porodu
                </span>
              </label>

              {input.scenario === 'ciaza' && input.employmentType === 'uop' && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.ageOver50}
                    onChange={(e) => update('ageOver50', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#007834]"
                  />
                  <span className="text-[#111C18]">
                    Ukończony 50. rok życia (14 dni wynagrodzenia chorobowego zamiast 33)
                  </span>
                </label>
              )}
            </div>

            {input.contractEndsBeforeDelivery && input.employmentType === 'uop' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#F5F7F6] p-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#111C18] mb-1">
                    Rodzaj kończącej się umowy o pracę
                  </label>
                  <select
                    value={input.contractTypeDetail}
                    onChange={(e) =>
                      update(
                        'contractTypeDetail',
                        e.target.value as CalculatorInput['contractTypeDetail']
                      )
                    }
                    className="w-full rounded-lg border border-[#CBD5D0] bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="czas_okreslony">Umowa na czas określony</option>
                    <option value="probny_ponad_miesiac">
                      Okres próbny przekraczający 1 miesiąc
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#111C18] mb-1">
                    Miesiąc ciąży w dniu rozwiązania umowy: {input.pregnancyMonthAtContractEnd} mies.
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={9}
                    value={input.pregnancyMonthAtContractEnd || 4}
                    onChange={(e) =>
                      update('pregnancyMonthAtContractEnd', Number(e.target.value))
                    }
                    className="w-full accent-[#007834]"
                  />
                  <span className="text-[11px] text-[#4B5E55]">
                    Po 3. miesiącu ciąży umowa przedłuża się z mocy prawa do dnia porodu.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Block 2: Scenario-Specific Parameters (Pregnancy vs Birth vs Adoption vs Special) */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
            <div className="border-b border-[#E6ECE9] pb-3">
              <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
                <Baby className="h-4 w-4 text-[#007834]" />
                2. Okoliczności wpływające na wymiar świadczeń
              </h2>
            </div>

            {input.scenario === 'ciaza' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                    Wykorzystane dni zwolnienia e-ZLA w tym okresie zasiłkowym
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={270}
                    value={input.ezlaDaysUsed}
                    onChange={(e) =>
                      update('ezlaDaysUsed', Math.min(270, Math.max(0, Number(e.target.value))))
                    }
                    className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm tabular-nums"
                  />
                  <p className="mt-1 text-[11px] text-[#4B5E55]">
                    Maksymalny okres zasiłkowy w ciąży to {config.sicknessMaxDaysPregnancy} dni.
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={input.hasCodeB}
                      onChange={(e) => update('hasCodeB', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded accent-[#007834]"
                    />
                    <span>
                      <strong className="text-[#111C18]">Kod literowy „B” na e-ZLA</strong>
                      <span className="block text-xs text-[#4B5E55]">
                        Zapewnia 100% podstawy wymiaru zasiłku chorobowego w ciąży.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                      Liczba dzieci (przy jednym porodzie / przyjętych jednocześnie)
                    </label>
                    <select
                      value={input.childrenCount}
                      onChange={(e) =>
                        update('childrenCount', Number(e.target.value) as CalculatorInput['childrenCount'])
                      }
                      className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 text-sm text-[#111C18]"
                    >
                      <option value={1}>1 dziecko (macierzyński {config.maternityWeeksByChildren.one} tyg.)</option>
                      <option value={2}>2 dzieci — bliźniaki ({config.maternityWeeksByChildren.two} tyg.)</option>
                      <option value={3}>3 dzieci — trojaczki ({config.maternityWeeksByChildren.three} tyg.)</option>
                      <option value={4}>4 dzieci — czworaczki ({config.maternityWeeksByChildren.four} tyg.)</option>
                      <option value={5}>5 lub więcej dzieci ({config.maternityWeeksByChildren.fivePlus} tyg.)</option>
                    </select>
                  </div>

                  {(input.scenario === 'adopcja' || input.scenario === 'rodzina_zastepcza') ? (
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Wiek przyjmowanego dziecka (lata)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={17}
                        step={0.5}
                        value={input.childAgeYears}
                        onChange={(e) => update('childAgeYears', Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm tabular-nums"
                      />
                      {input.scenario === 'rodzina_zastepcza' && (
                        <label className="mt-2 flex items-center gap-2 text-xs text-[#4B5E55] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={input.schoolDeferred}
                            onChange={(e) => update('schoolDeferred', e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#007834]"
                          />
                          Orzeczono odroczenie obowiązku szkolnego (limit do {config.fosterCareDeferredAgeLimit}{' '}
                          lat)
                        </label>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Rozpoczęcie macierzyńskiego przed porodem: {input.preBirthMaternityWeeks} tyg.
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={config.maxPreBirthMaternityWeeks}
                        value={input.preBirthMaternityWeeks}
                        onChange={(e) => update('preBirthMaternityWeeks', Number(e.target.value))}
                        className="w-full accent-[#007834] mt-2"
                      />
                      <p className="text-[11px] text-[#4B5E55]">
                        Maks. {config.maxPreBirthMaternityWeeks} tyg. przed przewidywaną datą porodu.
                      </p>
                    </div>
                  )}
                </div>

                {/* Special Situations selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EEF2F0]">
                  <div>
                    <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                      Okoliczność szczególna (opcjonalnie)
                    </label>
                    <select
                      value={input.specialSituation}
                      onChange={(e) => {
                        const val = e.target.value as SpecialSituationType;
                        onChange({
                          ...input,
                          specialSituation: val,
                          hasZaZyciemCertificate: val === 'za_zyciem' ? true : input.hasZaZyciemCertificate,
                          prematureCategory:
                            val === 'wczesniak_hospitalizacja' && input.prematureCategory === 'brak'
                              ? 'ponizej_28_lub_1000g'
                              : input.prematureCategory,
                          hospitalWeeks:
                            val === 'wczesniak_hospitalizacja' && input.hospitalWeeks === 0
                              ? 8
                              : input.hospitalWeeks,
                        });
                      }}
                      className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 text-sm text-[#111C18]"
                    >
                      <option value="brak">Standardowy przebieg (brak)</option>
                      <option value="wczesniak_hospitalizacja">
                        Wcześniak lub hospitalizacja noworodka (uzupełniający macierzyński)
                      </option>
                      <option value="za_zyciem">
                        Zaświadczenie „Za życiem” (wydłużony urlop rodzicielski 65/67 tyg.)
                      </option>
                      <option value="przejecie_ojciec_szczegolne">
                        Wcześniejsze przejęcie przez ojca (&lt;14 tyg.: szpital/śmierć/niezdolność matki)
                      </option>
                      <option value="upadlosc_pracodawcy">
                        Upadłość, likwidacja lub śmierć pracodawcy (zasiłek w wys. macierzyńskiego)
                      </option>
                      <option value="wyrok_sadu">
                        Bezprawne rozwiązanie umowy w ciąży (prawomocny wyrok sądu)
                      </option>
                      <option value="martwe_urodzenie">Urodzenie martwego dziecka (8 tyg. 100%)</option>
                      <option value="zgon_przed_8_tyg">Zgon dziecka przed upływem 8 tyg. życia</option>
                      <option value="zgon_po_8_tyg">Zgon dziecka po upływie 8 tyg. życia</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={input.hasZaZyciemCertificate}
                        onChange={(e) => update('hasZaZyciemCertificate', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-[#007834]"
                      />
                      <span>
                        <strong className="text-[#111C18]">Zaświadczenie lekarskie „Za życiem”</strong>
                        <span className="block text-[#4B5E55]">
                          Wydłuża urlop rodzicielski do {config.parentalWeeksZaZyciemSingle} tyg. (1
                          dziecko) lub {config.parentalWeeksZaZyciemMultiple} tyg. (mnogi).
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {input.specialSituation === 'wczesniak_hospitalizacja' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#EDF7F1] border border-[#BBF7D0] p-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Tydzień ciąży / masa urodzeniowa dziecka
                      </label>
                      <select
                        value={input.prematureCategory}
                        onChange={(e) =>
                          update('prematureCategory', e.target.value as PrematureCategory)
                        }
                        className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 text-xs text-[#111C18]"
                      >
                        <option value="ponizej_28_lub_1000g">
                          Poniżej 28. tyg. ciąży lub masa ≤ 1000 g (maks. {config.supplementaryMaxWeeksExtreme} tyg.)
                        </option>
                        <option value="od_28_do_36">
                          Od 28. do 36. tyg. ciąży i masa &gt; 1000 g (maks. {config.supplementaryMaxWeeksStandard} tyg.)
                        </option>
                        <option value="o_czasie_hospitalizacja">
                          Urodzone o czasie, hospitalizowane (maks. {config.supplementaryMaxWeeksStandard} tyg.)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Liczba tygodni pobytu dziecka w szpitalu:{' '}
                        <span className="font-mono tabular-nums">{input.hospitalWeeks} tyg.</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={
                          input.prematureCategory === 'ponizej_28_lub_1000g'
                            ? config.supplementaryMaxWeeksExtreme
                            : config.supplementaryMaxWeeksStandard
                        }
                        value={input.hospitalWeeks}
                        onChange={(e) => update('hospitalWeeks', Number(e.target.value))}
                        className="w-full accent-[#007834] mt-2"
                      />
                      <p className="text-[11px] text-[#4B5E55]">
                        1 tydzień uzupełniającego urlopu (100%) za każdy tydzień hospitalizacji.
                      </p>
                    </div>
                  </div>
                )}

                {isTragicScenario && (
                  <div className="rounded-lg border border-[#CBD5D0] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#334155] space-y-1">
                      <p className="font-semibold text-[#111C18]">
                        Wsparcie formalne i psychologiczne po stracie dziecka
                      </p>
                      <p>
                        Przygotowaliśmy zestawienie wyłącznie charytatywnych, bezpłatnych fundacji i
                        całodobowych telefonów wsparcia dla rodziców w żałobie.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenCharities}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#007834] bg-white px-3.5 py-2 text-xs font-semibold text-[#007834] hover:bg-[#EDF7F1] whitespace-nowrap shrink-0"
                    >
                      <HeartHandshake className="h-4 w-4" />
                      Zobacz fundacje wsparcia
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Block 3: Both Parents Sharing & Combining Parental Leave with Work */}
          {input.scenario !== 'ciaza' && !isTragicScenario && (
            <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6ECE9] pb-3">
                <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#007834]" />
                  3. Podział opieki między oboje rodziców oraz łączenie z pracą
                </h2>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#007834] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.includeFather}
                    onChange={(e) => update('includeFather', e.target.checked)}
                    className="h-4 w-4 accent-[#007834]"
                  />
                  Uwzględnij ojca / drugiego rodzica
                </label>
              </div>

              {input.includeFather && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Wynagrodzenie brutto ojca / drugiego rodzica (zł)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        step={100}
                        value={input.fatherMonthlyGrossBasis}
                        onChange={(e) =>
                          update('fatherMonthlyGrossBasis', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 font-mono text-sm tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={input.fatherHasSicknessInsurance}
                          onChange={(e) => update('fatherHasSicknessInsurance', e.target.checked)}
                          className="h-4 w-4 accent-[#007834]"
                        />
                        Ojciec podlega ubezpieczeniu chorobowemu
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={input.fatherTakesPaternityLeave}
                          onChange={(e) => update('fatherTakesPaternityLeave', e.target.checked)}
                          className="h-4 w-4 accent-[#007834]"
                        />
                        Urlop ojcowski (14 dni / 2 tyg., 100%, do 12 mies. dziecka)
                      </label>
                    </div>
                  </div>

                  {input.fatherHasSicknessInsurance && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#F5F7F6] p-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#111C18] mb-1">
                          Urlop rodzicielski dla ojca:{' '}
                          <span className="font-mono text-[#007834] tabular-nums">
                            {input.fatherTakesParentalWeeks} tyg.
                          </span>{' '}
                          (z {result.dimensions.parentalPoolTotal} tyg.)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={maxFatherParental}
                          value={Math.min(maxFatherParental, input.fatherTakesParentalWeeks)}
                          onChange={(e) => update('fatherTakesParentalWeeks', Number(e.target.value))}
                          className="w-full accent-[#007834]"
                        />
                        <p className="text-[11px] text-[#4B5E55]">
                          Minimum {config.nonTransferableParentWeeks} tyg. nieprzenoszalnych dla
                          ojca (70%). Przy 0 tyg. te {config.nonTransferableParentWeeks} tyg.
                          przepadają.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#111C18] mb-1">
                          Przejęcie macierzyńskiego przez ojca:{' '}
                          <span className="font-mono text-[#007834] tabular-nums">
                            {input.fatherTakesMaternityTransferWeeks} tyg.
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={
                            input.specialSituation === 'przejecie_ojciec_szczegolne'
                              ? result.dimensions.maternityWeeksTotal
                              : maxTransferableMat
                          }
                          value={input.fatherTakesMaternityTransferWeeks}
                          onChange={(e) =>
                            update('fatherTakesMaternityTransferWeeks', Number(e.target.value))
                          }
                          className="w-full accent-[#007834]"
                        />
                        <p className="text-[11px] text-[#4B5E55]">
                          Standardowo po wykorzystaniu przez matkę min.{' '}
                          {config.motherMandatoryMaternityWeeks} tyg.
                        </p>
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={input.parentsSimultaneousParental}
                            onChange={(e) =>
                              update('parentsSimultaneousParental', e.target.checked)
                            }
                            className="h-3.5 w-3.5 accent-[#007834]"
                          />
                          Rodzice korzystają z urlopu rodzicielskiego jednocześnie (równolegle na osi
                          czasu)
                        </label>
                        {input.fatherTakesPaternityLeave && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={input.paternitySplitTwoParts}
                              onChange={(e) => update('paternitySplitTwoParts', e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#007834]"
                            />
                            Podziel urlop ojcowski na 2 części po 7 dni
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Combining Parental Leave with Part-Time Work */}
              <div className="pt-4 border-t border-[#E6ECE9] space-y-3">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-[#111C18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.combineWithWork}
                    onChange={(e) =>
                      onChange({
                        ...input,
                        combineWithWork: e.target.checked,
                        workFraction: e.target.checked ? input.workFraction || 0.5 : 0,
                        workCombinedWeeks: e.target.checked ? input.workCombinedWeeks || 16 : 0,
                      })
                    }
                    className="h-4 w-4 accent-[#007834]"
                  />
                  Łączenie urlopu rodzicielskiego z pracą (do 1/2 etatu u pracodawcy)
                </label>

                {input.combineWithWork && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#F5F7F6] p-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Wymiar czasu pracy podczas urlopu rodzicielskiego
                      </label>
                      <div className="flex gap-2">
                        {[
                          { v: 0.25 as const, label: '1/4 etatu (25%)' },
                          { v: 0.5 as const, label: '1/2 etatu (50%)' },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => update('workFraction', opt.v)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                              input.workFraction === opt.v
                                ? 'border-[#007834] bg-white text-[#005E28]'
                                : 'border-[#CBD5D0] bg-transparent text-[#4B5E55]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#111C18] mb-1.5">
                        Tygodnie łączone z pracą:{' '}
                        <span className="font-mono text-[#007834] tabular-nums">
                          {input.workCombinedWeeks} tyg.
                        </span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={Math.max(1, result.dimensions.motherParentalWeeks)}
                        value={Math.min(
                          Math.max(1, result.dimensions.motherParentalWeeks),
                          input.workCombinedWeeks || 1
                        )}
                        onChange={(e) => update('workCombinedWeeks', Number(e.target.value))}
                        className="w-full accent-[#007834]"
                      />
                      <p className="text-[11px] text-[#4B5E55]">
                        Proporcjonalne wydłużenie urlopu:{' '}
                        <strong className="font-mono text-[#007834]">
                          +{result.dimensions.extendedParentalBonusWeeks} tyg.
                        </strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payout Rate Variant Choice */}
              <div className="pt-4 border-t border-[#E6ECE9] space-y-3">
                <p className="text-xs font-semibold text-[#111C18]">
                  Wariant wysokości zasiłku macierzyńskiego (wybór stawki)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...input, payoutVariant: '81_5', filedWithin21Days: true })
                    }
                    className={`text-left rounded-lg border p-3.5 transition-colors ${
                      input.payoutVariant === '81_5'
                        ? 'border-[#007834] bg-[#EDF7F1]'
                        : 'border-[#DCE3DF] bg-white hover:bg-[#F9FBFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111C18] font-mono tabular-nums">
                        {config.parentalAveragedRate}% uśrednione
                      </span>
                      {result.financialSummary.recommendedVariant === '81_5' && (
                        <span className="text-[11px] font-semibold text-[#007834]">Korzystniejszy</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#4B5E55]">
                      Jeden wniosek do {config.applicationDeadline21Days} dni po porodzie. Stała
                      wypłata przez cały okres (9 tyg. ojca zawsze {config.parentalStandardRate}%).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => update('payoutVariant', '100_70')}
                    className={`text-left rounded-lg border p-3.5 transition-colors ${
                      input.payoutVariant === '100_70'
                        ? 'border-[#007834] bg-[#EDF7F1]'
                        : 'border-[#DCE3DF] bg-white hover:bg-[#F9FBFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111C18] font-mono tabular-nums">
                        {config.maternityRate}% + {config.parentalStandardRate}%
                      </span>
                      {result.financialSummary.recommendedVariant === '100_70' && (
                        <span className="text-[11px] font-semibold text-[#007834]">Korzystniejszy</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#4B5E55]">
                      {config.maternityRate}% za urlop macierzyński i uzupełniający, następnie{' '}
                      {config.parentalStandardRate}% za urlop rodzicielski.
                    </p>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Live Calculation Results, Timeline, Documents & Risks */}
        <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-20">
          {/* Status & Payer Routing Card */}
          <section
            className={`rounded-xl border p-5 ${
              !result.eligible
                ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                : input.employmentType === 'jdg' && input.hasZUSArrears
                ? 'border-[#FCD34D] bg-[#FFFBEB]'
                : 'border-[#BBF7D0] bg-[#F0FDF4]'
            }`}
          >
            <div className="flex items-start gap-3">
              {!result.eligible ? (
                <ShieldAlert className="h-5 w-5 text-[#B91C1C] shrink-0 mt-0.5" />
              ) : input.employmentType === 'jdg' && input.hasZUSArrears ? (
                <AlertTriangle className="h-5 w-5 text-[#B45309] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[#007834] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-[#111C18]">
                  {result.eligibilityHeadline}
                </h2>
                <p className="text-xs text-[#334155] leading-relaxed">
                  {result.eligibilityReason}
                </p>
                <div className="pt-2 border-t border-black/10 text-xs">
                  <span className="font-semibold text-[#111C18]">Kto wypłaca świadczenie: </span>
                  <span className="font-semibold text-[#005E28]">{result.payerEntity}</span>
                  <p className="mt-1 text-[#4B5E55]">{result.payerExplanation}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Financial Numbers & Variant Comparison */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#111C18]">
              {input.scenario === 'ciaza'
                ? 'Wyliczenie zasiłku chorobowego w ciąży'
                : 'Zestawienie kwot i porównanie wariantów (szacunek netto po 13,71%)'}
            </h3>

            {input.scenario === 'ciaza' ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#F5F7F6] p-3">
                    <p className="text-xs text-[#4B5E55]">Stawka w ciąży</p>
                    <p className="font-mono text-lg font-bold text-[#007834] tabular-nums">
                      {result.pregnancySickness.ratePercent}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F5F7F6] p-3">
                    <p className="text-xs text-[#4B5E55]">Szacunkowo / miesiąc (30 dni)</p>
                    <p className="font-mono text-lg font-bold text-[#111C18] tabular-nums">
                      {result.pregnancySickness.estimatedMonthlyAmount.toLocaleString('pl-PL', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      zł
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[#4B5E55] space-y-1.5">
                  <p>
                    • Pierwsze{' '}
                    <strong className="text-[#111C18]">
                      {result.pregnancySickness.employerPaidDays} dni
                    </strong>{' '}
                    w roku płaci pracodawca (wynagrodzenie chorobowe); zasiłek z FUS przysługuje od{' '}
                    <strong className="text-[#111C18]">
                      {result.pregnancySickness.zusPaidFromDay}. dnia
                    </strong>
                    .
                  </p>
                  <p>• Pozostały limit okresu zasiłkowego: {result.pregnancySickness.remainingDays} dni z {result.pregnancySickness.maxDays}.</p>
                  <p className="pt-1 text-[#0369A1]">{result.pregnancySickness.rehabBenefitInfo}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#F5F7F6] p-3">
                    <p className="text-xs text-[#4B5E55]">Macierzyński (mies. / 30 dni)</p>
                    <p className="font-mono text-lg font-bold text-[#111C18] tabular-nums">
                      {result.financialSummary.motherMonthlyMaternity.toLocaleString('pl-PL', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      zł
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F5F7F6] p-3">
                    <p className="text-xs text-[#4B5E55]">Rodzicielski matki (mies.)</p>
                    <p className="font-mono text-lg font-bold text-[#111C18] tabular-nums">
                      {result.financialSummary.motherMonthlyParental.toLocaleString('pl-PL', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      zł
                    </p>
                    {result.financialSummary.motherMonthlyCombinedWorkSalaryEstimate > 0 && (
                      <p className="text-[11px] text-[#007834] font-mono tabular-nums mt-0.5">
                        + ~{result.financialSummary.motherMonthlyCombinedWorkSalaryEstimate.toFixed(0)}{' '}
                        zł z pracy
                      </p>
                    )}
                  </div>
                </div>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE3DF] text-[#4B5E55]">
                      <th className="py-2 text-left font-semibold">Wariant wypłaty</th>
                      <th className="py-2 text-right font-semibold">Suma świadczeń (oboje)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F0] tabular-nums">
                    <tr className={input.payoutVariant === '81_5' ? 'bg-[#EDF7F1]/70 font-semibold' : ''}>
                      <td className="py-2 pr-2">
                        Wariant {config.parentalAveragedRate}% (wniosek do {config.applicationDeadline21Days} dni)
                      </td>
                      <td className="py-2 text-right font-mono">
                        {result.financialSummary.variant81_5Total.toLocaleString('pl-PL', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        zł
                      </td>
                    </tr>
                    <tr className={input.payoutVariant === '100_70' ? 'bg-[#EDF7F1]/70 font-semibold' : ''}>
                      <td className="py-2 pr-2">
                        Wariant {config.maternityRate}% + {config.parentalStandardRate}%
                      </td>
                      <td className="py-2 text-right font-mono">
                        {result.financialSummary.variant100_70Total.toLocaleString('pl-PL', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        zł
                      </td>
                    </tr>
                  </tbody>
                </table>

                {result.financialSummary.minBenefitTopUpApplied && (
                  <p className="text-xs text-[#005E28] bg-[#EDF7F1] rounded-lg px-3 py-2">
                    Zastosowano podwyższenie zasiłku macierzyńskiego do gwarantowanej kwoty
                    świadczenia rodzicielskiego ({config.minMonthlyBenefitNet} zł netto/mies.).
                  </p>
                )}

                {input.includeFather && result.dimensions.fatherParentalWeeks > 0 && (
                  <div className="flex items-center justify-between text-xs border-t border-[#EEF2F0] pt-2.5 text-[#4B5E55] tabular-nums">
                    <span>
                      Zasiłek ojca (rodzicielski {result.dimensions.fatherParentalWeeks} tyg. · 70%)
                    </span>
                    <span className="font-mono font-semibold text-[#111C18]">
                      {result.financialSummary.fatherMonthlyParental.toLocaleString('pl-PL', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      zł/mies.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Labor Code Protection Summary */}
            <div className="pt-3 border-t border-[#E6ECE9] flex items-start gap-2 text-xs text-[#4B5E55]">
              <ShieldCheck
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  result.laborCodeProtection.protected ? 'text-[#007834]' : 'text-[#B45309]'
                }`}
              />
              <p>{result.laborCodeProtection.summary}</p>
            </div>
          </section>

          {/* Visual Timeline */}
          {result.timeline.length > 0 && (
            <section className="rounded-xl border border-[#DCE3DF] bg-white p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111C18]">
                  Harmonogram urlopów i wypłat (tydzień po tygodniu)
                </h3>
                <span className="font-mono text-xs text-[#4B5E55] tabular-nums">
                  Łącznie {result.dimensions.grandTotalCalendarWeeks} tyg.
                </span>
              </div>

              <div className="space-y-3">
                {result.timeline.map((seg) => {
                  const leftPct = ((seg.startWeek - minWeek) / totalSpan) * 100;
                  const widthPct = Math.max(8, (seg.durationWeeks / totalSpan) * 100);
                  return (
                    <div key={seg.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[#111C18] truncate">{seg.label}</span>
                        <span className="font-mono text-[#4B5E55] tabular-nums shrink-0">
                          {seg.durationWeeks} tyg. · {seg.ratePercent}%
                        </span>
                      </div>
                      <div className="relative h-5 w-full rounded bg-[#EEF2F0] overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 rounded ${
                            LEAVE_BAR_COLORS[seg.leaveType] ?? 'bg-[#007834]'
                          } flex items-center px-2 text-[10px] font-mono text-white truncate`}
                          style={{
                            left: `${Math.max(0, leftPct)}%`,
                            width: `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`,
                          }}
                        >
                          {seg.parent === 'Ojciec / Drugi rodzic' ? 'Ojciec' : 'Matka'} ·{' '}
                          {seg.monthlyNetEstimate.toFixed(0)} zł/m
                        </div>
                      </div>
                      {seg.note && <p className="text-[11px] text-[#4B5E55]">{seg.note}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Risks & Dynamic Documents */}
          {result.risks.length > 0 && (
            <section className="rounded-xl border border-[#DCE3DF] bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#111C18]">
                Wykryte ryzyka i ostrzeżenia ({result.risks.length})
              </h3>
              <div className="space-y-2.5">
                {result.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`rounded-lg border p-3 text-xs space-y-1 ${
                      risk.severity === 'error'
                        ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#7F1D1D]'
                        : risk.severity === 'warning'
                        ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#78350F]'
                        : 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0C4A6E]'
                    }`}
                  >
                    <p className="font-semibold flex items-center gap-1.5">
                      {risk.severity === 'info' ? (
                        <Info className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {risk.title}
                    </p>
                    <p className="leading-relaxed opacity-90">{risk.description}</p>
                    <p className="font-mono text-[10px] opacity-75">{risk.legalBasis}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documents Checklist CTA */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#111C18] flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#007834]" />
                Wymagane dokumenty i terminy ({result.documents.length})
              </h3>
            </div>
            <div className="divide-y divide-[#EEF2F0]">
              {result.documents.map((doc) => (
                <div key={doc.code} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#111C18]">{doc.title}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#007834] shrink-0">
                      {doc.code}
                    </span>
                  </div>
                  <p className="text-[#4B5E55]">
                    Adresat: <strong>{doc.recipient}</strong> · Termin: {doc.deadline}
                  </p>
                  <p className="text-[11px] text-[#6B7E75]">{doc.note}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenApplications}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#007834] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors"
            >
              Wypełnij wnioski w Kreatorze (wydruk + UPO)
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
