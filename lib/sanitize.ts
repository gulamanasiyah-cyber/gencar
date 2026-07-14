/**
 * Input sanitization utilities — defence-in-depth against
 * XSS, prompt injection, and SQL meta-character abuse.
 *
 * Usage:
 *   import { sanitizeString, detectPromptInjection, sanitizeObject } from "@/lib/sanitize";
 */

/** Strip HTML tags, escape characters, and trim whitespace */
export function sanitizeString(input: string): string {
  // Melakukan sanitize secara berulang (recursive replace) untuk menangani XSS evasion
  // seperti <scr<script>ipt> yang sering mengecoh regex sederhana.
  let previous = "";
  let current = input;

  while (current !== previous) {
    previous = current;
    current = current
      .replace(/<[^>]*>/g, "")             // strip HTML tags
      .replace(/javascript\s*:/gi, "")     // strip javascript: protocol beserta spasinya
      .replace(/vbscript\s*:/gi, "")       // strip vbscript: protocol
      .replace(/data\s*:[^,]+,/gi, "")     // pencegahan eksekusi payload base64 di href/src
      .replace(/on\w+\s*=/gi, "");         // strip inline event handlers (onclick=, onerror=, etc.)
  }

  return current
    .replace(/&lt;/gi, "")       // strip encoded < 
    .replace(/&gt;/gi, "")       // strip encoded >
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
 * Deep-sanitize all string fields in a plain object or array.
 * Mampu menembus objek tersarang (nested objects) dan Array.
 *
 * @throws Error if prompt injection is detected in any field
 */
export function sanitizeObject(
  obj: any,
  options: { throwOnInjection?: boolean } = { throwOnInjection: true }
): any {
  // Handle tipe primitif teratas
  if (obj === null || obj === undefined || typeof obj !== "object") {
    if (typeof obj === "string") {
      if (options.throwOnInjection && detectPromptInjection(obj)) {
        throw new Error(`Input ditolak — terdeteksi konten mencurigakan`);
      }
      return sanitizeString(obj);
    }
    return obj;
  }

  // Handle Array (Penting untuk payload JSON yang merupakan list data)
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  // Handle Object
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (options.throwOnInjection && detectPromptInjection(value)) {
        throw new Error(
          `Input ditolak — terdeteksi konten mencurigakan pada field "${key}"`
        );
      }
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      // Rekursif untuk membersihkan nested JSON Object/Array
      result[key] = sanitizeObject(value, options);
    } else {
      result[key] = value;
    }
  }

  return result;
}
