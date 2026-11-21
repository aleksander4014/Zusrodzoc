import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileUp,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type {
  CalculationResult,
  CalculatorInput,
  PdfAnalysisResult,
  TestCaseRecord,
} from '../shared/types';
import { analyzePdfWithAI } from '../services/api';

interface CasesAndPdfViewProps {
  testCases: Array<TestCaseRecord & { previewResult: CalculationResult }>;
  onApplyTestCase: (testCase: TestCaseRecord) => void;
  onApplyPdfResult: (pdfResult: PdfAnalysisResult) => void;
}

export const CasesAndPdfView: React.FC<CasesAndPdfViewProps> = ({
  testCases,
  onApplyTestCase,
  onApplyPdfResult,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfAnalysisResult | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<
    'all' | 'Przyznano' | 'Odmowa' | 'Przyznano z uwagami'
  >('all');

  const handleFileChange = (file: File | null) => {
    setPdfError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPdfError('Wybierz plik w formacie PDF (.pdf), np. formularz ZAM, Z-3, Z-3a lub Poświadczenie.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError('Maksymalny rozmiar pliku PDF to 10 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyzePdf = async () => {
    if (!selectedFile || analyzing) return;
    setAnalyzing(true);
    setPdfError(null);
    setPdfResult(null);
    try {
      const res = await analyzePdfWithAI(selectedFile);
      setPdfResult(res);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : 'Nie udało się przeanalizować pliku PDF.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredCases = testCases.filter((tc) => {
    const matchesDecision =
      decisionFilter === 'all' || tc.expectedDecision === decisionFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tc.title.toLowerCase().includes(q) ||
      tc.shortDescription.toLowerCase().includes(q) ||
      tc.caseNumber.toLowerCase().includes(q) ||
      tc.documentsInPack.some((d) => d.toLowerCase().includes(q));
    return matchesDecision && matchesQuery;
  });

  return (
    <div className="space-y-8">
      {/* Section 1: AI PDF Form Analyzer */}
      <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6ECE9] pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#111C18] flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[#007834]" />
              Analizator formularzy PDF i weryfikacja spraw ZUS
            </h1>
            <p className="text-sm text-[#4B5E55] mt-1">
              Wgraj przykładowy wniosek lub poświadczenie PDF (ZAM, Z-3, Z-3a, ZAS-53, e-ZLA), aby
              zweryfikować podleganie ubezpieczeniu chorobowemu i automatycznie zasilić kalkulator.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007834] shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            Analiza PDF wspierana przez AI
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Upload dropzone */}
          <div className="lg:col-span-5 space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0] ?? null;
                handleFileChange(dropped);
              }}
              className="rounded-xl border-2 border-dashed border-[#CBD5D0] bg-[#F9FBFA] p-6 text-center space-y-3 hover:border-[#007834] transition-colors"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#EDF7F1] text-[#007834]">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111C18]">
                  Przeciągnij plik PDF lub wybierz z dysku
                </p>
                <p className="text-xs text-[#4B5E55] mt-1">
                  Obsługiwane: ZAM, Z-3, Z-3a, ZAS-53, ZAS-12, Poświadczenie ubezpieczenia
                  chorobowego, e-ZLA (maks. 10 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[#CBD5D0] bg-white px-4 py-2 text-xs font-semibold text-[#111C18] hover:bg-[#F5F7F6] transition-colors"
              >
                Wybierz plik PDF
              </button>
              {selectedFile && (
                <p className="text-xs font-mono text-[#005E28] break-all">
                  Wybrano: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedFile || analyzing}
              onClick={handleAnalyzePdf}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#007834] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005E28] disabled:opacity-50 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {analyzing ? 'Analizuję dokument PDF...' : 'Zweryfikuj ubezpieczenie i wyciągnij dane (AI)'}
            </button>

            {pdfError && (
              <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
                {pdfError}
              </div>
            )}
          </div>

          {/* Analysis output */}
          <div className="lg:col-span-7">
            {analyzing ? (
              <div className="rounded-xl border border-[#E6ECE9] bg-[#F9FBFA] p-6 space-y-3 animate-pulse">
                <div className="h-4 w-2/5 rounded bg-[#DCE3DF]" />
                <div className="h-3 w-4/5 rounded bg-[#E6ECE9]" />
                <div className="h-3 w-3/4 rounded bg-[#E6ECE9]" />
                <div className="h-20 w-full rounded bg-[#EEF2F0]" />
              </div>
            ) : pdfResult ? (
              <div className="rounded-xl border border-[#DCE3DF] bg-[#FAFBFB] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6ECE9] pb-3">
                  <div>
                    <p className="text-xs text-[#4B5E55]">
                      Rozpoznany dokument · model {pdfResult.aiModel}
                    </p>
                    <h3 className="text-base font-bold text-[#111C18]">
                      {pdfResult.documentType} — {pdfResult.applicantName}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      pdfResult.insuranceVerified ? 'text-[#007834]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {pdfResult.insuranceVerified ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    {pdfResult.insuranceVerified
                      ? 'Ubezpieczenie chorobowe potwierdzone'
                      : 'Brak / wątpliwość co do ubezpieczenia'}
                  </span>
                </div>

                <p className="text-sm text-[#111C18] leading-relaxed">{pdfResult.rawSummary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-white border border-[#E6ECE9] p-3">
                    <p className="font-semibold text-[#111C18]">Weryfikacja ubezpieczenia</p>
                    <p className="mt-1 text-[#4B5E55]">{pdfResult.insuranceStatusSummary}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-[#E6ECE9] p-3">
                    <p className="font-semibold text-[#111C18]">Płatnik świadczenia</p>
                    <p className="mt-1 text-[#4B5E55]">{pdfResult.payerInfo}</p>
                  </div>
                </div>

                {pdfResult.detectedRisks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#991B1B]">Wykryte uwagi / ryzyka:</p>
                    <ul className="list-disc pl-5 text-xs text-[#4B5E55] space-y-0.5">
                      {pdfResult.detectedRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6ECE9]">
                  <p className="text-xs text-[#4B5E55]">
                    Wyodrębnione parametry możesz od razu przenieść do Zintegrowanego Kalkulatora.
                  </p>
                  <button
                    type="button"
                    onClick={() => onApplyPdfResult(pdfResult)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors whitespace-nowrap"
                  >
                    Załaduj dane do Kalkulatora
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E6ECE9] bg-[#FAFBFB] p-6 space-y-2 text-sm text-[#4B5E55]">
                <p className="font-semibold text-[#111C18]">
                  Jak działa weryfikacja formularzy PDF?
                </p>
                <p className="text-xs leading-relaxed">
                  1. Wgraj dowolny plik PDF ze sprawy zasiłkowej (np. zanonimizowany wniosek ZAM,
                  zaświadczenie płatnika Z-3 / Z-3a, wniosek ZAS-53 lub Poświadczenie ubezpieczenia
                  chorobowego).
                </p>
                <p className="text-xs leading-relaxed">
                  2. Serwer przesyła dokument bezpiecznie do modelu Gemini, który sprawdza tytuł
                  ubezpieczenia, okres wyczekiwania, podstawę wymiaru i wielkość płatnika (&gt;20
                  ubezpieczonych).
                </p>
                <p className="text-xs leading-relaxed">
                  3. Jednym kliknięciem przenosisz dane do Kalkulatora, aby przetestować poprawność
                  wyliczeń i wymaganych dokumentów.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Built-in ZUS Test Cases */}
      <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6ECE9] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111C18]">
              Wbudowane sprawy testowe ZUS (zestawy walidacyjne)
            </h2>
            <p className="text-xs text-[#4B5E55] mt-0.5">
              Przekrojowe stany faktyczne (decyzje pozytywne, odmowne i z uwagami) — wybierz sprawę,
              aby natychmiast zweryfikować ją w kalkulatorze.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative">
              <Search className="h-4 w-4 text-[#6B7E75] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj sprawy lub druku (np. Z-3a, wcześniak)..."
                className="w-full sm:w-64 rounded-lg border border-[#CBD5D0] bg-white pl-9 pr-3 py-1.5 text-xs text-[#111C18] focus:border-[#007834] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[#F0F4F2] p-1">
              {(
                [
                  { id: 'all', label: 'Wszystkie' },
                  { id: 'Przyznano', label: 'Przyznano' },
                  { id: 'Odmowa', label: 'Odmowa' },
                  { id: 'Przyznano z uwagami', label: 'Z uwagami' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDecisionFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    decisionFilter === tab.id
                      ? 'bg-white text-[#111C18] shadow-xs'
                      : 'text-[#4B5E55] hover:text-[#111C18]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#4B5E55]">
            Brak spraw testowych spełniających wybrane kryteria wyszukiwania.
          </div>
        ) : (
          <div className="divide-y divide-[#E6ECE9]">
            {filteredCases.map((tc) => (
              <article
                key={tc.id}
                className="py-5 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5E55]">
                    <span className="font-mono font-semibold text-[#111C18]">{tc.caseNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{tc.applicantName}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        tc.expectedDecision === 'Przyznano'
                          ? 'text-[#007834]'
                          : tc.expectedDecision === 'Odmowa'
                          ? 'text-[#B91C1C]'
                          : 'text-[#B45309]'
                      }`}
                    >
                      {tc.expectedDecision === 'Przyznano' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : tc.expectedDecision === 'Odmowa' ? (
                        <ShieldAlert className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      Wynik ZUS: {tc.expectedDecision}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[#111C18]">{tc.title}</h3>
                  <p className="text-xs text-[#4B5E55] leading-relaxed">{tc.shortDescription}</p>
                  <p className="text-xs text-[#111C18] bg-[#F5F7F6] rounded-lg px-3 py-2">
                    <strong>Rozstrzygnięcie:</strong> {tc.decisionSummary}
                  </p>
                  <div className="text-[11px] text-[#4B5E55]">
                    <span className="font-semibold text-[#111C18]">Dokumenty w zestawie: </span>
                    {tc.documentsInPack.join(' · ')}
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 lg:w-56">
                  <div className="text-left lg:text-right">
                    <p className="text-[11px] text-[#4B5E55]">Wyliczenie silnika (suma)</p>
                    <p className="font-mono text-base font-bold text-[#111C18] tabular-nums">
                      {tc.previewResult.financialSummary.selectedVariantTotal.toLocaleString(
                        'pl-PL',
                        { minimumFractionDigits: 2 }
                      )}{' '}
                      zł
                    </p>
                    <p className="text-[11px] text-[#4B5E55] truncate max-w-[210px]">
                      {tc.previewResult.payerEntity}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApplyTestCase(tc)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#007834] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005E28] transition-colors whitespace-nowrap"
                  >
                    Przetestuj w Kalkulatorze
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
