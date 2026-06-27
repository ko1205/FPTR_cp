import { useCallback, useEffect, useState } from "react";

/**
 * 그리드 뷰 설정 — 컬럼 순서/숨김만 localStorage 에 저장(엔티티 타입별).
 *
 * 설계 메모(에이전트 협업 결론):
 * - Gemini/GPT-5.5 둘 다 "뷰설정(순서/숨김)은 localStorage, 커스텀필드 스키마/값은 DB"
 *   로 권고. 그에 따라 커스텀필드는 API(custom_fields)로 분리하고, 여기서는
 *   순수 UI 선호(순서/숨김)만 클라이언트에 저장한다.
 * - 재배치는 moveColumn(from,to) 로 추상화 → 추후 dnd-kit 으로 교체 용이.
 */

export type CustomFieldType = "text" | "number" | "checkbox";

export interface ViewConfig {
  order: string[]; // 컬럼 key 순서 (기본 컬럼 key + `cf:<field_id>`)
  hidden: string[]; // 숨긴 컬럼 key
  widths: Record<string, number>; // 컬럼별 px 너비 (사용자 리사이즈)
}

const VIEW_PREFIX = "fptr.grid.";

function loadView(entityKey: string): ViewConfig {
  try {
    const raw = localStorage.getItem(VIEW_PREFIX + entityKey);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { order: [], hidden: [], widths: {} };
}

function saveView(entityKey: string, cfg: ViewConfig) {
  localStorage.setItem(VIEW_PREFIX + entityKey, JSON.stringify(cfg));
}

/** 현재 유효한 컬럼 key 목록과 동기화 (새 컬럼 append, 사라진 컬럼 제거) */
function normalize(cfg: ViewConfig, allKeys: string[]): ViewConfig {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const k of cfg.order) {
    if (allKeys.includes(k) && !seen.has(k)) {
      order.push(k);
      seen.add(k);
    }
  }
  for (const k of allKeys) if (!seen.has(k)) order.push(k);
  const hidden = cfg.hidden.filter((k) => allKeys.includes(k));
  const widths: Record<string, number> = {};
  for (const k of allKeys) if (cfg.widths?.[k]) widths[k] = cfg.widths[k];
  return { order, hidden, widths };
}

export function useGridView(entityKey: string, allKeys: string[]) {
  const [cfg, setCfg] = useState<ViewConfig>(() => normalize(loadView(entityKey), allKeys));

  // 유효 key 변경 시 정규화
  useEffect(() => {
    setCfg((c) => normalize(c, allKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKeys.join("|")]);

  const persist = useCallback(
    (next: ViewConfig) => {
      const norm = normalize(next, allKeys);
      saveView(entityKey, norm);
      return norm;
    },
    [entityKey, allKeys]
  );

  const moveColumn = useCallback(
    (fromKey: string, toKey: string) => {
      setCfg((c) => {
        const order = [...c.order];
        const fi = order.indexOf(fromKey);
        const ti = order.indexOf(toKey);
        if (fi < 0 || ti < 0 || fi === ti) return c;
        order.splice(fi, 1);
        order.splice(ti, 0, fromKey);
        return persist({ ...c, order });
      });
    },
    [persist]
  );

  const toggleHidden = useCallback(
    (key: string) => {
      setCfg((c) => {
        const hidden = c.hidden.includes(key)
          ? c.hidden.filter((k) => k !== key)
          : [...c.hidden, key];
        return persist({ ...c, hidden });
      });
    },
    [persist]
  );

  const setWidth = useCallback(
    (key: string, width: number) => {
      setCfg((c) => persist({ ...c, widths: { ...c.widths, [key]: Math.max(56, Math.round(width)) } }));
    },
    [persist]
  );

  const resetView = useCallback(() => {
    setCfg(persist({ order: [], hidden: [], widths: {} }));
  }, [persist]);

  return { cfg, moveColumn, toggleHidden, setWidth, resetView };
}
