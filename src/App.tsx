import { useCallback, useEffect, useState } from "react";
import { agent, errorMessage, isApiError, type AgentStatus, type Ticket } from "./api";
import TitleBar from "./components/TitleBar";
import PairScreen from "./components/PairScreen";
import BlockedScreen from "./components/BlockedScreen";
import TicketList from "./components/TicketList";
import NewTicketForm from "./components/NewTicketForm";
import ChatScreen from "./components/ChatScreen";

type View = { name: "list" } | { name: "new" } | { name: "chat"; ticket: Ticket };

export default function App() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [view, setView] = useState<View>({ name: "list" });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await agent.status());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (!status) {
    return (
      <div className="app">
        <TitleBar />
        <div className="center muted">Carregando…</div>
      </div>
    );
  }

  const body = () => {
    if (status.blocked) {
      return <BlockedScreen message={status.blocked} onRetry={refresh} />;
    }
    if (!status.paired) {
      return <PairScreen status={status} onPaired={refresh} />;
    }
    if (view.name === "new") {
      return (
        <NewTicketForm
          onCancel={() => setView({ name: "list" })}
          onCreated={(ticket) => setView({ name: "chat", ticket })}
          onSessionLost={refresh}
        />
      );
    }
    if (view.name === "chat") {
      return (
        <ChatScreen
          ticket={view.ticket}
          onBack={() => setView({ name: "list" })}
          onSessionLost={refresh}
        />
      );
    }
    return (
      <TicketList
        status={status}
        onNew={() => setView({ name: "new" })}
        onOpen={(ticket) => setView({ name: "chat", ticket })}
        onSessionLost={refresh}
      />
    );
  };

  return (
    <div className="app">
      <TitleBar />
      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      {body()}
    </div>
  );
}

/** Repassa erros de sessão perdida para o App revalidar o pareamento. */
export function handleScreenError(err: unknown, onSessionLost: () => void): string {
  if (isApiError(err) && (err.code === "unauthorized" || err.status === 401)) {
    onSessionLost();
  }
  return errorMessage(err);
}
