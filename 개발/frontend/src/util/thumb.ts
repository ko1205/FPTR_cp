import type { CSSProperties } from "react";

/**
 * thumbnail 필드는 이미지 경로(/static/...) 또는 색상 hex(#rrggbb) 둘 다 올 수 있다.
 * 경로면 background-image, 색상이면 background-color 로 렌더한다.
 */
export function thumbStyle(t: string | null | undefined): CSSProperties {
  if (t && (t.startsWith("/") || t.startsWith("http"))) {
    return {
      backgroundImage: `url(${t})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: "#1a1a1a",
    };
  }
  return { backgroundColor: t || "#333" };
}
