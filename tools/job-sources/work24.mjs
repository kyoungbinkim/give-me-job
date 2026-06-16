import { readFile } from "node:fs/promises";
import { cleanText, normalizeJob } from "../normalize-job.mjs";

const DEFAULT_RECRUIT_API_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do";
const DEFAULT_COMPANY_API_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L31.do";

function tagValue(text, tag) {
  const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return cleanText(match?.[1]?.replace(/<[^>]+>/g, " ") ?? "");
}

function blocks(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) => match[1]);
}

function legacyJobBlocks(xml) {
  const generic = [...xml.matchAll(/<(item|job|채용정보)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  if (generic.length > 0) return generic;
  return blocks(xml, "detailempwanted");
}

function yyyymmddToIso(value) {
  const text = cleanText(value);
  if (!/^\d{8}$/.test(text)) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function isActiveDeadline(deadline, today = new Date()) {
  if (!deadline) return true;
  const date = new Date(`${deadline}T23:59:59+09:00`);
  if (Number.isNaN(date.getTime())) return true;
  return date >= today;
}

function normalizeRecruitBlock(block, companyInfoByName = new Map()) {
  const company = tagValue(block, "empBusiNm");
  const companyInfo = companyInfoByName.get(company);
  const title = tagValue(block, "empWantedTitle");
  const employmentType = tagValue(block, "empWantedTypeNm");
  const companyType = tagValue(block, "coClcdNm");
  const postingDate = yyyymmddToIso(tagValue(block, "empWantedStdt"));
  const deadline = yyyymmddToIso(tagValue(block, "empWantedEndt"));

  return normalizeJob({
    source: "work24",
    sourceId: tagValue(block, "empSeqno"),
    url: tagValue(block, "empWantedHomepgDetail") || tagValue(block, "empWantedMobileUrl") || companyInfo?.homepg,
    company,
    title,
    role: companyInfo?.mainBusiCont || companyInfo?.coIntroSummaryCont || "",
    careerLevel: tagValue(block, "empWantedCareerNm"),
    education: tagValue(block, "empWantedEduNm"),
    location: tagValue(block, "regionNm"),
    employmentType,
    postingDate,
    deadline,
    closeType: deadline ? "접수마감일" : "",
    active: isActiveDeadline(deadline),
    keywords: [title, company, employmentType, companyType],
    raw: { xml: block, companyInfo },
  });
}

function normalizeLegacyJobBlock(block) {
  return normalizeJob({
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
  });
}

export function parseWork24CompanyXml(xml) {
  return blocks(xml, "dhsOpenEmpHireInfo").map((block) => ({
    source: "work24-company",
    sourceId: tagValue(block, "empCoNo"),
    company: tagValue(block, "coNm"),
    companyType: tagValue(block, "coClcdNm"),
    businessNumber: tagValue(block, "busino"),
    logoUrl: tagValue(block, "regLogImgNm"),
    homepg: tagValue(block, "homepg"),
    summary: tagValue(block, "coIntroSummaryCont"),
    description: tagValue(block, "coIntroCont"),
    mainBusiCont: tagValue(block, "mainBusiCont"),
    coordinates: {
      latitude: tagValue(block, "mapCoorY"),
      longitude: tagValue(block, "mapCoorX"),
    },
    raw: { xml: block },
  }));
}

export function normalizeWork24Xml(xml, options = {}) {
  const companyInfoByName = options.companyInfoByName ?? new Map();
  const recruitBlocks = blocks(xml, "dhsOpenEmpInfo");
  if (recruitBlocks.length > 0) {
    return recruitBlocks.map((block) => normalizeRecruitBlock(block, companyInfoByName));
  }

  return legacyJobBlocks(xml).map(normalizeLegacyJobBlock);
}

function buildUrl(endpoint, authKey, params = {}) {
  const url = new URL(endpoint);
  if (!url.searchParams.has("authKey")) url.searchParams.set("authKey", authKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

async function fetchText(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} API request failed: ${response.status} ${response.statusText}`);
  return response.text();
}

function baseParams(params = {}) {
  return {
    callTp: "L",
    returnType: "XML",
    startPage: 1,
    display: 10,
    ...params,
  };
}

async function fetchCompanyInfoByName(company, options) {
  const endpoint = options.companyEndpoint ?? process.env.WORK24_COMPANY_API_URL ?? DEFAULT_COMPANY_API_URL;
  const url = buildUrl(endpoint, options.authKey, baseParams({ display: 5, coNm: company }));
  const companies = parseWork24CompanyXml(await fetchText(url, "Work24 company"));
  return companies.find((candidate) => candidate.company === company) ?? companies[0];
}

export async function fetchWork24Companies(options = {}) {
  if (options.fixture) {
    return parseWork24CompanyXml(await readFile(options.fixture, "utf8"));
  }

  const endpoint = options.companyEndpoint ?? options.endpoint ?? process.env.WORK24_COMPANY_API_URL ?? DEFAULT_COMPANY_API_URL;
  const authKey = options.authKey ?? process.env.WORK24_AUTH_KEY;
  if (!authKey) {
    throw new Error("Work24 company search requires WORK24_AUTH_KEY, or use --fixture for tests.");
  }

  const url = buildUrl(endpoint, authKey, baseParams(options.params));
  return parseWork24CompanyXml(await fetchText(url, "Work24 company"));
}

export async function fetchWork24Jobs(options = {}) {
  if (options.fixture) {
    const jobs = normalizeWork24Xml(await readFile(options.fixture, "utf8"));
    return options.activeOnly ? jobs.filter((job) => job.active) : jobs;
  }

  const endpoint = options.endpoint ?? process.env.WORK24_RECRUIT_API_URL ?? DEFAULT_RECRUIT_API_URL;
  const authKey = options.authKey ?? process.env.WORK24_AUTH_KEY;
  if (!endpoint || !authKey) {
    throw new Error(
      "Work24 requires approved API access. Set WORK24_AUTH_KEY, optionally set WORK24_RECRUIT_API_URL, or use --fixture for tests.",
    );
  }

  const params = baseParams(options.params);
  const url = buildUrl(endpoint, authKey, params);
  const xml = await fetchText(url, "Work24 recruit");

  if (options.noCompanyEnrichment) {
    const jobs = normalizeWork24Xml(xml);
    return options.activeOnly ? jobs.filter((job) => job.active) : jobs;
  }

  const jobs = normalizeWork24Xml(xml);
  const companyInfoByName = new Map();
  for (const company of [...new Set(jobs.map((job) => job.company).filter(Boolean))]) {
    try {
      const companyInfo = await fetchCompanyInfoByName(company, { ...options, authKey });
      if (companyInfo) companyInfoByName.set(company, companyInfo);
    } catch {
      // Company enrichment is optional; a recruit listing should still be useful when L31 fails or has no match.
    }
  }

  const enrichedJobs = normalizeWork24Xml(xml, { companyInfoByName });
  return options.activeOnly ? enrichedJobs.filter((job) => job.active) : enrichedJobs;
}
