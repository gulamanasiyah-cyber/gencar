import { useEffect, useId, useRef } from "react";
import { X as IcoX } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  maxWidth,
  className,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${className ?? ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <strong className="modal-title" id={titleId}>
            {title}
          </strong>
          <button ref={closeRef} className="btn-close" aria-label="Tutup" onClick={onClose}>
            <IcoX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
