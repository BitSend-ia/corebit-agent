import { useState } from "react";

type Props = {
  message: string;
  onRetry: () => void | Promise<void>;
  onUnpair: () => void | Promise<void>;
};

export default function BlockedScreen({ message, onRetry, onUnpair }: Props) {
  const [busy, setBusy] = useState<null | "retry" | "unpair">(null);

  const run = async (kind: "retry" | "unpair", action: () => void | Promise<void>) => {
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="center stack">
      <h2>Acesso indisponível</h2>
      <p className="muted">{message}</p>

      <button
        className="primary"
        disabled={busy !== null}
        onClick={() => void run("unpair", onUnpair)}
      >
        {busy === "unpair" ? "Liberando…" : "Ativar com outra licença"}
      </button>

      <button
        className="ghost"
        disabled={busy !== null}
        onClick={() => void run("retry", onRetry)}
      >
        {busy === "retry" ? "Verificando…" : "Verificar novamente"}
      </button>

      <p className="muted small">Fale com o suporte da Corebit: (11) 5026-9135</p>
    </div>
  );
}
