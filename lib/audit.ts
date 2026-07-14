/**
 * Audit Logging Service
 * Digunakan untuk mencatat aktivitas penting (security events, logins, data access)
 * Untuk tahap produksi, log ini bisa dikirim ke layanan eksternal seperti Sentry, Datadog, atau database.
 */

export function logAuditActivity(
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "SECURITY_ALERT" | "DATA_MODIFIED",
  user: { email: string; id?: string; role?: string } | "GUEST",
  details: Record<string, any>
) {
  // 1. Log Redaction (Penyensoran Data Sensitif)
  // Mencegah password atau token secara tidak sengaja tercetak di server log.
  const SENSITIVE_KEYS = ["password", "token", "secret", "authorization", "cookie"];
  
  const maskSensitiveData = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(maskSensitiveData);
    
    const maskedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        maskedObj[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        maskedObj[key] = maskSensitiveData(value);
      } else {
        maskedObj[key] = value;
      }
    }
    return maskedObj;
  };

  const safeDetails = maskSensitiveData(details);

  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    action,
    user,
    details: safeDetails,
  };

  // Dalam level production, ini dikirim ke secure logging server.
  // Untuk saat ini, kita log di server environment. (Next.js server-side)
  if (process.env.NODE_ENV !== "production") {
    console.log("[AUDIT LOG]", JSON.stringify(logEntry, null, 2));
  } else {
    // Pada production, JSON stringified digunakan agar sistem monitoring CloudWatch/Datadog mudah membaca.
    console.log(JSON.stringify({ severity: "INFO", source: "AuthAudit", ...logEntry }));
  }
}
