import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { useProjects } from "../api/hooks";

/**
 * 프로젝트 리스트 뷰 — 좌상단 로고 클릭 시 (2번째 메뉴 라인 없이) 표시.
 * 프로젝트 카드 클릭 → 해당 프로젝트 선택 후 Overview 로 이동.
 */
export function ProjectsList() {
  const { projectId, setProjectId } = useProject();
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  const open = (id: number) => {
    setProjectId(id);
    navigate("/");
  };

  return (
    <div className="page-inner">
      <h1 className="page-title">Projects</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 18 }}>
        프로젝트를 선택하세요 ({projects?.length ?? 0})
      </p>
      <div className="project-cards">
        {projects?.map((p) => (
          <button
            key={p.id}
            className={`project-card ${p.id === projectId ? "selected" : ""}`}
            onClick={() => open(p.id)}
          >
            <div className="project-card-code">{p.code}</div>
            <div className="project-card-name">{p.name}</div>
            <div className="project-card-desc">{p.description}</div>
            <div className="project-card-foot">
              <span className={`proj-status st-${p.status}`}>{p.status}</span>
              <span className="project-card-dates muted">
                {p.start_date} → {p.end_date}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
