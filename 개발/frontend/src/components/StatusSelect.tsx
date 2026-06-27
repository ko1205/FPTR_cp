import { useEffect, useRef, useState } from "react";
import { useStatuses } from "../api/hooks";
import { StatusBadge } from "./StatusBadge";

export function StatusSelect({
  status,
  statusName,
  statusColor,
  onChange,
  disabled,
  variant = "pill",
}: {
  status: string;
  statusName: string;
  statusColor: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  variant?: "pill" | "cell";
}) {
  const { data: statuses } = useStatuses();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={`status-select ${variant === "cell" ? "is-cell" : ""}`} ref={ref}>
      <button
        type="button"
        className={variant === "cell" ? "status-cell-trigger" : "status-trigger"}
        style={variant === "cell" ? { background: statusColor } : undefined}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {variant === "cell" ? (
          <span className="status-cell-label">{statusName}</span>
        ) : (
          <StatusBadge color={statusColor} name={statusName} />
        )}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="status-menu" onClick={(e) => e.stopPropagation()}>
          {statuses?.map((s) => (
            <button
              type="button"
              key={s.code}
              className={`status-option ${s.code === status ? "active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (s.code !== status) onChange(s.code);
              }}
            >
              <StatusBadge color={s.color} name={s.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
