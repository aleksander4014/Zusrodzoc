import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  BUILTIN_TEST_CASES,
  CHARITY_ORGANIZATIONS,
  DEFAULT_LEGAL_CONFIG,
  OFFICIAL_EXTERNAL_LINKS,
  SIMULATED_MOBYWATEL_PROFILES,
} from './src/shared/data.ts';
import { calculateBenefits } from './src/shared/legalEngine.ts';
import type {
  CalculatorInput,
  LegalConfig,
  PdfAnalysisResult,
  SubmittedApplication,
} from './src/shared/types.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Live legislative parameters state (editable in Admin Panel)
let currentLegalConfig: LegalConfig = structuredClone(DEFAULT_LEGAL_CONFIG);

// Session-scoped simulated submitted applications log
const submittedApplications: SubmittedApplication[] = [];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function validateLegalConfigUpdate(body: Record<string, unknown>, base: LegalConfig): LegalConfig {
  const matWeeks = (body.maternityWeeksByChildren as Record<string, unknown> | undefined) ?? {};
  return {
    versionLabel:
      typeof body.versionLabel === 'string' && body.versionLabel.trim().length > 0
        ? body.versionLabel.trim().slice(0, 140)
        : base.versionLabel,
    updatedAt: new Date().toISOString().slice(0, 10),
    sicknessPregnancyRate: clampNumber(body.sicknessPregnancyRate, 50, 120, base.sicknessPregnancyRate),
    maternityRate: clampNumber(body.maternityRate, 50, 120, base.maternityRate),
    supplementaryMaternityRate: clampNumber(
      body.supplementaryMaternityRate,
      50,
      120,
      base.supplementaryMaternityRate
    ),
    paternityRate: clampNumber(body.paternityRate, 50, 120, base.paternityRate),
    parentalStandardRate: clampNumber(body.parentalStandardRate, 50, 100, base.parentalStandardRate),
    parentalAveragedRate: clampNumber(body.parentalAveragedRate, 50, 100, base.parentalAveragedRate),
    sicknessMaxDaysPregnancy: clampNumber(
      body.sicknessMaxDaysPregnancy,
      90,
      365,
      base.sicknessMaxDaysPregnancy
    ),
    waitingPeriodMandatoryDays: clampNumber(
      body.waitingPeriodMandatoryDays,
      0,
      180,
      base.waitingPeriodMandatoryDays
    ),
    waitingPeriodVoluntaryDays: clampNumber(
      body.waitingPeriodVoluntaryDays,
      0,
      365,
      base.waitingPeriodVoluntaryDays
    ),
    employerSicknessDaysUnder50: clampNumber(
      body.employerSicknessDaysUnder50,
      0,
      90,
      base.employerSicknessDaysUnder50
    ),
    employerSicknessDaysOver50: clampNumber(
      body.employerSicknessDaysOver50,
      0,
      90,
      base.employerSicknessDaysOver50
    ),
    employerPayerThreshold: clampNumber(
      body.employerPayerThreshold,
      1,
      500,
      base.employerPayerThreshold
    ),
    socialContributionDeductionRate: clampNumber(
      body.socialContributionDeductionRate,
      0,
      30,
      base.socialContributionDeductionRate
    ),
    minMonthlyBenefitNet: clampNumber(body.minMonthlyBenefitNet, 0, 10000, base.minMonthlyBenefitNet),
    maternityWeeksByChildren: {
      one: clampNumber(matWeeks.one, 8, 60, base.maternityWeeksByChildren.one),
      two: clampNumber(matWeeks.two, 8, 60, base.maternityWeeksByChildren.two),
      three: clampNumber(matWeeks.three, 8, 60, base.maternityWeeksByChildren.three),
      four: clampNumber(matWeeks.four, 8, 60, base.maternityWeeksByChildren.four),
      fivePlus: clampNumber(matWeeks.fivePlus, 8, 60, base.maternityWeeksByChildren.fivePlus),
    },
    motherMandatoryMaternityWeeks: clampNumber(
      body.motherMandatoryMaternityWeeks,
      4,
      20,
      base.motherMandatoryMaternityWeeks
    ),
    maxPreBirthMaternityWeeks: clampNumber(
      body.maxPreBirthMaternityWeeks,
      0,
      12,
      base.maxPreBirthMaternityWeeks
    ),
    parentalWeeksSingle: clampNumber(body.parentalWeeksSingle, 10, 100, base.parentalWeeksSingle),
    parentalWeeksMultiple: clampNumber(
      body.parentalWeeksMultiple,
      10,
      100,
      base.parentalWeeksMultiple
    ),
    parentalWeeksZaZyciemSingle: clampNumber(
      body.parentalWeeksZaZyciemSingle,
      20,
      120,
      base.parentalWeeksZaZyciemSingle
    ),
    parentalWeeksZaZyciemMultiple: clampNumber(
      body.parentalWeeksZaZyciemMultiple,
      20,
      120,
      base.parentalWeeksZaZyciemMultiple
    ),
    nonTransferableParentWeeks: clampNumber(
      body.nonTransferableParentWeeks,
      0,
      26,
      base.nonTransferableParentWeeks
    ),
    maxParentalParts: clampNumber(body.maxParentalParts, 1, 10, base.maxParentalParts),
    paternityWeeks: clampNumber(body.paternityWeeks, 1, 8, base.paternityWeeks),
    supplementaryMaxWeeksExtreme: clampNumber(
      body.supplementaryMaxWeeksExtreme,
      0,
      30,
      base.supplementaryMaxWeeksExtreme
    ),
    supplementaryMaxWeeksStandard: clampNumber(
      body.supplementaryMaxWeeksStandard,
      0,
      20,
      base.supplementaryMaxWeeksStandard
    ),
    stillbirthWeeks: clampNumber(body.stillbirthWeeks, 1, 20, base.stillbirthWeeks),
    deathGraceDays: clampNumber(body.deathGraceDays, 1, 30, base.deathGraceDays),
    fosterCareAgeLimit: clampNumber(body.fosterCareAgeLimit, 1, 18, base.fosterCareAgeLimit),
    fosterCareDeferredAgeLimit: clampNumber(
      body.fosterCareDeferredAgeLimit,
      1,
      18,
      base.fosterCareDeferredAgeLimit
    ),
    adoptionAgeLimit: clampNumber(body.adoptionAgeLimit, 1, 18, base.adoptionAgeLimit),
    maxPartTimeParentalSingle: clampNumber(
      body.maxPartTimeParentalSingle,
      40,
      160,
      base.maxPartTimeParentalSingle
    ),
    maxPartTimeParentalMultiple: clampNumber(
      body.maxPartTimeParentalMultiple,
      40,
      160,
      base.maxPartTimeParentalMultiple
    ),
    maxPartTimeZaZyciemSingle: clampNumber(
      body.maxPartTimeZaZyciemSingle,
      60,
      200,
      base.maxPartTimeZaZyciemSingle
    ),
    maxPartTimeZaZyciemMultiple: clampNumber(
      body.maxPartTimeZaZyciemMultiple,
      60,
      200,
      base.maxPartTimeZaZyciemMultiple
    ),
    applicationDeadline21Days: clampNumber(
      body.applicationDeadline21Days,
      7,
      60,
      base.applicationDeadline21Days
    ),
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max PDF
    files: 1,
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Legislative configuration (Admin panel REST API)
  app.get('/api/config', (_req, res) => {
    res.json(currentLegalConfig);
  });

  app.put('/api/config', (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Nieprawidłowy format parametrów konfiguracyjnych.' });
      return;
    }
    currentLegalConfig = validateLegalConfigUpdate(
      req.body as Record<string, unknown>,
      currentLegalConfig
    );
    res.json(currentLegalConfig);
  });

  app.post('/api/config/reset', (_req, res) => {
    currentLegalConfig = structuredClone(DEFAULT_LEGAL_CONFIG);
    res.json(currentLegalConfig);
  });

  // 2. Simulated mObywatel & ZUS account profiles
  app.get('/api/zus/profiles', (_req, res) => {
    res.json({ profiles: SIMULATED_MOBYWATEL_PROFILES });
  });

  app.post('/api/zus/simulate-fetch', (req, res) => {
    const profileId = typeof req.body?.profileId === 'string' ? req.body.profileId : '';
    const clearArrears = Boolean(req.body?.clearArrears);
    const found =
      SIMULATED_MOBYWATEL_PROFILES.find((p) => p.id === profileId) ??
      SIMULATED_MOBYWATEL_PROFILES[0];

    const simulated = structuredClone(found);
    if (clearArrears) {
      simulated.hasZUSArrears = false;
      simulated.arrearsAmountPln = 0;
      simulated.arrearsCertificateNumber = `ZUS-RWN/2026/${crypto.randomInt(100000, 999999)}`;
    }

    res.json({
      fetchedAt: new Date().toISOString(),
      sourceSystem: 'PUE/eZUS + mObywatel (środowisko symulacyjne)',
      profile: simulated,
    });
  });

  // 3. Built-in ZUS test cases
  app.get('/api/cases', (_req, res) => {
    const enriched = BUILTIN_TEST_CASES.map((tc) => ({
      ...tc,
      previewResult: calculateBenefits(tc.input, currentLegalConfig),
    }));
    res.json({ cases: enriched });
  });

  // 4. Server-side calculator endpoint
  app.post('/api/calculate', (req, res) => {
    const input = req.body as CalculatorInput | undefined;
    if (!input || typeof input !== 'object' || typeof input.employmentType !== 'string') {
      res.status(400).json({ error: 'Brak poprawnych danych wejściowych kalkulatora.' });
      return;
    }
    const result = calculateBenefits(input, currentLegalConfig);
    res.json(result);
  });

  // 5. Simulated application submission & UPO generation
  app.get('/api/applications', (_req, res) => {
    res.json({ applications: submittedApplications });
  });

  app.post('/api/applications/submit', (req, res) => {
    const formType = req.body?.formType;
    const applicantName =
      typeof req.body?.applicantName === 'string' && req.body.applicantName.trim()
        ? req.body.applicantName.trim().slice(0, 120)
        : 'Ubezpieczony';
    const recipient =
      typeof req.body?.recipient === 'string' && req.body.recipient.trim()
        ? req.body.recipient.trim().slice(0, 140)
        : 'ZUS (PUE/eZUS)';
    const summary =
      typeof req.body?.summary === 'string' && req.body.summary.trim()
        ? req.body.summary.trim().slice(0, 300)
        : 'Wniosek elektroniczny';

    if (
      formType !== 'URLOP_PRACODAWCA' &&
      formType !== 'ZAM_ZUS' &&
      formType !== 'ODPIS_USC'
    ) {
      res.status(400).json({ error: 'Nieobsługiwany typ formularza wniosku.' });
      return;
    }

    const prefix =
      formType === 'ODPIS_USC'
        ? 'UPO-USC'
        : formType === 'URLOP_PRACODAWCA'
        ? 'POTW-KADRY'
        : 'UPO-PUE-ZUS';

    const record: SubmittedApplication = {
      upoNumber: `${prefix}/2026/${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      submittedAt: new Date().toISOString(),
      formType,
      recipient,
      applicantName,
      summary,
      status: 'Przyjęto — wygenerowano UPO (symulacja)',
    };

    submittedApplications.unshift(record);
    if (submittedApplications.length > 30) {
      submittedApplications.pop();
    }

    res.status(201).json(record);
  });

  // 6. Charities & official institutional links
  app.get('/api/charities', (_req, res) => {
    res.json({
      charities: CHARITY_ORGANIZATIONS,
      officialLinks: OFFICIAL_EXTERNAL_LINKS,
    });
  });

  // 7. AI Endpoint 1: Analyze uploaded ZUS PDF form (Gemini 4 Hydrogen)
  app.post('/api/ai/analyze-pdf', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Nie przesłano pliku PDF.' });
        return;
      }

      const isPdfMime =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');
      const header = file.buffer.subarray(0, 5).toString('ascii');
      if (!isPdfMime || header !== '%PDF-') {
        res.status(400).json({
          error: 'Przesłany plik nie jest poprawnym dokumentem PDF (oczekiwany nagłówek %PDF-).',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Usługa AI analizy PDF wymaga skonfigurowanego klucza GEMINI_API_KEY po stronie serwera (panel Settings > Secrets).',
        });
        return;
      }

      const base64Data = file.buffer.toString('base64');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text:
                'Przeanalizuj załączony dokument PDF z kontekstu polskiego systemu ubezpieczeń społecznych ZUS (np. formularz ZAM, Z-3, Z-3a, ZAS-53, ZAS-12, Poświadczenie ubezpieczenia chorobowego, zwolnienie e-ZLA, zaświadczenie szpitalne lub „Za życiem”). ' +
                'Wyodrębnij z niego konkretne informacje do weryfikacji podlegania ubezpieczeniu chorobowemu oraz zasilenia kalkulatora zasiłkowego ZUS. ' +
                'Jeśli niektóre pola nie występują w dokumencie, przyjmij realistyczne wartości domyślne na podstawie kontekstu i zaznacz to w opisie. Odpowiedz wyłącznie po polsku w zadanym schemacie JSON.',
            },
          ],
        },
        config: {
          systemInstruction:
            'Jesteś ekspertem ds. świadczeń krótkoterminowych ZUS (ustawa zasiłkowa 2026 oraz Kodeks pracy). Analizujesz formularze PDF ZUS rzetelnie, nie zmyślaj nieistniejących kwot, dokładnie weryfikuj tytuł ubezpieczenia chorobowego oraz wielkość płatnika (>20 vs <=20 ubezpieczonych).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType: {
                type: Type.STRING,
                description: 'Rozpoznany typ formularza lub zestawu dokumentów (np. ZAM + Z-3, Poświadczenie ubezpieczenia chorobowego, e-ZLA).',
              },
              applicantName: {
                type: Type.STRING,
                description: 'Imię i nazwisko lub zanonimizowany identyfikator ubezpieczonego z dokumentu.',
              },
              insuranceVerified: {
                type: Type.BOOLEAN,
                description: 'Czy z dokumentu wynika podleganie ubezpieczeniu chorobowemu dające prawo do świadczenia.',
              },
              insuranceStatusSummary: {
                type: Type.STRING,
                description: 'Zwięzłe uzasadnienie weryfikacji ubezpieczenia (tytuł, okres wyczekiwania, przerwy).',
              },
              payerInfo: {
                type: Type.STRING,
                description: 'Informacja kto wypłaca świadczenie (Pracodawca >20 ubezp. czy ZUS).',
              },
              detectedRisks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista wykrytych ryzyk, braków formalnych lub uwag (np. brak kodu B, zaległość, brak chorobowego).',
              },
              recommendedNextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Zalecane kolejne kroki dla ubezpieczonego.',
              },
              rawSummary: {
                type: Type.STRING,
                description: 'Krótkie podsumowanie treści rozpoznanej w pliku PDF (2-4 zdania).',
              },
              extractedInput: {
                type: Type.OBJECT,
                properties: {
                  scenario: {
                    type: Type.STRING,
                    description: 'Jedna z wartości: ciaza, porod, adopcja, rodzina_zastepcza, szczegolne',
                  },
                  employmentType: {
                    type: Type.STRING,
                    description: 'Jedna z wartości: uop, zlecenie, jdg, brak',
                  },
                  hasSicknessInsurance: { type: Type.BOOLEAN },
                  insuranceDaysContinuous: { type: Type.INTEGER },
                  employerInsuredCount: { type: Type.INTEGER },
                  monthlyGrossBasis: { type: Type.NUMBER },
                  childrenCount: { type: Type.INTEGER },
                  hasZaZyciemCertificate: { type: Type.BOOLEAN },
                  hasZUSArrears: { type: Type.BOOLEAN },
                  arrearsAmountPln: { type: Type.NUMBER },
                  hospitalWeeks: { type: Type.INTEGER },
                  payoutVariant: {
                    type: Type.STRING,
                    description: '100_70 albo 81_5',
                  },
                },
              },
            },
            required: [
              'documentType',
              'applicantName',
              'insuranceVerified',
              'insuranceStatusSummary',
              'payerInfo',
              'detectedRisks',
              'recommendedNextSteps',
              'rawSummary',
              'extractedInput',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<PdfAnalysisResult, 'aiModel'>;
      const result: PdfAnalysisResult = {
        ...parsed,
        aiModel: 'gemini-4-hydrogen',
      };
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd podczas analizy PDF.';
      res.status(502).json({
        error: `Nie udało się przeanalizować dokumentu PDF przez model AI: ${msg}`,
      });
    }
  });

  // 8. AI Endpoint 2: PUE/eZUS Assistant Chat (Gemini 4 Hydrogen)
  app.post('/api/ai/pue-chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message || message.length > 2000) {
        res.status(400).json({ error: 'Wpisz pytanie o długości od 1 do 2000 znaków.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Asystent AI PUE/eZUS wymaga aktywnego klucza GEMINI_API_KEY po stronie serwera (Settings > Secrets).',
        });
        return;
      }

      const profileContext =
        typeof req.body?.profileContext === 'string'
          ? req.body.profileContext.slice(0, 1800)
          : 'Brak szczegółowego profilu.';

      const history = Array.isArray(req.body?.history)
        ? (req.body.history as Array<{ role?: string; content?: string }>)
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${String(h.content ?? '').slice(0, 500)}`)
            .join('\n')
        : '';

      const systemInstruction =
        `Jesteś oficjalnym, empatycznym asystentem informacyjnym „Zasiłkowy Przewodnik Przyszłego Rodzica” wspierającym użytkowników PUE/eZUS. ` +
        `Odpowiadasz wyłącznie po polsku, konkretnie, prostym i zrozumiałym językiem (bez zbędnego żargonu), powołując się na stan prawny 2026: ` +
        `Ustawę zasiłkową (Dz.U. z 2026 r. poz. 854), Kodeks pracy (Dz.U. z 2026 r. poz. 1245), zintegrowany formularz ZAM (od 24.10.2026 r. ZUR, ZAO i Z-3b są zlikwidowane), ` +
        `uzupełniający urlop macierzyński dla wcześniaków/dzieci hospitalizowanych (do 8 lub 15 tyg., 100%), program „Za życiem” (65/67 tyg. rodzicielskiego), ` +
        `nieprzenoszalne 9 tygodni dla każdego rodzica (70%), wariant 81,5% przy wniosku do 21 dni po porodzie, łączenie urlopu rodzicielskiego z pracą do 1/2 etatu, ` +
        `próg płatnika >20 ubezpieczonych, okres wyczekiwania 30/90 dni, limit 270 dni e-ZLA z kodem B oraz ochronę z Kodeksu pracy. ` +
        `Aktualne parametry z panelu administracyjnego: stawki ${currentLegalConfig.maternityRate}% / ${currentLegalConfig.parentalAveragedRate}% / ${currentLegalConfig.parentalStandardRate}%, próg płatnika ${currentLegalConfig.employerPayerThreshold} ubezp. ` +
        `Jeśli pytanie dotyczy straty dziecka lub ciężkiej choroby, odpowiadaj ze szczególnym taktem i przypomnij o sekcji bezpłatnej pomocy charytatywnej. Zawsze zaznacz, że odpowiedź ma charakter informacyjny i nie zastępuje formalnej decyzji ZUS.`;

      const prompt = [
        `Kontekst symulowanego profilu użytkownika:\n${profileContext}`,
        history ? `Dotychczasowa rozmowa:\n${history}` : '',
        `Aktualne pytanie użytkownika:\n${message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({
        reply: (response.text ?? '').trim() || 'Nie udało się wygenerować odpowiedzi.',
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd komunikacji z AI.';
      res.status(502).json({
        error: `Asystent AI PUE/eZUS napotkał błąd: ${msg}`,
      });
    }
  });

  // Frontend serving (Vite dev middleware or built dist/)
  app.set('trust proxy', true);

  if (!isProduction) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';

    if (hmrDisabled) {
      // Serve a lightweight, WebSocket-free Vite client stub when HMR is disabled
      // so CSS injection (updateStyle/removeStyle) works without opening port 24678
      // or triggering unhandled WebSocket rejections inside the preview iframe.
      const noopViteClient = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
  }
  sheetsMap.delete(id);
}
export function createHotContext() {
  const data = {};
  return {
    get data() { return data; },
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return \`\${pathname}?\${queryToInject}\${search ? '&' + search.slice(1) : ''}\${hash || ''}\`;
}
export class ErrorOverlay extends HTMLElement {}
`;
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(noopViteClient);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        cors: true,
        hmr: !hmrDisabled,
        ws: hmrDisabled ? false : undefined,
        watch: hmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zasiłkowy Przewodnik Przyszłego Rodzica API & App listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
