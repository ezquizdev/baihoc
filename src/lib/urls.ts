export function sanitizeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function firstHeaderValue(headers: Headers, name: string): string | null {
  const raw = headers.get(name);
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

export function getPublicOrigin(
  headers: Headers,
  fallbackOrigin: string,
): string {
  const forwardedHost = firstHeaderValue(headers, "x-forwarded-host");
  const hostHeader = firstHeaderValue(headers, "host");
  const host = forwardedHost ?? hostHeader;
  const proto = firstHeaderValue(headers, "x-forwarded-proto");

  if (host && proto) return `${proto}://${host}`;
  if (forwardedHost) return `https://${forwardedHost}`;
  if (hostHeader) return `${new URL(fallbackOrigin).protocol}//${hostHeader}`;
  return fallbackOrigin;
}
