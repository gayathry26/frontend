/**
 * Utility functions for validating and sanitizing event registration URLs.
 * Strictly prevents placeholder, fake, or generated URLs (e.g. example.com).
 */

const BLOCKED_HOSTNAMES = [
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'test.com',
  'dummy.com'
];

/**
 * Generic platform homepages and top-level listing pages that are NOT event-specific URLs.
 * A registration URL pointing to any of these is invalid — it means the system is
 * directing students to a general listing page instead of the specific event page.
 *
 * Format: "hostname::path" (path without trailing slash, lowercased)
 */
const GENERIC_PLATFORM_PAGES = new Set([
  // Devfolio generic pages
  'devfolio.co::',
  'devfolio.co::/hackathons',
  'devfolio.co::/explore',
  // Unstop generic pages
  'unstop.com::',
  'unstop.com::/hackathons',
  'unstop.com::/competitions',
  'unstop.com::/opportunities',
  'unstop.com::/jobs',
  // Devpost generic pages
  'devpost.com::',
  'devpost.com::/hackathons',
  // HackerEarth generic pages
  'hackerearth.com::',
  'www.hackerearth.com::',
  'www.hackerearth.com::/challenges',
  // MLH generic pages
  'mlh.io::',
  'mlh.io::/events',
  // Hack2Skill generic pages
  'hack2skill.com::',
  'hack2skill.com::/events',
]);

export function isPlaceholderUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return true;

  const lower = url.toLowerCase().trim();

  // Check explicit blocked hostnames & keywords
  if (BLOCKED_HOSTNAMES.some(blocked => lower.includes(blocked))) {
    return true;
  }

  // Check for dummy pattern variations
  if (
    lower.includes('/register/dummy') ||
    lower.includes('/register/test') ||
    lower.includes('/register/fake') ||
    lower.includes('/register/example')
  ) {
    return true;
  }

  // Check for generic platform pages (homepage / top-level listing)
  try {
    const parsed = new URL(url);
    const key = `${parsed.hostname.toLowerCase()}::${parsed.pathname.replace(/\/+$/, '').toLowerCase()}`;
    if (GENERIC_PLATFORM_PAGES.has(key)) {
      return true;
    }
  } catch {
    return true; // Unparseable = invalid
  }

  return false;
}


export function isValidHttpUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  if (isPlaceholderUrl(url)) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

export function validateRegistrationUrl(url?: string | null): {
  registrationUrl: string | null;
  registrationAvailable: boolean;
} {
  if (!url || isPlaceholderUrl(url) || !isValidHttpUrl(url)) {
    return {
      registrationUrl: null,
      registrationAvailable: false
    };
  }

  return {
    registrationUrl: url.trim(),
    registrationAvailable: true
  };
}
