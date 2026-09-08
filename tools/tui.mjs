import { emitKeypressEvents } from "node:readline";
import { executeAction } from "./workspace-service.mjs";
import { operations, actionInput } from "./dashboard-assets/actions.mjs";

export function terminalLines(value, columns = 80) {
  const clean = String(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
  const lines = [];
  const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
  const clusterWidth = (cluster) => {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(cluster)) return 2;
    let width = 0;
    for (const char of cluster) {
      const code = char.codePointAt(0);
      if (/\p{Mark}/u.test(char) || code === 0x200d || code === 0xfe0e || code === 0xfe0f) continue;
      width += code >= 0x1100 && (code <= 0x115f || code >= 0x2329 && code <= 0xa4cf || code >= 0xac00 && code <= 0xd7a3 || code >= 0xf900 && code <= 0xfaff || code >= 0xfe10 && code <= 0xfe6f || code >= 0xff01 && code <= 0xff60) ? 2 : 1;
    }
    return width;
  };
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

export async function runTui(workspace, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    output.write("TUI에는 대화형 터미널이 필요합니다. give-me-job digest 또는 jobs list --format json을 사용하세요.\n");
    return;
  }
  let selected = 0; let mode = "menu"; let fieldIndex = 0; let buffer = ""; let values = {}; let result = ""; let offset = 0; let busy = false;
  const wasRaw = Boolean(input.isRaw);
  const render = () => {
    const width = Math.max(10, (output.columns || 80) - 1);
    const height = Math.max(4, (output.rows || 24) - 4);
    let lines = ["give-me-job · 지원 작업공간", "↑↓ 탐색 · Enter 선택 · Esc 뒤로 · q 종료"];
    if (mode === "menu") lines.push(...operations.map((op, index) => `${selected === index ? ">" : " "} ${op.label}`));
    if (mode === "form") {
      const [key, label, type, options] = operations[selected].fields[fieldIndex];
      lines.push(operations[selected].label, `${label}${type === "checkbox" ? " (yes/no)" : type === "select" ? ` (${options.join(" / ")})` : ""}`, type === "textarea" ? "여러 줄: Alt+Enter 줄바꿈, Enter 완료" : "Enter 입력 완료", buffer || (type === "json" ? options : ""));
    }
    if (mode === "result") lines.push(...terminalLines(result, width).slice(offset, offset + height));
    if (busy) lines.push("처리 중…");
    output.write(`\x1b[2J\x1b[H${lines.flatMap((line) => terminalLines(line, width)).join("\n")}\n`);
  };
  await new Promise((resolve) => {
    const cleanup = () => { input.off("keypress", onKey); input.off("end", cleanup); output.off("resize", render); input.setRawMode(wasRaw); input.pause(); output.write("\x1b[?25h\n"); resolve(); };
    const execute = async () => {
      busy = true; render();
      try { result = JSON.stringify(await executeAction(workspace, operations[selected].action, actionInput(operations[selected], values)), null, 2); }
      catch (error) { result = `오류: ${error.message}`; }
      busy = false; mode = "result"; offset = 0; render();
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === "c") { cleanup(); return; }
      if (busy) return;
      if (key.name === "escape") { mode = "menu"; render(); return; }
      if (mode !== "form" && text === "q") { cleanup(); return; }
      if (mode === "menu") {
        if (key.name === "up") selected = (selected + operations.length - 1) % operations.length;
        if (key.name === "down") selected = (selected + 1) % operations.length;
        if (key.name === "return") { values = {}; fieldIndex = 0; buffer = ""; if (operations[selected].fields.length) mode = "form"; else { execute(); return; } }
      } else if (mode === "form") {
        if (key.name === "backspace") buffer = [...buffer].slice(0, -1).join("");
        else if (key.name === "return" && key.meta) buffer += "\n";
        else if (key.name === "return") {
          const [name, , type, options] = operations[selected].fields[fieldIndex];
          values[name] = buffer || (type === "select" ? options[0] : type === "json" ? options : "");
          fieldIndex += 1; buffer = "";
          if (fieldIndex === operations[selected].fields.length) { execute(); return; }
        } else if (text && !key.ctrl && !key.meta) buffer += text;
      } else {
        if (key.name === "down") offset = Math.min(offset + 1, Math.max(0, terminalLines(result, Math.max(10, (output.columns || 80) - 1)).length - 1));
        if (key.name === "up") offset = Math.max(0, offset - 1);
        if (key.name === "return") mode = "menu";
      }
      render();
    };
    emitKeypressEvents(input); input.setRawMode(true); input.resume(); input.on("keypress", onKey); input.on("end", cleanup); output.on("resize", render); output.write("\x1b[?25l"); render();
  });
}
