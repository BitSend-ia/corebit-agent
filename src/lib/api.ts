import { invoke } from "@tauri-apps/api/core";

export const AGENT_VERSION = "1.0.2";
const BASE = "https://cliente.corebit.com.br";

/* ------------------------------------------------------------------ */
/* Fingerprint de hardware                                             */
/* ------------------------------------------------------------------ */

let fingerprintCache: string | null = null;

/** Hash estavel desta maquina. O portal usa para impedir token copiado. */
export async function getFingerprint(): Promise<string> {
  if (!fingerprintCache) {
    fingerprintCache = await invoke<string>("machine_fingerprint").catch(() => "");
  }
  return fingerprintCache ?? "";
}

/* ------------------------------------------------------------------ */
/* Estado de pareamento                                                */
/* ------------------------------------------------------------------ */

export class UnpairedError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "UnpairedError";
  }
}

/** Codigos do portal: "este computador perdeu o acesso". */
const UNPAIR_CODES = [
  "unauthorized",
  "fingerprint_mismatch",
  "license_inactive",
  "machine_inactive",
  "license_expired",
];

/** Apaga o token local e avisa a interface para voltar a tela de licenca. */
export async function unpair(reason = "unauthorized") {
  await invoke("purge_credentials").catch(() => {});
  window.dispatchEvent(new CustomEvent("corebit:unpaired", { detail: { reason } }));
}

export async function getToken(): Promise<string | null> {
  return invoke<string | null>("get_machine_token").catch(() => null);
}

export async function isPaired(): Promise<boolean> {
  return Boolean(await getToken());
}

/* ------------------------------------------------------------------ */
/* Cliente HTTP autenticado                                            */
/* ------------------------------------------------------------------ */

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-machine-fingerprint": await getFingerprint(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const code = body.error ?? "unauthorized";
    if (UNPAIR_CODES.includes(code)) await unpair(code);
    throw new UnpairedError(code);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Erro ${res.status}`);
  }

  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Pareamento                                                          */
/* ------------------------------------------------------------------ */

const PAIR_MESSAGES: Record<string, string> = {
  invalid_license: "Licenca invalida. Confira a chave com o suporte.",
  license_expired: "Esta licenca expirou. Fale com o suporte.",
  machine_not_registered: "Este computador ainda nao foi cadastrado no portal.",
  machine_limit_reached: "Esta licenca ja atingiu o limite de maquinas.",
  rate_limited: "Muitas tentativas. Aguarde 15 minutos e tente de novo.",
  pair_failed: "Nao foi possivel concluir a ativacao. Tente novamente.",
};

export type PairResult = {
  token: string;
  machine: {
    id: string;
    hostname: string;
    sector: string | null;
    user_label: string | null;
  };
};

export async function pair(licenseKey: string): Promise<PairResult> {
  const payload = {
    license_key: licenseKey.trim().toUpperCase(),
    hostname: await invoke<string>("get_hostname").catch(() => "DESCONHECIDO"),
    anydesk_id: await invoke<string | null>("get_anydesk_id").catch(() => null),
    os_user: await invoke<string | null>("get_os_user").catch(() => null),
    agent_version: AGENT_VERSION,
    fingerprint: await getFingerprint(),
  };

  const res = await fetch(`${BASE}/api/public/agent/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<PairResult> & { error?: string };

  if (!res.ok || !body.token) {
    throw new Error(PAIR_MESSAGES[body.error ?? ""] ?? "Nao foi possivel ativar a licenca.");
  }

  await invoke("save_machine_token", { token: body.token });
  return body as PairResult;
}

/** Troca de licenca manual: limpar o cofre e voltar para a tela de ativacao. */
export async function switchLicense() {
  await unpair("manual");
}

/* ------------------------------------------------------------------ */
/* Heartbeat                                                           */
/* ------------------------------------------------------------------ */

export async function heartbeat() {
  return apiFetch<{ ok: boolean; valid: boolean; hostname: string }>(
    "/api/public/agent/heartbeat",
    {
      method: "POST",
      body: JSON.stringify({
        agent_version: AGENT_VERSION,
        anydesk_id: await invoke<string | null>("get_anydesk_id").catch(() => null),
      }),
    },
  );
}
