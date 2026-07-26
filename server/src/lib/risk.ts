import { isIP } from 'node:net';

/**
 * Heuristic risk scoring for a short link.
 *
 * This is triage, not a verdict. It exists to float the links a moderator
 * should look at first, and every score is explained by named signals so the
 * operator can see exactly why something was flagged rather than trusting a
 * number. Nothing here blocks a link on its own.
 */

export type RiskLevel = 'clean' | 'low' | 'suspicious' | 'high';

export interface RiskSignal {
  code: string;
  label: string;
  weight: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
}

/**
 * Dynamic-DNS and free-subdomain providers. Legitimate uses exist, but they are
 * overwhelmingly common in phishing because anyone can get a hostname in
 * seconds and burn it just as fast.
 */
const DYNAMIC_DNS_HOSTS = [
  // afraid.org FreeDNS public domains, heavily used in credential phishing.
  'strangled.net',
  'jumpingcrab.com',
  'crabdance.com',
  'twilightparadox.com',
  'chickenkiller.com',
  'mooo.com',
  'ignorelist.com',
  'fartit.com',
  'ftpaccess.cc',
  'gotdns.ch',
  'mine.nu',
  'my03.com',
  'ns01.info',
  'ns02.info',
  'us.to',
  'epac.to',
  'no-ip.org',
  'no-ip.com',
  'no-ip.biz',
  'noip.me',
  'ddns.net',
  'hopto.org',
  'zapto.org',
  'serveo.net',
  'duckdns.org',
  'ngrok.io',
  'ngrok-free.app',
  'trycloudflare.com',
  'loca.lt',
  'localtunnel.me',
  'sytes.net',
  'redirectme.net',
  'myftp.org',
  'servebeer.com',
  'servequake.com',
  'dynu.net',
  'freedns.afraid.org',
  '000webhostapp.com',
  'weeblysite.com',
  'glitch.me',
  'repl.co',
  'pages.dev',
  'workers.dev',
  'vercel.app',
  'netlify.app',
  'web.app',
  'firebaseapp.com',
];

/** File hosts and shorteners that are frequently used to launder a payload. */
const RELAY_HOSTS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rebrand.ly', 'shorturl.at'];

/** Words that show up in credential-harvesting URLs far more than in ordinary ones. */
const PHISHING_TERMS = [
  'verify',
  'verification',
  'confirm',
  'secure',
  'signin',
  'login',
  'log-in',
  'account',
  'update',
  'unlock',
  'suspend',
  'billing',
  'invoice',
  'payment',
  'wallet',
  'seed',
  'recover',
  'authenticate',
  'validate',
  'reactivate',
  'limited',
  'unusual',
];

/** TLDs with a persistently high abuse rate relative to registration volume. */
const HIGH_ABUSE_TLDS = ['zip', 'mov', 'top', 'xyz', 'gq', 'cf', 'ml', 'tk', 'work', 'click', 'link', 'rest', 'cam'];

export interface RiskInput {
  destination: string;
  domain: string | null;
  reportCount: number;
  flagged: boolean;
  blacklisted: boolean;
  /** How many links the creating IP has made in total, when known. */
  creatorLinkCount?: number;
  /** How many of the creator's links are already blocked, when known. */
  creatorBlockedCount?: number;
}

/** Shannon entropy per character, used to spot machine-generated subdomains. */
function entropy(value: string): number {
  if (!value) return 0;
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);

  let total = 0;
  for (const count of counts.values()) {
    const p = count / value.length;
    total -= p * Math.log2(p);
  }
  return total;
}

function hostMatches(host: string, needle: string): boolean {
  return host === needle || host.endsWith(`.${needle}`);
}

export function assessLink(input: RiskInput): RiskAssessment {
  const signals: RiskSignal[] = [];
  const host = (input.domain ?? '').toLowerCase();
  const url = input.destination.toLowerCase();

  const add = (code: string, label: string, weight: number) => signals.push({ code, label, weight });

  /* ---------------------------- moderation state ------------------------- */

  if (input.blacklisted) add('blocked', 'Already blocked by a moderator', 100);
  if (input.flagged) add('flagged', 'Auto-flagged after repeated reports', 35);

  if (input.reportCount > 0) {
    // Diminishing returns: the first report matters most.
    const weight = Math.min(45, 18 + (input.reportCount - 1) * 9);
    add('reported', `${input.reportCount} abuse report${input.reportCount === 1 ? '' : 's'}`, weight);
  }

  /* ------------------------------ destination ---------------------------- */

  if (host) {
    if (DYNAMIC_DNS_HOSTS.some((entry) => hostMatches(host, entry))) {
      add('dynamic_dns', 'Dynamic DNS or free subdomain host', 30);
    }

    if (RELAY_HOSTS.some((entry) => hostMatches(host, entry))) {
      add('relay', 'Points at another URL shortener', 25);
    }

    if (host.startsWith('xn--') || host.includes('.xn--')) {
      add('punycode', 'Punycode domain, possible lookalike', 28);
    }

    if (isIP(host)) {
      add('ip_literal', 'Destination is a raw IP address', 32);
    }

    const tld = host.split('.').pop() ?? '';
    if (HIGH_ABUSE_TLDS.includes(tld)) {
      add('abusive_tld', `High-abuse TLD (.${tld})`, 16);
    }

    // A machine-generated leftmost label. Entropy alone is not enough: ordinary
    // English words like "biomasschippers" clear 3.2 easily. Requiring an
    // unusual consonant run as well separates "keirmxfnty" from a real name.
    const label = host.split('.')[0] ?? '';
    if (label.length >= 8 && entropy(label) > 3.0 && !/^(www|mail|shop|blog|app|api|cdn|static)$/.test(label)) {
      const longestConsonantRun = Math.max(
        0,
        ...(label.toLowerCase().match(/[^aeiouy0-9-]+/g) ?? []).map((run) => run.length),
      );
      if (longestConsonantRun >= 5) {
        add('random_subdomain', 'Machine-generated subdomain', 18);
      }
    }

    if (host.split('.').length >= 5) {
      add('deep_subdomain', 'Unusually deep subdomain nesting', 12);
    }
  }

  /* -------------------------------- the URL ------------------------------ */

  const matchedTerms = PHISHING_TERMS.filter((term) => url.includes(term));
  if (matchedTerms.length > 0) {
    const weight = Math.min(30, 14 + (matchedTerms.length - 1) * 6);
    add('phishing_terms', `Credential-harvesting wording (${matchedTerms.slice(0, 3).join(', ')})`, weight);
  }

  if (url.startsWith('http://')) {
    add('insecure', 'Destination is not HTTPS', 14);
  }

  if (input.destination.length > 500) {
    add('long_url', 'Very long URL', 8);
  }

  if (/@/.test(input.destination.replace(/^https?:\/\//, '').split('/')[0] ?? '')) {
    add('userinfo', 'Credentials embedded in the host', 30);
  }

  /* ------------------------------- creator ------------------------------- */

  if (input.creatorBlockedCount && input.creatorBlockedCount > 0) {
    add('creator_history', `Creator IP has ${input.creatorBlockedCount} blocked link(s)`, 30);
  }

  if (input.creatorLinkCount && input.creatorLinkCount >= 20) {
    add('creator_volume', `Creator IP made ${input.creatorLinkCount} links`, 14);
  }

  /* -------------------------------- total -------------------------------- */

  const score = Math.min(100, signals.reduce((total, signal) => total + signal.weight, 0));

  const level: RiskLevel = score >= 70 ? 'high' : score >= 40 ? 'suspicious' : score >= 18 ? 'low' : 'clean';

  return { score, level, signals: signals.sort((a, b) => b.weight - a.weight) };
}

/**
 * SQL-expressible subset of the heuristics above, used by the "needs review"
 * filter. It cannot cover entropy or creator history, so it is deliberately a
 * superset-free approximation: everything it matches does carry a real signal.
 */
export const SUSPICIOUS_DOMAIN_PATTERNS = DYNAMIC_DNS_HOSTS.map((host) => `%${host}`);
export const SUSPICIOUS_URL_PATTERNS = ['%verify%', '%signin%', '%login%', '%confirm%', '%unlock%', '%wallet%', '%suspend%'];
