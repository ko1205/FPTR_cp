import { useProject } from "../context/ProjectContext";
import { useProjects, useProjectStats, useStatuses } from "../api/hooks";
import type { Status } from "../api/types";

function StatusBar({
  title,
  dist,
  statuses,
  total,
}: {
  title: string;
  dist: Record<string, number>;
  statuses: Status[];
  total: number;
}) {
  const ordered = [...statuses].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="dist-block">
      <div className="dist-head">
        <span>{title}</span>
        <span className="muted">{total}</span>
      </div>
      <div className="dist-bar">
        {ordered.map((s) => {
          const count = dist[s.code] ?? 0;
          if (!count) return null;
          return (
            <div
              key={s.code}
              className="dist-seg"
              style={{ backgroundColor: s.color, flex: count }}
              title={`${s.name}: ${count}`}
            />
          );
        })}
      </div>
      <div className="dist-legend">
        {ordered.map((s) => {
          const count = dist[s.code] ?? 0;
          if (!count) return null;
          return (
            <span key={s.code} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: s.color }} />
              {s.name} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { projectId } = useProject();
  const { data: projects } = useProjects();
  const { data: stats } = useProjectStats(projectId);
  const { data: statuses } = useStatuses();

  const current = projects?.find((p) => p.id === projectId);

  return (
    <div className="page-inner">
      <div className="ov-head">
        <h1 className="page-title">{current ? current.name : "Overview"}</h1>
        {current && <span className="muted">{current.description}</span>}
      </div>

      {projectId == null && (
        <div className="empty">Select a project (top-left logo → Projects).</div>
      )}

      {projectId != null && stats && statuses && (
        <>
          <div className="stat-grid">
            <Stat label="Sequences" value={stats.counts.sequences} />
            <Stat label="Shots" value={stats.counts.shots} />
            <Stat label="Assets" value={stats.counts.assets} />
            <Stat label="Tasks" value={stats.counts.tasks} />
            <Stat label="Versions" value={stats.counts.versions} />
          </div>

          <div className="dist-grid">
            <StatusBar
              title="Shot Status"
              dist={stats.shot_status}
              statuses={statuses}
              total={stats.counts.shots}
            />
            <StatusBar
              title="Asset Status"
              dist={stats.asset_status}
              statuses={statuses}
              total={stats.counts.assets}
            />
            <StatusBar
              title="Task Status"
              dist={stats.task_status}
              statuses={statuses}
              total={stats.counts.tasks}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
