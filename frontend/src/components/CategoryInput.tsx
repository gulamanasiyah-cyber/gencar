import { useState, useEffect, useRef } from "react";

export default function CategoryInput({
  value,
  onChange,
  existingCategories,
  placeholder = "Ketik atau pilih...",
}: {
  value: string;
  onChange: (v: string) => void;
  existingCategories: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 0 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, borderRadius: "12px 0 0 12px", borderRight: "none" }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "0 10px",
            borderRadius: "0 12px 12px 0",
            border: "1px solid var(--line)",
            background: "#f8fafc",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
          }}
          aria-label="Tampilkan kategori"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(17,17,24,0.12)",
            overflow: "hidden",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {existingCategories.map((k) => (
            <button
              key={k}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderBottom: "1px solid var(--line)",
                background: value.toLowerCase() === k.toLowerCase() ? "var(--primary-subtle, #fff1e6)" : "#fff",
                color: value.toLowerCase() === k.toLowerCase() ? "var(--primary)" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              <span>{k}</span>
              {value.toLowerCase() === k.toLowerCase() && (
                <span style={{ color: "var(--primary)", fontSize: 14, fontWeight: 800 }}>✓</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              background: "#fff",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            ✕ Hapus pilihan
          </button>
        </div>
      )}
    </div>
  );
}
