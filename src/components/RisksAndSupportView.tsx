import React, { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  HeartHandshake,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { CharityOrganization } from '../shared/types';

interface RisksAndSupportViewProps {
  charities: CharityOrganization[];
  officialLinks: Array<{
    title: string;
    description: string;
    url: string;
    institution: string;
  }>;
  initialSection?: 'risks' | 'support';
}

const CHARITY_CATEGORIES: Array<{
  id: 'all' | CharityOrganization['category'];
  label: string;
}> = [
  { id: 'all', label: 'Wszystkie organizacje' },
  { id: 'strata_poronienie', label: 'Strata dziecka i poronienie' },
  { id: 'wczesniaki', label: 'Wcześniaki i hospitalizacja' },
  { id: 'ciezka_choroba', label: 'Ciężka choroba dziecka' },
  { id: 'telefon_kryzysowy', label: 'Telefony kryzysowe 24/7' },
];

export const RisksAndSupportView: React.FC<RisksAndSupportViewProps> = ({
  charities,
  officialLinks,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CharityOrganization['category']>('all');

  const filteredCharities = charities.filter(
    (c) => categoryFilter === 'all' || c.category === categoryFilter
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Risks & Threats to Benefit Eligibility */}
      <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
        <div className="border-b border-[#E6ECE9] pb-4">
          <h1 className="text-xl font-bold text-[#111C18] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#B45309]" />
            Zagrożenia utraty uprawnień, ryzyka oraz szczególna ochrona (Kodeks pracy)
          </h1>
          <p className="text-sm text-[#4B5E55] mt-1">
            Najczęstsze sytuacje prowadzące do odmowy, wstrzymania lub obniżenia zasiłku z ZUS —
            poznaj je wcześniej, aby uniknąć sporów i zaskoczeń.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#E6ECE9] bg-[#FAFBFB] p-4 space-y-1.5">
            <h3 className="text-sm font-bold text-[#111C18]">
              1. Pozorność umowy o pracę lub działalności gospodarczej
            </h3>
            <p className="text-xs text-[#4B5E55] leading-relaxed">
              Zawarcie umowy lub rejestracja JDG wyłącznie w celu uzyskania tytułu do ubezpieczenia
              chorobowego (bez faktycznego świadczenia pracy) może skutkować postępowaniem ZUS i
              decyzją o niepodleganiu ubezpieczeniom — w konsekwencji brakiem prawa do zasiłków.
            </p>
          </div>

          <div className="rounded-lg border border-[#E6ECE9] bg-[#FAFBFB] p-4 space-y-1.5">
            <h3 className="text-sm font-bold text-[#111C18]">
              2. Podwyższenie podstawy wymiaru składek w ciąży
            </h3>
            <p className="text-xs text-[#4B5E55] leading-relaxed">
              Nagłe, nieuzasadnione zakresem obowiązków podniesienie wynagrodzenia w okresie ciąży
              może zostać zakwestionowane przez ZUS. Zakład może ustalić niższą, rynkową podstawę
              wymiaru składek, co obniży wysokość zasiłku chorobowego i macierzyńskiego.
            </p>
          </div>

          <div className="rounded-lg border border-[#E6ECE9] bg-[#FAFBFB] p-4 space-y-1.5">
            <h3 className="text-sm font-bold text-[#111C18]">
              3. Brak ubezpieczenia chorobowego na dzień porodu lub zaległość na JDG
            </h3>
            <p className="text-xs text-[#4B5E55] leading-relaxed">
              Nieprzystąpienie do dobrowolnego chorobowego (zlecenie / JDG) lub zakończenie umowy
              zlecenia / zamknięcie JDG przed porodem pozbawia prawa do zasiłku. Na JDG zadłużenie
              składkowe powyżej 1% płacy minimalnej wstrzymuje wypłatę zasiłku (do spłaty w ciągu 6
              miesięcy).
            </p>
          </div>

          <div className="rounded-lg border border-[#E6ECE9] bg-[#FAFBFB] p-4 space-y-1.5">
            <h3 className="text-sm font-bold text-[#111C18]">
              4. Przekroczenie terminu 21 dni oraz przepadające 9 tygodni rodzica
            </h3>
            <p className="text-xs text-[#4B5E55] leading-relaxed">
              Złożenie wniosku po upływie 21 dni od porodu uniemożliwia skorzystanie ze stawki
              uśrednionej 81,5% (pozostaje 100% + 70%). Dodatkowo 9 tygodni urlopu rodzicielskiego
              dla każdego z rodziców jest nieprzenoszalne — niewykorzystane przepadają.
            </p>
          </div>
        </div>

        {/* Labor Code Protection Comparison Table */}
        <div className="pt-2 space-y-3">
          <h2 className="text-base font-semibold text-[#111C18] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#007834]" />
            Szczególna ochrona pracownic w ciąży i rodziców na urlopach (Kodeks pracy)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DCE3DF] text-[#4B5E55]">
                  <th className="py-2.5 pr-3 font-semibold">Uprawnienie / Ochrona</th>
                  <th className="py-2.5 px-3 font-semibold">Umowa o pracę (UoP)</th>
                  <th className="py-2.5 px-3 font-semibold">Umowa zlecenie</th>
                  <th className="py-2.5 pl-3 font-semibold">Działalność (JDG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F0]">
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-[#111C18]">
                    Zakaz wypowiedzenia i przygotowań do zwolnienia
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#007834]">
                    Tak (ciąża, urlopy i od złożenia wniosku)
                  </td>
                  <td className="py-2.5 px-3 text-[#B91C1C]">Nie dotyczy</td>
                  <td className="py-2.5 pl-3 text-[#B91C1C]">Nie dotyczy</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-[#111C18]">
                    Przedłużenie umowy terminowej po 3. mies. ciąży do porodu
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#007834]">
                    Tak (czas określony i próbny &gt; 1 mies.)
                  </td>
                  <td className="py-2.5 px-3 text-[#B91C1C]">Nie dotyczy</td>
                  <td className="py-2.5 pl-3 text-[#B91C1C]">Nie dotyczy</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-[#111C18]">
                    Okres wyczekiwania na zasiłek chorobowy w ciąży
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">30 dni (obowiązkowe)</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">90 dni (dobrowolne)</td>
                  <td className="py-2.5 pl-3 font-mono tabular-nums">90 dni (dobrowolne)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-[#111C18]">
                    Okres wyczekiwania na zasiłek macierzyński po porodzie
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#007834]">Brak (od 1. dnia)</td>
                  <td className="py-2.5 px-3 font-semibold text-[#007834]">Brak (jeśli ubezp.)</td>
                  <td className="py-2.5 pl-3 font-semibold text-[#007834]">Brak (jeśli brak długu)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Charitable Organizations for Difficult Situations */}
      <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6ECE9] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111C18] flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-[#007834]" />
              Bezpłatne wsparcie organizacji wyłącznie charytatywnych w trudnych sytuacjach
            </h2>
            <p className="text-xs text-[#4B5E55] mt-1">
              Sprawdzone fundacje i stowarzyszenia non-profit pomagające rodzicom po poronieniu,
              urodzeniu martwego dziecka, przedwczesnym porodzie oraz w ciężkiej chorobie dziecka.
            </p>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-[#F0F4F2] p-1.5">
          {CHARITY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-white text-[#007834] shadow-xs'
                  : 'text-[#4B5E55] hover:text-[#111C18]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCharities.map((org) => (
            <article
              key={org.id}
              className="rounded-lg border border-[#DCE3DF] bg-[#FAFBFB] p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#4B5E55]">
                  <span className="font-semibold text-[#005E28]">{org.categoryLabel}</span>
                  {org.krs && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{org.krs}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Organizacja charytatywna (bezpłatna pomoc)</span>
                </div>
                <h3 className="text-sm font-bold text-[#111C18]">{org.name}</h3>
                <p className="text-xs text-[#4B5E55] leading-relaxed">{org.description}</p>
                <ul className="list-disc pl-4 text-xs text-[#111C18] space-y-0.5">
                  {org.supportTypes.map((st, idx) => (
                    <li key={idx}>{st}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[#E6ECE9] flex flex-wrap items-center justify-between gap-2 text-xs">
                {org.phone ? (
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#007834]">
                    <Phone className="h-3.5 w-3.5" />
                    {org.phone}
                  </span>
                ) : (
                  <span className="text-[#6B7E75]">Pomoc online i stacjonarna</span>
                )}
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#007834] hover:underline"
                >
                  Odwiedź stronę fundacji
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3: Official Redirects & AI Transparency Disclosure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-4">
          <h2 className="text-base font-bold text-[#111C18]">
            Oficjalne źródła i przekierowania instytucjonalne
          </h2>
          <div className="divide-y divide-[#EEF2F0]">
            {officialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 group"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-mono text-[#007834] font-semibold">
                    {link.institution}
                  </p>
                  <p className="text-sm font-semibold text-[#111C18] group-hover:text-[#007834] transition-colors">
                    {link.title}
                  </p>
                  <p className="text-xs text-[#4B5E55]">{link.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-[#6B7E75] group-hover:text-[#007834] shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-3">
          <h2 className="text-base font-bold text-[#111C18] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#007834]" />
            Jawna informacja o zakresie wykorzystania AI
          </h2>
          <p className="text-xs text-[#4B5E55] leading-relaxed">
            Zgodnie z wymogami przejrzystości narzędzia wskazujemy dokładnie, które moduły działają
            deterministycznie (regułowo), a które korzystają ze wsparcia sztucznej inteligencji:
          </p>
          <ul className="space-y-2 text-xs text-[#111C18]">
            <li className="rounded-lg bg-[#EDF7F1] p-3">
              <strong>Silnik kalkulatora zasiłkowego (100% deterministyczny):</strong> wszystkie
              wyliczenia wymiarów tygodniowych, podstawy (13,71%), wariantów 100%/70% vs 81,5%,
              łączenia z pracą i progów płatnika opierają się wyłącznie na regułach prawnych i
              parametrach z Panelu Administracyjnego — bez udziału AI.
            </li>
            <li className="rounded-lg bg-[#F5F7F6] p-3">
              <strong>Analizator wgranych plików PDF (wspierany przez AI):</strong> model Gemini
              odczytuje wgrane formularze PDF (ZAM, Z-3, Z-3a, e-ZLA, poświadczenia), weryfikuje
              status ubezpieczenia i proponuje dane do kalkulatora.
            </li>
            <li className="rounded-lg bg-[#F5F7F6] p-3">
              <strong>Asystent pytań PUE/eZUS (wspierany przez AI):</strong> model Gemini udziela
              informacyjnych wyjaśnień w języku naturalnym na bazie stanu prawnego 2026 oraz
              symulowanego profilu użytkownika.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
