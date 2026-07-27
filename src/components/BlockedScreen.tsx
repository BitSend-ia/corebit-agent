type Props = { message: string; onRetry: () => void };

export default function BlockedScreen({ message, onRetry }: Props) {
  return (
    <div className="center stack">
      <h2>Acesso indisponível</h2>
      <p className="muted">{message}</p>
      <p className="muted small">Fale com o suporte da Corebit: (11) 5026-9135</p>
      <button className="primary" onClick={onRetry}>
        Verificar novamente
      </button>
    </div>
  );
}
