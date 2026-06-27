import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { useProjects, useGlobalActivity } from "../api/hooks";
import { Avatar } from "./Avatar";
import { eventMs, useLastReadMs } from "../util/inboxRead";

/**
 * 1단: 글로벌 사이트 바.
 * - 로고 클릭 → 프로젝트 리스트(Overview "/")
 * - 아바타/계정명 클릭 → 유저 메뉴(설정/로그아웃)
 */
export function GlobalBar() {
  const { projectId, setProjectId } = useProject();
  const { data: projects } = useProjects();
  const { user, logout } = useAuth();
  const { data: inboxEvents } = useGlobalActivity(100);
  const lastReadMs = useLastReadMs();
  const unreadCount = inboxEvents
    ? inboxEvents.filter((e) => eventMs(e.created_at) > lastReadMs).length
    : 0;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const projRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId == null && projects && projects.length) setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!projOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (projRef.current && !projRef.current.contains(e.target as Node)) setProjOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [projOpen]);

  const pickProject = (id: number) => {
    setProjectId(id);
    setProjOpen(false);
    navigate("/");
  };

  return (
    <header className="globalbar">
      <span
        className="gb-logo gb-logo-btn"
        title="프로젝트 리스트"
        onClick={() => navigate("/projects")}
      >
        F
      </span>
      <NavLink to="/inbox" className={({ isActive }) => `gnav ${isActive ? "active" : ""}`}>
        Inbox{unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </NavLink>
      <NavLink to="/my-tasks" className={({ isActive }) => `gnav ${isActive ? "active" : ""}`}>My Tasks</NavLink>
      <NavLink to="/review" className={({ isActive }) => `gnav ${isActive ? "active" : ""}`}>Media</NavLink>

      {/* Projects 드롭다운 (프로젝트 선택) */}
      <div className="gb-proj-menu" ref={projRef}>
        <button className="gnav gnav-btn" onClick={() => setProjOpen((o) => !o)}>Projects ▾</button>
        {projOpen && (
          <div className="proj-dropdown">
            <div className="pd-title">Select project</div>
            {projects?.map((p) => (
              <button
                key={p.id}
                className={`pd-item ${p.id === projectId ? "active" : ""}`}
                onClick={() => pickProject(p.id)}
              >
                <span className="pd-code">{p.code}</span>
                <span className="pd-name">{p.name}</span>
              </button>
            ))}
            <div className="ud-divider" />
            <button className="pd-item pd-new" onClick={() => { setProjOpen(false); navigate("/projects?new=1"); }}>
              ＋ New Project…
            </button>
            <button className="pd-item" onClick={() => { setProjOpen(false); navigate("/projects"); }}>
              ▦ All Projects…
            </button>
          </div>
        )}
      </div>

      <span className="gnav">People</span>
      <span className="gnav">Apps ▾</span>

      <span className="gb-spacer" />

      <span className="gb-search">
        <input type="text" placeholder="Search Site…" disabled title="데모: 전역 검색 미구현" />
      </span>
      <span className="gb-icon" title="데모">＋</span>
      <span className="gb-icon" title="데모">🔔</span>
      <span className="gb-icon" title="데모">⚙</span>

      {/* 유저 메뉴 */}
      <div className="gb-user-menu" ref={menuRef}>
        <button className="gb-user-btn" onClick={() => setMenuOpen((o) => !o)} title={user?.email}>
          <Avatar name={user?.name ?? "User"} color={user?.color ?? "#674ea7"} size={26} />
        </button>
        {menuOpen && (
          <div className="user-dropdown">
            <div className="ud-head">
              <Avatar name={user?.name ?? "User"} color={user?.color ?? "#674ea7"} size={32} />
              <div>
                <div className="ud-name">{user?.name}</div>
                <div className="ud-email">{user?.email}</div>
              </div>
            </div>
            <button className="ud-item" disabled title="데모">👤 User Settings</button>
            <button className="ud-item" disabled title="데모">⚙ Preferences</button>
            <div className="ud-divider" />
            <button className="ud-item ud-logout" onClick={() => { setMenuOpen(false); logout(); }}>
              ⎋ Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
