export type IqairErrorKind =
  /** Too many calls too quickly, or a daily/monthly quota is used up. */
  | "rate-limited"
  /** Missing, wrong or expired API key, or an endpoint outside the plan. */
  | "configuration"
  | "not-found"
  /** Network failure, timeout, unexpected status or malformed payload. */
  | "upstream";

export class IqairError extends Error {
  readonly kind: IqairErrorKind;
  /** For rate limits: true when a daily or monthly quota is exhausted, not just the pace. */
  readonly quotaExhausted: boolean;
  /** True when we chose not to call IQAir at all (pacing or backoff), so there is nothing to log. */
  readonly deferred: boolean;

  constructor(
    kind: IqairErrorKind,
    message: string,
    options: { quotaExhausted?: boolean; deferred?: boolean } = {},
  ) {
    super(message);
    this.name = "IqairError";
    this.kind = kind;
    this.quotaExhausted = options.quotaExhausted ?? false;
    this.deferred = options.deferred ?? false;
    // Next.js logs failed background cache refreshes; keep deferrals to one line.
    if (this.deferred) this.stack = `${this.name}: ${message}`;
  }
}

/** Maps IQAir's `data.message` codes to an error kind. */
export function classifyIqairMessage(message: string): IqairErrorKind {
  const code = message.toLowerCase();
  if (
    code.includes("call_limit_reached") ||
    code.includes("too_many_requests") ||
    code.includes("too many requests")
  ) {
    return "rate-limited";
  }
  if (
    code.includes("incorrect_api_key") ||
    code.includes("api_key_expired") ||
    code.includes("permission_denied") ||
    code.includes("feature_not_available")
  ) {
    return "configuration";
  }
  if (code.includes("city_not_found") || code.includes("no_nearest")) {
    return "not-found";
  }
  return "upstream";
}

/** `call_limit_reached` means a quota is spent; "Too Many Requests" only means "slow down". */
export function isQuotaMessage(message: string): boolean {
  return message.toLowerCase().includes("call_limit_reached");
}
