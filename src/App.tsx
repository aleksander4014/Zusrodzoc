import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  FileSearch,
  FileSignature,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Settings2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BUILTIN_TEST_CASES,
  CHARITY_ORGANIZATIONS,
  DEFAULT_LEGAL_CONFIG,
  OFFICIAL_EXTERNAL_LINKS,
  SIMULATED_MOBYWATEL_PROFILES,
  profileToCalculatorInput,
} from './shared/data';
import { calculateBenefits } from './shared/legalEngine';
import type {
  CalculationResult,
  CalculatorInput,
  CharityOrganization,
  EzlaCertificate,
  InsuredProfile,
  LegalConfig,
  PdfAnalysisResult,
  SubmittedApplication,
  TestCaseRecord,
} from './shared/types';
import {
  fetchCharitiesAndLinks,
  fetchLegalConfig,
  fetchSimulatedProfiles,
  fetchSubmittedApplications,
  fetchTestCases,
  resetLegalConfig,
  runServerCalculation,
  simulateZusFetch,
  updateLegalConfig,
} from './services/api';
import { MObywatelModal } from './components/MObywatelModal';
import { DashboardZusView } from './components/DashboardZusView';
import { IntegratedCalculatorView } from './components/IntegratedCalculatorView';
import { CasesAndPdfView } from './components/CasesAndPdfView';
import { ApplicationsWizardView } from './components/ApplicationsWizardView';
import { RisksAndSupportView } from './components/RisksAndSupportView';
import { AdminPanelView } from './components/AdminPanelView';

type NavTab =
  | 'dashboard'
  | 'calculator'
  | 'cases'
  | 'applications'
  | 'support'
  | 'admin';

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'Pulpit i PUE/eZUS',
    breadcrumb: 'Pulpit i konto PUE/eZUS',
    icon: LayoutDashboard,
  },
  {
    id: 'calculator',
    label: 'Kalkulator zasiłków',
    breadcrumb: 'Zintegrowany kalkulator zasiłkowy',
    icon: Calculator,
  },
  {
    id: 'cases',
    label: 'Sprawy i analiza PDF',
    breadcrumb: 'Sprawy testowe i weryfikator PDF (AI)',
    icon: FileSearch,
  },
  {
    id: 'applications',
    label: 'Wnioski i UPO',
    breadcrumb: 'Kreator wniosków, wydruk i UPO',
    icon: FileSignature,
  },
  {
    id: 'support',
    label: 'Ryzyka i wsparcie',
    breadcrumb: 'Ryzyka, ochrona prawna i fundacje',
    icon: HeartHandshake,
  },
  {
    id: 'admin',
    label: 'Panel administracyjny',
    breadcrumb: 'Parametry legislacyjne',
    icon: Settings2,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [config, setConfig] = useState<LegalConfig>(DEFAULT_LEGAL_CONFIG);
  const [profiles, setProfiles] = useState<InsuredProfile[]>(SIMULATED_MOBYWATEL_PROFILES);
  const [activeProfile, setActiveProfile] = useState<InsuredProfile | null>(
    SIMULATED_MOBYWATEL_PROFILES[0]
  );
  const [fetchedAt, setFetchedAt] = useState<string | null>(new Date().toISOString());

  const [calcInput, setCalcInput] = useState<CalculatorInput>(() =>
    profileToCalculatorInput(SIMULATED_MOBYWATEL_PROFILES[0])
  );
  const [serverCalcResult, setServerCalcResult] = useState<CalculationResult | null>(null);

  const [testCases, setTestCases] = useState<
    Array<TestCaseRecord & { previewResult: CalculationResult }>
  >(() =>
    BUILTIN_TEST_CASES.map((tc) => ({
      ...tc,
      previewResult: calculateBenefits(tc.input, DEFAULT_LEGAL_CONFIG),
    }))
  );

  const [charities, setCharities] = useState<CharityOrganization[]>(CHARITY_ORGANIZATIONS);
  const [officialLinks, setOfficialLinks] = useState(OFFICIAL_EXTERNAL_LINKS);
  const [submittedApps, setSubmittedApps] = useState<SubmittedApplication[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Instant deterministic local calculation (zero latency while sliding controls)
  const instantCalculation = useMemo(
    () => calculateBenefits(calcInput, config),
    [calcInput, config]
  );

  const calculation = serverCalcResult ?? instantCalculation;

  // Initial hydration from Express REST API
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchLegalConfig().catch(() => null),
      fetchSimulatedProfiles().catch(() => null),
      fetchTestCases().catch(() => null),
      fetchCharitiesAndLinks().catch(() => null),
      fetchSubmittedApplications().catch(() => null),
    ]).then(([cfg, profs, cases, charData, apps]) => {
      if (!mounted) return;
      if (cfg) setConfig(cfg);
      if (profs && profs.length > 0) setProfiles(profs);
      if (cases) setTestCases(cases);
      if (charData) {
        setCharities(charData.charities);
        setOfficialLinks(charData.officialLinks);
      }
      if (apps) setSubmittedApps(apps);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced server-side calculation validation via REST API
  useEffect(() => {
    setServerCalcResult(null);
    const timer = window.setTimeout(() => {
      runServerCalculation(calcInput)
        .then((res) => setServerCalcResult(res))
        .catch(() => {
          // Fallback seamlessly to identical local deterministic engine
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [calcInput, config]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5500);
  };

  const handleSelectProfile = async (profileId: string) => {
    const res = await simulateZusFetch(profileId, false);
    setActiveProfile(res.profile);
    setFetchedAt(res.fetchedAt);
    setCalcInput(profileToCalculatorInput(res.profile));
    showToast(`Pobrano symulowane dane ZUS dla: ${res.profile.fullName}`);
  };

  const handleRefreshZus = async (clearArrears = false) => {
    if (!activeProfile) return;
    const res = await simulateZusFetch(activeProfile.id, clearArrears);
    setActiveProfile(res.profile);
    setFetchedAt(res.fetchedAt);
    setCalcInput((prev) => ({
      ...prev,
      hasZUSArrears: res.profile.hasZUSArrears,
      arrearsAmountPln: res.profile.arrearsAmountPln,
      insuranceDaysContinuous: res.profile.insuranceDaysContinuous,
      employerInsuredCount: res.profile.employerInsuredCount,
    }));
    showToast(
      clearArrears
        ? 'Zasymulowano spłatę zaległości ZUS — zaświadczenie o niezaleganiu zaktualizowane.'
        : 'Zaktualizowano symulowane dane z PUE/eZUS.'
    );
  };

  const handleAddSimulatedEzla = (cert: EzlaCertificate) => {
    if (activeProfile) {
      const updated: InsuredProfile = {
        ...activeProfile,
        ezlaHistory: [cert, ...activeProfile.ezlaHistory],
      };
      setActiveProfile(updated);
    }
    setCalcInput((prev) => ({
      ...prev,
      ezlaDaysUsed: Math.min(config.sicknessMaxDaysPregnancy, prev.ezlaDaysUsed + cert.days),
    }));
    showToast(`Dodano symulowane zwolnienie ${cert.series} (+${cert.days} dni, kod B).`);
  };

  const handleApplyTestCase = (tc: TestCaseRecord) => {
    setCalcInput(tc.input);
    setActiveTab('calculator');
    showToast(`Załadowano sprawę testową ${tc.caseNumber} (${tc.expectedDecision}) do kalkulatora.`);
  };

  const handleApplyPdfResult = (pdfRes: PdfAnalysisResult) => {
    const ext = pdfRes.extractedInput ?? {};
    setCalcInput((prev) => ({
      ...prev,
      scenario:
        ext.scenario === 'ciaza' ||
        ext.scenario === 'porod' ||
        ext.scenario === 'adopcja' ||
        ext.scenario === 'rodzina_zastepcza' ||
        ext.scenario === 'szczegolne'
          ? ext.scenario
          : prev.scenario,
      employmentType:
        ext.employmentType === 'uop' ||
        ext.employmentType === 'zlecenie' ||
        ext.employmentType === 'jdg' ||
        ext.employmentType === 'brak'
          ? ext.employmentType
          : prev.employmentType,
      hasSicknessInsurance:
        typeof ext.hasSicknessInsurance === 'boolean'
          ? ext.hasSicknessInsurance
          : pdfRes.insuranceVerified,
      insuranceDaysContinuous:
        typeof ext.insuranceDaysContinuous === 'number' && ext.insuranceDaysContinuous >= 0
          ? ext.insuranceDaysContinuous
          : prev.insuranceDaysContinuous,
      employerInsuredCount:
        typeof ext.employerInsuredCount === 'number' && ext.employerInsuredCount > 0
          ? ext.employerInsuredCount
          : prev.employerInsuredCount,
      monthlyGrossBasis:
        typeof ext.monthlyGrossBasis === 'number' && ext.monthlyGrossBasis > 0
          ? ext.monthlyGrossBasis
          : prev.monthlyGrossBasis,
      childrenCount:
        typeof ext.childrenCount === 'number' && ext.childrenCount >= 1 && ext.childrenCount <= 5
          ? (ext.childrenCount as CalculatorInput['childrenCount'])
          : prev.childrenCount,
      hasZaZyciemCertificate:
        typeof ext.hasZaZyciemCertificate === 'boolean'
          ? ext.hasZaZyciemCertificate
          : prev.hasZaZyciemCertificate,
      hasZUSArrears:
        typeof ext.hasZUSArrears === 'boolean' ? ext.hasZUSArrears : prev.hasZUSArrears,
      arrearsAmountPln:
        typeof ext.arrearsAmountPln === 'number' ? ext.arrearsAmountPln : prev.arrearsAmountPln,
      hospitalWeeks:
        typeof ext.hospitalWeeks === 'number' && ext.hospitalWeeks > 0
          ? ext.hospitalWeeks
          : prev.hospitalWeeks,
      payoutVariant:
        ext.payoutVariant === '81_5' || ext.payoutVariant === '100_70'
          ? ext.payoutVariant
          : prev.payoutVariant,
    }));
    setActiveTab('calculator');
    showToast(`Przeniesiono wyodrębnione dane z PDF (${pdfRes.documentType}) do kalkulatora.`);
  };

  const handleSaveAdminConfig = async (next: LegalConfig) => {
    const saved = await updateLegalConfig(next);
    setConfig(saved);
    const refreshedCases = await fetchTestCases().catch(() => null);
    if (refreshedCases) setTestCases(refreshedCases);
  };

  const handleResetAdminConfig = async () => {
    const reset = await resetLegalConfig();
    setConfig(reset);
    const refreshedCases = await fetchTestCases().catch(() => null);
    if (refreshedCases) setTestCases(refreshedCases);
  };

  const activeNavMeta = NAV_ITEMS.find((i) => i.id === activeTab) ?? NAV_ITEMS[0];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7F6] text-[#111C18]">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 border-r border-[#DCE3DF] bg-white no-print">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-[#DCE3DF]">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#007834] text-white font-display font-extrabold text-xs tracking-tight shrink-0">
            ZUS
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-[#111C18] whitespace-nowrap truncate">
            Przewodnik Rodzica
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Nawigacja główna">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EDF7F1] text-[#005E28] font-semibold'
                    : 'text-[#4B5E55] hover:bg-[#F5F7F6] hover:text-[#111C18]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-[#007834]' : 'text-[#6B7E75]'}`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E6ECE9] text-xs text-[#4B5E55] space-y-1">
          <p className="font-semibold text-[#111C18]">Stan prawny 2026</p>
          <p className="leading-snug">
            Ustawa zasiłkowa (Dz.U. poz. 854) · Kodeks pracy (Dz.U. poz. 1245)
          </p>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#111C18]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white border-r border-[#DCE3DF] shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-[#DCE3DF]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#007834] text-white font-display font-extrabold text-xs">
                  ZUS
                </div>
                <span className="font-display text-sm font-bold text-[#111C18]">
                  Przewodnik Rodzica
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5E55] hover:bg-[#F0F4F2]"
                aria-label="Zamknij menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#EDF7F1] text-[#005E28] font-semibold'
                        : 'text-[#4B5E55] hover:bg-[#F5F7F6]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (strictly h-14 = 56px, well below 15% mobile viewport cap) */}
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-4 border-b border-[#DCE3DF] bg-white/95 backdrop-blur-xs px-4 lg:px-8 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-[#111C18] hover:bg-[#F0F4F2] shrink-0"
              aria-label="Otwórz menu nawigacji"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#4B5E55] whitespace-nowrap">
                Przewodnik Rodzica
              </span>
              <span className="hidden sm:inline text-[#CBD5D0]" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#111C18] truncate">
                {activeNavMeta.breadcrumb}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#007834] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-4 w-4" />
            <span className="max-w-[150px] sm:max-w-none truncate">
              {activeProfile ? `mObywatel: ${activeProfile.fullName}` : 'Zaloguj mObywatel'}
            </span>
          </button>
        </header>

        {/* Action Toast */}
        {toastMessage && (
          <div className="mx-4 lg:mx-8 mt-4 rounded-lg border border-[#BBF7D0] bg-[#EDF7F1] px-4 py-2.5 text-xs font-medium text-[#005E28] flex items-center justify-between gap-3 no-print">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-[#005E28] hover:underline shrink-0"
            >
              Zamknij
            </button>
          </div>
        )}

        {/* Active View Viewport */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {activeTab === 'dashboard' && (
            <DashboardZusView
              profile={activeProfile}
              calculation={calculation}
              fetchedAt={fetchedAt}
              onOpenLogin={() => setLoginModalOpen(true)}
              onRefreshZus={handleRefreshZus}
              onAddSimulatedEzla={handleAddSimulatedEzla}
              onNavigate={(tab) => handleNavClick(tab as NavTab)}
            />
          )}

          {activeTab === 'calculator' && (
            <IntegratedCalculatorView
              input={calcInput}
              onChange={setCalcInput}
              result={calculation}
              config={config}
              onOpenApplications={() => handleNavClick('applications')}
              onOpenCharities={() => handleNavClick('support')}
            />
          )}

          {activeTab === 'cases' && (
            <CasesAndPdfView
              testCases={testCases}
              onApplyTestCase={handleApplyTestCase}
              onApplyPdfResult={handleApplyPdfResult}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsWizardView
              profile={activeProfile}
              input={calcInput}
              calculation={calculation}
              submittedList={submittedApps}
              onSubmitted={(item) => setSubmittedApps((prev) => [item, ...prev])}
            />
          )}

          {activeTab === 'support' && (
            <RisksAndSupportView charities={charities} officialLinks={officialLinks} />
          )}

          {activeTab === 'admin' && (
            <AdminPanelView
              config={config}
              onSaveConfig={handleSaveAdminConfig}
              onResetConfig={handleResetAdminConfig}
            />
          )}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="mt-auto border-t border-[#DCE3DF] bg-white px-4 lg:px-8 py-4 text-xs text-[#4B5E55] no-print">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p>
              Zasiłkowy Przewodnik Przyszłego Rodzica · Narzędzie informacyjno-symulacyjne (nie
              zastępuje formalnej decyzji administracyjnej ZUS).
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://www.zus.pl"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#007834] transition-colors"
              >
                zus.pl
              </a>
              <a
                href="https://www.gov.pl/web/rodzina/urlop-rodzicielski"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#007834] transition-colors"
              >
                MRPiPS (gov.pl)
              </a>
              <a
                href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#007834] transition-colors"
              >
                PIP
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Simulated mObywatel Login Modal */}
      <MObywatelModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfile?.id ?? null}
        onSelectProfile={handleSelectProfile}
        onSelectManualMode={() => {
          setActiveProfile(null);
          setFetchedAt(null);
          showToast('Przełączono na tryb wprowadzania danych własnych (bez logowania).');
        }}
      />
    </div>
  );
}
