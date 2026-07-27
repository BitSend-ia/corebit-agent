import { invoke } from "@tauri-apps/api/core";

export type ApiError = { code: string; status: number; message: string };

export type Machine = {
  id: string;
  hostname: string;
  sector?: string | null;
  user_label?: string | null;
};

export type AgentStatus = {
  paired: boolean;
  hostname: string;
  os_user: string;
  anydesk_id: string | null;
  agent_version: string;
  machine: Machine | null;
  blocked: string | null;
};

export type Category = { id: string; name: string; slug: string };

export type Ticket = {
  ticket_number: string;
  public_token: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
};

export type Message = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  mine: boolean;
};

/** O título do chamado é gerado pela IA no portal (assunto + descrição). */
export type NewTicket = {
  category_id: string;
  description: string;
  impact: "self" | "team" | "company";
  urgency: "working" | "partial" | "blocked";
};

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "message" in error && "code" in error;
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return "Não foi possível concluir a operação.";
}

export const agent = {
  status: () => invoke<AgentStatus>("get_status"),
  pair: (licenseKey: string) => invoke<Machine>("pair", { licenseKey }),
  unpair: () => invoke<void>("unpair"),
  categories: async () => (await invoke<{ categories: Category[] }>("categories")).categories ?? [],
  tickets: async () => (await invoke<{ tickets: Ticket[] }>("tickets")).tickets ?? [],
  createTicket: async (ticket: NewTicket) =>
    (await invoke<{ ticket: Ticket }>("create_ticket", { ticket })).ticket,
  messages: (publicToken: string) =>
    invoke<{ status: string; messages: Message[] }>("messages", { publicToken }),
  sendMessage: (publicToken: string, body: string) =>
    invoke<{ message: Message }>("send_message", { publicToken, body }),
  hide: () => invoke<void>("hide_window"),
  minimize: () => invoke<void>("minimize_window"),
};

export const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguardando você",
  resolved: "Resolvido",
  closed: "Fechado",
  cancelled: "Cancelado",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const CLOSED_STATUSES = ["closed", "cancelled"];
