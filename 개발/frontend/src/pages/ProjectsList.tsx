import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { useProjects, useCreateProject } from "../api/hooks";
import { AddModal, type AddField } from "../components/EntityGrid";

const PROJECT_FIELDS: AddField[] = [
  { key: "name", label: "Project Name", type: "text", required: true },
  { key: "code", label: "Code (short)", type: "text", required: true },
  {
    key: "status", label: "Status", type: "select", default: "active",
    options: [
      { value: "active", label: "Active" },
      { value: "bidding", label: "Bidding" },
      { value: "on_hold", label: "On Hold" },
      { value: "archived", label: "Archived" },
    ],
  },
  { key: "description", label: "Description", type: "text" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "end_date", label: "End Date", type: "date" },
];

/**
 * 프로젝트 리스트 뷰 — 좌상단 로고 클릭 시 (2번째 메뉴 라인 없이) 표시.
 * 프로젝트 카드 클릭 → 해당 프로젝트 선택 후 Overview 로 이동.
 * "+ New Project" 카드 또는 Projects 드롭다운(?new=1)에서 생성 폼 오픈.
 */
export function ProjectsList() {
  const { projectId, setProjectId } = useProject();
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNew, setShowNew] = useState(false);

  // Projects 드롭다운의 "New Project…" 딥링크(?new=1) → 폼 자동 오픈
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowNew(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const open = (id: number) => {
    setProjectId(id);
    navigate("/");
  };

  const submitNew = async (values: Record<string, string | number>) => {
    const created = await createProject.mutateAsync(values);
    setShowNew(false);
    if (created?.id) open(created.id); // 생성 후 새 프로젝트로 진입
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
        <button className="project-card project-card-new" onClick={() => setShowNew(true)}>
          <span className="pcn-plus">＋</span>
          <span className="pcn-label">New Project</span>
        </button>
      </div>

      {showNew &&
        createPortal(
          <AddModal
            title="New Project"
            fields={PROJECT_FIELDS}
            onClose={() => setShowNew(false)}
            onSubmit={submitNew}
          />,
          document.body
        )}
    </div>
  );
}
