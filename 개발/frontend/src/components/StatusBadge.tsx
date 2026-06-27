export function StatusBadge({
  color,
  name,
  code,
}: {
  color: string;
  name?: string;
  code?: string;
}) {
  return (
    <span className="badge" style={{ backgroundColor: color }}>
      {name ?? code ?? ""}
    </span>
  );
}
