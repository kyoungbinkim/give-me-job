import { emitKeypressEvents } from "node:readline";
import { executeAction } from "./workspace-service.mjs";
import { operations, actionInput } from "./dashboard-assets/actions.mjs";

const MENU = [
  ["오늘", ["digest"]],
  ["공고", ["jobs.list", "jobs.import", "jobs.refresh", "jobs.rank"]],
  ["지원서류", ["application.prepare", "application.validate", "file.read"]],
  ["전형", ["tracker.list", "tracker.update"]],
  ["설정·AI", ["profile.show", "profile.set", "request"]],
];

const HELP = {
  digest: "마감·재검토·예정 일정을 한번에 확인합니다.",
  "jobs.list": "등록한 공고를 검색하고 마감일순으로 봅니다.",
  "jobs.import": "JD 본문, URL 목록, CSV를 작업공간에 등록합니다.",
  "jobs.refresh": "등록한 공개 URL의 변경과 마감 상태를 다시 확인합니다.",
  "jobs.rank": "희망 조건과 분석 상태로 지원 우선순위를 봅니다.",
  "application.prepare": "공고와 선택 직무를 연결한 지원 패키지를 준비합니다.",
  "application.validate": "구조 또는 제출 준비 상태를 검사합니다.",
  "file.read": "작업공간 안의 Markdown·JSON 자료를 읽습니다.",
  "tracker.list": "지원별 현재 전형과 일정을 확인합니다.",
  "tracker.update": "사용자가 확인한 제출·결과와 일정을 기록합니다.",
  "profile.show": "희망 직무·지역·고용 형태와 제외 조건을 봅니다.",
  "profile.set": "공고 정렬과 조건 판정에 쓸 희망 조건을 바꿉니다.",
  request: "기존 에이전트에서 실행할 근거 기반 AI 작업 프롬프트를 만듭니다.",
};

const VALUE_LABELS = {
  deadline: "마감일순", updated: "최근 확인순", company: "회사명순",
  text: "JD 본문", urls: "URL 목록", csv: "CSV",
  ready: "준비 완료", structure: "구조",
  active: "진행 중", submitted: "제출", passed: "합격", rejected: "불합격", withdrawn: "지원 철회",
  assess: "지원 판단", draft: "초안 작성", review: "HR 검토", interview: "면접 준비",
  "mock-interview": "모의면접", debrief: "면접 복기",
};

function clusterWidth(cluster) {
  if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(cluster)) return 2;
  let width = 0;
  for (const char of cluster) {
    const code = char.codePointAt(0);
    if (/\p{Mark}/u.test(char) || code === 0x200d || code === 0xfe0e || code === 0xfe0f) continue;
    width += code >= 0x1100 && (code <= 0x115f || code >= 0x2329 && code <= 0xa4cf || code >= 0xac00 && code <= 0xd7a3 || code >= 0xf900 && code <= 0xfaff || code >= 0xfe10 && code <= 0xfe6f || code >= 0xff01 && code <= 0xff60) ? 2 : 1;
  }
  return width;
}

function visibleWidth(value) {
  let width = 0;
  for (const { segment } of new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(String(value))) width += clusterWidth(segment);
  return width;
}

export function terminalLines(value, columns = 80) {
  const clean = String(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
  const lines = [];
  const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
  for (const source of clean.split("\n")) {
    let line = ""; let width = 0;
    for (const { segment: char } of segmenter.segment(source.replace(/\t/g, "    "))) {
      const size = clusterWidth(char);
      if (width + size > columns && line) { lines.push(line); line = ""; width = 0; }
      line += char; width += size;
    }
    lines.push(line);
  }
  return lines;
}

function fit(value, width) {
  const line = terminalLines(value, width)[0] ?? "";
  return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

function scalar(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
}

function rows(items, empty, render) {
  if (!items?.length) return [empty];
  return items.flatMap((item, index) => render(item, index));
}

export function formatTuiResult(action, result) {
  if (action === "file.read") return [result.path, "", ...String(result.content).split("\n")];
  if (action === "digest") {
    const sections = [
      ["신규 공고", result.newJobs, (item) => `${item.company || "회사 미확인"} · ${item.title || item.role || "직무 미확인"}`],
      ["마감 임박", result.deadlines, (item) => `${item.deadline} · ${item.company} · ${item.title}`],
      ["재검토", result.reviewRequired, (item) => `${item.packagePath} · ${item.state?.status ?? "상태 미확인"}`],
      ["예정 전형", result.upcomingStages, (item) => `${item.at} · ${item.title}`],
    ];
    return sections.flatMap(([title, items, render]) => [`${title} ${items.length}건`, ...rows(items, "  없음", (item) => [`  ${render(item)}`]), ""]);
  }
  if (["jobs.list", "jobs.rank"].includes(action)) return rows(result, "등록된 공고가 없습니다. '공고 등록'에서 URL·JD·CSV를 추가하세요.", (job) => [
    `${job.availability === "closed" ? "[종료]" : job.availability === "unverifiable" ? "[확인 필요]" : "[공고]"} ${job.company || "회사 미확인"} · ${job.title || job.role || "직무 미확인"}`,
    `  ${[job.location, job.employmentType, job.deadline && `마감 ${job.deadline}`].filter(Boolean).join(" · ") || "세부 정보 미확인"}`,
    `  ID ${job.id}${job.recommendation ? ` · ${job.recommendation}` : ""}`,
  ]);
  if (action === "tracker.list") return rows(result, "기록된 전형이 없습니다.", (item) => [
    `[${item.status}] ${item.applicationId}`,
    `  ${item.stage} · 일정 ${(item.events ?? []).length}건 · 최종 기록 ${item.updatedAt ?? "-"}`,
  ]);
  if (action === "jobs.import") return [
    `결과 · 신규 ${result.counts.new} / 갱신 ${result.counts.updated} / 중복 ${result.counts.duplicate} / 확인 ${result.counts["needs-confirmation"]} / 실패 ${result.counts.failed} / 마감 삭제 ${result.expiredRemoved?.length ?? 0}`,
    "", ...rows(result.results, "처리할 항목이 없습니다.", (item) => [`${item.row}행 · ${item.status}${item.jobId ? ` · ${item.jobId}` : ""}${item.message ? ` · ${item.message}` : ""}`]),
  ];
  if (action === "jobs.refresh") return [`마감 삭제 ${result.expiredRemoved?.length ?? 0}건`, "", ...rows(result.results, "재확인할 공개 URL이 없습니다.", (item) => [`${item.status} · ${item.jobId} · ${item.availability}${item.message ? ` · ${item.message}` : ""}`])];
  if (action.startsWith("profile.")) return ["희망 직무  " + scalar(result.roles), "희망 지역  " + scalar(result.locations), "고용 형태  " + scalar(result.employmentTypes), "제외 조건  " + scalar(result.excludedKeywords)];
  if (action === "request") return [`${result.task} · ${result.status}`, "", result.prompt, "", `입력 자료  ${scalar(result.inputs?.sources)}`];
  if (Array.isArray(result)) return rows(result, "결과가 없습니다.", (item) => [Object.entries(item).map(([key, value]) => `${key}: ${scalar(value)}`).join(" · ")]);
  return Object.entries(result ?? {}).flatMap(([key, value]) => typeof value === "object" && value !== null ? [`${key}`, ...terminalLines(JSON.stringify(value, null, 2), 100).map((line) => `  ${line}`)] : [`${key}  ${scalar(value)}`]);
}

function initialValues(operation) {
  return Object.fromEntries(operation.fields.map(([name, , type, options]) => [name, type === "select" ? options[0] : type === "json" ? options : type === "checkbox" ? false : ""]));
}

function formValue(field, values) {
  const [name, , type] = field;
  const value = values[name];
  if (type === "checkbox") return value ? "[✓]" : "[ ]";
  if (type === "select") return VALUE_LABELS[value] ?? scalar(value);
  if (value === "") return "입력 없음";
  const shown = scalar(value).replaceAll("\n", " ");
  return shown.length > 48 ? shown.slice(0, 47) + "…" : shown;
}

export async function runTui(workspace, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    output.write("TUI에는 대화형 터미널이 필요합니다. give-me-job digest 또는 jobs list --format json을 사용하세요.\n");
    return;
  }
  let selected = 0; let mode = "menu"; let fieldIndex = 0; let buffer = ""; let values = {}; let resultLines = []; let offset = 0; let busy = false; let error = "";
  let summary;
  try { summary = await executeAction(workspace, "digest", {}); } catch { summary = null; }
  const color = !process.env.NO_COLOR && typeof output.getColorDepth === "function" && output.getColorDepth() > 1;
  const operation = () => operations[selected];
  const summaryText = () => summary ? `공고 ${summary.newJobs.length}  ·  재검토 ${summary.reviewRequired.length}  ·  예정 ${summary.upcomingStages.length}` : "작업공간 상태를 불러오지 못했습니다";
  const menuLines = () => MENU.flatMap(([group, actions]) => [group, ...actions.map((action) => {
    const index = operations.findIndex((item) => item.action === action);
    const marker = selected === index ? color ? "▸" : ">" : " ";
    return `${marker} ${operations[index].label}`;
  })]);
  const formLines = () => operation().fields.flatMap((field, index) => {
    const active = index === fieldIndex;
    return [`${active ? color ? "▸" : ">" : " "} ${field[1]}`, `  ${formValue(field, values)}`];
  });
  const bodyLines = (bodyHeight, width) => {
    if (mode === "result") {
      const wrapped = resultLines.flatMap((line) => terminalLines(line, width));
      offset = Math.min(offset, Math.max(0, wrapped.length - bodyHeight));
      return wrapped.slice(offset, offset + bodyHeight);
    }
    if (mode === "edit") return [operation().label, "", `${operation().fields[fieldIndex][1]} 입력 중`, ...terminalLines(buffer || "입력하세요…", width), "", operation().fields[fieldIndex][2] === "textarea" ? "Alt+Enter 줄바꿈 · Enter 저장 · Esc 취소" : "Enter 저장 · Esc 취소"];
    const nav = mode === "menu" ? menuLines() : formLines();
    const activeLine = nav.findIndex((line) => /^[▸>]/.test(line));
    const navStart = activeLine < bodyHeight ? 0 : activeLine - bodyHeight + 2;
    const visibleNav = nav.slice(navStart, navStart + bodyHeight);
    const detail = mode === "menu"
      ? [operation().label, "", ...terminalLines(HELP[operation().action], Math.max(20, width - 34)), "", operation().fields.length ? `입력 ${operation().fields.length}개` : "Enter로 바로 실행"]
      : [operation().label, "", ...terminalLines(HELP[operation().action], Math.max(20, width - 34)), "", error, "", "s를 눌러 실행"];
    if (width < 72) {
      const compactDetail = detail.filter(Boolean);
      const detailHeight = Math.min(compactDetail.length, Math.max(2, Math.floor(bodyHeight / 3)));
      const navHeight = Math.max(1, bodyHeight - detailHeight);
      const compactStart = activeLine < navHeight ? 0 : activeLine - navHeight + 1;
      return [...nav.slice(compactStart, compactStart + navHeight), ...compactDetail.slice(0, detailHeight)];
    }
    const leftWidth = 28; const rightWidth = width - leftWidth - 3;
    const left = visibleNav; const right = detail.flatMap((line) => terminalLines(line, rightWidth)).slice(0, bodyHeight);
    return Array.from({ length: Math.min(bodyHeight, Math.max(left.length, right.length)) }, (_, index) => `${fit(left[index] ?? "", leftWidth)} | ${right[index] ?? ""}`);
  };
  const wasRaw = Boolean(input.isRaw);
  const render = () => {
    const width = Math.max(10, (output.columns || 80) - 1);
    const footer = busy ? "처리 중…" : mode === "menu" ? "↑↓ 이동 · Enter 선택 · q 종료" : mode === "form" ? "↑↓ 항목 · ←→ 선택 · Space 토글 · Enter 편집 · s 실행 · Esc 뒤로" : mode === "edit" ? "Enter 저장 · Esc 취소" : "↑↓ 스크롤 · Enter/Esc 뒤로 · q 종료";
    const footerLines = terminalLines(footer, width);
    const height = Math.max(1, (output.rows || 24) - 5 - footerLines.length);
    const lines = ["give-me-job · 지원 작업공간", summaryText(), "-".repeat(width), ...bodyLines(height, width), "-".repeat(width), ...footerLines]
      .slice(0, (output.rows || 24) - 1);
    const styled = color ? lines.map((line, index) => {
      if (index === 0) return `\x1b[1;34m${line}\x1b[0m`;
      if (/^▸/.test(line)) return `\x1b[1;7m${line}\x1b[0m`;
      if (MENU.some(([group]) => line.trim() === group)) return `\x1b[2m${line}\x1b[0m`;
      if (line.startsWith("오류")) return `\x1b[31m${line}\x1b[0m`;
      return line;
    }) : lines;
    output.write(`\x1b[2J\x1b[H${styled.join("\n")}\n`);
  };
  await new Promise((resolve) => {
    const cleanup = () => { input.off("keypress", onKey); input.off("end", cleanup); output.off("resize", render); input.setRawMode(wasRaw); input.pause(); output.write("\x1b[?25h\n"); resolve(); };
    const execute = async () => {
      busy = true; render();
      try {
        const action = operation().action;
        resultLines = formatTuiResult(action, await executeAction(workspace, action, actionInput(operation(), values)));
        summary = await executeAction(workspace, "digest", {});
      } catch (caught) { resultLines = [`오류 · ${caught.message}`]; }
      busy = false; mode = "result"; offset = 0; render();
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === "c") { cleanup(); return; }
      if (busy) return;
      if (key.name === "escape") {
        if (mode === "edit") { mode = "form"; buffer = ""; }
        else if (mode === "menu") { cleanup(); return; }
        else mode = "menu";
        render(); return;
      }
      if (["menu", "result"].includes(mode) && text === "q") { cleanup(); return; }
      if (mode === "menu") {
        if (key.name === "up") selected = (selected + operations.length - 1) % operations.length;
        if (key.name === "down") selected = (selected + 1) % operations.length;
        if (key.name === "return") { values = initialValues(operation()); fieldIndex = 0; buffer = ""; error = ""; if (operation().fields.length) mode = "form"; else { execute(); return; } }
      } else if (mode === "form") {
        const [name, , type, options] = operation().fields[fieldIndex];
        if (key.name === "up") fieldIndex = (fieldIndex + operation().fields.length - 1) % operation().fields.length;
        else if (key.name === "down") fieldIndex = (fieldIndex + 1) % operation().fields.length;
        else if (["left", "right"].includes(key.name) && type === "select") {
          const step = key.name === "right" ? 1 : -1; const index = options.indexOf(values[name]);
          values[name] = options[(index + step + options.length) % options.length];
        } else if (key.name === "space" && type === "checkbox") values[name] = !values[name];
        else if (key.name === "return" && type === "select") values[name] = options[(options.indexOf(values[name]) + 1) % options.length];
        else if (key.name === "return" && type === "checkbox") values[name] = !values[name];
        else if (key.name === "return") { buffer = String(values[name] ?? ""); mode = "edit"; }
        else if (text === "s") {
          try { actionInput(operation(), values); error = ""; execute(); return; }
          catch (caught) { error = caught.message; }
        }
      } else if (mode === "edit") {
        if (key.name === "backspace") buffer = [...buffer].slice(0, -1).join("");
        else if (key.name === "return" && key.meta) buffer += "\n";
        else if (key.name === "return") { values[operation().fields[fieldIndex][0]] = buffer; buffer = ""; mode = "form"; }
        else if (text && !key.ctrl && !key.meta) buffer += text;
      } else {
        if (key.name === "down") {
          const width = Math.max(10, (output.columns || 80) - 1);
          const wrapped = resultLines.flatMap((line) => terminalLines(line, width));
          const height = Math.max(4, (output.rows || 24) - 6);
          offset = Math.min(offset + 1, Math.max(0, wrapped.length - height));
        }
        if (key.name === "up") offset = Math.max(0, offset - 1);
        if (key.name === "return") mode = "menu";
      }
      render();
    };
    emitKeypressEvents(input); input.setRawMode(true); input.resume(); input.on("keypress", onKey); input.on("end", cleanup); output.on("resize", render); output.write("\x1b[?25l"); render();
  });
}
