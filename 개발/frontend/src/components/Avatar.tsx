function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  color,
  size = 24,
  title,
}: {
  name: string;
  color: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className="avatar"
      title={title ?? name}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size * 0.42,
      }}
    >
      {initials(name)}
    </span>
  );
}
