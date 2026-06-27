import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  useShot,
  useAsset,
  useTasks,
  useVersions,
  useNotes,
  useUpdateStatus,
  useEntityActivity,
  useUsers,
} from "../api/hooks";
import { StatusSelect } from "../components/StatusSelect";
import { StatusBadge } from "../components/StatusBadge";
import { StepBadge } from "../components/StepBadge";
import { Avatar } from "../components/Avatar";
import { thumbStyle } from "../util/thumb";
import { ReviewPanel } from "./Review";
import type { Version } from "../api/types";

type Tab = "activity" | "tasks" | "versions" | "notes";

/**
 * 엔티티 상세 — 전체 페이지 (원본 FPTR /detail/<Entity>/<id> 모사).
 * 협업 결론(Gemini+GPT-5.5 합의 최우선): 사이드 패널이 아니라 전체 페이지.
 * 브레드크럼 + 큰 썸네일 + 필드표 + 연관 탭(Tasks/Versions/Notes 서브그리드).
 */
export function EntityDetail() {
  const { entityType = "Shot", id } = useParams();
  const navigate = useNavigate();
  const entityId = id ? Number(id) : null;
  const isShot = entityType === "Shot";

  const shotQ = useShot(isShot ? entityId : null);
  const assetQ = useAsset(!isShot ? entityId : null);
  const entity: any = isShot ? shotQ.data : assetQ.data;

  const updateStatus = useUpdateStatus(isShot ? "shots" : "assets");
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "activity";
  const [tab, setTab] = useState<Tab>(["activity", "tasks", "versions", "notes"].includes(initialTab) ? initialTab : "activity");

  const tasks = useTasks({ entity_type: entityType, entity_id: entityId ?? undefined });
  const versions = useVersions({ entity_type: entityType, entity_id: entityId ?? undefined });
  const notes = useNotes(entityType, entityId);
  const activity = useEntityActivity(entityType, entityId);
  const { data: users } = useUsers();
  const [playVersion, setPlayVersion] = useState<Version | null>(null);

  if (!entity) return <div className="pad muted">Loading…</div>;

  return (
    <div className="detail-page">
      {/* 브레드크럼 */}
      <div className="dp-crumb">
        <button className="dp-back" onClick={() => navigate(-1)} title="뒤로">←</button>
        <span className="muted">{isShot ? entity.sequence_code ?? entityType : entity.asset_type}</span>
        <span className="muted">›</span>
        <span className="mono dp-crumb-code">{entity.code}</span>
      </div>

      {/* 헤더: 큰 썸네일 + 필드표 */}
      <div className="dp-header">
        <div className="dp-thumb" style={thumbStyle(entity.thumbnail)} />
        <div className="dp-fields">
          <h1 className="dp-title mono">{entity.code}</h1>
          <table className="dp-field-table">
            <tbody>
              <tr>
                <td className="dp-flabel">{isShot ? "Shot Code" : "Asset Name"}</td>
                <td className="mono">{entity.code}</td>
              </tr>
              {isShot ? (
                <tr>
                  <td className="dp-flabel">Sequence</td>
                  <td className="col-link">{entity.sequence_code ?? "—"}</td>
                </tr>
              ) : (
                <tr>
                  <td className="dp-flabel">Type</td>
                  <td>{entity.asset_type}</td>
                </tr>
              )}
              <tr>
                <td className="dp-flabel">Status</td>
                <td>
                  <StatusSelect
                    status={entity.status}
                    statusName={entity.status_name}
                    statusColor={entity.status_color}
                    onChange={(status) => updateStatus.mutate({ id: entity.id, status })}
                  />
                </td>
              </tr>
              <tr>
                <td className="dp-flabel">Description</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{entity.description || <span className="muted">—</span>}</td>
              </tr>
              {isShot && (
                <tr>
                  <td className="dp-flabel">Cut</td>
                  <td className="mono">
                    {entity.cut_in} – {entity.cut_out}{" "}
                    <span className="muted">({entity.cut_duration} fr)</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 연관 탭 */}
      <div className="tabs dp-tabs">
        {(["activity", "tasks", "versions", "notes"] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "activity"
              ? `Activity (${activity.data?.length ?? 0})`
              : t === "tasks"
              ? `Tasks (${tasks.data?.length ?? 0})`
              : t === "versions"
              ? `Versions (${versions.data?.length ?? 0})`
              : `Notes (${notes.data?.length ?? 0})`}
          </button>
        ))}
      </div>

      <div className="dp-tab-body">
        {tab === "activity" &&
          (activity.data?.length ? (
            <ul className="activity-list">
              {activity.data.map((e) => (
                <li key={e.id} className="activity-item">
                  {e.user ? (
                    <Avatar name={e.user.name} color={e.user.color} size={24} />
                  ) : (
                    <span className="activity-dot" />
                  )}
                  <div className="activity-body">
                    <span className="activity-text">
                      {e.user && <b>{e.user.name}</b>} {e.message}
                    </span>
                    <span className="activity-time">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No activity yet.</div>
          ))}

        {tab === "tasks" &&
          (tasks.data?.length ? (
            <table className="data-table">
              <thead>
                <tr><th>Step</th><th>Task</th><th>Status</th><th>Assignees</th><th>Due</th></tr>
              </thead>
              <tbody>
                {tasks.data.map((t) => (
                  <tr key={t.id}>
                    <td><StepBadge color={t.step_color} name={t.step_code} /></td>
                    <td>{t.content}</td>
                    <td><StatusBadge color={t.status_color} name={t.status_name} /></td>
                    <td><div className="assignee-cell">{t.assignees.map((a) => <Avatar key={a.id} name={a.name} color={a.color} size={20} />)}</div></td>
                    <td className="mono">{t.due_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No tasks.</div>)}

        {tab === "versions" &&
          (versions.data?.length ? (
            <div className="version-grid">
              {versions.data.map((v) => (
                <div key={v.id} className="version-card clickable" onClick={() => setPlayVersion(v)} title="리뷰 플레이어 열기">
                  <div className="vc-thumb" style={thumbStyle(v.thumbnail)}>
                    <span className="vc-play">▶</span>
                    <span className="vc-vnum">v{v.version_number}</span>
                  </div>
                  <div className="vc-body"><div className="vc-code mono">{v.code}</div></div>
                  <div className="vc-row">
                    <StatusBadge color={v.status_color} name={v.status_name} />
                    {v.user && <span className="submitter"><Avatar name={v.user.name} color={v.user.color} size={18} />{v.user.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No versions.</div>)}

        {tab === "notes" &&
          (notes.data?.length ? (
            <ul className="note-list dp-notes">
              {notes.data.map((n) => (
                <li key={n.id} className={n.parent_id ? "note reply" : "note"}>
                  <div className="note-head">
                    {n.user && <Avatar name={n.user.name} color={n.user.color} size={20} />}
                    <span className="note-author">{n.user?.name ?? "Unknown"}</span>
                    <span className="note-date">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="note-body">{n.body}</div>
                </li>
              ))}
            </ul>
          ) : <div className="empty">No notes.</div>)}
      </div>

      {playVersion && users && (
        <div className="review-drawer-backdrop" onClick={() => setPlayVersion(null)}>
          <div className="review-drawer" onClick={(e) => e.stopPropagation()}>
            <ReviewPanel version={playVersion} users={users} onClose={() => setPlayVersion(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
