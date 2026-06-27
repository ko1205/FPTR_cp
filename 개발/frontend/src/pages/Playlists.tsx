import { useEffect, useState } from "react";
import { useProject } from "../context/ProjectContext";
import { usePlaylists } from "../api/hooks";
import { StatusBadge } from "../components/StatusBadge";
import { Avatar } from "../components/Avatar";
import { thumbStyle } from "../util/thumb";

export function Playlists() {
  const { projectId } = useProject();
  const { data: playlists, isLoading } = usePlaylists(projectId);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (playlists && playlists.length && selectedId == null)
      setSelectedId(playlists[0].id);
  }, [playlists, selectedId]);

  if (projectId == null)
    return <div className="page empty">Select a project first.</div>;

  const selected = playlists?.find((p) => p.id === selectedId);

  return (
    <div className="page split">
      <div className="playlist-list">
        <h1 className="page-title">Playlists</h1>
        {isLoading ? (
          <div className="muted">Loading…</div>
        ) : (
          <ul className="pl-items">
            {playlists?.map((p) => (
              <li key={p.id}>
                <button
                  className={`pl-item ${p.id === selectedId ? "selected" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="pl-code">{p.code}</div>
                  <div className="pl-desc">{p.description}</div>
                  <div className="pl-count">{p.version_count} versions</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid-wrap">
        {selected ? (
          <>
            <div className="section-head">
              <h2 className="page-title">{selected.code}</h2>
              <span className="tb-count">{selected.version_count} versions</span>
            </div>
            <div className="filmstrip">
              {selected.versions.map((v) => (
                <div key={v.id} className="film-cell">
                  <div className="film-thumb" style={thumbStyle(v.thumbnail)} />
                  <div className="film-body">
                    <div className="vc-code mono">{v.code}</div>
                    <div className="vc-row" style={{ padding: 0 }}>
                      <StatusBadge color={v.status_color} name={v.status_name} />
                      <span className="muted">v{v.version_number}</span>
                    </div>
                    {v.user && (
                      <span className="submitter">
                        <Avatar name={v.user.name} color={v.user.color} size={18} />
                        {v.user.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty">No playlist selected.</div>
        )}
      </div>
    </div>
  );
}
