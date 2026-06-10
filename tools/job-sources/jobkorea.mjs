import { readFile } from "node:fs/promises";
import { cleanText, normalizeJob } from "../normalize-job.mjs";

function tagValue(text, tag) {
  const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return cleanText(match?.[1]?.replace(/<[^>]+>/g, " ") ?? "");
}

function itemBlocks(xml) {
  return [...xml.matchAll(/<(item|job|recruit|채용정보)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(
    (match) => match[2],
  );
}

export function normalizeJobKoreaXml(xml) {
  return itemBlocks(xml).map((block) =>
    normalizeJob({
      source: "jobkorea",
      sourceId: tagValue(block, "id") || tagValue(block, "recruitId") || tagValue(block, "공고ID"),
      url: tagValue(block, "url") || tagValue(block, "detailUrl") || tagValue(block, "상세요강URL"),
      company: tagValue(block, "company") || tagValue(block, "companyName") || tagValue(block, "채용기업명"),
      title: tagValue(block, "title") || tagValue(block, "recruitTitle") || tagValue(block, "채용정보제목"),
      role: tagValue(block, "occupation") || tagValue(block, "job") || tagValue(block, "직무"),
      careerLevel: tagValue(block, "career") || tagValue(block, "경력"),
      education: tagValue(block, "education") || tagValue(block, "학력"),
      location: tagValue(block, "location") || tagValue(block, "근무지역"),
      employmentType: tagValue(block, "employmentType") || tagValue(block, "고용형태"),
      postingDate: tagValue(block, "postingDate") || tagValue(block, "등록일"),
      deadline: tagValue(block, "deadline") || tagValue(block, "마감일"),
      closeType: tagValue(block, "closeType") || tagValue(block, "마감유형"),
      active: true,
      keywords: [tagValue(block, "occupation"), tagValue(block, "job"), tagValue(block, "industry")],
      raw: { xml: block },
    }),
  );
}

export async function fetchJobKoreaJobs(options = {}) {
  if (options.fixture) {
    return normalizeJobKoreaXml(await readFile(options.fixture, "utf8"));
  }

  const endpoint = options.endpoint ?? process.env.JOBKOREA_API_URL;
  if (!endpoint) {
    throw new Error(
      "JobKorea API access is approval-based. Set JOBKOREA_API_URL to the issued call URL, or use --fixture for tests.",
    );
  }

  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`JobKorea API request failed: ${response.status} ${response.statusText}`);
  return normalizeJobKoreaXml(await response.text());
}
