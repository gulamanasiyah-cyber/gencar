export type EventTimeWindow = {
  start: Date;
  end: Date;
  windowOpen: Date;
  windowClose: Date;
};

/** Format tanggal YYYY-MM-DD di zona waktu Indonesia Barat (WIB / UTC+7) */
export function getWibDateStr(d: Date = new Date()): string {
  const wibTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().slice(0, 10);
}

function withTime(dateStr: string, timeStr: string): Date {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${t}+07:00`);
}

export function getEventTimeWindow(k: {
  tanggal: string;
  tanggalSelesai?: string | null;
  jamMulai?: string | null;
  jamSelesai?: string | null;
  jam?: string | null;
}): EventTimeWindow {
  const hasTimeInfo = Boolean(k.jamMulai || k.jamSelesai || k.jam);
  const startTimeStr = k.jamMulai || k.jam || "00:00";
  const start = withTime(k.tanggal, startTimeStr);

  let end: Date;
  if (!hasTimeInfo && !k.tanggalSelesai) {
    // Tanpa info jam = acara seharian penuh pada tanggal tersebut
    end = withTime(k.tanggal, "23:59:59");
  } else if (k.tanggalSelesai && k.jamSelesai) {
    end = withTime(k.tanggalSelesai, k.jamSelesai);
  } else if (k.jamSelesai) {
    if (k.jamSelesai < startTimeStr) {
      const nextDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const nextDayStr = getWibDateStr(nextDay);
      end = withTime(nextDayStr, k.jamSelesai);
    } else {
      end = withTime(k.tanggal, k.jamSelesai);
    }
  } else {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }

  const windowOpen = new Date(start.getTime() - 30 * 60 * 1000);
  const windowClose = end;

  return { start, end, windowOpen, windowClose };
}

export function isEventActiveNow(k: any, now: Date = new Date()): boolean {
  const { windowOpen, windowClose } = getEventTimeWindow(k);
  return now.getTime() >= windowOpen.getTime() && now.getTime() <= windowClose.getTime();
}
