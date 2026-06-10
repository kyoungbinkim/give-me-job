import { readFile } from "node:fs/promises";
import { cleanText, normalizeJob } from "../normalize-job.mjs";

function tagValue(text, tag) {
  const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return cleanText(match?.[1]?.replace(/<[^>]+>/g, " ") ?? "");
}

function itemBlocks(xml) {
  const blocks = [...xml.matchAll(/<(item|job|채용정보)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  if (blocks.length > 0) return blocks;
  return [...xml.matchAll(/<detailempwanted(?:\s[^>]*)?>([\s\S]*?)<\/detailempwanted>/gi)].map((match) => match[1]);
}

export function normalizeWork24Xml(xml) {
  return itemBlocks(xml).map((block) =>
    normalizeJob({
      source: "work24",
      sourceId: tagValue(block, "wantedAuthNo") || tagValue(block, "id") || tagValue(block, "채용공고ID"),
      url: tagValue(block, "wantedInfoUrl") || tagValue(block, "url") || tagValue(block, "상세URL"),
      company: tagValue(block, "company") || tagValue(block, "corpNm") || tagValue(block, "회사명"),
      title: tagValue(block, "title") || tagValue(block, "wantedTitle") || tagValue(block, "공고명"),
      role: tagValue(block, "jobCont") || tagValue(block, "직무내용"),
      careerLevel: tagValue(block, "career") || tagValue(block, "경력"),
      education: tagValue(block, "education") || tagValue(block, "학력"),
      location: tagValue(block, "region") || tagValue(block, "근무지역"),
      employmentType: tagValue(block, "empTpNm") || tagValue(block, "고용형태"),
      postingDate: tagValue(block, "regDt") || tagValue(block, "등록일"),
      deadline: tagValue(block, "closeDt") || tagValue(block, "마감일"),
      closeType: tagValue(block, "closeType") || tagValue(block, "마감유형"),
      active: true,
      keywords: [tagValue(block, "jobCont")],
      raw: { xml: block },
    }),
  );
}

export async function fetchWork24Jobs(options = {}) {
  if (options.fixture) {
    return normalizeWork24Xml(await readFile(options.fixture, "utf8"));
  }

  const endpoint = options.endpoint ?? process.env.WORK24_API_URL;
  const authKey = options.authKey ?? process.env.WORK24_AUTH_KEY;
  if (!endpoint || !authKey) {
    throw new Error(
      "Work24 requires approved API access. Set WORK24_API_URL and WORK24_AUTH_KEY, or use --fixture for tests.",
    );
  }

  const url = new URL(endpoint);
  if (!url.searchParams.has("authKey")) url.searchParams.set("authKey", authKey);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Work24 API request failed: ${response.status} ${response.statusText}`);
  return normalizeWork24Xml(await response.text());
}
