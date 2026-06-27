import { useEffect, useState } from "react";

/**
 * 전역 Inbox 읽음 추적 (유저별 localStorage).
 * 협업 결론(Gemini): 프로토타입엔 백엔드 스키마 변경 없이 last-read 타임스탬프가 가장 가볍고 충분.
 * (GPT-5.5 의 Notification 테이블이 가장 충실하나 SQLite 마이그레이션 비용 회피.)
 * 값은 "마지막으로 읽음 처리한 시점의 최신 이벤트 시각(ms)" — 이벤트 시각끼리 비교하므로
 * 타임존 파싱 편차에 영향받지 않음.
 */
const KEY = "fptr.inbox.lastReadMs";

export function getLastReadMs(): number {
  const v = localStorage.getItem(KEY);
  return v ? Number(v) : 0;
}

export function markRead(ms: number) {
  localStorage.setItem(KEY, String(ms));
  window.dispatchEvent(new Event("inbox-read"));
}

/** lastReadMs 를 구독 (다른 컴포넌트의 markRead / 다른 탭의 storage 변화에 반응) */
export function useLastReadMs(): number {
  const [v, setV] = useState(getLastReadMs);
  useEffect(() => {
    const on = () => setV(getLastReadMs());
    window.addEventListener("inbox-read", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("inbox-read", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}

export const eventMs = (iso: string) => new Date(iso).getTime();
