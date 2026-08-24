/** Ported from lib/sanitize.ts — no framework deps, safe for Workers */
export function sanitizeString(input: string): string {
  let previous = "";
  let current = input;
  while (current !== previous) {
    previous = current;
    current = current
      .replace(/<[^>]*>/g, "")
      .replace(/javascript\s*:/gi, "")
      .replace(/vbscript\s*:/gi, "")
      .replace(/data\s*:[^,]+,/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
  return current.replace(/&lt;/gi, "").replace(/&gt;/gi, "").trim();
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+if\s+you/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /\{\{.*\}\}/,
  /<\|.*\|>/,
  /\bDAN\b.*\bjailbreak\b/i,
  /bypass\s+(all\s+)?(safety|security|filter)/i,
  /pretend\s+you\s+(are|have)/i,
  /reveal\s+(your|the)\s+(system|hidden|secret)/i,
  /from\s+now\s+on\s+you\s+(are|will)/i,
  /enter\s+(developer|sudo|admin|root)\s+mode/i,
  /override\s+(safety|security|instructions)/i,
  /do\s+not\s+follow\s+(any|your)\s+(rules|guidelines)/i,
  /new\s+instructions?\s*:/i,
  /&#x[0-9a-f]+;/i,
  /\\u00[0-9a-f]{2}/i,
  /base64\s*(decode|encode)/i,
  /abaikan\s+(semua\s+)?instruksi/i,
  /lupakan\s+(semua\s+)?perintah/i,
  /kamu\s+sekarang\s+adalah/i,
  /respond\s+only\s+with/i,
  /output\s+the\s+(system|hidden|secret)/i,
  /print\s+(your|the)\s+(system|initial)\s+prompt/i,
];

export function detectPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeObject(obj: any, options: { throwOnInjection?: boolean } = { throwOnInjection: true }): any {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    if (typeof obj === "string") {
      if (options.throwOnInjection && detectPromptInjection(obj)) {
        throw new Error("Input ditolak — terdeteksi konten mencurigakan");
      }
      return sanitizeString(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, options));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (options.throwOnInjection && detectPromptInjection(value)) {
        throw new Error(`Input ditolak — terdeteksi konten mencurigakan pada field "${key}"`);
      }
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value, options);
    } else {
      result[key] = value;
    }
  }
  return result;
}
