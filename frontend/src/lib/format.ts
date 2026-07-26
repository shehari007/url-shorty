/** Shared formatting helpers. All dates from the API are UTC ISO strings. */

export function compactNumber(value: number | null | undefined): string {
  const n = value ?? 0;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('en-US');
}

export function fullNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('en-US');
}

export function formatDate(value: string | Date | null | undefined, fallback = 'Not set'): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined, fallback = 'Not set'): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value: string | Date | null | undefined, fallback = 'Never'): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secondsPerUnit] of units) {
    const amount = Math.floor(seconds / secondsPerUnit);
    if (amount >= 1) return formatter.format(-amount, unit);
  }
  return 'just now';
}

/** `https://example.com/very/long/path?x=1` → `example.com/very/long/path…` */
export function prettyUrl(url: string, maxLength = 60): string {
  const stripped = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength - 1)}…` : stripped;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Two-letter country code → flag emoji, via regional indicator symbols. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((char) => 0x1f1a5 + char.charCodeAt(0)),
  );
}
