import { useCallback, useEffect, useState } from "react";
import { agent, PRIORITY_LABEL, STATUS_LABEL, type AgentStatus, type Ticket } from "../api";
import { handleScreenError } from "../App";

type Props = {
  status: AgentStatus;
  onNew: () => void;
  onOpen: (ticket: Ticket) => void;
  onSessionLost: () => void;
};

export default function TicketList({ status, onNew, onOpen, onSessionLost }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTickets(await agent.tickets());
      setError(null);
    } catch (err) {
      setError(handleScreenError(err, onSessionLost));
    } finally {
      setLoading(false);
    }
  }, [onSessionLost]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="stack pad fill">
      <div className="row between">
        <div>
          <h2 className="tight">{status.machine?.hostname ?? status.hostname}</h2>
          <p className="muted small">
            {status.machine?.sector ?? "Suporte Corebit"} · {status.os_user}
          </p>
        </div>
        <button className="primary" onClick={onNew}>
          Novo chamado
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <p className="muted small">Carregando chamados…</p>}
      {!loading && tickets.length === 0 && !error && (
        <p className="muted small">Nenhum chamado registrado para este computador.</p>
      )}

      <ul className="list">
        {tickets.map((ticket) => (
          <li key={ticket.public_token}>
            <button className="ticket" onClick={() => onOpen(ticket)}>
              <div className="row between">
                <strong>{ticket.ticket_number}</strong>
                <span className={`badge ${ticket.priority}`}>
                  {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
                </span>
              </div>
              <span className="title">{ticket.title}</span>
              <span className="muted small">
                {STATUS_LABEL[ticket.status] ?? ticket.status} ·{" "}
                {new Date(ticket.updated_at || ticket.created_at).toLocaleString("pt-BR")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
