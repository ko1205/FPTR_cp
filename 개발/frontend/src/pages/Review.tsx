import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import {
  useVersions,
  useNotes,
  useUsers,
  useCreateNote,
  useUpdateStatus,
} from "../api/hooks";
import { StatusBadge } from "../components/StatusBadge";
import { StatusSelect } from "../components/StatusSelect";
import { Avatar } from "../components/Avatar";
import { thumbStyle } from "../util/thumb";
import { EntityGrid, type GridColumn, type GroupOption } from "../components/EntityGrid";
import type { Version, Note, User } from "../api/types";

function NoteThread({ notes }: { notes: Note[] }) {
  const childrenOf = (id: number) => notes.filter((n) => n.parent_id === id);
  const roots = notes.filter((n) => n.parent_id == null);
  const render = (n: Note, depth: number) => (
    <li key={n.id} className={depth ? "note reply" : "note"}>
      <div className="note-head">
        {n.user && <Avatar name={n.user.name} color={n.user.color} size={20} />}
        <span className="note-author">{n.user?.name ?? "Unknown"}</span>
        <span className="note-date">{new Date(n.created_at).toLocaleString()}</span>
      </div>
      <div className="note-body">{n.body}</div>
      {childrenOf(n.id).map((c) => render(c, depth + 1))}
    </li>
  );
  if (!notes.length) return <div className="muted">No notes yet.</div>;
  return <ul className="note-list">{roots.map((n) => render(n, 0))}</ul>;
}

/**
 * 실제 영상 스트리밍 리뷰 플레이어.
 * 협업 결론(Gemini+GPT-5.5): video는 ref로 명령 제어, state는 isPlaying만(re-render 폭주 방지),
 * 프레임 카운터는 timeupdate/seeked 시 DOM 직접 갱신. 프레임 이동은 정수 프레임 인덱스에
 * 앵커링(부동소수 드리프트 방지). 키보드 ←→는 입력중이 아닐 때만.
 */
function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const FPS = 24; // 표준 24fps (샘플 영상 기준)

  const totalFrames = () => {
    const v = videoRef.current;
    return v && v.duration ? Math.round(v.duration * FPS) : 0;
  };
  const updateFrame = () => {
    const v = videoRef.current;
    if (!v || !frameRef.current) return;
    const f = Math.round(v.currentTime * FPS);
    frameRef.current.textContent = `${f} / ${totalFrames() || "…"}`;
  };
  const stepFrame = (dir: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    const cur = Math.round(v.currentTime * FPS); // 정수 프레임 앵커
    const target = Math.max(0, Math.min(totalFrames(), cur + dir));
    v.currentTime = target / FPS;
  };
  const playPause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  // 키보드: ←/→ 프레임 이동, Space 재생/일시정지 (입력 중엔 무시)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); stepFrame(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepFrame(1); }
      else if (e.key === " ") { e.preventDefault(); playPause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasVideo = !!src && (src.startsWith("/") || src.startsWith("http"));

  return (
    <div className="vplayer">
      {hasVideo ? (
        <video
          ref={videoRef}
          className="vplayer-video"
          src={src}
          poster={poster && (poster.startsWith("/") || poster.startsWith("http")) ? poster : undefined}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={updateFrame}
          onTimeUpdate={updateFrame}
          onSeeked={updateFrame}
        />
      ) : (
        <div className="vplayer-video vplayer-nomedia" style={thumbStyle(poster)}>
          <span className="muted">미디어 없음</span>
        </div>
      )}
      <div className="vplayer-controls">
        <button className="vp-btn" onClick={() => stepFrame(-1)} title="이전 프레임 (←)">⏮</button>
        <button className="vp-btn vp-play" onClick={playPause} title="재생/일시정지 (Space)">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className="vp-btn" onClick={stop} title="정지(처음으로) ⏹">⏹</button>
        <button className="vp-btn" onClick={() => stepFrame(1)} title="다음 프레임 (→)">⏭</button>
        <span className="vp-frame">F <span ref={frameRef}>0 / …</span></span>
        <span className="vp-hint">← → 프레임 이동</span>
      </div>
    </div>
  );
}

export function ReviewPanel({ version, users, onClose }: { version: Version; users: User[]; onClose: () => void }) {
  const { data: notes } = useNotes("Version", version.id);
  const createNote = useCreateNote();
  const supervisor = useMemo(() => users.find((u) => u.role === "supervisor") ?? users[0], [users]);
  const [authorId, setAuthorId] = useState<number>(supervisor?.id ?? 0);
  const [text, setText] = useState("");
  useEffect(() => { if (supervisor) setAuthorId(supervisor.id); }, [supervisor]);

  const submit = () => {
    if (!text.trim()) return;
    createNote.mutate(
      { project_id: version.project_id, body: text.trim(), user_id: authorId, link_entity_type: "Version", link_entity_id: version.id },
      { onSuccess: () => setText("") }
    );
  };

  return (
    <aside className="review-panel">
      <div className="detail-header">
        <div className="detail-title-wrap"><div className="detail-title mono">{version.code}</div></div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="player">
        <VideoPlayer key={version.id} src={version.media_url} poster={version.thumbnail} />
        <div className="player-meta">
          <StatusBadge color={version.status_color} name={version.status_name} />
          <span className="muted">v{version.version_number} · {version.frame_count} frames</span>
          {version.user && <span className="submitter"><Avatar name={version.user.name} color={version.user.color} size={20} />{version.user.name}</span>}
          <span className="muted">{version.entity_type} {version.entity_name}</span>
        </div>
      </div>
      <div className="activity-head">Activity · Notes</div>
      <div className="note-thread"><NoteThread notes={notes ?? []} /></div>
      <div className="note-compose">
        <div className="compose-row">
          <span className="header-label">AUTHOR</span>
          <select value={authorId} onChange={(e) => setAuthorId(Number(e.target.value))}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <textarea placeholder="Add a note…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary-btn" onClick={submit} disabled={createNote.isPending}>
          {createNote.isPending ? "Posting…" : "Post Note"}
        </button>
      </div>
    </aside>
  );
}

/**
 * Review / Media — Versions 전용 EntityGrid + 리뷰 패널.
 * 협업 결론(Gemini+GPT-5.5): 일반 EntityGrid 를 customFields=false 로 재사용 + 행 선택 시 리뷰 패널.
 */
export function Review() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const { data: versions, isLoading } = useVersions({ project_id: projectId });
  const { data: users } = useUsers();
  const updateStatus = useUpdateStatus("versions");
  const [selected, setSelected] = useState<Version | null>(null);

  if (projectId == null) return <div className="page empty">Select a project first.</div>;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const columns: GridColumn<Version>[] = [
    {
      key: "status", label: "Status", className: "col-status", width: 130, sortAccessor: (v) => v.status_name,
      render: (v) => (
        <StatusSelect variant="cell" status={v.status} statusName={v.status_name} statusColor={v.status_color}
          onChange={(status) => updateStatus.mutate({ id: v.id, status })} />
      ),
    },
    {
      key: "thumb", label: "Thumbnail", className: "col-thumb", width: 96,
      render: (v, w) => {
        const iw = Math.max(48, w - 12);
        return <div className="grid-thumb clickable" style={{ width: iw, height: Math.round((iw * 9) / 16), ...thumbStyle(v.thumbnail) }} onClick={(e) => { stop(e); setSelected(v); }} title="리뷰 패널 열기" />;
      },
    },
    {
      key: "code", label: "Version Name", width: 230, sortAccessor: (v) => v.code,
      render: (v) => <a className="entity-link mono" onClick={(e) => { stop(e); setSelected(v); }}>{v.code}</a>,
    },
    { key: "vnum", label: "Ver", className: "num", width: 56, sortAccessor: (v) => v.version_number, render: (v) => <span className="mono">v{v.version_number}</span> },
    {
      key: "link", label: "Link", width: 160, sortAccessor: (v) => v.entity_name ?? "",
      render: (v) => (
        <a className="entity-link" onClick={(e) => { stop(e); if (v.entity_type && v.entity_id) navigate(`/detail/${v.entity_type}/${v.entity_id}`); }}>
          {v.entity_type} {v.entity_name}
        </a>
      ),
    },
    {
      key: "artist", label: "Artist", width: 160, sortAccessor: (v) => v.user?.name ?? "",
      render: (v) => v.user ? <span className="submitter"><Avatar name={v.user.name} color={v.user.color} size={18} />{v.user.name}</span> : <span className="muted">—</span>,
    },
    { key: "notes", label: "Notes", className: "num", width: 80, sortAccessor: (v) => v.note_count, render: (v) => <span className="muted">💬 {v.note_count}</span> },
    { key: "date", label: "Date", width: 130, sortAccessor: (v) => Date.parse(v.created_at), render: (v) => <span className="mono">{new Date(v.created_at).toLocaleDateString()}</span> },
  ];

  const groupOptions: GroupOption<Version>[] = [
    { key: "link", label: "Link (Entity)", accessor: (v) => ({ key: `${v.entity_type}:${v.entity_id}`, label: `${v.entity_type} ${v.entity_name}` }) },
    { key: "status", label: "Status", accessor: (v) => ({ key: v.status, label: v.status_name, color: v.status_color }) },
  ];

  return (
    <div className="page split">
      <div className="grid-wrap">
        <EntityGrid
          entityKey="versions"
          entityType="Version"
          projectId={projectId}
          entityLabel="Version"
          rows={versions}
          loading={isLoading}
          rowKey={(v) => v.id}
          columns={columns}
          groupOptions={groupOptions}
          defaultGroup="none"
          customFields={false}
          selectedKey={selected?.id ?? null}
          onSelect={(v) => setSelected(v)}
          renderCard={(v) => ({ thumbnail: v.thumbnail, code: v.code, statusColor: v.status_color, statusName: v.status_name })}
        />
      </div>
      {selected && users && <ReviewPanel version={selected} users={users} onClose={() => setSelected(null)} />}
    </div>
  );
}
