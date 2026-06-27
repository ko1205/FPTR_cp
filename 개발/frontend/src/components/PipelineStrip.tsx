import type { PipelineItem, Step } from "../api/types";

/**
 * 파이프라인 스텝 상태 스트립 (step 정렬) — 원본 FPTR 시그니처 요소.
 *
 * 협업 결론(Gemini/GPT-5.5 합의): 가변 길이 strip 은 같은 위치가 행마다 다른 공정을
 * 의미해 스캔 불가 → **표준 step 순서로 고정 슬롯**을 만들고, 그 샷에 해당 task 가 있으면
 * 상태색으로, 없으면 빈 슬롯으로 표시한다. (step code 로 매칭)
 *
 * 이렇게 하면 샷마다 task 수가 달라도(예: FX 없음) 같은 'FX' 열을 세로로 스캔할 수 있고,
 * 빈 슬롯으로 "그 공정이 없음"이 한눈에 보인다.
 */
export function PipelineStrip({
  pipeline,
  steps,
  size = "md",
}: {
  pipeline: PipelineItem[];
  steps: Step[]; // 표준 step 순서 (해당 엔티티 타입)
  size?: "md" | "sm";
}) {
  const byCode = new Map(pipeline.map((p) => [p.step_code, p]));
  return (
    <span className={`pipe-strip pipe-${size}`}>
      {steps.map((st) => {
        const task = byCode.get(st.code);
        if (!task) {
          return (
            <span
              key={st.code}
              className="pipe-cell pipe-empty"
              title={`${st.name} · (없음)`}
            />
          );
        }
        return (
          <span
            key={st.code}
            className="pipe-cell"
            style={{ backgroundColor: task.status_color }}
            title={`${task.step_name} · ${task.status_name}`}
          >
            <span className="pipe-code">{st.code}</span>
          </span>
        );
      })}
    </span>
  );
}

/** 파이프라인 컬럼의 적정 px 너비 (step 수 기준) */
export function pipelineWidth(stepCount: number, size: "md" | "sm" = "md"): number {
  const cell = size === "sm" ? 24 : 32; // 셀폭 + gap
  return Math.max(60, stepCount * cell + 16);
}
