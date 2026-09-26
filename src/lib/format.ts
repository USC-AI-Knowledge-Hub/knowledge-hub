const nf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const compact = (n: number) => nf.format(n);

export function duration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function ago(iso: string, now = Date.now()): string {
  const days = Math.round((Date.parse(iso) - now) / 86_400_000);
  if (days > -1) {
    const hours = Math.round((Date.parse(iso) - now) / 3_600_000);
    return hours > -1 ? "just now" : rtf.format(hours, "hour");
  }
  if (days > -14) return rtf.format(days, "day");
  if (days > -60) return rtf.format(Math.round(days / 7), "week");
  return rtf.format(Math.round(days / 30), "month");
}

export function longDate(isoDate: string): string {
  return new Date(isoDate + (isoDate.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
