export const operations = [
  { action: "digest", label: "오늘의 작업", fields: [] },
  { action: "jobs.list", label: "공고 목록", fields: [["query", "회사·직무 검색"], ["sort", "정렬", "select", ["deadline", "updated", "company"]]] },
  { action: "jobs.import", label: "공고 등록", fields: [["kind", "입력 형식", "select", ["urls", "text", "csv"]], ["input", "URL 목록 · JD 본문 · CSV", "textarea"], ["metadata", "공고 정보", "json", '{"company":"", "role":"", "title":"", "url":""}'], ["encoding", "문자 인코딩", "select", ["utf-8", "euc-kr"]], ["mapping", "CSV 열 매핑", "json", "{}"]] },
  { action: "jobs.refresh", label: "관심 공고 재확인", fields: [] },
  { action: "jobs.rank", label: "지원 우선순위", fields: [] },
  { action: "application.prepare", label: "패키지 준비", fields: [["jobId", "공고 ID"], ["role", "선택한 지원 직무"]] },
  { action: "application.validate", label: "패키지 검사", fields: [["packagePath", "패키지 경로"], ["mode", "검사 단계", "select", ["ready", "structure"]]] },
  { action: "file.read", label: "자료 보기", fields: [["path", "작업공간 내 자료 경로"]] },
  { action: "tracker.list", label: "전형 현황", fields: [] },
  { action: "tracker.update", label: "전형 기록", fields: [["applicationId", "지원 ID"], ["stage", "전형 단계"], ["status", "상태", "select", ["active", "submitted", "passed", "rejected", "withdrawn"]], ["confirmed", "사용자가 제출 또는 결과를 확인함", "checkbox"], ["note", "메모", "textarea"], ["events", "일정 (종류 · 제목 · 날짜/시간)", "json", "[]"]] },
  { action: "profile.show", label: "희망 조건", fields: [] },
  { action: "profile.set", label: "희망 조건 수정", fields: [["roles", "희망 직무 (쉼표 구분)", "list"], ["locations", "희망 지역 (쉼표 구분)", "list"], ["employmentTypes", "고용 형태 (쉼표 구분)", "list"], ["exclude", "제외 조건 (쉼표 구분)", "list"]] },
  { action: "request", label: "AI 작업 준비", fields: [["task", "작업", "select", ["assess", "draft", "review", "interview", "mock-interview", "debrief"]], ["jobId", "공고 ID"], ["packagePath", "패키지 경로"]] },
];

export function actionInput(operation, values) {
  const input = {};
  for (const [key, , type] of operation.fields) {
    const value = values[key];
    if (type === "checkbox") input[key] = value === true || value === "yes" || value === "y";
    else if (type === "json") input[key] = JSON.parse(value || (key === "events" ? "[]" : "{}"));
    else if (type === "list") input[key] = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
    else if (value !== undefined && value !== "") input[key] = value;
  }
  if (operation.action === "tracker.update") input.source = "user";
  return input;
}
