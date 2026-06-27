import { NavLink, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { useProjects, useProjectStats } from "../api/hooks";

/**
 * 2단: 프로젝트 엔티티 탭 바 (원본 FPTR 프로젝트 네비).
 * 프로젝트 코드 + 스위처 + 가로 엔티티 탭(Overview/Assets/Shots/...) + Project Actions
 */
export function ProjectTabs() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: stats } = useProjectStats(projectId);
  const current = projects?.find((p) => p.id === projectId);

  const tabs = [
    { to: "/", label: "Overview", end: true, count: undefined as number | undefined },
    { to: "/assets", label: "Assets", count: stats?.counts.assets },
    { to: "/shots", label: "Shots", count: stats?.counts.shots },
    { to: "/my-tasks", label: "Tasks", count: stats?.counts.tasks },
    { to: "/schedule", label: "Schedule", count: undefined },
    { to: "/review", label: "Versions", count: stats?.counts.versions },
    { to: "/playlists", label: "Playlists", count: undefined },
  ];

  return (
    <nav className="projbar">
      <div className="pb-project">
        <span
          className="pb-code pb-code-btn"
          title="프로젝트 Overview(기본 뷰)로"
          onClick={() => navigate("/")}
        >
          {current?.code ?? "—"}
        </span>
        {current && <span className="pb-name">{current.name}</span>}
      </div>

      <div className="pb-tabs">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `ptab ${isActive ? "active" : ""}`}
          >
            {t.label}
            {t.count != null && <span className="pcount">{t.count}</span>}
          </NavLink>
        ))}
      </div>

      <span className="pb-spacer" />
      <span className="pb-actions">Project Actions ▾</span>
    </nav>
  );
}
