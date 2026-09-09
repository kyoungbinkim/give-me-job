import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { cleanText, normalizeJob } from "../normalize-job.mjs";

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const NON_PUBLIC_ADDRESSES = new BlockList();
const GLOBAL_IPV6_ADDRESSES = new BlockList();
GLOBAL_IPV6_ADDRESSES.addSubnet("2000::", 3, "ipv6");
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 96], ["64:ff9b::", 96],
  ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 23], ["2001:db8::", 32],
  ["2002::", 16], ["3fff::", 20], ["fc00::", 7], ["fe80::", 10],
  ["fec0::", 10], ["ff00::", 8],
]) NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, "ipv6");
const SUPPORTED_HOSTS = new Map([
  ["jobkorea.co.kr", "jobkorea"],
  ["www.jobkorea.co.kr", "jobkorea"],
  ["linkareer.com", "linkareer"],
  ["www.linkareer.com", "linkareer"],
  ["skcareers.com", "skcareers"],
  ["www.skcareers.com", "skcareers"],
  ["careers.lg.com", "lgcareers"],
]);

function decodeHtml(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return String(value ?? "").replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const codePoint = Number.parseInt(entity.slice(entity[1]?.toLowerCase() === "x" ? 2 : 1), entity[1]?.toLowerCase() === "x" ? 16 : 10);
    try {
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    } catch {
      return match;
    }
  });
}

function decodeSerializedHtml(value) {
  return String(value ?? "")
    .replace(/\\u([\da-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\"/g, '"')
    .replace(/\\&/g, "&")
    .replace(/\\\//g, "/");
}

function stripHtml(value) {
  return cleanText(
    decodeHtml(decodeSerializedHtml(value))
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(?:div|h[1-6]|li|p|section|tr)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function findByType(value, expectedType) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByType(item, expectedType);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes(expectedType)) return value;
  for (const child of Object.values(value)) {
    const found = findByType(child, expectedType);
    if (found) return found;
  }
  return null;
}

function parseJsonLd(html) {
  for (const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const posting = findByType(JSON.parse(match[1]), "JobPosting");
      if (posting) return posting;
    } catch {
      // Ignore unrelated or malformed metadata and continue with site-specific extraction.
    }
  }
  return {};
}

function tagAttribute(tag, name) {
  return decodeHtml(String(tag).match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "");
}

function metaContent(html, name) {
  for (const match of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const key = tagAttribute(match[0], "property") || tagAttribute(match[0], "name");
    if (key.toLowerCase() === name.toLowerCase()) return cleanText(tagAttribute(match[0], "content"));
  }
  return "";
}

function organizationName(value) {
  return cleanText(typeof value === "string" ? value : value?.name);
}

function locationText(value) {
  const locations = Array.isArray(value) ? value : value ? [value] : [];
  return locations
    .map((location) => {
      const address = location?.address ?? location;
      if (typeof address === "string") return cleanText(address);
      return cleanText([address?.addressRegion, address?.addressLocality, address?.streetAddress].filter(Boolean).join(" "));
    })
    .filter(Boolean)
    .join(", ");
}

function identifierValue(value) {
  return cleanText(typeof value === "string" || typeof value === "number" ? value : value?.value);
}

function sourceIdFromUrl(url) {
  const parsed = new URL(url);
  return cleanText(
    parsed.searchParams.get("Gno") ||
    parsed.searchParams.get("gno") ||
    parsed.searchParams.get("id") ||
    parsed.pathname.split("/").filter(Boolean).at(-1),
  );
}

function textFromClass(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stripHtml(String(html).match(new RegExp(`<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"))?.[1] ?? "");
}

function unique(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function stringsUnderKey(value, targetKey, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) stringsUnderKey(item, targetKey, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    if (key === targetKey) found.push(child);
    stringsUnderKey(child, targetKey, found);
  }
  return found;
}

function flattenStrings(value, found = []) {
  if (typeof value === "string") found.push(cleanText(stripHtml(value)));
  else if (Array.isArray(value)) for (const item of value) flattenStrings(item, found);
  else if (value && typeof value === "object") for (const child of Object.values(value)) flattenStrings(child, found);
  return found;
}

function nextData(html) {
  const text = String(html).match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function baseJsonLdJob(posting, source, url, raw = {}) {
  return normalizeJob({
    source,
    sourceId: identifierValue(posting.identifier) || sourceIdFromUrl(url),
    url: posting.url || url,
    company: organizationName(posting.hiringOrganization),
    title: posting.title,
    role: "",
    careerLevel: posting.experienceRequirements,
    education: posting.educationRequirements,
    location: locationText(posting.jobLocation),
    employmentType: Array.isArray(posting.employmentType) ? posting.employmentType.join(", ") : posting.employmentType,
    postingDate: posting.datePosted,
    deadline: posting.validThrough,
    active: true,
    keywords: [],
    raw: {
      postingText: stripHtml(posting.description),
      positions: [],
      questions: [],
      attachments: [],
      applyUrl: "",
      extractionWarnings: [],
      ...raw,
    },
  });
}

export function parseJobKorea(html, url, detailHtml = "") {
  const posting = parseJsonLd(html);
  const serialized = decodeSerializedHtml(html);
  const applyUrl = serialized.match(/https:\/\/careers\.[^"'<>\s\\]+/i)?.[0] ?? "";
  const postingText = stripHtml(detailHtml) || stripHtml(posting.description);
  const warnings = [];
  if (!detailHtml) warnings.push("Detailed JobKorea posting body could not be resolved; verify the target position manually.");
  warnings.push("Public JobKorea pages may not include application questions or character limits.");
  return baseJsonLdJob(posting, "jobkorea", url, {
    postingText,
    applyUrl,
    extractionWarnings: warnings,
  });
}

export function jobKoreaDetailPath(html) {
  const match = decodeSerializedHtml(html).match(/\/Recruit\/GI_Read_Comt_Ifrm\?[^"'<>\s]+/i);
  return match?.[0]?.replace(/&amp;/g, "&") ?? "";
}

export function parseLinkareer(html, url) {
  const posting = parseJsonLd(html);
  const data = nextData(html);
  const activity = data?.props?.pageProps?.data?.activityData?.activity ?? {};
  const apollo = data?.props?.pageProps?.__APOLLO_STATE__ ?? {};
  const activityTexts = Object.entries(apollo)
    .filter(([key, value]) => key.startsWith("ActivityText:") && value?.text)
    .map(([, value]) => stripHtml(value.text));
  const questions = unique(
    stringsUnderKey(data, "questionTemplates")
      .flatMap((value) => flattenStrings(value))
      .filter((value) => value.length >= 10 && (/[?？]|작성|기술|설명|주세요/.test(value))),
  );
  const positions = unique(stringsUnderKey(activity?.duties ?? {}, "title").flatMap((value) => flattenStrings(value)))
    .filter((value) => value !== cleanText(posting.title) && !/^\[[^\]]+\]\s*\[/.test(value));
  const attachments = unique(
    (activity?.files ?? []).flatMap((file) => [file?.url, file?.fileUrl, file?.downloadUrl]).filter(Boolean),
  ).filter((value) => /\/applications\/|\.pdf(?:$|\?)/i.test(value));
  const postingText = unique([stripHtml(posting.description), ...activityTexts]).join("\n");
  const warnings = [];
  if (Number(activity?.duties?.totalCount ?? positions.length) > positions.length) {
    warnings.push("The Linkareer page exposes only part of its position list; choose a role and verify the attached JD.");
  }
  if (attachments.length > 0) warnings.push("Detailed duties may be available only in an attached PDF or image.");
  if (questions.length === 0) warnings.push("No public application questions or character limits were found.");
  const job = baseJsonLdJob(posting, "linkareer", url, {
    postingText,
    positions,
    questions,
    attachments,
    applyUrl: cleanText(activity?.applyDetail),
    extractionWarnings: warnings,
  });
  job.sourceId = new URL(url).pathname.split("/").filter(Boolean).at(-1) || job.sourceId;
  job.role = positions.length === 1 ? positions[0] : "";
  job.keywords = unique(positions);
  return job;
}

function labeledValue(html, label) {
  return stripHtml(
    String(html).match(new RegExp(`<div[^>]+class=["']label["'][^>]*>\\s*${label}[\\s\\S]*?<div[^>]+class=["']value["'][^>]*>([\\s\\S]*?)<\\/div>`, "i"))?.[1] ?? "",
  );
}

function skDeadline(html) {
  const period = labeledValue(html, "(?:Application(?:<br\\s*\\/?>)?\\s*period|지원\\s*기간)");
  const matches = [...period.matchAll(/([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/g)];
  if (matches.length === 0) return cleanText(period);
  const [, month, day, year] = matches.at(-1);
  const date = new Date(`${month} ${day}, ${year} UTC`);
  return Number.isNaN(date.valueOf()) ? cleanText(period) : date.toISOString().slice(0, 10);
}

export function parseSkCareers(html, url) {
  const main = String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  const title = textFromClass(html, "box-title");
  const role = labeledValue(html, "(?:Job|직무)");
  const attachments = unique(
    [...String(main).matchAll(/<a\b[^>]*href=["']([^"']*\/Recruit\/DownloadFile[^"']*)["']/gi)].map((match) => new URL(decodeHtml(match[1]), url).href),
  );
  const postingText = stripHtml(String(main).match(/<div\b[^>]*class=["'][^"']*detail-content-wrapper[^"']*["'][^>]*>([\s\S]*?)<div\b[^>]*class=["'][^"']*detail-more-list/i)?.[1] ?? main);
  return normalizeJob({
    source: "skcareers",
    sourceId: new URL(url).pathname.split("/").filter(Boolean).at(-1),
    url,
    company: labeledValue(html, "(?:Company|회사)"),
    title,
    role,
    careerLevel: labeledValue(html, "(?:Category|구분)"),
    location: labeledValue(html, "(?:Region|지역)"),
    employmentType: labeledValue(html, "(?:Type|유형)"),
    deadline: skDeadline(html),
    active: true,
    keywords: unique([role, title]),
    raw: {
      postingText,
      positions: role ? [role] : [],
      questions: [],
      attachments,
      applyUrl: url,
      extractionWarnings: [
        ...(attachments.length > 0 ? ["Detailed duties may be available only in an attached PDF."] : []),
        "Public SK Careers pages may not include application questions or character limits.",
      ],
    },
  });
}

function lgDate(value) {
  const match = cleanText(value).match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : cleanText(value);
}

export function parseLgCareers(payload, url) {
  if (payload?.status !== "S") throw new Error(`LG Careers detail request failed: ${payload?.message || payload?.status || "unknown response"}`);
  const container = payload?.data?.jobNoticesDetail ?? payload?.data ?? {};
  const notice = container?.jobNoticesDetail ?? {};
  const positions = Array.isArray(container?.recList) ? container.recList : [];
  const positionNames = unique(positions.map((position) => position.jobGroupName || position.jobGroupSh || position.orgName));
  const postingText = unique([
    notice.qualForAppInfo,
    notice.recProcessInfo,
    notice.submitMethodInfo,
    notice.otherInfo,
    ...positions.flatMap((position) => [position.detailContext, position.requiredItem, position.preferredItem]),
  ]).map(stripHtml).filter(Boolean).join("\n");
  const questions = unique(stringsUnderKey(container, "question").flatMap((value) => flattenStrings(value)));
  const id = cleanText(notice.jobNoticeId || new URL(url).searchParams.get("id"));
  return normalizeJob({
    source: "lgcareers",
    sourceId: id,
    url,
    company: notice.companyName,
    title: notice.jobNoticeName,
    role: positionNames.length === 1 ? positionNames[0] : "",
    careerLevel: notice.careerTypeName,
    location: unique(positions.map((position) => position.locationName)).join(", "),
    employmentType: notice.recruitTypeName || notice.recruitTypeCode,
    postingDate: lgDate(notice.recStartDate),
    deadline: lgDate(notice.recEndDate),
    active: notice.applyAvailable !== false,
    keywords: unique([...positionNames, notice.jobGroupSh, notice.jobGroupSh2]),
    raw: {
      postingText,
      positions: positions.map((position) => ({
        organization: cleanText(position.orgName),
        role: cleanText(position.jobGroupName || position.jobGroupSh),
        location: cleanText(position.locationName),
        responsibilities: stripHtml(position.detailContext),
        required: stripHtml(position.requiredItem),
        preferred: stripHtml(position.preferredItem),
      })),
      questions,
      attachments: [],
      applyUrl: url,
      extractionWarnings: [
        ...(positionNames.length > 1 ? ["This LG Careers notice contains multiple positions; choose one before drafting."] : []),
        ...(questions.length === 0 ? ["No public application questions or character limits were found."] : []),
      ],
    },
  });
}

function genericSourceId(url, identifier = "") {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) parsed.searchParams.delete(key);
  parsed.searchParams.sort();
  const location = parsed.search ? `${parsed.pathname}${parsed.search}` : sourceIdFromUrl(url) || parsed.pathname;
  return `${parsed.hostname.toLowerCase()}:${cleanText(identifier) || location}`;
}

export function parseGenericPosting(html, url) {
  const structured = parseJsonLd(html);
  if (Object.keys(structured).length) {
    const job = baseJsonLdJob({ ...structured, url }, "web", url, {
      postingText: stripHtml(structured.description),
      applyUrl: url,
      extractionWarnings: ["Generic public-page extraction; verify the role, deadline, and application questions against the source page."],
    });
    job.sourceId = genericSourceId(url, identifierValue(structured.identifier));
    return job;
  }
  const title = metaContent(html, "og:title") || stripHtml(String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const company = metaContent(html, "og:site_name") || metaContent(html, "application-name");
  const content = String(html).match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1]
    ?? String(html).match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    ?? "";
  return normalizeJob({
    source: "web",
    sourceId: genericSourceId(url),
    url,
    company,
    title,
    active: true,
    raw: {
      postingText: stripHtml(content), positions: [], questions: [], attachments: [], applyUrl: url,
      extractionWarnings: [
        "This page has no JobPosting structured metadata; verify every extracted field against the source page.",
        "Application questions and character limits may be missing.",
      ],
    },
  });
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 0 || address.toLowerCase().startsWith("::ffff:")) return false;
  if (family === 6 && !GLOBAL_IPV6_ADDRESSES.check(address, "ipv6")) return false;
  return !NON_PUBLIC_ADDRESSES.check(address, family === 4 ? "ipv4" : "ipv6");
}

async function resolvePublicAddress(hostname) {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isPrivateHostname(clean)) {
    throw new Error("Posting URLs must use a public hostname.");
  }
  const addresses = await lookup(clean, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Posting hostname resolves to a non-public address.");
  }
  return addresses[0];
}

export function createPinnedLookup({ address, family }) {
  return (_hostname, options, callback) => {
    if (options?.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
}

export async function readLimitedResponse(response) {
  const contentLength = Number(response.headers["content-length"] ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    response.destroy();
    throw new Error("Posting response is larger than 10 MB; paste the relevant JD text manually.");
  }
  const chunks = [];
  let received = 0;
  for await (const chunk of response) {
    received += chunk.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      response.destroy();
      throw new Error("Posting response is larger than 10 MB; paste the relevant JD text manually.");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isPrivateHostname(hostname) {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return Boolean(isIP(clean) || clean === "localhost" || clean.endsWith(".localhost") || clean.endsWith(".local") || clean.endsWith(".internal"));
}

export function validatePostingUrl(value) {
  let url;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    throw new Error("A valid posting URL is required.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Posting URLs must use HTTPS with the default port and must not include credentials.");
  }
  if (isPrivateHostname(url.hostname)) throw new Error("Posting URLs must use a public hostname.");
  const source = SUPPORTED_HOSTS.get(url.hostname.toLowerCase()) ?? "web";
  const validPath = source === "web" ? null : {
    jobkorea: /^\/Recruit\/GI_Read(?:\/\d+)?\/?$/i,
    linkareer: /^\/activity\/\d+\/?$/i,
    skcareers: /^\/Recruit\/Detail\/R[\dA-Za-z]+\/?$/i,
    lgcareers: /^\/apply\/detail\/?$/i,
  }[source];
  if (validPath && !validPath.test(url.pathname)) throw new Error(`Unsupported ${source} posting path: ${url.pathname}`);
  url.hash = "";
  return { source, url };
}

async function fetchResponse(url, options = {}) {
  let currentUrl = new URL(url);
  const { timeoutMs = 30_000, ...fetchOptions } = options;
  let requestOptions = { ...fetchOptions };
  let response;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const address = await resolvePublicAddress(currentUrl.hostname);
    response = await new Promise((resolve, reject) => {
      const request = httpsRequest(currentUrl, {
        ...requestOptions,
        headers: { "User-Agent": "give-me-job manual-url-intake", ...(requestOptions.headers ?? {}) },
        lookup: createPinnedLookup(address),
        signal: AbortSignal.timeout(timeoutMs),
      }, resolve);
      request.on("error", reject);
      if (requestOptions.body !== undefined) request.write(requestOptions.body);
      request.end();
    });
    if (![301, 302, 303, 307, 308].includes(response.statusCode)) break;
    if (redirects === 5) {
      response.resume();
      throw new Error("Posting request exceeded 5 redirects.");
    }
    const location = response.headers.location;
    if (!location) {
      response.resume();
      throw new Error("Posting redirect did not include a location.");
    }
    let nextUrl;
    try { nextUrl = new URL(location, currentUrl); }
    catch {
      response.resume();
      throw new Error("Posting redirect location is invalid.");
    }
    const currentSource = SUPPORTED_HOSTS.get(currentUrl.hostname.toLowerCase());
    const nextSource = SUPPORTED_HOSTS.get(nextUrl.hostname.toLowerCase());
    const sameHost = currentUrl.hostname.toLowerCase() === nextUrl.hostname.toLowerCase();
    if (nextUrl.protocol !== "https:" || nextUrl.username || nextUrl.password || nextUrl.port || (!sameHost && (!currentSource || currentSource !== nextSource))) {
      response.resume();
      throw new Error(`Posting redirected to an unsupported host: ${nextUrl.hostname}`);
    }
    response.resume();
    if (response.statusCode === 303 || ([301, 302].includes(response.statusCode) && String(requestOptions.method ?? "GET").toUpperCase() === "POST")) {
      const headers = { ...(requestOptions.headers ?? {}) };
      delete headers["Content-Type"];
      requestOptions = { ...requestOptions, method: "GET", body: undefined, headers };
    }
    currentUrl = nextUrl;
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    response.resume();
    throw new Error(`Posting request failed: ${response.statusCode} ${response.statusMessage}`);
  }
  return readLimitedResponse(response);
}

function usableJob(job) {
  if (!job.company || !job.title || !job.raw?.postingText) {
    throw new Error("The public page did not expose enough posting content. Paste the relevant JD text manually.");
  }
  return job;
}

export async function fetchManualUrlJobs(options = {}) {
  const { source, url } = validatePostingUrl(options.url);
  if (source === "lgcareers") {
    const id = url.searchParams.get("id");
    if (!/^\d+$/.test(id ?? "") || !Number.isSafeInteger(Number(id))) {
      throw new Error("LG Careers URL must include a safe numeric id query parameter.");
    }
    const payload = options.fixture
      ? JSON.parse(await readFile(options.fixture, "utf8"))
      : JSON.parse(await fetchResponse("https://api.careers.lg.com/rmk/job/retrieveJobNoticesDetail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobNoticeId: Number(id) }),
          timeoutMs: options.timeout ?? 30_000,
        }));
    return [usableJob(parseLgCareers(payload, url.href))];
  }

  const html = options.fixture ? await readFile(options.fixture, "utf8") : await fetchResponse(url, { timeoutMs: options.timeout ?? 30_000 });
  if (source === "web") return [usableJob(parseGenericPosting(html, url.href))];
  if (source === "linkareer") return [usableJob(parseLinkareer(html, url.href))];
  if (source === "skcareers") return [usableJob(parseSkCareers(html, url.href))];

  let detailHtml = "";
  const detailPath = jobKoreaDetailPath(html);
  if (detailPath && !options.fixture) detailHtml = await fetchResponse(new URL(detailPath, url), { timeoutMs: options.timeout ?? 30_000 });
  return [usableJob(parseJobKorea(html, url.href, detailHtml))];
}
