import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Save, Settings2 } from 'lucide-react';
import type { LegalConfig } from '../shared/types';

interface AdminPanelViewProps {
  config: LegalConfig;
  onSaveConfig: (next: LegalConfig) => Promise<void>;
  onResetConfig: () => Promise<void>;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  config,
  onSaveConfig,
  onResetConfig,
}) => {
  const [draft, setDraft] = useState<LegalConfig>(config);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const setField = <K extends keyof LegalConfig>(key: K, value: LegalConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSavedNotice(null);
  };

  const setMatWeeks = (
    key: keyof LegalConfig['maternityWeeksByChildren'],
    value: number
  ) => {
    setDraft((prev) => ({
      ...prev,
      maternityWeeksByChildren: {
        ...prev.maternityWeeksByChildren,
        [key]: value,
      },
    }));
    setSavedNotice(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(null);
    try {
      await onSaveConfig(draft);
      setSavedNotice(
        'Zapisano nowe parametry legislacyjne przez REST API. Wszystkie wyliczenia w kalkulatorze zostały zaktualizowane.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu parametrów.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    setSavedNotice(null);
    try {
      await onResetConfig();
      setSavedNotice('Przywrócono ustawowe wartości domyślne dla stanu prawnego 2026.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd przywracania konfiguracji.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-xl border border-[#DCE3DF] bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111C18] flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[#007834]" />
              Panel administracyjny parametrów legislacyjnych
            </h1>
            <p className="text-sm text-[#4B5E55] mt-1">
              Elastyczna konfiguracja stawek procentowych, maksymalnych wymiarów urlopów oraz
              okresów wyczekiwania na wypadek zmian w ustawie zasiłkowej lub Kodeksie pracy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111C18] hover:bg-[#F5F7F6] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Przywróć stan prawny 2026
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Zapisywanie...' : 'Zapisz parametry (REST API)'}
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#14532D] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#007834] shrink-0" />
            {savedNotice}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group 1: Rates & Financial Parameters */}
        <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111C18] border-b border-[#E6ECE9] pb-3">
            1. Stopy procentowe i parametry finansowe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#111C18] mb-1">
                Etykieta wersji stanu prawnego
              </label>
              <input
                type="text"
                value={draft.versionLabel}
                onChange={(e) => setField('versionLabel', e.target.value)}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Chorobowy w ciąży — kod „B” (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={draft.sicknessPregnancyRate}
                onChange={(e) => setField('sicknessPregnancyRate', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Zasiłek macierzyński / uzupełniający (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={draft.maternityRate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDraft((prev) => ({
                    ...prev,
                    maternityRate: v,
                    supplementaryMaternityRate: v,
                  }));
                }}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Urlop rodzicielski — stawka standardowa (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={draft.parentalStandardRate}
                onChange={(e) => setField('parentalStandardRate', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Wariant uśredniony — wniosek do 21 dni (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={draft.parentalAveragedRate}
                onChange={(e) => setField('parentalAveragedRate', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Odliczenie składek społecznych (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={draft.socialContributionDeductionRate}
                onChange={(e) => setField('socialContributionDeductionRate', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Minimalna kwota zasiłku (podwyższenie, zł)
              </label>
              <input
                type="number"
                step="50"
                value={draft.minMonthlyBenefitNet}
                onChange={(e) => setField('minMonthlyBenefitNet', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* Group 2: Waiting Periods, Payer Threshold & Sickness Limits */}
        <section className="rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111C18] border-b border-[#E6ECE9] pb-3">
            2. Okresy wyczekiwania, limity chorobowego i próg płatnika
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Próg płatnika wypłacającego zasiłki (liczba ubezp.)
              </label>
              <input
                type="number"
                value={draft.employerPayerThreshold}
                onChange={(e) => setField('employerPayerThreshold', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Maks. okres zasiłkowy w ciąży (dni)
              </label>
              <input
                type="number"
                value={draft.sicknessMaxDaysPregnancy}
                onChange={(e) => setField('sicknessMaxDaysPregnancy', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Wyczekiwanie — obowiązkowe UoP (dni)
              </label>
              <input
                type="number"
                value={draft.waitingPeriodMandatoryDays}
                onChange={(e) => setField('waitingPeriodMandatoryDays', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Wyczekiwanie — dobrowolne JDG/zlecenie (dni)
              </label>
              <input
                type="number"
                value={draft.waitingPeriodVoluntaryDays}
                onChange={(e) => setField('waitingPeriodVoluntaryDays', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Termin na wniosek o wariant 81,5% (dni po porodzie)
              </label>
              <input
                type="number"
                value={draft.applicationDeadline21Days}
                onChange={(e) => setField('applicationDeadline21Days', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Urodzenie martwe — wymiar macierzyńskiego (tyg.)
              </label>
              <input
                type="number"
                value={draft.stillbirthWeeks}
                onChange={(e) => setField('stillbirthWeeks', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* Group 3: Leave Dimensions */}
        <section className="lg:col-span-2 rounded-xl border border-[#DCE3DF] bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111C18] border-b border-[#E6ECE9] pb-3">
            3. Wymiary urlopów (tygodnie) i limity wieku (adopcja / rodzina zastępcza)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Macierzyński (1 dz.)</label>
              <input
                type="number"
                value={draft.maternityWeeksByChildren.one}
                onChange={(e) => setMatWeeks('one', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Macierzyński (2 dz.)</label>
              <input
                type="number"
                value={draft.maternityWeeksByChildren.two}
                onChange={(e) => setMatWeeks('two', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Macierzyński (3 dz.)</label>
              <input
                type="number"
                value={draft.maternityWeeksByChildren.three}
                onChange={(e) => setMatWeeks('three', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Rodzicielski (1 dz.)</label>
              <input
                type="number"
                value={draft.parentalWeeksSingle}
                onChange={(e) => setField('parentalWeeksSingle', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">Rodzicielski (mnogi)</label>
              <input
                type="number"
                value={draft.parentalWeeksMultiple}
                onChange={(e) => setField('parentalWeeksMultiple', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Nieprzenoszalna część (tyg.)
              </label>
              <input
                type="number"
                value={draft.nonTransferableParentWeeks}
                onChange={(e) => setField('nonTransferableParentWeeks', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                „Za życiem” (1 dz., tyg.)
              </label>
              <input
                type="number"
                value={draft.parentalWeeksZaZyciemSingle}
                onChange={(e) => setField('parentalWeeksZaZyciemSingle', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Uzupełniający maks. (&lt;28 tyg.)
              </label>
              <input
                type="number"
                value={draft.supplementaryMaxWeeksExtreme}
                onChange={(e) => setField('supplementaryMaxWeeksExtreme', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Uzupełniający maks. (28–36 tyg.)
              </label>
              <input
                type="number"
                value={draft.supplementaryMaxWeeksStandard}
                onChange={(e) => setField('supplementaryMaxWeeksStandard', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111C18] mb-1">
                Limit wieku adopcja (lata)
              </label>
              <input
                type="number"
                value={draft.adoptionAgeLimit}
                onChange={(e) => setField('adoptionAgeLimit', Number(e.target.value))}
                className="w-full rounded-lg border border-[#CBD5D0] px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
};
