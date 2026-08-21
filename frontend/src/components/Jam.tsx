import { useState, useRef, useCallback, useEffect } from "react";

export type JamProps = {
  value?: string;
  onChange?: (time: string) => void;
  format?: "12h" | "24h";
  showAnalog?: boolean;
  minuteStep?: 5 | 10 | 15 | 30;
};

export default function Jam({
  value = "",
  onChange,
  format = "24h",
  showAnalog = true,
  minuteStep = 5,
}: JamProps) {
  const [inputVal, setInputVal] = useState(value);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [isDragging, setIsDragging] = useState(false);
  const clockRef = useRef<HTMLDivElement>(null);

  const [hour, minute] = inputVal
    ? inputVal.split(":").map(Number)
    : [new Date().getHours(), new Date().getMinutes()];

  const clampedHour = Math.max(0, Math.min(23, hour || 0));
  const clampedMinute = Math.max(0, Math.min(59, minute || 0));

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const formatTime = useCallback(
    (h: number, m: number) => {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      return `${hh}:${mm}`;
    },
    []
  );

  function emitChange(h: number, m: number) {
    const t = formatTime(h, m);
    setInputVal(t);
    onChange?.(t);
  }

  function handleHourSelect(h: number) {
    setMode("minute");
    emitChange(h, clampedMinute);
  }

  function handleMinuteSelect(m: number) {
    setMode("hour");
    emitChange(clampedHour, m);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputVal(v);
    if (/^\d{2}:\d{2}$/.test(v)) {
      onChange?.(v);
    }
  }

  function handleInputBlur() {
    if (/^\d{1,2}$/.test(inputVal)) {
      const t = formatTime(parseInt(inputVal), 0);
      setInputVal(t);
      onChange?.(t);
    }
  }

  function stepHour(delta: number) {
    const h = (clampedHour + delta + 24) % 24;
    emitChange(h, clampedMinute);
  }

  function stepMinute(delta: number) {
    let m = clampedMinute + delta * minuteStep;
    let h = clampedHour;
    if (m >= 60) { m -= 60; h = (h + 1) % 24; }
    if (m < 0) { m += 60; h = (h + 23) % 24; }
    emitChange(h, m);
  }

  function getAngle(cx: number, cy: number, ex: number, ey: number) {
    const a = Math.atan2(ey - cy, ex - cx);
    return ((a * 180) / Math.PI + 390) % 360;
  }

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = clockRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = getAngle(cx, cy, clientX, clientY);

      if (mode === "hour") {
        const h = Math.round(angle / 30) % 24;
        emitChange(h, clampedMinute);
      } else {
        const raw = Math.round(angle / (360 / (60 / minuteStep))) * minuteStep;
        const m = raw % 60;
        handleMinuteSelect(m);
      }
    },
    [mode, clampedHour, clampedMinute, minuteStep, emitChange]
  );

  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    handlePointer(e.clientX, e.clientY);
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  const displayHour = format === "12h" ? (clampedHour % 12 || 12) : clampedHour;
  const period = clampedHour >= 12 ? "PM" : "AM";

  const hourMarkers = Array.from({ length: 12 }, (_, i) => i);
  const minuteMarkers = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="jam">
      <div className="jam-display">
        <button
          className={`jam-display-btn ${mode === "hour" ? "active" : ""}`}
          onClick={() => setMode("hour")}
        >
          {String(displayHour).padStart(2, "0")}
        </button>
        <span className="jam-colon">:</span>
        <button
          className={`jam-display-btn ${mode === "minute" ? "active" : ""}`}
          onClick={() => setMode("minute")}
        >
          {String(clampedMinute).padStart(2, "0")}
        </button>
        {format === "12h" && <span className="jam-period">{period}</span>}
      </div>

      <div className="jam-stepper">
        <button className="btn btn-ghost btn-sm" onClick={() => mode === "hour" ? stepHour(-1) : stepMinute(-1)}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => mode === "hour" ? stepHour(1) : stepMinute(1)}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {showAnalog && (
        <div
          ref={clockRef}
          className="jam-analog"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="jam-face">
            {mode === "hour"
              ? hourMarkers.map((h) => {
                  const angle = h * 30;
                  const isSelected = h === clampedHour;
                  const displayLabel = format === "12h" ? (h === 0 ? "12" : h > 12 ? String(h - 12) : String(h)) : String(h).padStart(2, "0");
                  return (
                    <button
                      key={h}
                      className={`jam-marker ${isSelected ? "selected" : ""}`}
                      style={{ transform: `rotate(${angle}deg) translateY(-82px) rotate(-${angle}deg)` }}
                      onClick={() => handleHourSelect(h)}
                    >
                      {displayLabel}
                    </button>
                  );
                })
              : minuteMarkers.map((m) => {
                  const angle = m * 6;
                  const isSelected = m === clampedMinute;
                  return (
                    <button
                      key={m}
                      className={`jam-marker ${isSelected ? "selected" : ""}`}
                      style={{ transform: `rotate(${angle}deg) translateY(-82px) rotate(-${angle}deg)` }}
                      onClick={() => handleMinuteSelect(m)}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
          </div>

          <div className="jam-hand-container">
            <div
              className={`jam-hand ${mode}`}
              style={{
                transform: `rotate(${mode === "hour" ? clampedHour * 30 : clampedMinute * 6}deg)`,
              }}
            />
            <div className="jam-center-dot" />
          </div>
        </div>
      )}

      <div className="field">
        <label>Input Manual</label>
        <input
          type="time"
          value={inputVal}
          onChange={handleInput}
          onBlur={handleInputBlur}
        />
      </div>
    </div>
  );
}
