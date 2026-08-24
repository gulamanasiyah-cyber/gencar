/** Ported from lib/audit.ts — framework agnostic, Workers-safe */
export function logAuditActivity(
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "SECURITY_ALERT" | "DATA_MODIFIED",
  user: { email: string; id?: string; role?: string } | "GUEST",
  details: Record<string, any>
) {
  const SENSITIVE_KEYS = ["password", "token", "secret", "authorization", "cookie"];
  const maskSensitiveData = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(maskSensitiveData);
    const maskedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) maskedObj[key] = "[REDACTED]";
      else if (typeof value === "object") maskedObj[key] = maskSensitiveData(value);
      else maskedObj[key] = value;
    }
    return maskedObj;
  };
  const safeDetails = maskSensitiveData(details);
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, action, user, details: safeDetails };
  console.log(JSON.stringify({ severity: "INFO", source: "AuthAudit", ...logEntry }));
}
