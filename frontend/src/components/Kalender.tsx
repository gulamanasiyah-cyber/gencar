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

export type KalenderProps = {
  value?: Date | null;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: string[];
  events?: { tanggal: string; label?: string; color?: string }[];
};

export default function Kalender({
  value = null,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  events = [],
}: KalenderProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());

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
    const iso = d.toISOString().slice(0, 10);
    if (disabledDates.includes(iso)) return true;
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  }

  function isSelected(day: number) {
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
    if (isDisabled(day) || !onChange) return;
    onChange(new Date(viewYear, viewMonth, day));
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (onChange) onChange(today);
  }

  return (
    <div className="kalender">
      <div className="kalender-header">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth} aria-label="Bulan sebelumnya">
          <IcoChevronLeft />
        </button>
        <div className="kalender-title">
          <span className="kalender-month">{MONTHS_ID[viewMonth]}</span>
          <span className="kalender-year">{viewYear}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth} aria-label="Bulan berikutnya">
          <IcoChevronRight />
        </button>
      </div>

      <div className="kalender-days-header">
        {DAYS_ID.map((d) => (
          <div key={d} className="kalender-day-label">{d}</div>
        ))}
      </div>

      <div className="kalender-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="kalender-cell empty" />;
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const ev = eventMap[iso];
          const disabled = isDisabled(day);
          const classes = [
            "kalender-cell",
            disabled ? "disabled" : "",
            isSelected(day) ? "selected" : "",
            isToday(day) ? "today" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={iso}
              className={classes}
              onClick={() => selectDay(day)}
              disabled={disabled}
              title={ev?.label}
            >
              <span className="kalender-day-num">{day}</span>
              {ev && <span className="kalender-event-dot" style={{ background: ev.color ?? "var(--primary)" }} />}
            </button>
          );
        })}
      </div>

      <div className="kalender-footer">
        <button className="btn btn-ghost btn-sm" onClick={goToToday}>Hari ini</button>
        {value && (
          <div className="muted">
            {value.getDate()} {MONTHS_ID[value.getMonth()]} {value.getFullYear()}
          </div>
        )}
      </div>
    </div>
  );
}
