import { useState, useMemo } from "react";

function IcoChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IcoChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string): { year: number; month: number; day: number } | null {
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1] - 1, day: parts[2] };
}

function formatIsoDisplay(iso: string) {
  const p = parseIso(iso);
  if (!p) return iso;
  return `${p.day} ${MONTHS_ID[p.month]?.slice(0, 3)} ${p.year}`;
}

export type KalenderProps = {
  mode?: "single" | "range";
  value?: Date | null;
  onChange?: (date: Date) => void;
  startDate?: string | null;
  endDate?: string | null;
  onChangeRange?: (startDate: string | null, endDate: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: string[];
  events?: { tanggal: string; label?: string; color?: string }[];
  presets?: boolean;
  className?: string;
};

export default function Kalender({
  mode = "single",
  value = null,
  onChange,
  startDate = null,
  endDate = null,
  onChangeRange,
  minDate,
  maxDate,
  disabledDates = [],
  events = [],
  presets = false,
  className = "",
}: KalenderProps) {
  const today = new Date();
  const initialParsed = startDate ? parseIso(startDate) : value ? { year: value.getFullYear(), month: value.getMonth(), day: value.getDate() } : null;
  const [viewYear, setViewYear] = useState(initialParsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialParsed?.month ?? today.getMonth());
  const [hoverIso, setHoverIso] = useState<string | null>(null);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = startDayOfWeek(viewYear, viewMonth);

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) arr.push(null);
    for (let d = 1; d <= totalDays; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [startDay, totalDays]);

  const eventMap = useMemo(() => {
    const m: Record<string, { label?: string; color?: string }> = {};
    for (const ev of events) m[ev.tanggal] = { label: ev.label, color: ev.color };
    return m;
  }, [events]);

  function isDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const iso = toIso(d);
    if (disabledDates.includes(iso)) return true;
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  }

  function isSingleSelected(day: number) {
    if (!value) return false;
    return value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;
  }

  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(day: number) {
    if (isDisabled(day)) return;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (mode === "range") {
      if (!onChangeRange) return;
      if (!startDate || (startDate && endDate)) {
        // Mulai seleksi rentang baru
        onChangeRange(iso, null);
      } else if (startDate && !endDate) {
        if (iso < startDate) {
          onChangeRange(iso, startDate);
        } else {
          onChangeRange(startDate, iso);
        }
      }
    } else {
      if (!onChange) return;
      onChange(new Date(viewYear, viewMonth, day));
    }
  }

  function applyPreset(type: "today" | "last7" | "next7" | "thisMonth" | "clear") {
    if (mode !== "range" || !onChangeRange) return;
    const now = new Date();
    if (type === "clear") {
      onChangeRange(null, null);
    } else if (type === "today") {
      const iso = toIso(now);
      onChangeRange(iso, iso);
    } else if (type === "last7") {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      onChangeRange(toIso(past), toIso(now));
    } else if (type === "next7") {
      const fut = new Date();
      fut.setDate(fut.getDate() + 6);
      onChangeRange(toIso(now), toIso(fut));
    } else if (type === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChangeRange(toIso(start), toIso(end));
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (mode === "single" && onChange) {
      onChange(today);
    }
  }

  return (
    <div className={`kalender ${className}`.trim()} style={{ width: "100%", maxWidth: "100%" }}>
      {presets && mode === "range" && (
        <div className="kalender-presets" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <button type="button" className="chip" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => applyPreset("today")}>
            Hari ini
          </button>
          <button type="button" className="chip" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => applyPreset("last7")}>
            7 Hari Terakhir
          </button>
          <button type="button" className="chip" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => applyPreset("next7")}>
            7 Hari Mendatang
          </button>
          <button type="button" className="chip" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => applyPreset("thisMonth")}>
            Bulan Ini
          </button>
          {(startDate || endDate) && (
            <button type="button" className="chip" style={{ fontSize: 11, padding: "3px 8px", color: "var(--primary)" }} onClick={() => applyPreset("clear")}>
              Reset
            </button>
          )}
        </div>
      )}

      <div className="kalender-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={prevMonth} aria-label="Bulan sebelumnya">
          <IcoChevronLeft />
        </button>
        <div className="kalender-title">
          <span className="kalender-month">{MONTHS_ID[viewMonth]}</span>
          <span className="kalender-year">{viewYear}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={nextMonth} aria-label="Bulan berikutnya">
          <IcoChevronRight />
        </button>
      </div>

      <div className="kalender-days-header">
        {DAYS_ID.map((d) => (
          <div key={d} className="kalender-day-label">{d}</div>
        ))}
      </div>

      <div className="kalender-grid" onMouseLeave={() => setHoverIso(null)}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="kalender-cell empty" />;
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const ev = eventMap[iso];
          const disabled = isDisabled(day);

          let isStart = false;
          let isEnd = false;
          let inRange = false;
          let inPreview = false;

          if (mode === "range") {
            if (startDate && endDate) {
              isStart = iso === startDate;
              isEnd = iso === endDate;
              inRange = iso > startDate && iso < endDate;
            } else if (startDate && !endDate) {
              isStart = iso === startDate;
              if (hoverIso) {
                if (hoverIso > startDate) {
                  inPreview = iso > startDate && iso <= hoverIso;
                } else if (hoverIso < startDate) {
                  inPreview = iso >= hoverIso && iso < startDate;
                }
              }
            }
          }

          const selected = mode === "range" ? (isStart || isEnd) : isSingleSelected(day);

          const classes = [
            "kalender-cell",
            disabled ? "disabled" : "",
            selected ? "selected" : "",
            isStart ? "range-start" : "",
            isEnd ? "range-end" : "",
            inRange ? "in-range" : "",
            inPreview ? "in-range-preview" : "",
            isToday(day) ? "today" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={iso}
              type="button"
              className={classes}
              onClick={() => selectDay(day)}
              onMouseEnter={() => {
                if (mode === "range" && startDate && !endDate) {
                  setHoverIso(iso);
                }
              }}
              disabled={disabled}
              title={ev?.label || iso}
            >
              <span className="kalender-day-num">{day}</span>
              {ev && <span className="kalender-event-dot" style={{ background: ev.color ?? "var(--primary)" }} />}
            </button>
          );
        })}
      </div>

      <div className="kalender-footer">
        <button type="button" className="btn btn-ghost btn-sm" onClick={goToToday}>Hari ini</button>
        {mode === "range" ? (
          <div className="muted" style={{ fontSize: 11, textAlign: "right", lineHeight: 1.3 }}>
            {startDate && endDate ? (
              startDate === endDate ? (
                formatIsoDisplay(startDate)
              ) : (
                `${formatIsoDisplay(startDate)} – ${formatIsoDisplay(endDate)}`
              )
            ) : startDate ? (
              <span>Mulai: <b>{formatIsoDisplay(startDate)}</b> (pilih akhir)</span>
            ) : (
              <span>Pilih rentang tanggal</span>
            )}
          </div>
        ) : (
          value && (
            <div className="muted" style={{ fontSize: 11 }}>
              {value.getDate()} {MONTHS_ID[value.getMonth()]} {value.getFullYear()}
            </div>
          )
        )}
      </div>
    </div>
  );
}
