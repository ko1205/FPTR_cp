import { useProject } from "../context/ProjectContext";
import { useTasks, useUpdateStatus } from "../api/hooks";
import { StatusSelect } from "../components/StatusSelect";
import { StepBadge } from "../components/StepBadge";
import { Avatar } from "../components/Avatar";

/**
 * Tasks (프로젝트 엔티티 탭) — 선택된 프로젝트에 귀속된 모든 Task.
 * (유저 무관. 유저별 전역 태스크는 상단바 My Tasks → /my-tasks.)
 */
export function ProjectTasks() {
  const { projectId } = useProject();
  const { data: tasks, isLoading } = useTasks({ project_id: projectId });
  const updateStatus = useUpdateStatus("tasks");

  if (projectId == null) return <div className="page empty">Select a project first.</div>;

  return (
    <div className="entity-grid">
      <div className="page-head-row">
        <h1 className="page-title">Tasks</h1>
        <span className="tb-count">{tasks?.length ?? 0} tasks</span>
      </div>

      {isLoading ? (
        <div className="muted pad">Loading…</div>
      ) : tasks?.length ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Step</th>
              <th>Entity</th>
              <th>Status</th>
              <th>Assignees</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td className="cell-strong">{t.content}</td>
                <td>
                  <StepBadge color={t.step_color} name={t.step_code} />
                </td>
                <td>
                  <span className="muted">{t.entity_type}</span>{" "}
                  <span className="mono">{t.entity_name}</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    status={t.status}
                    statusName={t.status_name}
                    statusColor={t.status_color}
                    onChange={(status) => updateStatus.mutate({ id: t.id, status })}
                  />
                </td>
                <td>
                  {t.assignees.length ? (
                    <span className="assignee-list">
                      {t.assignees.map((u) => (
                        <Avatar key={u.id} name={u.name} color={u.color} size={22} title={u.name} />
                      ))}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="mono">{t.due_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No tasks in this project.</div>
      )}
    </div>
  );
}
