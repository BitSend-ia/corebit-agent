import { useState } from "react";
import { unpair } from "../lib/api";

const REASONS: Record<string, string> = {
  fingerprint_mismatch:
    "Esta ativacao pertence a outro computador. Por seguranca, o acesso foi bloqueado.",
  license_expired: "A licenca deste computador expirou.",
  license_inactive: "A licenca deste computador foi desativada.",
  machine_inactive: "Este computador foi desativado no portal.",
  unauthorized: "O acesso deste computador foi revogado pelo suporte.",
};

export function UnpairedScreen({
  reason = "unauthorized",
  onRetry,
  onSwitchLicense,
}: {
  reason?: string;
  onRetry?: () => void | Promise<void>;
  onSwitchLicense: () => void;
}) {
  const [checking, setChecking] = useState(false);

  async function handleRetry() {
    if (!onRetry) return;
    setChecking(true);
    try {
      await onRetry();
    } finally {
      setChecking(false);
    }
  }

  async function handleSwitch() {
    await unpair("manual");
    onSwitchLicense();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
        &#9888;
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Acesso desativado</h2>
        <p className="max-w-xs text-sm leading-relaxed text-white/55">
          {REASONS[reason] ?? REASONS.unauthorized}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <button
          type="button"
          onClick={handleSwitch}
          className="w-full rounded-xl bg-[#2dff98] px-4 py-2.5 text-sm font-semibold text-[#04140c] transition hover:brightness-95"
        >
          Ativar com outra licenca
        </button>

        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            {checking ? "Verificando..." : "Verificar novamente"}
          </button>
        )}
      </div>

      <p className="text-xs text-white/35">
        Precisa de ajuda? Fale com o suporte da Corebit.
      </p>
    </div>
  );
}
