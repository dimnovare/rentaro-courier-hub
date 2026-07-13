const FILTERED_TOKEN = "%5BFiltered%5D";
const FEEDBACK_TOKEN_HEADER = "x-rentaro-feedback-token";
const TOKEN_LINK = /([?&#]token=)[^&#\s"'<>]*/gi;

/**
 * Sentry events, breadcrumbs and spans are plain serializable objects. Walk
 * their string values before transmission so a signed feedback link can never
 * leave the browser through telemetry.
 */
export function redactSentryTokens<T>(value: T): T {
  return redact(value, new WeakSet<object>());
}

function redact<T>(value: T, seen: WeakSet<object>): T {
  if (typeof value === "string") {
    return value.replace(TOKEN_LINK, `$1${FILTERED_TOKEN}`) as T;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = redact(value[index], seen);
    }
    return value;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    record[key] =
      key.toLowerCase() === FEEDBACK_TOKEN_HEADER
        ? "[Filtered]"
        : redact(record[key], seen);
  }
  return value;
}
