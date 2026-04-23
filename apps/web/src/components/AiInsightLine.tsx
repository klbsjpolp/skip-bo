interface AiInsightLineProps {
  text?: string;
}

export function AiInsightLine({text}: AiInsightLineProps) {
  return (
    <div
      aria-live="polite"
      className="ai-insight-line"
      data-testid="ai-insight-line"
    >
      {text ? (
        <span className="block truncate">{text}</span>
      ) : (
        <span aria-hidden="true">&nbsp;</span>
      )}
    </div>
  );
}
