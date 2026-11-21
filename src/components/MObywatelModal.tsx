import React, { useState } from 'react';
import { CheckCircle2, QrCode, ShieldCheck, UserCheck, X } from 'lucide-react';
import type { InsuredProfile } from '../shared/types';

interface MObywatelModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: InsuredProfile[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => Promise<void>;
  onSelectManualMode: () => void;
}

export const MObywatelModal: React.FC<MObywatelModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSelectManualMode,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'qr'>('select');
  const [pendingProfileId, setPendingProfileId] = useState<string>(
    profiles[0]?.id ?? 'prof-anna'
  );

  if (!isOpen) return null;

  const handleConfirmLogin = async (profileId: string) => {
    setLoadingId(profileId);
    try {
      await onSelectProfile(profileId);
      onClose();
    } finally {
      setLoadingId(null);
      setStep('select');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111C18]/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobywatel-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#DCE3DF] bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#DCE3DF] px-6 py-4 bg-[#F5F7F6]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4213D] text-white font-display font-bold text-sm">
              mO
            </div>
            <div>
              <h2
                id="mobywatel-modal-title"
                className="text-base font-semibold text-[#111C18]"
              >
                Logowanie przez mObywatel — symulacja węzła krajowego
              </h2>
              <p className="text-xs text-[#4B5E55]">
                Środowisko demonstracyjne · pobranie danych ubezpieczeniowych z PUE/eZUS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5E55] hover:bg-[#E7ECEA] hover:text-[#111C18] transition-colors"
            aria-label="Zamknij okno logowania"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-[#DCE3DF] pb-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#F0F4F2] p-1">
              <button
                type="button"
                onClick={() => setStep('select')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  step === 'select'
                    ? 'bg-white text-[#111C18] shadow-xs'
                    : 'text-[#4B5E55] hover:text-[#111C18]'
                }`}
              >
                Wybierz profil testowy
              </button>
              <button
                type="button"
                onClick={() => setStep('qr')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  step === 'qr'
                    ? 'bg-white text-[#111C18] shadow-xs'
                    : 'text-[#4B5E55] hover:text-[#111C18]'
                }`}
              >
                Symulacja kodu QR mObywatel
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectManualMode();
                onClose();
              }}
              className="text-xs font-medium text-[#007834] hover:underline whitespace-nowrap"
            >
              Korzystaj bez logowania (dane własne)
            </button>
          </div>

          {step === 'select' ? (
            <div className="space-y-3">
              <p className="text-sm text-[#4B5E55]">
                Wybierz symulowany profil obywatela. Aplikacja zasymuluje uwierzytelnienie w
                aplikacji mObywatel oraz pobranie danych z konta ZUS (okresy ubezpieczenia, e-ZLA,
                stan rozliczeń składek).
              </p>

              <div className="divide-y divide-[#E6ECE9] rounded-lg border border-[#DCE3DF]">
                {profiles.map((profile) => {
                  const isActive = activeProfileId === profile.id;
                  const isBusy = loadingId === profile.id;
                  return (
                    <div
                      key={profile.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors ${
                        isActive ? 'bg-[#EDF7F1]/70' : 'hover:bg-[#F9FBFA]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#111C18]">
                          <span>{profile.fullName}</span>
                          <span className="font-mono text-xs font-normal text-[#4B5E55]">
                            PESEL {profile.peselMasked}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#007834]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aktywny
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#4B5E55]">{profile.roleLabel}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5E55] tabular-nums">
                          <span>Podstawa: {profile.monthlyGrossBasis.toLocaleString('pl-PL')} zł</span>
                          <span aria-hidden="true">·</span>
                          <span>Płatnik: {profile.employerInsuredCount} ubezp.</span>
                          <span aria-hidden="true">·</span>
                          <span>e-ZLA: {profile.ezlaHistory.length} szt.</span>
                          {profile.hasZUSArrears && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#B91C1C]">
                                Zaległość: {profile.arrearsAmountPln.toFixed(2)} zł
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(loadingId)}
                        onClick={() => handleConfirmLogin(profile.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                      >
                        <UserCheck className="h-4 w-4" />
                        {isBusy ? 'Pobieranie z ZUS...' : 'Zaloguj i pobierz dane'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center py-2">
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#DCE3DF] bg-[#F9FBFA] p-6 text-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-[#DCE3DF] bg-white p-3">
                  <QrCode className="h-28 w-28 text-[#111C18]" strokeWidth={1.5} />
                </div>
                <p className="mt-3 font-mono text-xs text-[#4B5E55] tabular-nums">
                  Kod sesji: MO-ZUS-2026-8419
                </p>
                <p className="mt-1 text-xs text-[#4B5E55]">
                  Wersja demonstracyjna — skanowanie nie jest wymagane
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 text-sm text-[#111C18]">
                  <ShieldCheck className="h-5 w-5 text-[#007834] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Zasymuluj potwierdzenie w telefonie</p>
                    <p className="mt-1 text-xs text-[#4B5E55] leading-relaxed">
                      Wybierz tożsamość do zasymulowania autoryzacji mObywatel i automatycznego
                      zaciągnięcia poświadczenia ubezpieczenia chorobowego z ZUS.
                    </p>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="qr-profile-select"
                    className="block text-xs font-medium text-[#4B5E55] mb-1.5"
                  >
                    Profil obywatela do zasymulowania
                  </label>
                  <select
                    id="qr-profile-select"
                    value={pendingProfileId}
                    onChange={(e) => setPendingProfileId(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5D0] bg-white px-3 py-2 text-sm text-[#111C18] focus:border-[#007834] focus:outline-none"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} — {p.roleLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={Boolean(loadingId)}
                  onClick={() => handleConfirmLogin(pendingProfileId)}
                  className="w-full rounded-lg bg-[#007834] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005E28] disabled:opacity-60 transition-colors"
                >
                  {loadingId ? 'Autoryzacja i pobieranie danych...' : 'Potwierdź logowanie mObywatel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
