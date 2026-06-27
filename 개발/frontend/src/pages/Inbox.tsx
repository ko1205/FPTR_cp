import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalActivity } from "../api/hooks";
import { useProject } from "../context/ProjectContext";
import { Avatar } from "../components/Avatar";
import { eventMs, getLastReadMs, markRead, useLastReadMs } from "../util/inboxRead";
import type { InboxEvent } from "../api/types";

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - eventMs(iso)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const BUCKETS = ["Today", "Yesterday", "This Week", "Earlier"] as const;
function bucketOf(iso: string): (typeof BUCKETS)[number] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = eventMs(iso);
  if (t >= startToday) return "Today";
  if (t >= startToday - 86400000) return "Yesterday";
  if (t >= startToday - 7 * 86400000) return "This Week";
  return "Earlier";
}

// 활동 종류별 좌측 아이콘 (Activity 점 대용)
function eventIcon(t: string): string {
  switch (t) {
    case "status_change": return "◉";
    case "note": return "💬";
    case "version": return "🎬";
    case "created": return "✚";
    default: return "✎";
  }
}

export function Inbox() {
  const { data: events, isLoading } = useGlobalActivity(100);
  const lastReadMs = useLastReadMs();
  const navigate = useNavigate();
  const { setProjectId } = useProject();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const maxMs = useMemo(
    () => (events && events.length ? Math.max(...events.map((e) => eventMs(e.created_at))) : 0),
    [events]
  );
  const unreadCount = useMemo(
    () => (events ? events.filter((e) => eventMs(e.created_at) > lastReadMs).length : 0),
    [events, lastReadMs]
  );

  const shown = useMemo(() => {
    if (!events) return [];
    return filter === "unread"
      ? events.filter((e) => eventMs(e.created_at) > lastReadMs)
      : events;
  }, [events, filter, lastReadMs]);

  // 버킷별로 순서 보존하여 그룹화
  const grouped = useMemo(() => {
    const m = new Map<string, InboxEvent[]>();
    for (const e of shown) {
      const b = bucketOf(e.created_at);
      if (!m.has(b)) m.set(b, []);
      m.get(b)!.push(e);
    }
    return BUCKETS.filter((b) => m.has(b)).map((b) => [b, m.get(b)!] as const);
  }, [shown]);

  const openEvent = (e: InboxEvent) => {
    if (e.project) setProjectId(e.project.id);
    if (e.entity_type === "Shot" || e.entity_type === "Asset") {
      navigate(`/detail/${e.entity_type}/${e.entity_id}`);
    }
  };

  return (
    <div className="page inbox-page">
      <div className="inbox-head">
        <h1 className="inbox-title">Inbox</h1>
        <div className="inbox-filters">
          <button className={`seg ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          <button className={`seg ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>
            Unread{unreadCount ? ` (${unreadCount})` : ""}
          </button>
        </div>
        <span className="gb-spacer" />
        <button
          className="inbox-readall"
          disabled={!unreadCount}
          onClick={() => markRead(Math.max(maxMs, getLastReadMs()))}
        >
          ✓ Mark all as read
        </button>
      </div>

      {isLoading ? (
        <div className="muted pad">Loading…</div>
      ) : !shown.length ? (
        <div className="empty">{filter === "unread" ? "No unread activity." : "No activity yet."}</div>
      ) : (
        <div className="inbox-feed">
          {grouped.map(([bucket, items]) => (
            <div key={bucket} className="inbox-bucket">
              <div className="inbox-bucket-head">{bucket}</div>
              <ul className="inbox-list">
                {items.map((e) => {
                  const unread = eventMs(e.created_at) > lastReadMs;
                  const clickable = e.entity_type === "Shot" || e.entity_type === "Asset";
                  return (
                    <li
                      key={e.id}
                      className={`inbox-item ${unread ? "unread" : ""} ${clickable ? "clickable" : ""}`}
                      onClick={clickable ? () => openEvent(e) : undefined}
                    >
                      <span className="inbox-dot" aria-hidden>{unread ? "●" : ""}</span>
                      {e.user ? (
                        <Avatar name={e.user.name} color={e.user.color} size={28} />
                      ) : (
                        <span className="inbox-icon">{eventIcon(e.event_type)}</span>
                      )}
                      <div className="inbox-body">
                        <div className="inbox-text">
                          {e.user && <b>{e.user.name}</b>} {e.message}{" "}
                          <span className="inbox-target mono">
                            {e.entity_type} {e.entity_label}
                          </span>
                        </div>
                        <div className="inbox-meta">
                          {e.project && <span className="inbox-proj">{e.project.code}</span>}
                          <span className="inbox-icon-sm">{eventIcon(e.event_type)}</span>
                          <span className="inbox-time" title={new Date(e.created_at).toLocaleString()}>
                            {relTime(e.created_at)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
