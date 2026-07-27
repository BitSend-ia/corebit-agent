import { useCallback, useEffect, useRef, useState } from "react";
import { agent, CLOSED_STATUSES, STATUS_LABEL, type Message, type Ticket } from "../api";
import { handleScreenError } from "../App";

type Props = { ticket: Ticket; onBack: () => void; onSessionLost: () => void };

export default function ChatScreen({ ticket, onBack, onSessionLost }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState(ticket.status);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await agent.messages(ticket.public_token);
      setMessages(result.messages ?? []);
      setStatus(result.status || ticket.status);
      setError(null);
    } catch (err) {
      setError(handleScreenError(err, onSessionLost));
    }
  }, [ticket.public_token, ticket.status, onSessionLost]);

  // polling de 4s apenas com a janela visível
  useEffect(() => {
    void load();
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined) timer = window.setInterval(() => void load(), 4_000);
    };
    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : (void load(), start()));
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const closed = CLOSED_STATUSES.includes(status);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await agent.sendMessage(ticket.public_token, draft.trim());
      setDraft("");
      await load();
    } catch (err) {
      setError(handleScreenError(err, onSessionLost));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat fill">
      <div className="row between pad-sm border-b">
        <div>
          <strong>{ticket.ticket_number}</strong>
          <p className="muted small tight">{STATUS_LABEL[status] ?? status}</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Voltar
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && <p className="muted small center">Nenhuma interação ainda.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`bubble ${message.mine ? "mine" : "theirs"}`}>
            {!message.mine && <span className="author">{message.author_name}</span>}
            <p>{message.body}</p>
            <time>{new Date(message.created_at).toLocaleString("pt-BR")}</time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="banner error">{error}</div>}

      {closed ? (
        <p className="muted small pad-sm">Este chamado foi encerrado e não aceita novas mensagens.</p>
      ) : (
        <form className="composer" onSubmit={send}>
          <input
            value={draft}
            maxLength={4000}
            placeholder="Escreva sua mensagem…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="primary" type="submit" disabled={sending || !draft.trim()}>
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}
