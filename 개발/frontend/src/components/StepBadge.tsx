export function StepBadge({ color, name }: { color: string; name: string }) {
  return (
    <span className="badge step-badge" style={{ borderColor: color, color }}>
      {name}
    </span>
  );
}
