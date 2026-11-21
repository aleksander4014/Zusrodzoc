import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import type {
  CalculationResult,
  ChatMessage,
  EzlaCertificate,
  InsuredProfile,
} from '../shared/types';
import { askPueAssistant } from '../services/api';

interface DashboardZusViewProps {
  profile: InsuredProfile | null;
  calculation: CalculationResult;
  fetchedAt: string | null;
  onOpenLogin: () => void;
  onRefreshZus: (clearArrears?: boolean) => Promise<void>;
  onAddSimulatedEzla: (cert: EzlaCertificate) => void;
  onNavigate: (tab: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'Czy bardziej opłaca mi się wariant 81,5% czy 100% + 70%?',
  'Kto wypłaci mój zasiłek — pracodawca czy ZUS i jakie druki złożyć?',
  'Co się dzieje, gdy ojciec nie wykorzysta swoich 9 tygodni urlopu rodzicielskiego?',
  'Czy zaległość na JDG blokuje zasiłek macierzyński z ZUS?',
];

export const DashboardZusView: React.FC<DashboardZusViewProps> = ({
  profile,
  calculation,
  fetchedAt,
  onOpenLogin,
  onRefreshZus,
  onAddSimulatedEzla,
  onNavigate,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-pue',
      role: 'assistant',
      content:
        'Dzień dobry. Jestem Asystentem PUE/eZUS (moduł wspierany przez AI). Możesz zapytać mnie o swoją sytuację ubezpieczeniową, wymagane wnioski (w tym ujednolicony formularz ZAM 2026), uzupełniający urlop macierzyński, łączenie urlopu z pracą lub ryzyka utraty prawa do zasiłku.',
      timestamp: new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  const handleRefresh = async (clearArrears = false) => {
    setRefreshing(true);
    try {
      await onRefreshZus(clearArrears);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddMockEzla = () => {
    const nextNum = (profile?.ezlaHistory.length ?? 0) + 1;
    const newCert: EzlaCertificate = {
      id: `ezla-sim-${Date.now()}`,
      series: `ZLA/2026/${940000 + nextNum * 37}`,
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      days: 30,
      code: 'B',
      doctorName: 'dr n. med. Ewa Dąbrowska (ginekolog-położnik)',
      status: 'Zatwierdzone w ZUS',
      payer: calculation.payerEntity.includes('Pracodawca') ? 'Pracodawca' : 'ZUS',
    };
    onAddSimulatedEzla(newCert);
  };

  const handleSendQuestion = async (textOverride?: string) => {
    const question = (textOverride ?? chatInput).trim();
    if (!question || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);

    try {
      const profileSummary = profile
        ? `Ubezpieczony: ${profile.fullName}, forma: ${profile.employmentType}, chorobowe: ${
            profile.hasSicknessInsurance ? 'TAK' : 'NIE'
          } (${profile.insuranceDaysContinuous} dni), wielkość płatnika: ${
            profile.employerInsuredCount
          } os., podstawa: ${profile.monthlyGrossBasis} zł, zaległość ZUS: ${
            profile.hasZUSArrears ? `${profile.arrearsAmountPln} zł` : 'brak'
          }. Aktualny wynik kalkulatora: ${calculation.eligibilityHeadline}, wypłaca: ${
            calculation.payerEntity
          }, wariant 100/70: ${calculation.financialSummary.variant100_70Total} zł, wariant 81,5%: ${
            calculation.financialSummary.variant81_5Total
          } zł.`
        : `Tryb niezalogowany (dane wprowadzone ręcznie). Wynik kalkulatora: ${calculation.eligibilityHeadline}, wypłaca: ${calculation.payerEntity}.`;

      const res = await askPueAssistant({
        message: question,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        profileContext: profileSummary,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : 'Nie udało się uzyskać odpowiedzi od Asystenta PUE/eZUS.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  const ezlaList = profile?.ezlaHistory ?? [];
  const totalEzlaDays = ezlaList.reduce((sum, item) => sum + item.days, 0);
  const ezlaPct = Math.min(100, Math.round((totalEzlaDays / calculation.pregnancySickness.maxDays) * 100));

  return (
    <div className="space-y-8">
      {/* Hero / Institutional Summary Banner */}
      <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5E55]">
              <span>Zakład Ubezpieczeń Społecznych</span>
              <span aria-hidden="true">·</span>
              <span>Ubezpieczenie chorobowe i macierzyństwo</span>
              <span aria-hidden="true">·</span>
              <span>Stan prawny 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111C18]">
              Zasiłkowy Przewodnik Przyszłego Rodzica
            </h1>
            <p className="text-sm sm:text-base text-[#4B5E55] leading-relaxed">
              Sprawdź przysługujące świadczenia w ciąży i po narodzinach lub przyjęciu dziecka na
              wychowanie, przetestuj warianty wypłat (100%/70% vs 81,5%), zweryfikuj dokumenty PDF
              oraz wygeneruj gotowe wnioski do pracodawcy, ZUS i USC.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('calculator')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#007834] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005E28] transition-colors whitespace-nowrap"
            >
              <Calculator className="h-4 w-4" />
              Otwórz kalkulator zasiłków
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5D0] bg-white px-4 py-2.5 text-sm font-semibold text-[#111C18] hover:bg-[#F5F7F6] transition-colors whitespace-nowrap"
            >
              <UserCheck className="h-4 w-4 text-[#007834]" />
              {profile ? 'Zmień profil mObywatel' : 'Zaloguj przez mObywatel'}
            </button>
          </div>
        </div>

        {/* 4-column institutional KPI summary strip */}
        <div className="mt-6 pt-6 border-t border-[#E6ECE9] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <div>
            <p className="text-xs font-medium text-[#4B5E55]">Status uprawnień (bieżąca symulacja)</p>
            <p
              className={`mt-1 text-sm font-semibold flex items-center gap-1.5 ${
                calculation.eligible ? 'text-[#007834]' : 'text-[#B91C1C]'
              }`}
            >
              {calculation.eligible ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{calculation.eligible ? 'Uprawnienie potwierdzone' : 'Brak prawa / blokada'}</span>
            </p>
            <p className="mt-0.5 text-xs text-[#4B5E55] truncate">{calculation.payerEntity}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4B5E55]">Łączny wymiar urlopów (kalendarz.)</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#111C18] tabular-nums">
              {calculation.dimensions.grandTotalCalendarWeeks} tyg.
            </p>
            <p className="mt-0.5 text-xs text-[#4B5E55] tabular-nums">
              Macierz. {calculation.dimensions.maternityWeeksTotal} · Rodzic.{' '}
              {calculation.dimensions.motherParentalWeeks + calculation.dimensions.fatherParentalWeeks}
              {calculation.dimensions.supplementaryWeeks > 0
                ? ` · Uzup. ${calculation.dimensions.supplementaryWeeks}`
                : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4B5E55]">Szacowana suma świadczeń (wybrany wariant)</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#111C18] tabular-nums">
              {calculation.financialSummary.selectedVariantTotal.toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              zł
            </p>
            <p className="mt-0.5 text-xs text-[#4B5E55] tabular-nums">
              Podstawa dzienna 100%: {calculation.motherDaily100.toFixed(2)} zł
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4B5E55]">Wykryte ryzyka i wymogi</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#111C18] tabular-nums">
              {calculation.risks.length} {calculation.risks.length === 1 ? 'uwaga' : 'uwag'} ·{' '}
              {calculation.documents.length} dok.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#007834] hover:underline"
            >
              Przejdź do wniosków
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Main 2-column workspace: Simulated ZUS Data & Debt / e-ZLA */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 columns: Account Data, Debt Certificate, e-ZLA */}
        <div className="xl:col-span-7 space-y-6">
          {/* ZUS Account & Contribution Arrears Simulation */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6ECE9] pb-4">
              <div>
                <h2 className="text-base font-semibold text-[#111C18]">
                  Dane z konta ubezpieczonego PUE/eZUS i stan rozliczeń
                </h2>
                <p className="text-xs text-[#4B5E55] mt-0.5">
                  Symulacja pobrania danych z systemów ZUS
                  {fetchedAt
                    ? ` · Ostatnia synchronizacja: ${new Date(fetchedAt).toLocaleTimeString('pl-PL')}`
                    : ' · Dane wprowadzane ręcznie'}
                </p>
              </div>
              <button
                type="button"
                disabled={refreshing || !profile}
                onClick={() => handleRefresh(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5D0] bg-white px-3 py-1.5 text-xs font-medium text-[#111C18] hover:bg-[#F5F7F6] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Pobierz ponownie z ZUS
              </button>
            </div>

            {profile ? (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-[#4B5E55]">Ubezpieczony</span>
                    <p className="font-semibold text-[#111C18]">
                      {profile.fullName}{' '}
                      <span className="font-mono text-xs font-normal text-[#4B5E55]">
                        ({profile.peselMasked})
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-[#4B5E55]">Tytuł ubezpieczenia chorobowego</span>
                    <p className="font-semibold text-[#111C18]">
                      {profile.employmentType === 'uop'
                        ? 'Umowa o pracę (obowiązkowe chorobowe)'
                        : profile.employmentType === 'jdg'
                        ? 'Działalność gospodarcza (dobrowolne chorobowe)'
                        : profile.employmentType === 'zlecenie'
                        ? 'Umowa zlecenie (dobrowolne chorobowe)'
                        : 'Brak tytułu do ubezpieczenia'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-[#4B5E55]">Nieprzerwany okres ubezpieczenia</span>
                    <p className="font-mono font-semibold text-[#111C18] tabular-nums">
                      {profile.insuranceDaysContinuous} dni
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-[#4B5E55]">Płatnik składek (stan na 30 listopada)</span>
                    <p className="font-semibold text-[#111C18] flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-[#007834] shrink-0" />
                      <span className="tabular-nums">
                        {profile.employerInsuredCount} ubezp. → wypłaca{' '}
                        {profile.employerInsuredCount > 20 && profile.employmentType !== 'jdg'
                          ? 'Pracodawca'
                          : 'ZUS'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Contribution Arrears Certificate (critical for JDG) */}
                <div
                  className={`rounded-lg border p-4 ${
                    profile.hasZUSArrears
                      ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                      : 'border-[#BBF7D0] bg-[#F0FDF4]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {profile.hasZUSArrears ? (
                          <AlertTriangle className="h-4 w-4 text-[#B91C1C] shrink-0" />
                        ) : (
                          <FileCheck2 className="h-4 w-4 text-[#007834] shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold text-[#111C18]">
                          Zaświadczenie o stanie zadłużenia z tytułu składek (symulacja)
                        </h3>
                      </div>
                      <p className="text-xs text-[#4B5E55] font-mono tabular-nums">
                        Nr dokumentu: {profile.arrearsCertificateNumber} · Stan na dzień powstania prawa
                      </p>
                      {profile.hasZUSArrears ? (
                        <p className="text-xs text-[#7F1D1D] leading-relaxed pt-1">
                          Wykryto zadłużenie na koncie płatnika w wysokości{' '}
                          <strong className="font-mono tabular-nums">
                            {profile.arrearsAmountPln.toFixed(2)} zł
                          </strong>
                          . W przypadku pozarolniczej działalności gospodarczej zadłużenie przekraczające
                          1% minimalnego wynagrodzenia wstrzymuje wypłatę zasiłku do czasu uregulowania.
                        </p>
                      ) : (
                        <p className="text-xs text-[#14532D] leading-relaxed pt-1">
                          Brak zaległości z tytułu składek na ubezpieczenia społeczne (saldo: 0,00 zł).
                          Brak przeszkód formalnych do wypłaty świadczenia z FUS.
                        </p>
                      )}
                    </div>

                    {profile.hasZUSArrears && (
                      <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => handleRefresh(true)}
                        className="rounded-lg bg-[#007834] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors whitespace-nowrap shrink-0"
                      >
                        Zasymuluj spłatę zadłużenia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#CBD5D0] bg-[#F9FBFA] p-5 text-center space-y-3">
                <p className="text-sm font-medium text-[#111C18]">
                  Nie pobrano jeszcze danych z konta ZUS
                </p>
                <p className="text-xs text-[#4B5E55] max-w-md mx-auto">
                  Zaloguj się symulowanym profilem mObywatel, aby zobaczyć pobrane okresy
                  ubezpieczenia, zaświadczenie o niezaleganiu ze składkami oraz historię e-ZLA, albo
                  wprowadź własne dane bezpośrednio w kalkulatorze.
                </p>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Zaloguj przez mObywatel (symulacja)
                </button>
              </div>
            )}
          </section>

          {/* e-ZLA Medical Certificates Simulation */}
          <section className="rounded-xl border border-[#DCE3DF] bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6ECE9] pb-4">
              <div>
                <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-[#007834]" />
                  Zaświadczenia lekarskie e-ZLA (symulacja podglądu)
                </h2>
                <p className="text-xs text-[#4B5E55] mt-0.5">
                  Elektroniczne zwolnienia lekarskie trafiają bezpośrednio do ZUS i na profil płatnika
                  PUE/eZUS · kod „B” oznacza 100% zasiłku w ciąży
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMockEzla}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5D0] bg-white px-3 py-1.5 text-xs font-medium text-[#111C18] hover:bg-[#F5F7F6] transition-colors whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-[#007834]" />
                Zasymuluj nowe e-ZLA (kod B)
              </button>
            </div>

            {/* 270 days usage progress */}
            <div className="mt-4 rounded-lg bg-[#F5F7F6] p-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-[#111C18]">
                  Wykorzystanie okresu zasiłkowego w ciąży (limit {calculation.pregnancySickness.maxDays}{' '}
                  dni)
                </span>
                <span className="font-mono font-semibold text-[#007834] tabular-nums">
                  {totalEzlaDays} / {calculation.pregnancySickness.maxDays} dni ({ezlaPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#DCE3DF] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#007834] transition-all duration-200"
                  style={{ width: `${ezlaPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#4B5E55]">
                Pozostało{' '}
                <strong className="font-mono tabular-nums">
                  {Math.max(0, calculation.pregnancySickness.maxDays - totalEzlaDays)} dni
                </strong>{' '}
                okresu zasiłkowego. Po jego wyczerpaniu można wystąpić o świadczenie rehabilitacyjne.
              </p>
            </div>

            {ezlaList.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE3DF] text-[#4B5E55]">
                      <th className="py-2.5 pr-3 font-semibold">Seria e-ZLA</th>
                      <th className="py-2.5 px-3 font-semibold">Okres</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Dni</th>
                      <th className="py-2.5 px-3 font-semibold">Kod</th>
                      <th className="py-2.5 px-3 font-semibold">Płatnik</th>
                      <th className="py-2.5 pl-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F0]">
                    {ezlaList.map((cert) => (
                      <tr key={cert.id} className="hover:bg-[#F9FBFA]">
                        <td className="py-2.5 pr-3 font-mono font-medium text-[#111C18]">
                          {cert.series}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#4B5E55] tabular-nums whitespace-nowrap">
                          {cert.dateFrom} – {cert.dateTo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right font-semibold text-[#111C18] tabular-nums">
                          {cert.days}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#007834]">
                          {cert.code === 'B' ? 'Kod B (100%)' : 'Brak (80%)'}
                        </td>
                        <td className="py-2.5 px-3 text-[#4B5E55]">{cert.payer}</td>
                        <td className="py-2.5 pl-3 text-[#111C18]">{cert.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#4B5E55]">
                Brak wystawionych zaświadczeń e-ZLA dla wybranego profilu. Kliknij „Zasymuluj nowe
                e-ZLA (kod B)”, aby przetestować naliczanie okresu zasiłkowego.
              </p>
            )}
          </section>
        </div>

        {/* Right 5 columns: Simulated PUE/eZUS AI Assistant */}
        <section className="xl:col-span-5 rounded-xl border border-[#DCE3DF] bg-white flex flex-col overflow-hidden">
          <div className="border-b border-[#E6ECE9] bg-[#F5F7F6] px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#007834]" />
                Asystent PUE/eZUS
              </h2>
              <span className="text-xs font-medium text-[#007834]">
                Funkcja wspierana przez AI
              </span>
            </div>
            <p className="text-xs text-[#4B5E55] mt-1">
              Symulacja połączenia z PUE/eZUS · zadaj pytanie o swój profil, terminy wniosków lub
              szczególną sytuację życiową.
            </p>
          </div>

          <div className="p-4 space-y-3 h-[420px] overflow-y-auto bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#007834] text-white'
                      : 'bg-[#F5F7F6] text-[#111C18] border border-[#E6ECE9]'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="mt-1 text-[11px] font-mono text-[#6B7E75] tabular-nums">
                  {msg.role === 'user' ? 'Ty' : 'Asystent PUE/eZUS (AI)'} · {msg.timestamp}
                </span>
              </div>
            ))}
            {chatLoading && (
              <div className="rounded-lg border border-[#E6ECE9] bg-[#F5F7F6] px-3.5 py-2.5 text-xs text-[#4B5E55]">
                Analizuję przepisy ustawy zasiłkowej i Twój profil...
              </div>
            )}
            {chatError && (
              <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#991B1B]">
                {chatError}
              </div>
            )}
          </div>

          <div className="border-t border-[#E6ECE9] bg-[#FAFBFB] p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={chatLoading}
                  onClick={() => handleSendQuestion(q)}
                  className="text-left text-xs text-[#005E28] bg-[#EDF7F1] hover:bg-[#D4ECDD] px-2.5 py-1.5 rounded-md transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Zadaj pytanie o zasiłek, urlop lub dokumenty ZUS..."
                className="flex-1 rounded-lg border border-[#CBD5D0] bg-white px-3.5 py-2 text-sm text-[#111C18] placeholder:text-[#7A8C83] focus:border-[#007834] focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#007834] text-white hover:bg-[#005E28] disabled:opacity-50 transition-colors shrink-0"
                aria-label="Wyślij pytanie"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
