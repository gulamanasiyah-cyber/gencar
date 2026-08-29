import React, { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

export type DeviceMode = "mobile" | "tablet" | "desktop" | "free";

export default function ResizablePreviewPane({
  title = "Live Preview",
  badge = "Faithful CSS",
  children,
  defaultSplit = 50,
  storageKey,
}: {
  title?: string;
  badge?: string;
  children: React.ReactNode;
  defaultSplit?: number; // percentage width for left form pane
  storageKey?: string;
}) {
  const [device, setDevice] = useState<DeviceMode>("free");
  const [splitPct, setSplitPct] = useState<number>(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(`split_${storageKey}`);
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= 25 && parsed <= 75) return parsed;
      }
    }
    return defaultSplit;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPct = (relativeX / rect.width) * 100;
      const clamped = Math.max(25, Math.min(75, newPct));
      setSplitPct(clamped);
      if (storageKey) {
        localStorage.setItem(`split_${storageKey}`, clamped.toFixed(1));
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    if (isDragging) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, storageKey]);

  return (
    <div
      ref={containerRef}
      className={`cms-resizable-container ${isDragging ? "is-resizing" : ""}`}
      style={
        {
          "--form-width": `${splitPct}%`,
          "--preview-width": `${100 - splitPct}%`,
        } as React.CSSProperties
      }
    >
      {/* LEFT PANE (Children form must be first child) */}
      <div className="cms-resizable-left">{children}</div>

      {/* DRAG DIVIDER / SASH */}
      <div
        className={`cms-resizable-divider ${isDragging ? "active" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        title="Geser untuk resize lebar form & preview"
      >
        <div className="cms-divider-handle" />
      </div>

      {/* RIGHT PANE (Preview) */}
      <div className="cms-resizable-right">
        <div className="cms-preview-sticky">
          <div className="cms-preview-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{title}</span>
              <span className="pill pill-slate" style={{ fontSize: 9, padding: "2px 6px" }}>{badge}</span>
            </div>

            {/* Device Switcher */}
            <div className="cms-device-switcher">
              <button
                type="button"
                className={`cms-device-btn ${device === "mobile" ? "active" : ""}`}
                onClick={() => setDevice("mobile")}
                title="Tampilan HP (375px)"
                aria-label="Tampilan HP"
              >
                <Smartphone size={13} />
              </button>
              <button
                type="button"
                className={`cms-device-btn ${device === "tablet" ? "active" : ""}`}
                onClick={() => setDevice("tablet")}
                title="Tampilan Tablet (768px)"
                aria-label="Tampilan Tablet"
              >
                <Tablet size={13} />
              </button>
              <button
                type="button"
                className={`cms-device-btn ${device === "desktop" ? "active" : ""}`}
                onClick={() => setDevice("desktop")}
                title="Tampilan Desktop (100%)"
                aria-label="Tampilan Desktop"
              >
                <Monitor size={13} />
              </button>
            </div>
          </div>

          <div className={`cms-preview-content pub-root device-mode--${device}`}>
            <div className="cms-preview-scaler">{/* Child element containing the preview */}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
