import { thumbStyle } from "../util/thumb";

export function Thumbnail({
  color,
  width = 44,
  height = 26,
  label,
}: {
  color: string;
  width?: number;
  height?: number;
  label?: string;
}) {
  return (
    <span className="thumbnail" style={{ ...thumbStyle(color), width, height }}>
      {label}
    </span>
  );
}
