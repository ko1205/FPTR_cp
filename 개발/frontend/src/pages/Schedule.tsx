import { useMemo, useState } from "react";
import { useProject } from "../context/ProjectContext";
import { useTasks } from "../api/hooks";
import { Avatar } from "../components/Avatar";
import type { Task } from "../api/types";

/**
 * Schedule / Gantt 뷰 — 원본 FPTR 의 일정/간트 모사.
 *
 * 협업 결론(Gemini+GPT-5.5 합의):
 * - EntityGrid 와 분리된 별도 페이지.
 * - 날짜는 YYYY-MM-DD 를 UTC day-index 로 파싱(타임존 1일 밀림 방지).
 * - pixels-per-day 스케일(zoom), bar = 절대위치 left/width.
 * - 좌측 라벨(엔티티/태스크) sticky, 우측 타임라인 가로 스크롤, today 라인.
 * - 날짜 없는 task 는 "Unscheduled" 로 분리.
 */

const DAY = 86400000;
const ZOOMS = { Day: 26, Week: 11, Month: 4 } as const;
type Zoom = keyof typeof ZOOMS;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}
function fromIndex(idx: number): Date {
  return new Date(idx * DAY);
}

export function Schedule() {
  const { projectId } = useProject();
  const { data: tasks, isLoading } = useTasks({ project_id: projectId });
  const [zoom, setZoom] = useState<Zoom>("Week");
  const pxPerDay = ZOOMS[zoom];

  const model = useMemo(() => {
    const list = tasks ?? [];
    const scheduled = list.filter((t) => t.start_date && t.due_date);
    const unscheduled = list.filter((t) => !t.start_date || !t.due_date);
    if (!scheduled.length) return null;

    let min = Infinity, max = -Infinity;
    for (const t of scheduled) {
      min = Math.min(min, dayIndex(t.start_date!));
      max = Math.max(max, dayIndex(t.due_date!));
    }
    const viewStart = min - 7;
    const viewEnd = max + 7;
    const totalDays = viewEnd - viewStart + 1;

    // 엔티티별 그룹 (정렬: entity_type, entity_name)
    const groups = new Map<string, { label: string; type: string; tasks: Task[] }>();
    for (const t of scheduled) {
      const key = `${t.entity_type}:${t.entity_name}`;
      if (!groups.has(key)) groups.set(key, { label: t.entity_name ?? "?", type: t.entity_type, tasks: [] });
      groups.get(key)!.tasks.push(t);
    }
    const ordered = Array.from(groups.values()).sort((a, b) =>
      a.type === b.type ? a.label.localeCompare(b.label) : a.type.localeCompare(b.type)
    );

    // 월/주 눈금
    const ticks: { idx: number; month?: string; week?: boolean }[] = [];
    for (let d = viewStart; d <= viewEnd; d++) {
      const date = fromIndex(d);
      const isMonthStart = date.getUTCDate() === 1;
      const isWeekStart = date.getUTCDay() === 1; // 월요일
      if (isMonthStart) ticks.push({ idx: d, month: `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` });
      else if (isWeekStart) ticks.push({ idx: d, week: true });
    }

    const now = new Date();
    const todayIdx = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY);

    return { groups: ordered, viewStart, totalDays, ticks, todayIdx, unscheduled };
  }, [tasks]);

  if (projectId == null) return <div className="page empty">Select a project first.</div>;
  if (isLoading) return <div className="muted pad">Loading…</div>;
  if (!model) return <div className="empty">No scheduled tasks.</div>;

  const { groups, viewStart, totalDays, ticks, todayIdx, unscheduled } = model;
  const width = totalDays * pxPerDay;
  const x = (idx: number) => (idx - viewStart) * pxPerDay;

  return (
    <div className="schedule">
      <div className="section-head">
        <h1 className="page-title">Schedule</h1>
        <span className="tb-count">{groups.length} entities · {groups.reduce((n, g) => n + g.tasks.length, 0)} tasks</span>
        <span className="sched-zoom">
          Zoom:
          {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
            <button key={z} className={`zbtn ${zoom === z ? "active" : ""}`} onClick={() => setZoom(z)}>{z}</button>
          ))}
        </span>
        {unscheduled.length > 0 && <span className="muted">· {unscheduled.length} unscheduled</span>}
      </div>

      <div className="gantt">
        {/* 헤더 (월/주 눈금) */}
        <div className="gantt-head">
          <div className="gantt-corner">Entity / Task</div>
          <div className="gantt-timeline-head" style={{ width }}>
            {ticks.map((t, i) => (
              <div
                key={i}
                className={t.month ? "tick-month" : "tick-week"}
                style={{ left: x(t.idx) }}
              >
                {t.month && <span className="tick-label">{t.month}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 바디 */}
        <div className="gantt-body">
          {/* 전체 높이 격자선 (월/주) */}
          <div className="gantt-lines">
            {ticks.map((t, i) => (
              <div
                key={i}
                className={t.month ? "vline vline-month" : "vline"}
                style={{ left: 220 + x(t.idx) }}
              />
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.label} className="gantt-group">
              <div className="gantt-grouprow">
                <div className="gantt-label gantt-grouplabel">
                  <span className="muted">{g.type}</span> <span className="mono">{g.label}</span>
                </div>
                <div className="gantt-track" style={{ width }} />
              </div>
              {g.tasks.map((t) => {
                const s = dayIndex(t.start_date!);
                const e = dayIndex(t.due_date!);
                return (
                  <div key={t.id} className="gantt-row">
                    <div className="gantt-label">
                      <span className="step-chip" style={{ background: t.step_color }}>{t.step_code}</span>
                      <span className="gantt-taskname">{t.content}</span>
                      {t.assignees[0] && <Avatar name={t.assignees[0].name} color={t.assignees[0].color} size={16} />}
                    </div>
                    <div className="gantt-track" style={{ width }}>
                      <div
                        className="gantt-bar"
                        style={{ left: x(s), width: (e - s + 1) * pxPerDay, background: t.step_color }}
                        title={`${t.content} · ${t.status_name}\n${t.start_date} ~ ${t.due_date}`}
                      >
                        <span className="gantt-bar-label">{t.status_name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* today 라인 (전체 높이) */}
          <div className="gantt-today" style={{ left: 220 + x(todayIdx) }} title="Today" />
        </div>
      </div>
    </div>
  );
}
