import type {
  CalculationResult,
  CalculatorInput,
  CharityOrganization,
  InsuredProfile,
  LegalConfig,
  PdfAnalysisResult,
  SubmittedApplication,
  TestCaseRecord,
} from '../shared/types';

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Błąd serwera (${res.status})`;
    throw new Error(errMsg);
  }
  return data as T;
}

export async function fetchLegalConfig(): Promise<LegalConfig> {
  const res = await fetch('/api/config');
  return handleJson<LegalConfig>(res);
}

export async function updateLegalConfig(config: LegalConfig): Promise<LegalConfig> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleJson<LegalConfig>(res);
}

export async function resetLegalConfig(): Promise<LegalConfig> {
  const res = await fetch('/api/config/reset', { method: 'POST' });
  return handleJson<LegalConfig>(res);
}

export async function fetchSimulatedProfiles(): Promise<InsuredProfile[]> {
  const res = await fetch('/api/zus/profiles');
  const data = await handleJson<{ profiles: InsuredProfile[] }>(res);
  return data.profiles;
}

export async function simulateZusFetch(
  profileId: string,
  clearArrears = false
): Promise<{ fetchedAt: string; sourceSystem: string; profile: InsuredProfile }> {
  const res = await fetch('/api/zus/simulate-fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, clearArrears }),
  });
  return handleJson(res);
}

export async function fetchTestCases(): Promise<
  Array<TestCaseRecord & { previewResult: CalculationResult }>
> {
  const res = await fetch('/api/cases');
  const data = await handleJson<{
    cases: Array<TestCaseRecord & { previewResult: CalculationResult }>;
  }>(res);
  return data.cases;
}

export async function runServerCalculation(input: CalculatorInput): Promise<CalculationResult> {
  const res = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleJson<CalculationResult>(res);
}

export async function fetchSubmittedApplications(): Promise<SubmittedApplication[]> {
  const res = await fetch('/api/applications');
  const data = await handleJson<{ applications: SubmittedApplication[] }>(res);
  return data.applications;
}

export async function submitSimulatedApplication(payload: {
  formType: SubmittedApplication['formType'];
  applicantName: string;
  recipient: string;
  summary: string;
}): Promise<SubmittedApplication> {
  const res = await fetch('/api/applications/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<SubmittedApplication>(res);
}

export async function fetchCharitiesAndLinks(): Promise<{
  charities: CharityOrganization[];
  officialLinks: Array<{
    title: string;
    description: string;
    url: string;
    institution: string;
  }>;
}> {
  const res = await fetch('/api/charities');
  return handleJson(res);
}

export async function analyzePdfWithAI(file: File): Promise<PdfAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/ai/analyze-pdf', {
    method: 'POST',
    body: formData,
  });
  return handleJson<PdfAnalysisResult>(res);
}

export async function askPueAssistant(payload: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  profileContext: string;
}): Promise<{ reply: string; model: string }> {
  const res = await fetch('/api/ai/pue-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}
