import React, { useEffect, useRef, useState } from "react";

export default function SplitPreviewLayout({
  form,
  preview,
  defaultSplit = 50,
  storageKey,
}: {
  form: React.ReactNode;
  preview: React.ReactNode;
  defaultSplit?: number;
  storageKey?: string;
}) {
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
      {/* FORM PANE */}
      <div className="cms-resizable-left">{form}</div>

      {/* DRAG RESIZE SASH */}
      <div
        className={`cms-resizable-divider ${isDragging ? "active" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        title="Geser untuk mengatur lebar form & preview"
      >
        <div className="cms-divider-handle" />
      </div>

      {/* PREVIEW PANE */}
      <div className="cms-resizable-right">
        <div className="cms-preview-sticky">
          <div className="cms-preview-content pub-root">
            <div className="cms-device-stage">{preview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
