import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export function Select({
  value, onChange, options, className, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuH, setMenuH] = useState(0);
  const triggerId = useRef(`select-${Math.random().toString(36).slice(2, 8)}`);
  const listboxId = `${triggerId.current}-listbox`;
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(menuRef.current && menuRef.current.contains(target))) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    if (open && menuRef.current) setMenuH(menuRef.current.offsetHeight);
  }, [open, options]);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((prev) => {
        const n = options.length;
        if (n === 0) return -1;
        if (e.key === "ArrowDown") return prev < n - 1 ? prev + 1 : 0;
        return prev > 0 ? prev - 1 : n - 1;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      if (open) setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (open) setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && activeIndex >= 0) {
        onChange(options[activeIndex]!.value);
        setOpen(false);
      } else setOpen((o) => !o);
    }
  };

  const triggerRect = open ? ref.current?.getBoundingClientRect() : null;
  const openUp = triggerRect ? triggerRect.bottom + menuH + 6 > window.innerHeight : false;

  return (
    <div className={`select ${className ?? ""}`} data-open={open} ref={ref}>
      <button
        type="button"
        id={triggerId.current}
        className="select-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-label={ariaLabel}
      >
        <span>{current?.label ?? "Pilih"}</span>
        <ChevronDown size={14} />
      </button>
      {open && triggerRect && createPortal(
        <div
          ref={menuRef}
          className="select-menu"
          role="listbox"
          id={listboxId}
          aria-labelledby={triggerId.current}
          style={{ position: "fixed", top: menuH ? (openUp ? triggerRect.top - menuH - 6 : triggerRect.bottom + 6) : -9999, left: triggerRect.left, width: triggerRect.width, zIndex: 9999 }}
        >
          {options.map((o, idx) => (
            <button
              key={o.value}
              id={`${listboxId}-opt-${idx}`}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`select-option ${o.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default Select;
