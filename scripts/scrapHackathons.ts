import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

// ============================================================
// CONFIGURATION
// ============================================================

const BASE_URL = "https://www.knowafest.com";

const HACKATHON_CATEGORY_URL =
  "https://www.knowafest.com/explore/category/Hackathon_";

const OUTPUT_DIR = path.join(
  process.cwd(),
  "src",
  "data"
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  "hackathons.json"
);

// Start with 3 while testing.
// Change to 200 after confirming everything works.
const MAX_PAGES = 200;

const REQUEST_TIMEOUT = 30000;

// Delay between requests to avoid sending
// too many requests too quickly.
const DELAY_BETWEEN_REQUESTS = 1200;

const SOURCE_NAME = "Knowafest";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Safari/537.36";

// ============================================================
// TYPES
// ============================================================

interface HackathonEvent {
  id: string;

  title: string;

  eventType: string;

  startDate?: string;
  endDate?: string;

  organizer?: string;
  college?: string;

  city?: string;
  state?: string;
  country: string;

  venue?: string;
  address?: string;

  description?: string;

  eligibility?: string;

  prize?: string;

  registrationFee?: string;

  registrationDeadline?: string;

  registrationUrl?: string;

  // The original Knowafest event page URL.
  // registrationUrl holds the real external registration URL.
  sourceUrl?: string;

  eventUrl: string;

  posterImage?: string;

  source: string;

  sourceId: string;

  mode:
  | "Online"
  | "Offline"
  | "Hybrid"
  | "Unknown";

  technologies: string[];

  themes: string[];

  scrapedAt: string;
}

interface ListingEvent {
  title: string;

  eventUrl: string;

  eventType?: string;

  date?: string;

  college?: string;

  city?: string;

  posterImage?: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

// ------------------------------------------------------------
// Clean text
// ------------------------------------------------------------

function cleanText(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------
// Convert relative URL to absolute URL
// ------------------------------------------------------------

function absoluteUrl(
  url?: string | null
): string {
  if (!url) {
    return "";
  }

  const cleaned = url.trim().replace(/^(\.\.\/)+/, "");

  if (
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://")
  ) {
    return cleaned;
  }

  if (cleaned.startsWith("//")) {
    return `https:${cleaned}`;
  }

  if (cleaned.startsWith("/")) {
    return `${BASE_URL}${cleaned}`;
  }

  return `${BASE_URL}/${cleaned}`;
}

// ------------------------------------------------------------
// Create slug
// ------------------------------------------------------------

function createSlug(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ------------------------------------------------------------
// Create stable event ID
//
// Using event URL instead of date/city prevents IDs from
// changing when Knowafest changes event information.
// ------------------------------------------------------------

function createId(
  title: string,
  eventUrl: string
): string {
  const urlPart = eventUrl
    .replace(BASE_URL, "")
    .replace(/[^a-zA-Z0-9]+/g, "-");

  return `${createSlug(title)}-${createSlug(
    urlPart
  )}`;
}

// ============================================================
// HTTP FETCH
// ============================================================

async function fetchPage(
  url: string
): Promise<string> {
  console.log(`Fetching: ${url}`);

  const response = await axios.get<string>(
    url,
    {
      timeout: REQUEST_TIMEOUT,

      headers: {
        "User-Agent": USER_AGENT,

        Accept:
          "text/html,application/xhtml+xml," +
          "application/xml;q=0.9," +
          "image/avif,image/webp,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9",

        "Cache-Control":
          "no-cache",

        Pragma: "no-cache",
      },

      maxRedirects: 5,

      validateStatus: (status) =>
        status >= 200 && status < 400,
    }
  );

  return response.data;
}

// ============================================================
// DATE PARSING
// ============================================================

function parseDateRange(
  dateText: string
): {
  startDate?: string;
  endDate?: string;
} {
  const clean = cleanText(dateText);

  if (!clean) {
    return {
      startDate: undefined,
      endDate: undefined,
    };
  }

  /*
    Examples:

    25 Sep 2026

    25 Sep 2026 Onwards

    25 Sep 2026 - 26 Sep 2026

    8th - 10th October 2026

    8 October 2026
  */

  const normalDates = clean.match(
    /\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}/gi
  );

  if (
    !normalDates ||
    normalDates.length === 0
  ) {
    return {
      startDate: clean,
      endDate: undefined,
    };
  }

  return {
    startDate: normalDates[0],

    endDate:
      normalDates.length > 1
        ? normalDates[1]
        : undefined,
  };
}

// ============================================================
// MODE DETECTION
// ============================================================

function detectMode(
  text: string
): HackathonEvent["mode"] {
  const value =
    text.toLowerCase();

  const online =
    value.includes("online") ||
    value.includes("virtual") ||
    value.includes("remote");

  const offline =
    value.includes("offline") ||
    value.includes("on campus") ||
    value.includes("campus") ||
    value.includes("venue");

  if (online && offline) {
    return "Hybrid";
  }

  if (online) {
    return "Online";
  }

  if (offline) {
    return "Offline";
  }

  return "Unknown";
}

// ============================================================
// TECHNOLOGY DETECTION
// ============================================================

function detectTechnologies(
  text: string
): string[] {
  const value =
    text.toLowerCase();

  const technologies =
    new Set<string>();

  const keywords: Record<
    string,
    string
  > = {
    "artificial intelligence":
      "Artificial Intelligence",

    "generative ai":
      "Generative AI",

    "machine learning":
      "Machine Learning",

    "deep learning":
      "Deep Learning",

    "computer vision":
      "Computer Vision",

    "machine vision":
      "Computer Vision",

    python: "Python",

    java: "Java",

    javascript: "JavaScript",

    typescript: "TypeScript",

    react: "React",

    "next.js": "Next.js",

    nextjs: "Next.js",

    "node.js": "Node.js",

    nodejs: "Node.js",

    express: "Express.js",

    mongodb: "MongoDB",

    mysql: "MySQL",

    postgresql: "PostgreSQL",

    sql: "SQL",

    firebase: "Firebase",

    "cloud computing":
      "Cloud Computing",

    aws: "AWS",

    azure: "Microsoft Azure",

    "google cloud":
      "Google Cloud",

    gcp: "Google Cloud",

    blockchain: "Blockchain",

    web3: "Web3",

    iot: "IoT",

    robotics: "Robotics",

    cybersecurity: "Cybersecurity",

    "cyber security":
      "Cybersecurity",

    "data science":
      "Data Science",

    "data analytics":
      "Data Analytics",

    "big data":
      "Big Data",

    fintech: "FinTech",

    "natural language processing":
      "NLP",

    nlp: "NLP",

    ar: "AR/VR",

    vr: "AR/VR",

    "augmented reality":
      "AR/VR",

    "virtual reality":
      "AR/VR",

    "large language model":
      "LLM",

    llm: "LLM",

    tensorflow: "TensorFlow",

    pytorch: "PyTorch",

    "power bi":
      "Power BI",

    "data visualization":
      "Data Visualization",
  };

  for (
    const [keyword, technology]
    of Object.entries(
      keywords
    )
  ) {
    if (
      value.includes(keyword)
    ) {
      technologies.add(
        technology
      );
    }
  }

  return Array.from(
    technologies
  );
}

// ============================================================
// THEME DETECTION
// ============================================================

function detectThemes(
  text: string
): string[] {
  const value =
    text.toLowerCase();

  const themes =
    new Set<string>();

  const keywords: Record<
    string,
    string
  > = {
    sustainability:
      "Sustainability",

    healthcare:
      "Healthcare",

    healthtech:
      "Healthcare",

    education:
      "Education",

    edtech:
      "Education",

    agriculture:
      "Agriculture",

    agritech:
      "Agriculture",

    fintech:
      "FinTech",

    banking:
      "Banking",

    smartcity:
      "Smart Cities",

    "smart city":
      "Smart Cities",

    cybersecurity:
      "Cybersecurity",

    "cyber security":
      "Cybersecurity",

    climate:
      "Climate Tech",

    environment:
      "Environment",

    mobility:
      "Mobility",

    transportation:
      "Transportation",

    robotics:
      "Robotics",

    artificial:
      "Artificial Intelligence",

    blockchain:
      "Blockchain",

    web3:
      "Web3",

    ecommerce:
      "E-Commerce",

    "e-commerce":
      "E-Commerce",

    "smart agriculture":
      "Smart Agriculture",

    "smart healthcare":
      "Smart Healthcare",

    "digital transformation":
      "Digital Transformation",

    "social impact":
      "Social Impact",

    "space technology":
      "Space Technology",

    "clean energy":
      "Clean Energy",

    energy:
      "Energy",

    tourism:
      "Tourism",

    automobile:
      "Automotive",

    automotive:
      "Automotive",
  };

  for (
    const [keyword, theme]
    of Object.entries(
      keywords
    )
  ) {
    if (
      value.includes(keyword)
    ) {
      themes.add(theme);
    }
  }

  return Array.from(
    themes
  );
}

// ============================================================
// FIND VALUE IN HTML TABLE
// ============================================================

function findValueByLabel(
  $: cheerio.CheerioAPI,
  labels: string[]
): string {
  let result = "";

  $("tr").each(
    (_, row) => {
      const cells = $(row)
        .find("th, td")
        .map(
          (_, cell) =>
            cleanText(
              $(cell).text()
            )
        )
        .get();

      if (cells.length < 2) {
        return;
      }

      const label =
        cells[0].toLowerCase();

      for (
        const wanted of labels
      ) {
        if (
          label.includes(
            wanted.toLowerCase()
          )
        ) {
          result = cells
            .slice(1)
            .join(" ");
        }
      }
    }
  );

  return cleanText(result);
}

// ============================================================
// FIND VALUE AFTER TEXT LABEL
// ============================================================

function findTextAfterLabel(
  text: string,
  labels: string[]
): string {
  const lines = text
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const current =
      lines[i].toLowerCase();

    for (
      const label of labels
    ) {
      const lowerLabel =
        label.toLowerCase();

      if (
        current ===
        lowerLabel
      ) {
        return (
          lines[i + 1] || ""
        );
      }

      if (
        current.startsWith(
          `${lowerLabel}:`
        )
      ) {
        return cleanText(
          lines[i]
            .split(":")
            .slice(1)
            .join(":")
        );
      }
    }
  }

  return "";
}

// ============================================================
// LISTING PAGE EXTRACTION
// ============================================================

function extractListingEvents(
  html: string
): ListingEvent[] {
  const $ = cheerio.load(html);

  const events: ListingEvent[] = [];
  const seen = new Set<string>();

  /*
    Knowafest category pages present events in a table:
    <tr onClick="window.open('../events/2026/08/...');">
  */
  $("tr").each((_, row) => {
    const onclick =
      $(row).attr("onclick") ||
      $(row).attr("onClick") ||
      (row as any).attribs?.onclick ||
      (row as any).attribs?.onClick ||
      "";

    const urlMatch =
      onclick.match(/window\.open\s*\(\s*['"]([^'"]+)['"]/i) ||
      onclick.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i) ||
      onclick.match(/['"](\.\.\/events\/[^'"]+)['"]/i) ||
      onclick.match(/['"](\/events\/[^'"]+)['"]/i);

    if (!urlMatch) {
      return;
    }

    const rawUrl = urlMatch[1];
    const url = absoluteUrl(rawUrl);

    if (!url) {
      return;
    }

    const cleanUrl = url.split("#")[0].split("?")[0];

    if (seen.has(cleanUrl)) {
      return;
    }

    const title =
      cleanText($(row).find("[itemprop='name']").text()) ||
      cleanText($(row).find("td").eq(1).text());

    if (!title || title.length < 3) {
      return;
    }

    seen.add(cleanUrl);

    const startDate = cleanText(
      $(row).find("[itemprop='startDate']").text()
    );

    const eventType =
      cleanText($(row).find(".optout").text()) || "Hackathon";

    const college = cleanText(
      $(row).find("[itemprop='location'] [itemprop='name']").text()
    );

    const city = cleanText(
      $(row).find("[itemprop='location'] [itemprop='address']").text()
    );

    events.push({
      title,
      eventUrl: cleanUrl,
      eventType,
      date: startDate || undefined,
      college: college || undefined,
      city: city || undefined,
    });
  });

  /*
    Fallback: check <a> links for detail pages
  */
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const url = absoluteUrl(href);

    if (!url || !url.includes("/events/")) {
      return;
    }

    const cleanUrl = url.split("#")[0].split("?")[0];

    if (seen.has(cleanUrl)) {
      return;
    }

    const title = cleanText($(element).text());

    if (!title || title.length < 3) {
      return;
    }

    seen.add(cleanUrl);

    events.push({
      title,
      eventUrl: cleanUrl,
      eventType: "Hackathon",
    });
  });

  return events;
}

// ============================================================
// OFFICIAL REGISTRATION URL EXTRACTOR
// ============================================================

/**
 * Trusted external hackathon platforms – URLs on these domains
 * are always preferred over generic "register" links.
 */
const REGISTRATION_PLATFORMS = [
  "devfolio.co",
  "unstop.com",
  "dare2compete.com",
  "hackerearth.com",
  "devpost.com",
  "hack2skill.com",
  "hackathon.io",
  "toplyst.com",
  "hackerrank.com",
  "challengerocket.com",
  "innovaccer.com",
  "cumulations.com",
  "ingenium.in",
];

/**
 * Link-text patterns that strongly indicate a registration/official
 * page button on the Knowafest event detail page.
 */
const REGISTRATION_LINK_TEXTS = [
  "register now",
  "register",
  "registration",
  "apply now",
  "apply",
  "participate",
  "official website",
  "visit website",
  "hackathon website",
  "event website",
  "official page",
];

/** Knowafest-internal path prefixes to skip */
const KNOWAFEST_PATHS = [
  "/explore/",
  "/events/",
  "/competitions/",
  "/colleges/",
  "/companies/",
  "/search",
  "knowafest.com",
];

function isKnowafestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("knowafest.com")) {
      return true;
    }
  } catch {
    // relative or malformed — treat as internal
    return true;
  }
  return false;
}

function isTrustedPlatform(url: string): boolean {
  return REGISTRATION_PLATFORMS.some((domain) =>
    url.toLowerCase().includes(domain)
  );
}

/**
 * Given a Knowafest event page URL, fetches the page and attempts
 * to find the real external registration / official website URL.
 *
 * Priority:
 *  1. Trusted platform URL (Devfolio, Unstop, etc.) in any link
 *  2. External URL whose link text matches registration keywords
 *  3. Any other external link not pointing back to Knowafest
 *  4. null  – caller should fall back to the Knowafest source URL
 */
async function extractOfficialRegistrationUrl(
  eventUrl: string,
  $page: cheerio.CheerioAPI
): Promise<string | null> {
  const candidates: Array<{ url: string; score: number }> = [];

  $page("a[href]").each((_, element) => {
    const href = $page(element).attr("href");
    if (!href) return;

    const resolved = absoluteUrl(href);
    if (!resolved) return;

    // Strip fragment and common tracking params
    let clean = resolved.split("#")[0];
    try {
      const u = new URL(clean);
      ["utm_source", "utm_medium", "utm_campaign", "ref", "source"].forEach(
        (p) => u.searchParams.delete(p)
      );
      clean = u.toString();
    } catch { /* keep as-is */ }

    // Skip Knowafest-internal URLs
    if (isKnowafestUrl(clean)) return;

    // Skip javascript: / mailto: / tel:
    if (/^(javascript|mailto|tel):/i.test(clean)) return;

    const linkText = $page(element).text().toLowerCase().trim();
    const hrefLower = clean.toLowerCase();

    let score = 0;

    // Highest priority: trusted hackathon platforms
    if (isTrustedPlatform(hrefLower)) {
      score += 100;
    }

    // High priority: link text matches registration keywords
    if (
      REGISTRATION_LINK_TEXTS.some((kw) => linkText.includes(kw))
    ) {
      score += 50;
    }

    // Medium priority: URL itself contains registration keyword
    if (
      hrefLower.includes("register") ||
      hrefLower.includes("apply") ||
      hrefLower.includes("signup") ||
      hrefLower.includes("participate")
    ) {
      score += 25;
    }

    // Any external link gets at least 1 point
    score += 1;

    if (score > 0) {
      candidates.push({ url: clean, score });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // Sort descending by score; stable secondary sort by insertion order
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0].url;
}

// ============================================================
// DETAIL PAGE SCRAPER
// ============================================================

async function scrapeEventDetails(
  listing: ListingEvent
): Promise<
  HackathonEvent | null
> {
  try {
    console.log(
      `\n → Opening: ${listing.title}`
    );

    const html =
      await fetchPage(
        listing.eventUrl
      );

    const $ =
      cheerio.load(html);

    const bodyText =
      cleanText(
        $("body").text()
      );

    // ========================================================
    let extractedTitle = cleanText($("h1").first().text());

    if (
      !extractedTitle ||
      extractedTitle.toLowerCase().includes("knowafest") ||
      extractedTitle.toLowerCase().includes("participate in events")
    ) {
      extractedTitle = listing.title;
    }

    const title = extractedTitle || listing.title;

    if (!title) {
      return null;
    }

    // ========================================================
    // EVENT TYPE
    // ========================================================

    const eventType =
      findValueByLabel(
        $,
        [
          "fest type",
          "event type",
          "type",
          "category",
        ]
      ) ||
      listing.eventType ||
      "Hackathon";

    // ========================================================
    // ORGANIZER / COLLEGE
    // ========================================================

    const college =
      findValueByLabel(
        $,
        [
          "college name",
          "organizer",
          "organiser",
          "institution",
          "college",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Organizer",
          "Organiser",
          "College",
          "Institution",
        ]
      ) ||
      listing.college;

    // ========================================================
    // CITY / LOCATION
    // ========================================================

    let city =
      findValueByLabel(
        $,
        [
          "city",
          "location",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Location",
          "City",
        ]
      ) ||
      listing.city;

    if (city) {
      city =
        cleanText(city);
    }

    // ========================================================
    // VENUE
    // ========================================================

    const venue =
      findValueByLabel(
        $,
        [
          "venue",
          "place",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Venue",
          "Place",
        ]
      );

    // ========================================================
    // ADDRESS
    // ========================================================

    const address =
      findValueByLabel(
        $,
        [
          "address",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Address",
        ]
      );

    // ========================================================
    // ELIGIBILITY
    // ========================================================

    const eligibility =
      findValueByLabel(
        $,
        [
          "eligibility",
          "eligible",
          "who can participate",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Eligibility",
          "Who Can Attend",
          "Who Can Participate",
        ]
      );

    // ========================================================
    // PRIZE
    // ========================================================

    const prize =
      findValueByLabel(
        $,
        [
          "prize",
          "prize pool",
          "cash prize",
          "rewards",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Prize",
          "Prize Pool",
          "Rewards",
        ]
      );

    // ========================================================
    // REGISTRATION FEE
    // ========================================================

    const registrationFee =
      findValueByLabel(
        $,
        [
          "registration fee",
          "entry fee",
          "fee",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Registration Fee",
          "Entry Fee",
        ]
      );

    // ========================================================
    // REGISTRATION DEADLINE
    // ========================================================

    const registrationDeadline =
      findValueByLabel(
        $,
        [
          "registration deadline",
          "last date",
          "deadline",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Registration Deadline",
          "Deadline",
          "Last Date",
        ]
      );

    // ========================================================
    // DATE
    // ========================================================

    const dateText =
      findValueByLabel(
        $,
        [
          "start date",
          "event date",
          "date",
        ]
      ) ||
      findTextAfterLabel(
        bodyText,
        [
          "Date",
          "Event Date",
        ]
      ) ||
      listing.date ||
      "";

    const {
      startDate,
      endDate,
    } =
      parseDateRange(
        dateText
      );

    // ========================================================
    // REGISTRATION URL  (official external link)
    // ========================================================

    const officialUrl = await extractOfficialRegistrationUrl(
      listing.eventUrl,
      $
    );

    // Use official URL as registrationUrl; Knowafest page becomes sourceUrl
    const registrationUrl = officialUrl || "";

    // Debug logging as required
    console.log(`  [Hackathon] ${listing.title}`);
    console.log(`  [Source]   ${listing.eventUrl}`);
    if (officialUrl) {
      console.log(`  [Official Registration] ${officialUrl}`);
    } else {
      console.log(`  [Official Registration] Not found`);
      console.log(`  [Fallback] Using Knowafest source URL`);
    }

    // ========================================================
    // DESCRIPTION
    // ========================================================

    let description =
      "";

    const descriptionSelectors =
      [
        ".description",
        ".event-description",
        "#description",
        ".content",
        "article",
      ];

    for (
      const selector of
      descriptionSelectors
    ) {
      const value =
        cleanText(
          $(selector)
            .first()
            .text()
        );

      if (
        value.length >
        description.length
      ) {
        description =
          value;
      }
    }

    /*
      Look for "About Event"
      if the normal selectors
      did not work.
    */

    if (
      !description
    ) {
      const lowerBody =
        bodyText.toLowerCase();

      const aboutIndex =
        lowerBody.indexOf(
          "about event"
        );

      if (
        aboutIndex !== -1
      ) {
        description =
          bodyText.substring(
            aboutIndex +
            "about event"
              .length,
            aboutIndex +
            "about event"
              .length +
            2500
          );
      }
    }

    /*
      Last fallback.
    */

    if (
      !description
    ) {
      description =
        bodyText.substring(
          0,
          2500
        );
    }

    // ========================================================
    // POSTER IMAGE
    // ========================================================

    const posterImage =
      listing.posterImage ||
      $(
        "meta[property='og:image']"
      ).attr(
        "content"
      ) ||
      $(
        "meta[name='twitter:image']"
      ).attr(
        "content"
      ) ||
      $("img")
        .first()
        .attr("src");

    // ========================================================
    // STATE
    // ========================================================

    const state =
      detectIndianState(
        `
        ${city || ""}
        ${address || ""}
        ${venue || ""}
        ${bodyText}
        `
      );

    // ========================================================
    // TECHNOLOGIES
    // ========================================================

    const technologies =
      detectTechnologies(
        `
        ${title}
        ${description}
        ${bodyText}
        `
      );

    // ========================================================
    // THEMES
    // ========================================================

    const themes =
      detectThemes(
        `
        ${title}
        ${description}
        ${bodyText}
        `
      );

    // ========================================================
    // MODE
    // ========================================================

    const mode =
      detectMode(
        `
        ${title}
        ${description}
        ${bodyText}
        `
      );

    // ========================================================
    // ID
    // ========================================================

    const id =
      createId(
        title,
        listing.eventUrl
      );

    // ========================================================
    // FINAL EVENT OBJECT
    // ========================================================

    const event:
      HackathonEvent = {
      id,

      title,

      eventType,

      startDate,

      endDate,

      organizer:
        college,

      college,

      city,

      state,

      country:
        "India",

      venue,

      address,

      description,

      eligibility,

      prize,

      registrationFee,

      registrationDeadline,

      registrationUrl:
        registrationUrl ||
        undefined,

      // Preserve the original Knowafest detail page URL
      sourceUrl:
        listing.eventUrl,

      eventUrl:
        listing.eventUrl,

      posterImage:
        posterImage
          ? absoluteUrl(
            posterImage
          )
          : undefined,

      source:
        SOURCE_NAME,

      sourceId:
        id,

      mode,

      technologies,

      themes,

      scrapedAt:
        new Date()
          .toISOString(),
    };

    return event;
  } catch (
  error: any
  ) {
    console.error(
      ` ✗ Failed: ${listing.title}`
    );

    console.error(
      error?.message ||
      error
    );

    return null;
  }
}

// ============================================================
// INDIAN STATE DETECTION
// ============================================================

function detectIndianState(
  text: string
): string | undefined {
  const value =
    text.toLowerCase();

  const states:
    Record<string, string> =
  {
    // Tamil Nadu
    "tamil nadu":
      "Tamil Nadu",

    tamilnadu:
      "Tamil Nadu",

    chennai:
      "Tamil Nadu",

    coimbatore:
      "Tamil Nadu",

    madurai:
      "Tamil Nadu",

    salem:
      "Tamil Nadu",

    erode:
      "Tamil Nadu",

    tiruchengode:
      "Tamil Nadu",

    tiruchirappalli:
      "Tamil Nadu",

    trichy:
      "Tamil Nadu",

    tirunelveli:
      "Tamil Nadu",

    thanjavur:
      "Tamil Nadu",

    vellore:
      "Tamil Nadu",

    namakkal:
      "Tamil Nadu",

    hosur:
      "Tamil Nadu",

    // Karnataka
    karnataka:
      "Karnataka",

    bangalore:
      "Karnataka",

    bengaluru:
      "Karnataka",

    mysore:
      "Karnataka",

    mangalore:
      "Karnataka",

    hubli:
      "Karnataka",

    // Kerala
    kerala:
      "Kerala",

    kochi:
      "Kerala",

    ernakulam:
      "Kerala",

    trivandrum:
      "Kerala",

    thiruvananthapuram:
      "Kerala",

    // Maharashtra
    maharashtra:
      "Maharashtra",

    mumbai:
      "Maharashtra",

    pune:
      "Maharashtra",

    nagpur:
      "Maharashtra",

    // Telangana
    telangana:
      "Telangana",

    hyderabad:
      "Telangana",

    // Andhra Pradesh
    "andhra pradesh":
      "Andhra Pradesh",

    vijayawada:
      "Andhra Pradesh",

    visakhapatnam:
      "Andhra Pradesh",

    // Delhi
    delhi:
      "Delhi",

    // Uttar Pradesh
    "uttar pradesh":
      "Uttar Pradesh",

    noida:
      "Uttar Pradesh",

    lucknow:
      "Uttar Pradesh",

    kanpur:
      "Uttar Pradesh",

    // Haryana
    haryana:
      "Haryana",

    gurgaon:
      "Haryana",

    gurugram:
      "Haryana",

    faridabad:
      "Haryana",

    // Gujarat
    gujarat:
      "Gujarat",

    ahmedabad:
      "Gujarat",

    surat:
      "Gujarat",

    vadodara:
      "Gujarat",

    // Rajasthan
    rajasthan:
      "Rajasthan",

    jaipur:
      "Rajasthan",

    udaipur:
      "Rajasthan",

    // West Bengal
    "west bengal":
      "West Bengal",

    kolkata:
      "West Bengal",

    // Odisha
    odisha:
      "Odisha",

    bhubaneswar:
      "Odisha",

    // Punjab
    punjab:
      "Punjab",

    // Chandigarh
    chandigarh:
      "Chandigarh",

    // Bihar
    bihar:
      "Bihar",

    patna:
      "Bihar",

    // Jharkhand
    jharkhand:
      "Jharkhand",

    ranchi:
      "Jharkhand",

    // Assam
    assam:
      "Assam",

    guwahati:
      "Assam",

    // Madhya Pradesh
    "madhya pradesh":
      "Madhya Pradesh",

    bhopal:
      "Madhya Pradesh",

    indore:
      "Madhya Pradesh",

    // Chhattisgarh
    chhattisgarh:
      "Chhattisgarh",

    raipur:
      "Chhattisgarh",

    // Goa
    goa:
      "Goa",

    panaji:
      "Goa",

    // Uttarakhand
    uttarakhand:
      "Uttarakhand",

    dehradun:
      "Uttarakhand",

    // Himachal Pradesh
    "himachal pradesh":
      "Himachal Pradesh",

    shimla:
      "Himachal Pradesh",

    // Jammu & Kashmir
    "jammu and kashmir":
      "Jammu and Kashmir",

    srinagar:
      "Jammu and Kashmir",
  };

  for (
    const [
      keyword,
      state,
    ] of Object.entries(
      states
    )
  ) {
    if (
      value.includes(
        keyword
      )
    ) {
      return state;
    }
  }

  return undefined;
}

// ============================================================
// PAGINATION
// ============================================================

function buildPageUrl(
  page: number
): string {
  if (page === 1) {
    return HACKATHON_CATEGORY_URL;
  }

  return `${HACKATHON_CATEGORY_URL}?page=${page}`;
}

// ============================================================
// LOAD EXISTING JSON
// ============================================================

function loadExistingEvents():
  HackathonEvent[] {
  if (
    !fs.existsSync(
      OUTPUT_FILE
    )
  ) {
    return [];
  }

  try {
    const raw =
      fs.readFileSync(
        OUTPUT_FILE,
        "utf-8"
      );

    const parsed =
      JSON.parse(raw);

    if (
      Array.isArray(parsed)
    ) {
      return parsed.filter(
        (event: HackathonEvent) =>
          event &&
          event.title &&
          !event.title.includes("Participate in Events")
      );
    }

    return [];
  } catch (
  error
  ) {
    console.warn(
      "Could not read existing hackathons.json."
    );

    return [];
  }
}

// ============================================================
// DATE SORTING
// ============================================================

function parseKnowafestDate(
  value?: string
): Date {
  if (!value) {
    return new Date(
      "9999-12-31"
    );
  }

  const match =
    value.match(
      /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})/i
    );

  if (!match) {
    return new Date(
      "9999-12-31"
    );
  }

  const day =
    match[1];

  const month =
    match[2];

  const year =
    match[3];

  const date =
    new Date(
      `${day} ${month} ${year}`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return new Date(
      "9999-12-31"
    );
  }

  return date;
}

// ============================================================
// MAIN
// ============================================================

async function run() {
  console.log("");

  console.log(
    "================================================"
  );

  console.log(
    "       KNOWAFEST HACKATHON SCRAPER"
  );

  console.log(
    "================================================"
  );

  console.log("");

  console.log(
    `Source: ${HACKATHON_CATEGORY_URL}`
  );

  console.log(
    `Output: ${OUTPUT_FILE}`
  );

  console.log(
    `Maximum pages: ${MAX_PAGES}`
  );

  console.log("");

  // ==========================================================
  // CREATE OUTPUT DIRECTORY
  // ==========================================================

  if (
    !fs.existsSync(
      OUTPUT_DIR
    )
  ) {
    fs.mkdirSync(
      OUTPUT_DIR,
      {
        recursive: true,
      }
    );
  }

  // ==========================================================
  // LOAD EXISTING EVENTS
  // ==========================================================

  const existingEvents =
    loadExistingEvents();

  console.log(
    `Loaded ${existingEvents.length} existing events.`
  );

  // ==========================================================
  // EVENT MAP
  // ==========================================================

  const eventMap =
    new Map<
      string,
      HackathonEvent
    >();

  for (
    const event of
    existingEvents
  ) {
    if (
      event &&
      event.id
    ) {
      eventMap.set(
        event.id,
        event
      );
    }
  }

  // ==========================================================
  // PAGINATION
  // ==========================================================

  let emptyPages = 0;

  let totalListings = 0;

  let totalScraped = 0;

  let totalFailed = 0;

  for (
    let page = 1;
    page <= MAX_PAGES;
    page++
  ) {
    const pageUrl =
      buildPageUrl(page);

    console.log("");

    console.log(
      "------------------------------------------------"
    );

    console.log(
      `SCRAPING PAGE ${page}/${MAX_PAGES}`
    );

    console.log(
      pageUrl
    );

    console.log(
      "------------------------------------------------"
    );

    try {
      // ------------------------------------------------------
      // FETCH CATEGORY PAGE
      // ------------------------------------------------------

      const html =
        await fetchPage(
          pageUrl
        );

      // ------------------------------------------------------
      // EXTRACT EVENTS
      // ------------------------------------------------------

      const listings =
        extractListingEvents(
          html
        );

      console.log(
        `Found ${listings.length} event links.`
      );

      totalListings +=
        listings.length;

      // ------------------------------------------------------
      // EMPTY PAGE
      // ------------------------------------------------------

      if (
        listings.length === 0
      ) {
        emptyPages++;

        console.log(
          `Empty page count: ${emptyPages}`
        );

        if (
          emptyPages >= 3
        ) {
          console.log("");

          console.log(
            "No events found for 3 consecutive pages."
          );

          console.log(
            "Stopping pagination."
          );

          break;
        }

        await sleep(
          DELAY_BETWEEN_REQUESTS
        );

        continue;
      }

      emptyPages = 0;

      // ------------------------------------------------------
      // SCRAPE EACH EVENT
      // ------------------------------------------------------

      for (
        const listing of
        listings
      ) {
        /*
          Avoid unnecessary duplicate
          detail-page requests if the
          event already exists.
        */

        const existingId =
          createId(
            listing.title,
            listing.eventUrl
          );

        if (
          eventMap.has(
            existingId
          )
        ) {
          console.log(
            ` ↻ Updating: ${listing.title}`
          );
        }

        const event =
          await scrapeEventDetails(
            listing
          );

        if (!event) {
          totalFailed++;

          await sleep(
            DELAY_BETWEEN_REQUESTS
          );

          continue;
        }

        eventMap.set(
          event.id,
          event
        );

        totalScraped++;

        console.log(
          ` ✓ Saved: ${event.title}`
        );

        await sleep(
          DELAY_BETWEEN_REQUESTS
        );
      }
    } catch (
    error: any
    ) {
      console.error("");

      console.error(
        ` ✗ Page ${page} failed`
      );

      console.error(
        error?.message ||
        error
      );
    }

    // --------------------------------------------------------
    // PAGE DELAY
    // --------------------------------------------------------

    await sleep(
      DELAY_BETWEEN_REQUESTS
    );
  }

  // ==========================================================
  // CONVERT MAP TO ARRAY
  // ==========================================================

  const events =
    Array.from(
      eventMap.values()
    );

  // ==========================================================
  // SORT EVENTS BY START DATE
  // ==========================================================

  events.sort(
    (a, b) => {
      const dateA =
        parseKnowafestDate(
          a.startDate
        );

      const dateB =
        parseKnowafestDate(
          b.startDate
        );

      return (
        dateA.getTime() -
        dateB.getTime()
      );
    }
  );

  // ==========================================================
  // REMOVE DUPLICATES
  // ==========================================================

  const uniqueEvents =
    Array.from(
      new Map(
        events.map(
          (event) => [
            event.id,
            event,
          ]
        )
      ).values()
    );

  // ==========================================================
  // SAVE JSON
  // ==========================================================

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      uniqueEvents,
      null,
      2
    ),
    "utf-8"
  );

  // ==========================================================
  // FINAL REPORT
  // ==========================================================

  console.log("");

  console.log(
    "================================================"
  );

  console.log(
    "           SCRAPING COMPLETE"
  );

  console.log(
    "================================================"
  );

  console.log(
    `Pages checked: ${MAX_PAGES}`
  );

  console.log(
    `Event links found: ${totalListings}`
  );

  console.log(
    `Events scraped/updated: ${totalScraped}`
  );

  console.log(
    `Failed events: ${totalFailed}`
  );

  console.log(
    `Total unique hackathons: ${uniqueEvents.length}`
  );

  console.log("");

  console.log(
    `JSON saved to:`
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "================================================"
  );

  console.log("");
}

// ============================================================
// START SCRAPER
// ============================================================

run().catch(
  (error) => {
    console.error("");

    console.error(
      "================================================"
    );

    console.error(
      "FATAL SCRAPER ERROR"
    );

    console.error(
      "================================================"
    );

    console.error(error);

    process.exit(1);
  }
);