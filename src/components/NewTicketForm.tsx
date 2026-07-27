import { useEffect, useState } from "react";
import { agent, type Category, type NewTicket, type Ticket } from "../api";
import { handleScreenError } from "../App";

type Props = {
  onCancel: () => void;
  onCreated: (ticket: Ticket) => void;
  onSessionLost: () => void;
};

const IMPACTS: Array<{ value: NewTicket["impact"]; label: string }> = [
  { value: "self", label: "Só eu" },
  { value: "team", label: "Minha equipe" },
  { value: "company", label: "A empresa toda" },
];

const URGENCIES: Array<{ value: NewTicket["urgency"]; label: string }> = [
  { value: "working", label: "Consigo trabalhar" },
  { value: "partial", label: "Trabalho parcialmente" },
  { value: "blocked", label: "Estou parado" },
];

export default function NewTicketForm({ onCancel, onCreated, onSessionLost }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<NewTicket>({
    category_id: "",
    description: "",
    impact: "self",
    urgency: "partial",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agent
      .categories()
      .then((list) => {
        setCategories(list);
        setForm((current) =>
          current.category_id ? current : { ...current, category_id: list[0]?.id ?? "" }
        );
      })
      .catch((err) => setError(handleScreenError(err, onSessionLost)));
  }, [onSessionLost]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await agent.createTicket(form));
    } catch (err) {
      setError(handleScreenError(err, onSessionLost));
    } finally {
      setBusy(false);
    }
  }

  const valid = Boolean(form.category_id) && form.description.trim().length >= 10;

  return (
    <form className="stack pad fill scroll" onSubmit={submit}>
      <div className="row between">
        <h2 className="tight">Novo chamado</h2>
        <button type="button" className="ghost" onClick={onCancel}>
          Voltar
        </button>
      </div>

      <label>
        Assunto
        <select
          value={form.category_id}
          onChange={(event) => setForm({ ...form, category_id: event.target.value })}
        >
          {categories.length === 0 && <option value="">Carregando…</option>}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>


      <label>
        Descrição
        <textarea
          value={form.description}
          rows={5}
          maxLength={4000}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="O que aconteceu? Desde quando? Aparece alguma mensagem de erro?"
        />
      </label>

      <label>
        Quem está afetado
        <select
          value={form.impact}
          onChange={(event) =>
            setForm({ ...form, impact: event.target.value as NewTicket["impact"] })
          }
        >
          {IMPACTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Situação atual
        <select
          value={form.urgency}
          onChange={(event) =>
            setForm({ ...form, urgency: event.target.value as NewTicket["urgency"] })
          }
        >
          {URGENCIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {error && <div className="banner error">{error}</div>}

      <button className="primary" type="submit" disabled={busy || !valid}>
        {busy ? "Enviando…" : "Abrir chamado"}
      </button>
      <p className="muted small">
        O título é gerado automaticamente a partir do assunto e da descrição. A prioridade é
        definida automaticamente pela equipe de suporte.
      </p>
    </form>
  );
}
