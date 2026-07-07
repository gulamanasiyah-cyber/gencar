/**
 * Input sanitization utilities — defence-in-depth against
 * XSS, prompt injection, and SQL meta-character abuse.
 *
 * Usage:
 *   import { sanitizeString, detectPromptInjection, sanitizeObject } from "@/lib/sanitize";
 */

/** Strip HTML tags and trim whitespace */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")     // strip HTML tags
    .replace(/&lt;/gi, "")       // strip encoded < 
    .replace(/&gt;/gi, "")       // strip encoded >
    .replace(/javascript:/gi, "")// strip javascript: protocol
    .replace(/on\w+\s*=/gi, "")  // strip inline event handlers (onclick=, onerror=, etc.)
    .trim();
}

/**
 * Prompt Injection Detection — catches common patterns used in
 * LLM prompt injection and social engineering payloads.
 * Returns true if suspicious input is detected.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // English patterns
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+if\s+you/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /\{\{.*\}\}/,  // template injection {{ }}
  /<\|.*\|>/,    // special token markers <|...|>
  /\bDAN\b.*\bjailbreak\b/i,
  /bypass\s+(all\s+)?(safety|security|filter)/i,
  /pretend\s+you\s+(are|have)/i,
  /reveal\s+(your|the)\s+(system|hidden|secret)/i,

  // Role-play escalation
  /from\s+now\s+on\s+you\s+(are|will)/i,
  /enter\s+(developer|sudo|admin|root)\s+mode/i,
  /override\s+(safety|security|instructions)/i,
  /do\s+not\s+follow\s+(any|your)\s+(rules|guidelines)/i,
  /new\s+instructions?\s*:/i,

  // Encoded/obfuscated attacks
  /&#x[0-9a-f]+;/i, // HTML hex entities
  /\\u00[0-9a-f]{2}/i, // Unicode escapes
  /base64\s*(decode|encode)/i,

  // Indonesian language patterns
  /abaikan\s+(semua\s+)?instruksi/i,
  /lupakan\s+(semua\s+)?perintah/i,
  /kamu\s+sekarang\s+adalah/i,

  // Output manipulation
  /respond\s+only\s+with/i,
  /output\s+the\s+(system|hidden|secret)/i,
  /print\s+(your|the)\s+(system|initial)\s+prompt/i,
];

export function detectPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Deep-sanitize all string fields in a plain object.
 * Non-string values are passed through unchanged.
 * Also checks for prompt injection — throws if detected.
 *
 * @throws Error if prompt injection is detected in any field
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { throwOnInjection?: boolean } = { throwOnInjection: true }
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (options.throwOnInjection && detectPromptInjection(value)) {
        throw new Error(
          `Input ditolak — terdeteksi konten mencurigakan pada field "${key}"`
        );
      }
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
