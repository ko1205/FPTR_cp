import { useEffect, useState } from "react";
import { useUsers, useMyTasks, useUpdateStatus } from "../api/hooks";
import { StatusSelect } from "../components/StatusSelect";
import { StepBadge } from "../components/StepBadge";

export function MyTasks() {
  const { data: users } = useUsers();
  const [userId, setUserId] = useState<number | null>(null);
  const { data: tasks, isLoading } = useMyTasks(userId);
  const updateStatus = useUpdateStatus("tasks");

  useEffect(() => {
    if (userId == null && users && users.length) setUserId(users[0].id);
  }, [users, userId]);

  const current = users?.find((u) => u.id === userId);

  return (
    <div className="entity-grid">
      <div className="page-head-row">
        <h1 className="page-title">
          My Tasks{" "}
          {current && (
            <span className="muted" style={{ fontSize: 12 }}>
              · {current.name}
            </span>
          )}
        </h1>
        <div className="user-picker">
          <span className="header-label">USER</span>
          <select
            value={userId ?? ""}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : null)}
          >
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.department}
              </option>
            ))}
          </select>
          <span className="tb-count">{tasks?.length ?? 0} tasks</span>
        </div>
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
                <td className="mono">{t.due_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No tasks for this user.</div>
      )}
    </div>
  );
}
