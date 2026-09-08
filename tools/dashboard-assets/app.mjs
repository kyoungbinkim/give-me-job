import { operations, actionInput } from "./actions.mjs";

const navigation = document.querySelector("#navigation");
const form = document.querySelector("#action-form");
const results = document.querySelector("#results");
const status = document.querySelector("#status");
let selected = operations[0];
let busy = false;
const labels = { id: "ID", jobId: "공고 ID", applicationId: "지원 ID", company: "회사", role: "직무", title: "제목", deadline: "마감", status: "상태", stage: "전형 단계", packagePath: "패키지", changes: "변경 사항", changedJobs: "변경된 공고", newJobs: "신규 공고", deadlines: "마감 임박", reviewRequired: "재검토 필요", upcomingStages: "다가오는 전형", confirmedResults: "확인된 결과", recurringImprovements: "반복 개선점", duplicateCandidates: "중복 후보", blockers: "차단 사유", warnings: "경고", nextAction: "다음 작업", prompt: "실행 프롬프트", jobs: "공고", events: "일정", source: "출처", updatedAt: "최근 변경", body: "원문", content: "내용", ready: "준비 완료", result: "결과 분석", results: "결과 분석", passed: "합격", rejected: "불합격", withdrawn: "지원 철회", confirmed: "사용자 확인", requirements: "지원 조건", evidence: "경험 근거", eligibility: "지원 자격", preparation: "서류 준비", items: "항목" };

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const emptyGuidance = { newJobs: "공고 등록에서 CSV, URL 목록 또는 JD 본문을 추가하세요.", changedJobs: "관심 공고를 재확인하면 변경 내용이 표시됩니다.", deadlines: "마감 임박 공고가 없습니다.", reviewRequired: "패키지를 준비하면 검토 상태가 표시됩니다.", upcomingStages: "전형 기록에서 일정을 추가하세요.", recurringImprovements: "확인된 면접 복기에서 반복된 개선점이 없습니다." };

function renderValue(value, depth = 0, field = "") {
  if (value === null || value === undefined || value === "") return element("span", "미등록");
  if (typeof value !== "object") return element("pre", typeof value === "boolean" ? (value ? "예" : "아니오") : String(value));
  if (Array.isArray(value)) {
    const list = element("div");
    if (!value.length) list.append(element("p", emptyGuidance[field] || "표시할 항목이 없습니다."));
    for (const [index, item] of value.entries()) {
      const detail = element("details");
      detail.append(element("summary", typeof item === "object" && item ? [item.company, item.title || item.role || item.stage || item.id].filter(Boolean).join(" · ") || `항목 ${index + 1}` : String(item)));
      detail.append(renderValue(item, depth + 1));
      if (item && typeof item === "object" && (item.id || item.jobId) && selected.action.startsWith("jobs.")) {
        const actions = element("div", undefined, "actions");
        for (const [action, text] of [["application.prepare", "이 공고로 준비"], ["request", "상세 평가 요청"]]) {
          const button = element("button", text); button.type = "button";
          button.addEventListener("click", () => choose(operations.find((op) => op.action === action), { jobId: item.jobId || item.id, role: item.role || "" }));
          actions.append(button);
        }
        detail.append(actions);
      }
      list.append(detail);
    }
    return list;
  }
  const list = element("dl");
  for (const [key, item] of Object.entries(value)) {
    const row = element("div");
    row.append(element("dt", labels[key] || key));
    const content = element("dd"); content.append(depth > 8 ? element("pre", JSON.stringify(item, null, 2)) : renderValue(item, depth + 1, key)); row.append(content); list.append(row);
  }
  return list;
}

async function execute() {
  if (busy) return;
  busy = true;
  status.className = ""; status.textContent = "불러오는 중…";
  const values = {};
  for (const [key, , type] of selected.fields) {
    const control = form.elements.namedItem(key);
    values[key] = type === "checkbox" ? control.checked : control.value;
  }
  document.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json", "X-Give-Me-Job": "workspace" }, body: JSON.stringify({ action: selected.action, input: actionInput(selected, values) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "작업에 실패했습니다.");
    results.replaceChildren(renderValue(data.result));
    status.textContent = selected.action === "request" ? "프롬프트가 준비되었습니다. 기존 에이전트에서 실행한 뒤 새로고침하세요." : "저장된 정보를 불러왔습니다.";
  } catch (error) { status.textContent = error.message; status.className = "error"; }
  finally { busy = false; document.querySelectorAll("button").forEach((button) => { button.disabled = false; }); }
}

function choose(operation, values = {}) {
  if (busy) return;
  selected = operation;
  document.querySelector("#title").textContent = operation.label;
  document.title = `${operation.label} · give-me-job`;
  navigation.querySelectorAll("button").forEach((button) => { if (button.dataset.action === operation.action) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
  form.replaceChildren(); results.replaceChildren(); status.textContent = "";
  for (const [key, label, type, options] of operation.fields) {
    const wrapper = element("label", label, ["textarea", "json"].includes(type) ? "wide" : type === "checkbox" ? "check" : "");
    const input = element(type === "select" ? "select" : ["textarea", "json"].includes(type) ? "textarea" : "input");
    input.name = key;
    if (type === "checkbox") input.type = "checkbox";
    if (type === "select") for (const option of options) { const choice = element("option", option); choice.value = option; input.append(choice); }
    if (type === "json") input.value = options;
    if (values[key] !== undefined) input.value = values[key];
    wrapper.append(input); form.append(wrapper);
  }
  if (operation.fields.length) { const submit = element("button", operation.label, "primary"); submit.type = "submit"; form.append(submit); }
  else execute();
}

for (const operation of operations) {
  const button = element("button", operation.label); button.type = "button"; button.dataset.action = operation.action;
  button.addEventListener("click", () => choose(operation)); navigation.append(button);
}
form.addEventListener("submit", (event) => { event.preventDefault(); execute(); });
document.querySelector("#reload").addEventListener("click", () => {
  if (["digest", "jobs.list", "jobs.rank", "profile.show", "tracker.list", "application.validate", "file.read"].includes(selected.action)) execute();
  else choose(operations[0]);
});
choose(selected);
