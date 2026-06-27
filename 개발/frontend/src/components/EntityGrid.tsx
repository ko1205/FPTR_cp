import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { thumbStyle } from "../util/thumb";
import { parseCSV } from "../util/csv";
import { useGridView, type CustomFieldType } from "./gridView";
import {
  useCustomFieldDefs,
  useCreateCustomField,
  useDeleteCustomField,
  useUpdateCustomValue,
  useUpdateStatus,
  useStatuses,
} from "../api/hooks";
import type { CustomFieldDef } from "../api/types";

export interface GridColumn<T> {
  key: string;
  label: string;
  className?: string;
  width?: number; // 기본 px 너비
  /** width = 컬럼의 "설정" 너비(px). 창 확장으로 인한 셀 stretch 가 아니라 고정값.
   *  썸네일처럼 설정 너비 기준으로 크기를 고정하고 싶을 때 사용. */
  render: (row: T, width: number) => ReactNode;
  /** 지정 시 더블클릭 인라인 편집 (텍스트/멀티라인) */
  edit?: {
    get: (row: T) => string;
    save: (row: T, value: string) => void;
    multiline?: boolean;
  };
  /** 지정 시 헤더 클릭으로 정렬 가능 */
  sortAccessor?: (row: T) => string | number;
  /** 지정 시 컬럼별 필터 가능 (filter-row). text=부분일치, select=정확일치(distinct 옵션) */
  filterAccessor?: (row: T) => string;
  filterType?: "text" | "select";
}

const DEFAULT_COL_WIDTH = 150;

export interface AddField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: string | number;
}

export interface GroupOption<T> {
  key: string;
  label: string;
  accessor: (row: T) => { key: string; label: string; color?: string };
}

export interface CardData {
  thumbnail: string;
  code: string;
  statusColor: string;
  statusName: string;
  sub?: ReactNode;
  pipeline?: ReactNode;
}

interface Group<T> {
  key: string;
  label: string;
  color?: string;
  rows: T[];
}

type CustomValues = Record<string, string | number | boolean>;

/**
 * 원본 FPTR 엔티티 그리드 모사.
 * - 컬럼: 헤더 드래그로 순서변경, Fields 메뉴에서 숨김/표시, 커스텀필드 추가(API/DB)
 * - 순서/숨김은 localStorage, 커스텀필드 정의/값은 백엔드(SQLite) — 협업 결론 반영
 */
export function EntityGrid<T>({
  entityKey,
  entityType,
  projectId,
  entityLabel,
  rows,
  loading,
  rowKey,
  columns,
  groupOptions,
  defaultGroup = "none",
  renderCard,
  getCustomFields,
  customFields = true,
  bulkStatus = true,
  selectedKey,
  onSelect,
  onOpen,
  addFields,
  primaryField = "code",
  onCreate,
  onDelete,
  onBulkCreate,
  onBulkDelete,
}: {
  entityKey: string;
  entityType: string;
  projectId: number | null;
  entityLabel: string;
  rows: T[] | undefined;
  loading: boolean;
  rowKey: (r: T) => number;
  columns: GridColumn<T>[];
  groupOptions: GroupOption<T>[];
  defaultGroup?: string;
  renderCard: (r: T) => CardData;
  getCustomFields?: (r: T) => CustomValues;
  /** Shot/Asset 만 커스텀필드 지원. Version 등은 false */
  customFields?: boolean;
  /** 일괄 Status 변경 지원 여부 */
  bulkStatus?: boolean;
  selectedKey: number | null;
  onSelect: (r: T) => void;
  /** 썸네일 카드 클릭 시(상세 열기 등). 미지정 시 onSelect */
  onOpen?: (r: T) => void;
  /** CRUD: 생성 폼 필드 정의 (있으면 Add 버튼 활성) */
  addFields?: AddField[];
  primaryField?: string;
  onCreate?: (values: Record<string, string | number>) => Promise<unknown>;
  /** CRUD: 삭제 (있으면 우클릭 삭제 + 일괄 삭제 활성) */
  onDelete?: (id: number) => Promise<unknown>;
  /** CRUD: 일괄 생성 (있으면 Add Multiple/CSV 가 단일 호출로 처리, 없으면 onCreate N회) */
  onBulkCreate?: (items: Record<string, string | number>[]) => Promise<unknown>;
  /** CRUD: 일괄 삭제 (있으면 단일 호출로 처리, 없으면 onDelete N회) */
  onBulkDelete?: (ids: number[]) => Promise<unknown>;
}) {
  const [groupKey, setGroupKey] = useState(defaultGroup);
  const [mode, setMode] = useState<"list" | "thumb">("list");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string | null; dir: "asc" | "desc" }>({ key: null, dir: "asc" });
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 커스텀필드 정의/값/뮤테이션 (DB)
  const { data: cfDefs = [] } = useCustomFieldDefs(customFields ? projectId : null, entityType);
  const createCf = useCreateCustomField();
  const deleteCf = useDeleteCustomField();
  const updateCfValue = useUpdateCustomValue(entityKey);

  const baseKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const cfKeys = useMemo(() => cfDefs.map((d) => `cf:${d.field_id}`), [cfDefs]);
  const allKeys = useMemo(() => [...baseKeys, ...cfKeys], [baseKeys, cfKeys]);
  const { cfg, moveColumn, toggleHidden, setWidth, resetView } = useGridView(entityKey, allKeys);

  // 기본 + 커스텀 컬럼 매핑
  const colMap = new Map<string, GridColumn<T>>();
  for (const c of columns) colMap.set(c.key, c);
  for (const def of cfDefs) {
    colMap.set(`cf:${def.field_id}`, {
      key: `cf:${def.field_id}`,
      label: def.label,
      className: "col-custom",
      render: (row: T) => (
        <CustomCell
          def={def}
          value={getCustomFields?.(row)?.[def.field_id]}
          onChange={(val) =>
            updateCfValue.mutate({ id: rowKey(row), fields: { [def.field_id]: val } })
          }
        />
      ),
    });
  }
  const visibleColumns: GridColumn<T>[] = cfg.order
    .filter((k) => !cfg.hidden.includes(k))
    .map((k) => colMap.get(k))
    .filter((c): c is GridColumn<T> => !!c);

  const filtered = useMemo<T[]>(() => {
    let list = rows ?? [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => renderCard(r).code.toLowerCase().includes(q));
    const active = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (active.length) {
      list = list.filter((r) =>
        active.every(([key, val]) => {
          const col = columns.find((c) => c.key === key);
          if (!col?.filterAccessor) return true;
          const cell = col.filterAccessor(r);
          return col.filterType === "select" ? cell === val : cell.toLowerCase().includes(val.toLowerCase());
        })
      );
    }
    return list;
  }, [rows, search, filters, columns, renderCard]);

  // 자연 정렬용 collator (shot_2 < shot_10)
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);

  // 협업 결론(GPT-5.5): 전역 정렬 후 그룹화가 아니라 **그룹 먼저 → 그룹 내부 정렬**
  // (그룹 순서는 첫 등장 순 유지, 행만 정렬). nulls last + 안정 정렬(원본 index tiebreak).
  const groups = useMemo<Group<T>[]>(() => {
    let result: Group<T>[];
    if (groupKey === "none") {
      result = [{ key: "__all", label: "", rows: [...filtered] }];
    } else {
      const opt = groupOptions.find((g) => g.key === groupKey);
      if (!opt) {
        result = [{ key: "__all", label: "", rows: [...filtered] }];
      } else {
        const map = new Map<string, Group<T>>();
        for (const r of filtered) {
          const { key, label, color } = opt.accessor(r);
          if (!map.has(key)) map.set(key, { key, label, color, rows: [] });
          map.get(key)!.rows.push(r);
        }
        result = Array.from(map.values());
      }
    }
    const acc = sort.key ? columns.find((c) => c.key === sort.key)?.sortAccessor : undefined;
    if (acc) {
      const dir = sort.dir === "asc" ? 1 : -1;
      for (const g of result) {
        g.rows = g.rows
          .map((r, i) => ({ r, i }))
          .sort((a, b) => {
            const av = acc(a.r), bv = acc(b.r);
            const an = av == null || av === "";
            const bn = bv == null || bv === "";
            if (an && bn) return a.i - b.i;
            if (an) return 1;
            if (bn) return -1;
            const c =
              typeof av === "number" && typeof bv === "number"
                ? av - bv
                : collator.compare(String(av), String(bv));
            return c * dir || a.i - b.i;
          })
          .map((x) => x.r);
      }
    }
    return result;
  }, [filtered, groupKey, groupOptions, sort, columns, collator]);

  const total = rows?.length ?? 0;
  const shown = filtered.length;
  const grouped = groupKey !== "none";

  // 일괄 선택 (체크박스)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const bulkStatusMut = useUpdateStatus(entityKey);
  const { data: statuses } = useStatuses();
  const filteredIds = filtered.map(rowKey);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedRows.has(id));
  const someSelected = filteredIds.some((id) => selectedRows.has(id)) && !allSelected;
  const toggleRow = (id: number) =>
    setSelectedRows((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelectedRows(() => (allSelected ? new Set<number>() : new Set(filteredIds)));
  const clearSel = () => setSelectedRows(new Set());
  const applyBulkStatus = (code: string) => {
    selectedRows.forEach((id) => bulkStatusMut.mutate({ id, status: code }));
  };
  const selCount = selectedRows.size;

  // CRUD UI 상태
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; row: T } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [batchMode, setBatchMode] = useState<null | "lines" | "csv">(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmBox, setConfirmBox] = useState<null | { message: string; onYes: () => void | Promise<void> }>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu]);

  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const askDelete = (id: number, label: string) =>
    setConfirmBox({ message: `${label} 을(를) 삭제할까요?`, onYes: async () => { setConfirmBox(null); await onDelete?.(id); } });

  const askBulkDelete = () => {
    const ids = [...selectedRows];
    setMoreOpen(false);
    setConfirmBox({
      message: `선택한 ${ids.length}개 ${entityLabel}을(를) 삭제할까요?`,
      onYes: async () => {
        setConfirmBox(null);
        if (onBulkDelete) {
          // 단일 호출 일괄 삭제 (all-or-nothing)
          try { await onBulkDelete(ids); } catch { /* 실패 시 무효화로 복구 */ }
        } else {
          // 폴백: onDelete N회
          for (const id of ids) { try { await onDelete?.(id); } catch { /* 부분실패 무시 */ } }
        }
        clearSel();
      },
    });
  };

  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const dragKey = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // 컬럼 너비 (저장값 ?? 기본값)
  const widthOf = (c: GridColumn<T>) => cfg.widths[c.key] ?? c.width ?? DEFAULT_COL_WIDTH;

  // 컬럼 리사이즈 (포인터 이벤트)
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const onGripDown = (e: React.PointerEvent, c: GridColumn<T>) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { key: c.key, startX: e.clientX, startW: widthOf(c) };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = "none";
  };
  const onGripMove = (e: React.PointerEvent) => {
    const r = resizing.current;
    if (!r) return;
    setWidth(r.key, r.startW + (e.clientX - r.startX));
  };
  const onGripUp = () => {
    resizing.current = null;
    document.body.style.userSelect = "";
  };

  // 헤더 클릭 정렬: 없음 → asc → desc → 없음
  const cycleSort = (key: string) =>
    setSort((s) =>
      s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : { key: null, dir: "asc" }
    );

  return (
    <div className="entity-grid">
      <div className="grid-toolbar">
        <div className="tb-left">
          <div className="tb-modes">
            <button className={`tb-mode ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")} title="List view">≣</button>
            <button className={`tb-mode ${mode === "thumb" ? "active" : ""}`} onClick={() => setMode("thumb")} title="Thumbnail view">▦</button>
          </div>
          <button
            className="add-btn"
            disabled={!(addFields && onCreate)}
            onClick={() => setShowAdd(true)}
            title={addFields && onCreate ? "" : "생성 미지원"}
          >
            + Add {entityLabel}
          </button>
          <button className="tb-menu" disabled>↕ Sort</button>
          <label className="tb-menu tb-group">
            ⊞ Group
            <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
              <option value="none">None</option>
              {groupOptions.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </label>
          <FieldsMenu
            order={cfg.order}
            hidden={cfg.hidden}
            colMap={colMap}
            cfDefs={cfDefs}
            onToggle={toggleHidden}
            onAddCustom={(label, type) =>
              createCf.mutate({ project_id: projectId!, entity_type: entityType, label, type })
            }
            onRemoveCustom={(defId) => deleteCf.mutate(defId)}
            onReset={resetView}
            canAdd={customFields && projectId != null}
            showAdd={customFields}
          />
          <div className="fields-menu" ref={moreRef}>
            <button className="tb-menu" onClick={() => setMoreOpen((o) => !o)}>More ▾</button>
            {moreOpen && (
              <div className="fields-dropdown more-dropdown">
                <button className="md-item" disabled={selCount === 0 || !onDelete} onClick={askBulkDelete}>
                  🗑 Delete selected ({selCount})
                </button>
                <div className="ud-divider" />
                <button className="md-item" disabled={!(addFields && onCreate)} onClick={() => { setMoreOpen(false); setBatchMode("lines"); }}>
                  ＋ Add Multiple…
                </button>
                <button className="md-item" disabled={!(addFields && onCreate)} onClick={() => { setMoreOpen(false); setBatchMode("csv"); }}>
                  ＋ Add CSV…
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="tb-right">
          <input
            className="grid-search"
            type="text"
            placeholder={`Search ${entityLabel}s…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterMenu
            columns={visibleColumns}
            rows={rows ?? []}
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      </div>

      {Object.entries(filters).filter(([, v]) => v.trim()).length > 0 && (
        <div className="filter-chips">
          <span className="muted" style={{ fontSize: 11 }}>Filters:</span>
          {Object.entries(filters)
            .filter(([, v]) => v.trim())
            .map(([key, val]) => {
              const col = visibleColumns.find((c) => c.key === key);
              return (
                <span key={key} className="filter-chip">
                  {col?.label ?? key}: <b>{val}</b>
                  <button onClick={() => setFilters((f) => ({ ...f, [key]: "" }))}>✕</button>
                </span>
              );
            })}
          <button className="filter-clear-all" onClick={() => setFilters({})}>Clear all</button>
        </div>
      )}

      {selCount > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selCount} selected</span>
          {bulkStatus && (
            <label className="bulk-action">
              Set Status
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) applyBulkStatus(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">—</option>
                {statuses?.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="bulk-clear" onClick={clearSel}>Clear</button>
        </div>
      )}

      <div className="grid-body">
        {loading ? (
          <div className="muted pad">Loading…</div>
        ) : total === 0 ? (
          <div className="empty">No {entityLabel.toLowerCase()}s.</div>
        ) : mode === "list" ? (
          <table className="data-table fixed">
            <colgroup>
              <col style={{ width: 34 }} />
              {visibleColumns.map((c) => (
                <col key={c.key} style={{ width: widthOf(c) }} />
              ))}
              {/* 남는 가로 공간을 흡수하는 스페이서 컬럼: 컬럼 리사이즈가 다른 컬럼을 늘리지 않게 함 */}
              <col className="col-spacer" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    title="전체 선택/해제"
                  />
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.className ?? ""} ${dragOver === c.key ? "drag-over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOver !== c.key) setDragOver(c.key);
                    }}
                    onDragLeave={() => setDragOver((d) => (d === c.key ? null : d))}
                    onDrop={() => {
                      if (dragKey.current) moveColumn(dragKey.current, c.key);
                      dragKey.current = null;
                      setDragOver(null);
                    }}
                  >
                    <span className="th-inner">
                      <span
                        className="th-drag"
                        draggable
                        onDragStart={() => (dragKey.current = c.key)}
                        title="드래그하여 컬럼 순서 변경"
                      >
                        ⠿
                      </span>
                      <span
                        className={`th-label ${c.sortAccessor ? "sortable" : ""}`}
                        onClick={c.sortAccessor ? () => cycleSort(c.key) : undefined}
                      >
                        {c.label}
                        {sort.key === c.key && (
                          <span className="sort-arrow">{sort.dir === "asc" ? "▲" : "▼"}</span>
                        )}
                      </span>
                    </span>
                    <span
                      className="th-resize"
                      onPointerDown={(e) => onGripDown(e, c)}
                      onPointerMove={onGripMove}
                      onPointerUp={onGripUp}
                      title="드래그하여 너비 조절"
                    />
                  </th>
                ))}
                <th className="col-spacer" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows
                  key={g.key}
                  group={g}
                  grouped={grouped}
                  collapsed={collapsed.has(g.key)}
                  toggle={toggle}
                  columns={visibleColumns}
                  colWidthOf={widthOf}
                  rowKey={rowKey}
                  selectedKey={selectedKey}
                  onSelect={onSelect}
                  selectedRows={selectedRows}
                  onToggleRow={toggleRow}
                  onRowContext={
                    onDelete
                      ? (e, r) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row: r }); }
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="thumb-scroll">
            {groups.map((g) => (
              <div key={g.key} className="thumb-group">
                {grouped && (
                  <div className="thumb-group-head" onClick={() => toggle(g.key)}>
                    <span className="grp-caret">{collapsed.has(g.key) ? "▸" : "▾"}</span>
                    {g.color && <span className="grp-dot" style={{ background: g.color }} />}
                    <span className="grp-label">{g.label}</span>
                    <span className="grp-count">{g.rows.length}</span>
                  </div>
                )}
                {!collapsed.has(g.key) && (
                  <div className="card-grid">
                    {g.rows.map((r) => {
                      const c = renderCard(r);
                      const k = rowKey(r);
                      return (
                        <button
                          key={k}
                          className={`thumb-card ${selectedKey === k ? "selected" : ""}`}
                          style={{ borderTopColor: c.statusColor }}
                          onClick={() => (onOpen ?? onSelect)(r)}
                        >
                          <span className="thumb-card-img" style={thumbStyle(c.thumbnail)} />
                          <span className="thumb-card-code mono">{c.code}</span>
                          <span className="thumb-card-row">
                            <span className="badge" style={{ background: c.statusColor }}>{c.statusName}</span>
                          </span>
                          {c.pipeline}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-footer">
        <span className="gf-count">
          {shown === total
            ? `1 - ${total} of ${total} ${entityLabel}s`
            : `${shown} of ${total} ${entityLabel}s (filtered)`}
        </span>
        <span className="gf-page">100 per page</span>
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu &&
        createPortal(
          <ul
            className="row-ctx"
            style={{
              position: "fixed",
              top: Math.min(ctxMenu.y, window.innerHeight - 90),
              left: Math.min(ctxMenu.x, window.innerWidth - 170),
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onOpen && (
              <li onClick={() => { const row = ctxMenu.row; setCtxMenu(null); onOpen(row); }}>Open</li>
            )}
            <li
              className="danger"
              onClick={() => { const row = ctxMenu.row; setCtxMenu(null); askDelete(rowKey(row), renderCard(row).code); }}
            >
              Delete
            </li>
          </ul>,
          document.body
        )}

      {/* 삭제 확인 모달 */}
      {confirmBox &&
        createPortal(
          <div className="modal-overlay" onClick={() => setConfirmBox(null)}>
            <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-body">{confirmBox.message}</div>
              <div className="modal-foot">
                <button className="btn-neutral" onClick={() => setConfirmBox(null)}>Cancel</button>
                <button className="btn-danger" onClick={() => confirmBox.onYes()}>Delete</button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 단일 추가 폼 */}
      {showAdd && addFields && onCreate &&
        createPortal(
          <AddModal
            title={`Add ${entityLabel}`}
            fields={addFields}
            onClose={() => setShowAdd(false)}
            onSubmit={async (v) => { await onCreate(v); setShowAdd(false); }}
          />,
          document.body
        )}

      {/* 다중/CSV 추가 */}
      {batchMode && addFields && onCreate &&
        createPortal(
          <BatchAddModal
            mode={batchMode}
            fields={addFields}
            primaryField={primaryField}
            entityLabel={entityLabel}
            onClose={() => setBatchMode(null)}
            onCreate={onCreate}
            onBulkCreate={onBulkCreate}
          />,
          document.body
        )}
    </div>
  );
}

/* ---------- 단일 추가 폼 모달 ---------- */
function AddModal({
  title,
  fields,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: AddField[];
  onClose: () => void;
  onSubmit: (values: Record<string, string | number>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default != null ? String(f.default) : ""]))
  );
  const [saving, setSaving] = useState(false);
  const missing = fields.some((f) => f.required && !String(form[f.key] ?? "").trim());

  const submit = async () => {
    if (missing || saving) return;
    setSaving(true);
    const values: Record<string, string | number> = {};
    for (const f of fields) {
      const raw = form[f.key];
      if (raw === undefined || raw === "") continue;
      values[f.key] = f.type === "number" || f.key.endsWith("_id") ? Number(raw) : raw;
    }
    try { await onSubmit(values); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-form">
          {fields.map((f) => (
            <label key={f.key} className="mf-row">
              <span className="mf-label">{f.label}{f.required && <b className="req">*</b>}</span>
              {f.type === "select" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}>
                  <option value="">—</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  autoFocus={f.key === fields[0].key}
                />
              )}
            </label>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn-neutral" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={missing || saving} onClick={submit}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 다중/CSV 추가 모달 ---------- */
function BatchAddModal({
  mode,
  fields,
  primaryField,
  entityLabel,
  onClose,
  onCreate,
  onBulkCreate,
}: {
  mode: "lines" | "csv";
  fields: AddField[];
  primaryField: string;
  entityLabel: string;
  onClose: () => void;
  onCreate: (values: Record<string, string | number>) => Promise<unknown>;
  onBulkCreate?: (items: Record<string, string | number>[]) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parse = (): Record<string, string | number>[] => {
    if (mode === "lines") {
      return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => ({ [primaryField]: line }));
    }
    // CSV (RFC4180 파서: 인용 필드/콤마/줄바꿈/이스케이프 따옴표 지원)
    const grid = parseCSV(text);
    if (grid.length < 2) return [];
    const headers = grid[0].map((h) => h.trim());
    return grid.slice(1).map((cells) => {
      const obj: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        const f = fields.find((a) => a.key === h || a.label.toLowerCase() === h.toLowerCase());
        if (!f) return;
        const raw = (cells[i] ?? "").trim();
        if (raw !== "") obj[f.key] = f.type === "number" || f.key.endsWith("_id") ? Number(raw) : raw;
      });
      return obj;
    }).filter((o) => o[primaryField] != null && o[primaryField] !== "");
  };

  const items = parse();

  const submit = async () => {
    if (!items.length || saving) return;
    setSaving(true);
    let ok = 0;
    let failed = 0;
    if (onBulkCreate) {
      // 단일 호출 일괄 생성 (all-or-nothing): 성공 시 전체, 실패 시 0
      try { await onBulkCreate(items); ok = items.length; }
      catch { failed = items.length; }
    } else {
      // 폴백: onCreate N회
      const res = await Promise.allSettled(items.map((it) => onCreate(it)));
      ok = res.filter((r) => r.status === "fulfilled").length;
      failed = items.length - ok;
    }
    setSaving(false);
    setResult(`${ok}개 생성${failed ? `, ${failed}개 실패` : ""}`);
    if (!failed) setTimeout(onClose, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{mode === "lines" ? `Add Multiple ${entityLabel}s` : `Add ${entityLabel}s from CSV`}</div>
        <div className="modal-form">
          <p className="muted" style={{ fontSize: 11, margin: "0 0 6px" }}>
            {mode === "lines"
              ? `한 줄에 하나씩 ${primaryField} 입력`
              : `첫 줄=헤더(${fields.map((f) => f.key).join(", ")}), 이후 줄=데이터 · 값에 콤마/줄바꿈은 "큰따옴표"로 감싸기`}
          </p>
          <textarea
            className="batch-textarea"
            rows={9}
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            placeholder={mode === "lines" ? "SEQ010_0050\nSEQ010_0060" : 'code,description\nSEQ010_0050,"Opening, wide shot"\nSEQ010_0060,Another'}
            autoFocus
          />
          <div className="muted" style={{ fontSize: 11 }}>
            {items.length}개 인식됨 {result && <b style={{ color: "var(--accent)" }}>· {result}</b>}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-neutral" onClick={onClose}>Close</button>
          <button className="btn-primary" disabled={!items.length || saving} onClick={submit}>
            {saving ? "Creating…" : `Create ${items.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 더블클릭 인라인 편집 셀 (텍스트, PATCH) ---------- */
function EditableCell({
  value,
  onSave,
  multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const committed = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const changed = draft !== value;
    if (changed) onSave(draft);
    setEditing(false);
    if (changed) { setSaved(true); setTimeout(() => setSaved(false), 1300); }
  };
  const cancel = () => {
    committed.current = true;
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={`ed-cell ${multiline ? "ed-multi" : ""} ${saved ? "ed-saved" : ""}`}
        title="더블클릭하여 편집"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          committed.current = false;
          setEditing(true);
        }}
      >
        {value ? value : <span className="muted">—</span>}
        {saved && <span className="ed-saved-tag">✓ 저장됨</span>}
      </div>
    );
  }
  if (multiline) {
    // 멀티라인: Enter=줄바꿈, ⌘/Ctrl+Enter 또는 바깥클릭/Save=저장, Esc/Cancel=취소
    return (
      <div className="ed-editor" onClick={(e) => e.stopPropagation()}>
        <textarea
          className="ed-textarea"
          autoFocus
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
        />
        <div className="ed-editor-foot">
          <span className="ed-hint">Enter=줄바꿈 · ⌘Enter/바깥클릭=저장 · Esc=취소</span>
          <span className="ed-editor-btns">
            {/* onMouseDown+preventDefault → textarea blur(자동저장)보다 먼저 처리 */}
            <button className="ed-btn" onMouseDown={(e) => { e.preventDefault(); cancel(); }}>Cancel</button>
            <button className="ed-btn ed-btn-save" onMouseDown={(e) => { e.preventDefault(); commit(); }}>Save</button>
          </span>
        </div>
      </div>
    );
  }
  return (
    <input
      className="ed-input"
      autoFocus
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        else if (e.key === "Escape") cancel();
      }}
    />
  );
}

/* ---------- 커스텀필드 셀 (값=DB, PATCH 병합) ---------- */
function CustomCell({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (def.type === "checkbox") {
    return (
      <input type="checkbox" checked={!!value} onClick={stop} onChange={(e) => onChange(e.target.checked)} />
    );
  }
  // 로컬 편집 상태 → blur 시 저장(매 키 입력마다 PATCH 방지)
  return (
    <CfTextInput
      type={def.type}
      value={value === undefined ? "" : String(value)}
      onCommit={(v) => onChange(def.type === "number" ? Number(v) : v)}
      onClick={stop}
    />
  );
}

function CfTextInput({
  type,
  value,
  onCommit,
  onClick,
}: {
  type: "text" | "number";
  value: string;
  onCommit: (v: string) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      className="cf-input"
      type={type === "number" ? "number" : "text"}
      value={local}
      placeholder="—"
      onClick={onClick}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/* ---------- Fields 드롭다운 ---------- */
function FieldsMenu<T>({
  order,
  hidden,
  colMap,
  cfDefs,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onReset,
  canAdd,
  showAdd,
}: {
  order: string[];
  hidden: string[];
  colMap: Map<string, GridColumn<T>>;
  cfDefs: CustomFieldDef[];
  onToggle: (key: string) => void;
  onAddCustom: (label: string, type: CustomFieldType) => void;
  onRemoveCustom: (defId: number) => void;
  onReset: () => void;
  canAdd: boolean;
  showAdd: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const defByKey = new Map(cfDefs.map((d) => [`cf:${d.field_id}`, d]));

  return (
    <div className="fields-menu" ref={ref}>
      <button className="tb-menu" onClick={() => setOpen((o) => !o)}>Fields ▾</button>
      {open && (
        <div className="fields-dropdown">
          <div className="fd-title">Columns</div>
          <ul className="fd-list">
            {order.map((k) => {
              const col = colMap.get(k);
              if (!col) return null;
              const def = defByKey.get(k);
              return (
                <li key={k} className="fd-item">
                  <label>
                    <input type="checkbox" checked={!hidden.includes(k)} onChange={() => onToggle(k)} />
                    {col.label || "(unnamed)"}
                    {def && <span className="fd-tag">custom</span>}
                  </label>
                  {def && (
                    <button className="fd-remove" title="커스텀필드 삭제" onClick={() => onRemoveCustom(def.id)}>✕</button>
                  )}
                </li>
              );
            })}
          </ul>
          {showAdd && (
            <>
              <div className="fd-title">Add custom field (DB)</div>
              <div className="fd-add">
                <input type="text" placeholder="Field name" value={label} onChange={(e) => setLabel(e.target.value)} />
                <select value={type} onChange={(e) => setType(e.target.value as CustomFieldType)}>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="checkbox">Checkbox</option>
                </select>
                <button
                  className="add-btn"
                  disabled={!label.trim() || !canAdd}
                  onClick={() => {
                    onAddCustom(label.trim(), type);
                    setLabel("");
                  }}
                >
                  Add
                </button>
              </div>
            </>
          )}
          <button className="fd-reset" onClick={onReset}>Reset columns</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Filter 드롭다운 패널 (컬럼별 필터) ---------- */
function FilterMenu<T>({
  columns,
  rows,
  filters,
  setFilters,
}: {
  columns: GridColumn<T>[];
  rows: T[];
  filters: Record<string, string>;
  setFilters: (f: Record<string, string> | ((p: Record<string, string>) => Record<string, string>)) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filterable = columns.filter((c) => c.filterAccessor);
  const activeCount = Object.values(filters).filter((v) => v.trim()).length;

  return (
    <div className="fields-menu" ref={ref}>
      <button className={`tb-menu ${activeCount ? "active" : ""}`} onClick={() => setOpen((o) => !o)}>
        ▼ Filter{activeCount ? ` (${activeCount})` : ""}
      </button>
      {open && (
        <div className="fields-dropdown filter-dropdown">
          <div className="fd-title">Filter columns</div>
          {filterable.length === 0 && <div className="muted" style={{ fontSize: 12 }}>필터 가능한 컬럼 없음</div>}
          {filterable.map((c) => (
            <div key={c.key} className="filter-field">
              <label>{c.label}</label>
              {c.filterType === "select" ? (
                <select
                  value={filters[c.key] ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                >
                  <option value="">All</option>
                  {Array.from(new Set(rows.map((r) => c.filterAccessor!(r)).filter(Boolean)))
                    .sort()
                    .map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="contains…"
                  value={filters[c.key] ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {activeCount > 0 && (
            <button className="fd-reset" onClick={() => setFilters({})}>Clear all filters</button>
          )}
        </div>
      )}
    </div>
  );
}

function GroupRows<T>({
  group,
  grouped,
  collapsed,
  toggle,
  columns,
  colWidthOf,
  rowKey,
  selectedKey,
  onSelect,
  selectedRows,
  onToggleRow,
  onRowContext,
}: {
  group: Group<T>;
  grouped: boolean;
  collapsed: boolean;
  toggle: (k: string) => void;
  columns: GridColumn<T>[];
  colWidthOf: (c: GridColumn<T>) => number;
  rowKey: (r: T) => number;
  selectedKey: number | null;
  onSelect: (r: T) => void;
  selectedRows: Set<number>;
  onToggleRow: (id: number) => void;
  onRowContext?: (e: React.MouseEvent, r: T) => void;
}) {
  return (
    <>
      {grouped && (
        <tr className="group-head" onClick={() => toggle(group.key)}>
          <td colSpan={columns.length + 2}>
            <span className="grp-caret">{collapsed ? "▸" : "▾"}</span>
            {group.color && <span className="grp-dot" style={{ background: group.color }} />}
            <span className="grp-label">{group.label}</span>
            <span className="grp-count">{group.rows.length}</span>
          </td>
        </tr>
      )}
      {!collapsed &&
        group.rows.map((r) => {
          const k = rowKey(r);
          const checked = selectedRows.has(k);
          return (
            <tr
              key={k}
              className={`${selectedKey === k ? "row-selected" : ""} ${checked ? "row-checked" : ""}`}
              onClick={() => onSelect(r)}
              onContextMenu={onRowContext ? (e) => onRowContext(e, r) : undefined}
            >
              <td className="col-check" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={checked} onChange={() => onToggleRow(k)} />
              </td>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.edit ? (
                    <EditableCell
                      value={c.edit.get(r)}
                      multiline={c.edit.multiline}
                      onSave={(v) => c.edit!.save(r, v)}
                    />
                  ) : (
                    c.render(r, colWidthOf(c))
                  )}
                </td>
              ))}
              <td className="col-spacer" />
            </tr>
          );
        })}
    </>
  );
}
