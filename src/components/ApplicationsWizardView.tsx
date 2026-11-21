import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Printer,
  Send,
} from 'lucide-react';
import type {
  CalculationResult,
  CalculatorInput,
  InsuredProfile,
  SubmittedApplication,
} from '../shared/types';
import { submitSimulatedApplication } from '../services/api';

interface ApplicationsWizardViewProps {
  profile: InsuredProfile | null;
  input: CalculatorInput;
  calculation: CalculationResult;
  submittedList: SubmittedApplication[];
  onSubmitted: (item: SubmittedApplication) => void;
}

type WizardFormTab = 'URLOP_PRACODAWCA' | 'ZAM_ZUS' | 'ODPIS_USC';

export const ApplicationsWizardView: React.FC<ApplicationsWizardViewProps> = ({
  profile,
  input,
  calculation,
  submittedList,
  onSubmitted,
}) => {
  const [activeTab, setActiveTab] = useState<WizardFormTab>(
    input.employmentType === 'uop' ? 'URLOP_PRACODAWCA' : 'ZAM_ZUS'
  );
  const [applicantName, setApplicantName] = useState(profile?.fullName ?? 'Anna Kowalska');
  const [pesel, setPesel] = useState(profile?.peselMasked ?? '940514*****');
  const [address, setAddress] = useState('ul. Marszałkowska 42/8, 00-514 Warszawa');
  const [employerName, setEmployerName] = useState('Przykładowa Sp. z o.o., ul. Prosta 20, Warszawa');
  const [childName, setChildName] = useState('Jan Kowalski');
  const [childBirthDate, setChildBirthDate] = useState(input.dueOrBirthDate || '2026-12-10');
  const [bankAccount, setBankAccount] = useState('PL 42 1020 1097 0000 7202 0194 8812');
  const [uscCopyType, setUscCopyType] = useState<'skrocony' | 'zupelny'>('skrocony');
  const [uscCity, setUscCity] = useState('Urząd Stanu Cywilnego m.st. Warszawy');

  const [submitting, setSubmitting] = useState(false);
  const [lastUpo, setLastUpo] = useState<SubmittedApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayPl = new Date().toLocaleDateString('pl-PL');

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitSimulation = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const recipient =
        activeTab === 'URLOP_PRACODAWCA'
          ? employerName
          : activeTab === 'ZAM_ZUS'
          ? 'Zakład Ubezpieczeń Społecznych (PUE/eZUS)'
          : `${uscCity} (Rejestr Stanu Cywilnego / gov.pl)`;

      const summary =
        activeTab === 'URLOP_PRACODAWCA'
          ? `Wniosek o urlop macierzyński (${calculation.dimensions.motherMaternityWeeks} tyg.) i rodzicielski (${calculation.dimensions.motherParentalWeeks} tyg.), wariant ${
              input.payoutVariant === '81_5' ? '81,5%' : '100% + 70%'
            }`
          : activeTab === 'ZAM_ZUS'
          ? `Wniosek ZAM o zasiłek macierzyński (ujednolicony formularz 2026), wariant ${
              input.payoutVariant === '81_5' ? '81,5%' : '100% + 70%'
            }`
          : `Wniosek o wydanie odpisu ${
              uscCopyType === 'skrocony' ? 'skróconego' : 'zupełnego'
            } aktu urodzenia dziecka (${childName})`;

      const res = await submitSimulatedApplication({
        formType: activeTab,
        applicantName,
        recipient,
        summary,
      });
      setLastUpo(res);
      onSubmitted(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zasymulować wysyłki wniosku.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Form Tabs */}
      <div className="rounded-xl border border-[#DCE3DF] bg-white p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111C18]">
              Kreator wniosków, podgląd do wydruku i symulacja wysyłki (UPO)
            </h1>
            <p className="text-sm text-[#4B5E55] mt-1">
              Wypełnij wniosek o urlopy do pracodawcy, ujednolicony wniosek ZAM do ZUS (od
              24.10.2026 r. zastępuje ZUR i ZAO) lub wniosek o odpis aktu urodzenia do USC.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111C18] hover:bg-[#F5F7F6] transition-colors whitespace-nowrap"
            >
              <Printer className="h-4 w-4 text-[#007834]" />
              Drukuj / Zapisz jako PDF
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitSimulation}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Wysyłanie...' : 'Symuluj wysyłkę i pobierz UPO'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5 rounded-lg bg-[#F0F4F2] p-1.5">
          {(
            [
              { id: 'URLOP_PRACODAWCA', label: '1. Wniosek o urlopy (do pracodawcy)' },
              { id: 'ZAM_ZUS', label: '2. Wniosek ZAM o zasiłek (do ZUS)' },
              { id: 'ODPIS_USC', label: '3. Odpis aktu urodzenia (USC / gov.pl)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setLastUpo(null);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-[#007834] shadow-xs'
                  : 'text-[#4B5E55] hover:text-[#111C18]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {lastUpo && (
          <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="h-5 w-5 text-[#007834] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#111C18]">
                  Symulacja wysyłki zakończona — wygenerowano UPO
                </p>
                <p className="font-mono text-[#005E28] mt-0.5">
                  Numer potwierdzenia: {lastUpo.upoNumber} ·{' '}
                  {new Date(lastUpo.submittedAt).toLocaleString('pl-PL')}
                </p>
                <p className="text-[#4B5E55] mt-0.5">Adresat: {lastUpo.recipient}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            {error}
          </div>
        )}
      </div>

      {/* Main 2-column Wizard: Form Inputs + Live Printable A4 Document */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Form Inputs (5 cols) */}
        <section className="xl:col-span-5 rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-4 no-print">
          <h2 className="text-base font-semibold text-[#111C18] border-b border-[#E6ECE9] pb-3">
            Dane do wypełnienia wniosku
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Imię i nazwisko wnioskodawcy
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm text-[#111C18]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#111C18] mb-1">PESEL (symulacja)</label>
                <input
                  type="text"
                  value={pesel}
                  onChange={(e) => setPesel(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm text-[#111C18]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#111C18] mb-1">
                  Data urodzenia / przyjęcia dziecka
                </label>
                <input
                  type="date"
                  value={childBirthDate}
                  onChange={(e) => setChildBirthDate(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm text-[#111C18]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Adres zamieszkania</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm text-[#111C18]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Imię i nazwisko dziecka</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm text-[#111C18]"
              />
            </div>

            {activeTab === 'URLOP_PRACODAWCA' && (
              <div>
                <label className="block font-semibold text-[#111C18] mb-1">
                  Nazwa i adres pracodawcy (płatnika składek)
                </label>
                <input
                  type="text"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm text-[#111C18]"
                />
              </div>
            )}

            {activeTab === 'ZAM_ZUS' && (
              <div>
                <label className="block font-semibold text-[#111C18] mb-1">
                  Numer rachunku bankowego do wypłaty zasiłku (ZUS)
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm text-[#111C18]"
                />
                <p className="mt-1.5 text-[11px] text-[#4B5E55]">
                  Wzory formularzy ZUS dostępne są także bezpośrednio na{' '}
                  <a
                    href="https://www.zus.pl"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#007834] underline inline-flex items-center gap-0.5"
                  >
                    www.zus.pl
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              </div>
            )}

            {activeTab === 'ODPIS_USC' && (
              <>
                <div>
                  <label className="block font-semibold text-[#111C18] mb-1">
                    Rodzaj odpisu aktu urodzenia
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUscCopyType('skrocony')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold ${
                        uscCopyType === 'skrocony'
                          ? 'border-[#007834] bg-[#EDF7F1] text-[#005E28]'
                          : 'border-[#CBD5D0] text-[#4B5E55]'
                      }`}
                    >
                      Odpis skrócony
                    </button>
                    <button
                      type="button"
                      onClick={() => setUscCopyType('zupelny')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold ${
                        uscCopyType === 'zupelny'
                          ? 'border-[#007834] bg-[#EDF7F1] text-[#005E28]'
                          : 'border-[#CBD5D0] text-[#4B5E55]'
                      }`}
                    >
                      Odpis zupełny
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-[#111C18] mb-1">
                    Urząd Stanu Cywilnego
                  </label>
                  <input
                    type="text"
                    value={uscCity}
                    onChange={(e) => setUscCity(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm text-[#111C18]"
                  />
                </div>
                <a
                  href="https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007834] hover:underline"
                >
                  Przejdź do oficjalnej usługi e-USC na gov.pl
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </section>

        {/* Live Printable Official Document Preview (7 cols) */}
        <section className="xl:col-span-7 rounded-xl border border-[#CBD5D0] bg-white p-8 shadow-xs print-only-sheet">
          <div className="space-y-6 text-sm text-[#111C18] leading-relaxed">
            <div className="flex items-start justify-between border-b-2 border-[#111C18] pb-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#4B5E55]">
                  {activeTab === 'URLOP_PRACODAWCA'
                    ? 'Dokument kadrowy — Kodeks pracy (Dz.U. 2026 poz. 1245)'
                    : activeTab === 'ZAM_ZUS'
                    ? 'Formularz ZUS ZAM — ujednolicony wniosek 2026'
                    : 'Rejestr Stanu Cywilnego — wniosek o odpis aktu urodzenia'}
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#111C18]">
                  {activeTab === 'URLOP_PRACODAWCA'
                    ? 'WNIOSEK O UDZIELENIE URLOPÓW ZWIĄZANYCH Z RODZICIELSTWEM'
                    : activeTab === 'ZAM_ZUS'
                    ? 'WNIOSEK O ZASIŁEK MACIERZYŃSKI (ZAM)'
                    : `WNIOSEK O WYDANIE ODPISU ${
                        uscCopyType === 'skrocony' ? 'SKRÓCONEGO' : 'ZUPEŁNEGO'
                      } AKTU URODZENIA`}
                </h2>
              </div>
              <div className="text-right font-mono text-xs text-[#4B5E55] shrink-0">
                <p>Data: {todayPl}</p>
                <p>Wersja symulacyjna</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-[#4B5E55]">Wnioskodawca:</p>
                <p className="font-bold text-[#111C18]">{applicantName}</p>
                <p className="font-mono">PESEL: {pesel}</p>
                <p>{address}</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <p className="font-semibold text-[#4B5E55]">Adresat wniosku:</p>
                <p className="font-bold text-[#111C18]">
                  {activeTab === 'URLOP_PRACODAWCA'
                    ? employerName
                    : activeTab === 'ZAM_ZUS'
                    ? 'Zakład Ubezpieczeń Społecznych (PUE/eZUS)'
                    : uscCity}
                </p>
              </div>
            </div>

            {activeTab === 'URLOP_PRACODAWCA' && (
              <div className="space-y-3 text-xs sm:text-sm">
                <p>
                  Na podstawie przepisów ustawy z dnia 26 czerwca 1974 r. – Kodeks pracy oraz
                  rozporządzenia MRPiPS z dnia 11 marca 2025 r. wnoszę o udzielenie urlopu
                  związanego z rodzicielstwem w związku z urodzeniem / przyjęciem na wychowanie
                  dziecka <strong>{childName}</strong> (data: <span className="font-mono">{childBirthDate}</span>):
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Urlop macierzyński / na warunkach macierzyńskiego:{' '}
                    <strong>{calculation.dimensions.motherMaternityWeeks} tygodni</strong>
                  </li>
                  {calculation.dimensions.supplementaryWeeks > 0 && (
                    <li>
                      Uzupełniający urlop macierzyński (wcześniak / hospitalizacja):{' '}
                      <strong>{calculation.dimensions.supplementaryWeeks} tygodni</strong> (jednorazowo
                      po macierzyńskim, zaświadczenie szpitala w załączeniu)
                    </li>
                  )}
                  {calculation.dimensions.motherParentalWeeks > 0 && (
                    <li>
                      Urlop rodzicielski (część wnioskodawcy):{' '}
                      <strong>{calculation.dimensions.motherParentalWeeks} tygodni</strong>
                      {calculation.dimensions.extendedParentalBonusWeeks > 0
                        ? ` + proporcjonalne wydłużenie o ${calculation.dimensions.extendedParentalBonusWeeks} tyg. z tytułu łączenia z pracą (${
                            input.workFraction * 100
                          }% etatu)`
                        : ''}
                    </li>
                  )}
                  <li>
                    Wnioskowany wariant wysokości zasiłku:{' '}
                    <strong>
                      {input.payoutVariant === '81_5'
                        ? '81,5% za cały okres (wniosek złożony nie później niż 21 dni po porodzie)'
                        : '100% za urlop macierzyński / uzupełniający oraz 70% za urlop rodzicielski'}
                    </strong>
                  </li>
                </ul>
                <p className="text-xs text-[#4B5E55]">
                  Jednocześnie oświadczam, że drugi rodzic dziecka skorzysta z przysługującej mu
                  nieprzenoszalnej części urlopu rodzicielskiego w wymiarze{' '}
                  {calculation.dimensions.fatherParentalWeeks} tygodni.
                </p>
              </div>
            )}

            {activeTab === 'ZAM_ZUS' && (
              <div className="space-y-3 text-xs sm:text-sm">
                <p>
                  Wnoszę o ustalenie prawa i wypłatę zasiłku macierzyńskiego (ujednolicony wniosek{' '}
                  <strong>ZAM</strong>, obejmujący również dawne zakresy zlikwidowanych druków ZUR
                  i ZAO od 24.10.2026 r.) za okres odpowiadający:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Okresowi urlopu macierzyńskiego:{' '}
                    <strong>{calculation.dimensions.motherMaternityWeeks} tygodni</strong>
                  </li>
                  {calculation.dimensions.supplementaryWeeks > 0 && (
                    <li>
                      Okresowi uzupełniającego urlopu macierzyńskiego:{' '}
                      <strong>{calculation.dimensions.supplementaryWeeks} tygodni</strong>
                    </li>
                  )}
                  <li>
                    Okresowi urlopu rodzicielskiego:{' '}
                    <strong>{calculation.dimensions.motherParentalWeeks} tygodni</strong>
                  </li>
                  <li>
                    Dane dziecka: <strong>{childName}</strong> (ur.{' '}
                    <span className="font-mono">{childBirthDate}</span>, liczba dzieci:{' '}
                    {input.childrenCount})
                  </li>
                  <li>
                    Wypłata na rachunek bankowy: <span className="font-mono">{bankAccount}</span>
                  </li>
                </ul>
                <p className="text-xs text-[#4B5E55]">
                  Wymagane załączniki: skrócony odpis aktu urodzenia dziecka
                  {input.employmentType === 'uop' && input.employerInsuredCount <= 20
                    ? ', zaświadczenie płatnika składek Z-3'
                    : input.employmentType === 'zlecenie'
                    ? ', zaświadczenie płatnika składek Z-3a'
                    : ''}
                  {input.hasZaZyciemCertificate ? ', zaświadczenie lekarskie „Za życiem”' : ''}.
                </p>
              </div>
            )}

            {activeTab === 'ODPIS_USC' && (
              <div className="space-y-3 text-xs sm:text-sm">
                <p>
                  Wnoszę o wydanie{' '}
                  <strong>
                    odpisu {uscCopyType === 'skrocony' ? 'skróconego' : 'zupełnego'} aktu urodzenia
                  </strong>{' '}
                  z Rejestru Stanu Cywilnego w celu przedłożenia w Zakładzie Ubezpieczeń Społecznych
                  / u pracodawcy dla ustalenia prawa do zasiłku macierzyńskiego.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Osoba, której akt dotyczy: <strong>{childName}</strong>
                  </li>
                  <li>
                    Data urodzenia dziecka: <span className="font-mono">{childBirthDate}</span>
                  </li>
                  <li>Forma odbioru: Dokument elektroniczny na skrzynkę e-Doręczenia / PUE</li>
                  <li>Podstawa zwolnienia z opłaty skarbowej: Sprawa z zakresu ubezpieczeń społecznych (ZUS)</li>
                </ul>
              </div>
            )}

            <div className="pt-8 flex items-end justify-between text-xs text-[#4B5E55] border-t border-[#E6ECE9]">
              <p>Dokument wygenerowany w Zasiłkowym Przewodniku Przyszłego Rodzica (ZUS)</p>
              <div className="text-center">
                <div className="w-48 border-b border-dotted border-[#4B5E55] mb-1" />
                <span>Czytelny podpis / podpis zaufany</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Submitted Applications UPO Log */}
      {submittedList.length > 0 && (
        <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-3 no-print">
          <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-[#007834]" />
            Rejestr wysłanych wniosków i potwierdzeń UPO (symulacja sesji)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DCE3DF] text-[#4B5E55]">
                  <th className="py-2 pr-3 font-semibold">Numer UPO</th>
                  <th className="py-2 px-3 font-semibold">Wnioskodawca</th>
                  <th className="py-2 px-3 font-semibold">Adresat</th>
                  <th className="py-2 px-3 font-semibold">Zakres wniosku</th>
                  <th className="py-2 pl-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F0]">
                {submittedList.map((item) => (
                  <tr key={item.upoNumber}>
                    <td className="py-2.5 pr-3 font-mono font-semibold text-[#007834] whitespace-nowrap">
                      {item.upoNumber}
                    </td>
                    <td className="py-2.5 px-3 text-[#111C18]">{item.applicantName}</td>
                    <td className="py-2.5 px-3 text-[#4B5E55]">{item.recipient}</td>
                    <td className="py-2.5 px-3 text-[#111C18]">{item.summary}</td>
                    <td className="py-2.5 pl-3 font-mono text-[#4B5E55] tabular-nums whitespace-nowrap">
                      {new Date(item.submittedAt).toLocaleString('pl-PL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
