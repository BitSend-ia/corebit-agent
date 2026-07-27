import { useState } from "react";
import { agent, errorMessage, type AgentStatus } from "../api";

type Props = { status: AgentStatus; onPaired: () => void };

export default function PairScreen({ status, onPaired }: Props) {
  const [licenseKey, setLicenseKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await agent.pair(licenseKey);
      onPaired();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack pad" onSubmit={submit}>
      <h2>Ativar este computador</h2>
      <p className="muted small">
        Cole a chave de licença fornecida pela Corebit. A ativação é feita uma única vez.
      </p>

      <label>
        Chave de licença
        <input
          value={licenseKey}
          onChange={(event) => setLicenseKey(event.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoFocus
          spellCheck={false}
        />
      </label>

      <div className="info-grid">
        <span>Computador</span>
        <strong>{status.hostname}</strong>
        <span>Usuário</span>
        <strong>{status.os_user}</strong>
        <span>AnyDesk</span>
        <strong>{status.anydesk_id ?? "não detectado"}</strong>
        <span>Versão</span>
        <strong>{status.agent_version}</strong>
      </div>

      {error && <div className="banner error">{error}</div>}

      <button className="primary" type="submit" disabled={busy || !licenseKey.trim()}>
        {busy ? "Ativando…" : "Ativar"}
      </button>
    </form>
  );
}
