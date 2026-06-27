/**
 * RFC4180 스타일 CSV 파서.
 * 지원: 인용 필드("..."), 필드 내 콤마/줄바꿈, 이스케이프 따옴표("" → ").
 * 반환: 행 배열(각 행은 셀 문자열 배열). 완전 빈 행은 제거.
 *
 * 예) `code,description\nSH010,"Opening, wide"` →
 *     [["code","description"],["SH010","Opening, wide"]]
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          // 이스케이프된 따옴표
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      // CRLF/CR 모두 줄바꿈으로 통일 (다음 \n 은 아래에서 흡수)
      endRow();
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }
    if (c === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  // 마지막 필드/행 마무리 (파일 끝에 줄바꿈이 없을 때)
  if (field !== "" || row.length > 0) endRow();

  // 완전히 빈 행(모든 셀이 공백) 제거
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}
