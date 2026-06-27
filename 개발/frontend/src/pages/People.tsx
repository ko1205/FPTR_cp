import { useMemo, useState } from "react";
import { useUsers } from "../api/hooks";
import { Avatar } from "../components/Avatar";
import type { User } from "../api/types";

const ROLE_LABEL: Record<string, string> = {
  artist: "Artist",
  supervisor: "Supervisor",
  coordinator: "Coordinator",
  admin: "Admin",
  producer: "Producer",
};

/**
 * People — 사이트 전역 사용자(HumanUser) 목록.
 * 전역 뷰(프로젝트 비종속). 검색 + 부서별 그룹 + 역할 배지.
 */
export function People() {
  const { data: users, isLoading } = useUsers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter((u) =>
      [u.name, u.login, u.email, u.department, u.role].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [users, search]);

  // 부서별 그룹 (부서 미지정은 마지막)
  const groups = useMemo(() => {
    const m = new Map<string, User[]>();
    for (const u of filtered) {
      const dept = u.department || "—";
      if (!m.has(dept)) m.set(dept, []);
      m.get(dept)!.push(u);
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0] === "—") return 1;
      if (b[0] === "—") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  return (
    <div className="page-inner">
      <div className="people-head">
        <h1 className="page-title" style={{ margin: 0 }}>People</h1>
        <span className="people-count">{users?.length ?? 0} people</span>
        <span className="gb-spacer" />
        <input
          className="people-search"
          type="text"
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="muted pad">Loading…</div>
      ) : !filtered.length ? (
        <div className="empty">No people{search ? " match your search." : "."}</div>
      ) : (
        groups.map(([dept, members]) => (
          <div key={dept} className="people-group">
            <div className="people-group-head">
              {dept} <span className="people-group-count">{members.length}</span>
            </div>
            <div className="people-cards">
              {members.map((u) => (
                <div key={u.id} className="person-card">
                  <Avatar name={u.name} color={u.color} size={44} />
                  <div className="person-info">
                    <div className="person-name">{u.name}</div>
                    <div className="person-login mono">@{u.login}</div>
                    <div className="person-meta">
                      <span className={`role-badge role-${u.role}`}>{ROLE_LABEL[u.role] ?? u.role}</span>
                      {u.email && <a className="person-email" href={`mailto:${u.email}`}>{u.email}</a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
