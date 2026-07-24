import { SCHEDULE, SEASON_MONTHS } from "./creacloud-schedule";

export type Tour = {
  id: string;
  name: string;
  short: string;
  emoji: string;
  uniqueKey: string;
};

export type Booking = {
  id: string;
  sourceKey: string;
  creator: string;
  date: string;
  tourId: string;
  tourName: string;
  status: "active";
  createdAt: string;
};

export type ContentItem = {
  id: string;
  creator: string;
  date: string;
  tourId: string;
  tourName: string;
  link: string;
  createdAt: string;
};

export type WorkingState = {
  bookings: Booking[];
  content: ContentItem[];
};

export type RemoteRow = Record<string, unknown>;

export const API_URL =
  "https://script.google.com/macros/s/AKfycbyRUzCwCTkj4TzURMsYfCZGVRrZnxoeoqTzz76w3n9qz-JlU4ji2i3e1xYQr4CymGsf8Q/exec";
export const WHATSAPP_NUMBER = "79149753285";
export const CALL_PHONE_NUMBER = "79149753285";
export const SEASON_START = "2026-04-01";
export const BOOKING_START = "2026-07-22";
export const SEASON_END = "2026-10-20";
export const TOTAL_UNIQUE_TOURS = 8;

export { SCHEDULE, SEASON_MONTHS };

export const TOURS: Tour[] = [
  {
    id: "barbecue",
    name: "Барбекю на островах",
    short: "Барбекю на островах",
    emoji: "☀",
    uniqueKey: "barbecue",
  },
  {
    id: "saxophone",
    name: "Вечерний круиз на яхте с саксофоном",
    short: "Круиз с саксофоном",
    emoji: "♫",
    uniqueKey: "evening",
  },
  {
    id: "ricorda",
    name: "Путешествие на остров Рикорда",
    short: "Остров Рикорда",
    emoji: "◒",
    uniqueKey: "ricorda",
  },
  {
    id: "russkiy",
    name: "Путешествие на остров Русский",
    short: "Остров Русский",
    emoji: "⌁",
    uniqueKey: "russkiy",
  },
  {
    id: "fishing",
    name: "Отдых на катере с рыбалкой",
    short: "Катер с рыбалкой",
    emoji: "⌁",
    uniqueKey: "fishing",
  },
  {
    id: "shkota",
    name: "Путешествие на остров Шкота",
    short: "Остров Шкота",
    emoji: "◇",
    uniqueKey: "shkota",
  },
  {
    id: "archipelago",
    name: "Прогулка «Архипелаг»",
    short: "Архипелаг",
    emoji: "≈",
    uniqueKey: "archipelago",
  },
  {
    id: "askold",
    name: "Путешествие на остров Аскольд",
    short: "Остров Аскольд",
    emoji: "△",
    uniqueKey: "askold",
  },
  {
    id: "captain",
    name: "Вечерняя прогулка на катере с рассказами от капитана",
    short: "Истории капитана",
    emoji: "✦",
    uniqueKey: "evening",
  },
];

const CREATOR_ALIASES: Record<string, string> = {
  "@a4anaseva": "@a4fanaseva",
};

const DELETED_CREATORS = new Set(["@ник", "@тест", "@nik", "@test"]);

const KNOWN_BOOKING_TRANSFERS = [
  {
    from: {
      date: "2026-07-23",
      telegram: "@a4fanaseva",
      tour: "Путешествие на остров Аскольд на катере 32ft",
    },
    to: {
      date: "2026-07-29",
      telegram: "@a4fanaseva",
      tour: "Путешествие на остров Аскольд на катере 32ft",
    },
  },
];

const KNOWN_BOOKING_CANCELLATIONS = [
  {
    date: "2026-07-26",
    telegram: "@evgivl",
    tour: "Барбекю на островах",
  },
];

function rowString(row: RemoteRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

export function normalizeDate(value: unknown) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeCreator(value: unknown) {
  let normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (normalized && !normalized.startsWith("@")) normalized = `@${normalized}`;
  return CREATOR_ALIASES[normalized] ?? normalized;
}

export function isDeletedCreator(value: unknown) {
  return DELETED_CREATORS.has(normalizeCreator(value));
}

export function canonicalTourName(value: unknown) {
  const original = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const tour = original.toLowerCase().replace(/ё/g, "е");

  if (!tour) return "";
  if (tour.includes("барбекю") || tour.includes("купальный круиз")) {
    return TOURS[0].name;
  }
  if (
    (tour.includes("вечерний круиз") || tour.includes("саксофон")) &&
    !tour.includes("без саксофона")
  ) {
    return TOURS[1].name;
  }
  if (
    tour.includes("рассказ") ||
    tour.includes("вечерняя прогулка на катере") ||
    tour.includes("без саксофона")
  ) {
    return TOURS[8].name;
  }
  if (/острова?\s+рик[оа]рда/.test(tour)) return TOURS[2].name;
  if (/острова?\s+русск/.test(tour)) return TOURS[3].name;
  if (
    tour.includes("отдых на катере") &&
    (tour.includes("рыбал") || tour.includes("32"))
  ) {
    return TOURS[4].name;
  }
  if (tour.includes("остров шкота")) return TOURS[5].name;
  if (
    tour.includes("архипелаг") ||
    (tour.includes("желтухин") && tour.includes("карамзин"))
  ) {
    return TOURS[6].name;
  }
  if (tour.includes("остров аскольд")) return TOURS[7].name;
  return original;
}

export function normalizeTour(value: unknown) {
  return canonicalTourName(value).toLowerCase().replace(/\s+/g, " ");
}

export function isExcludedTour(value: unknown) {
  return /(?:2\s*[-–—]?\s*[хx]?\s*[-–—]?\s*днев|двух\s*[-–—]?\s*днев|два\s+дн)/i.test(
    String(value ?? ""),
  );
}

export function getTour(tourId: string) {
  return TOURS.find((tour) => tour.id === tourId);
}

export function getTourByName(name: unknown) {
  const normalized = normalizeTour(name);
  return TOURS.find((tour) => normalizeTour(tour.name) === normalized);
}

export function getTourName(tourId: string) {
  return getTour(tourId)?.name ?? "";
}

export function bookingFingerprint(
  date: unknown,
  creator: unknown,
  tour: unknown,
) {
  return [
    normalizeDate(date),
    normalizeCreator(creator),
    normalizeTour(tour),
  ].join("|");
}

export function bookingSlotFingerprint(date: unknown, tour: unknown) {
  return [normalizeDate(date), normalizeTour(tour)].join("|");
}

function isInactiveBooking(row: RemoteRow) {
  const status = rowString(row, "status").toLowerCase();
  return [
    "отмена",
    "не пришел",
    "не пришёл",
    "отменено",
    "cancelled",
    "canceled",
  ].includes(status);
}

function decodeFingerprint(value: unknown) {
  const key = String(value ?? "").trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function transferSourceFingerprint(row: RemoteRow) {
  const direct = rowString(
    row,
    "transferFromKey",
    "replacesBookingKey",
    "previousBookingKey",
  );
  if (direct) return decodeFingerprint(direct);

  const previousDate = normalizeDate(row.previousDate ?? row.fromDate);
  const previousTour = row.previousTour ?? row.fromTour;
  const creator = row.previousTelegram ?? row.fromTelegram ?? row.telegram;
  if (previousDate && previousTour && creator) {
    return bookingFingerprint(previousDate, creator, previousTour);
  }

  const marker = rowString(row, "comment").match(/\[transferFrom:([^\]]+)\]/i);
  return marker ? decodeFingerprint(marker[1]) : "";
}

function cancellationSourceFingerprint(row: RemoteRow) {
  const direct = rowString(
    row,
    "cancelBookingKey",
    "cancelsBookingKey",
    "deletedBookingKey",
  );
  if (direct) return decodeFingerprint(direct);

  const marker = rowString(row, "comment").match(/\[cancelBooking:([^\]]+)\]/i);
  if (marker) return decodeFingerprint(marker[1]);
  if (rowString(row, "operation").toLowerCase() !== "cancel") return "";

  const previousDate = normalizeDate(row.previousDate ?? row.date);
  const previousTour = row.previousTour ?? row.tour;
  const creator = row.previousTelegram ?? row.telegram;
  return previousDate && previousTour && creator
    ? bookingFingerprint(previousDate, creator, previousTour)
    : "";
}

function isKnownCancellation(row: RemoteRow) {
  const key = bookingFingerprint(row.date, row.telegram, row.tour);
  return KNOWN_BOOKING_CANCELLATIONS.some(
    (item) =>
      bookingFingerprint(item.date, item.telegram, item.tour) === key,
  );
}

function resolveEffectiveBookingRows(rows: RemoteRow[]) {
  const unique = new Map<string, { row: RemoteRow; index: number }>();
  const cancelledAt = new Map<string, number>();

  rows.forEach((row, index) => {
    const cancellationKey = cancellationSourceFingerprint(row);
    if (cancellationKey) {
      cancelledAt.set(cancellationKey, index);
      return;
    }
    if (
      isInactiveBooking(row) ||
      isDeletedCreator(row.telegram) ||
      isKnownCancellation(row)
    ) {
      return;
    }
    unique.set(bookingFingerprint(row.date, row.telegram, row.tour), {
      row,
      index,
    });
  });

  const transferred = new Set<string>();
  unique.forEach(({ row }, key) => {
    const sourceKey = transferSourceFingerprint(row);
    if (sourceKey && sourceKey !== key) transferred.add(sourceKey);
  });

  KNOWN_BOOKING_TRANSFERS.forEach(({ from, to }) => {
    const sourceKey = bookingFingerprint(from.date, from.telegram, from.tour);
    const targetKey = bookingFingerprint(to.date, to.telegram, to.tour);
    if (unique.has(sourceKey) && unique.has(targetKey)) transferred.add(sourceKey);
  });

  return [...unique.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .filter(({ key, index }) => {
      const cancellationIndex = cancelledAt.get(key);
      const cancelledAfterBooking =
        cancellationIndex !== undefined && cancellationIndex >= index;
      return !transferred.has(key) && !cancelledAfterBooking;
    })
    .sort((a, b) => a.index - b.index)
    .map(({ row }) => row);
}

function rowCreatedAt(row: RemoteRow) {
  const raw = rowString(
    row,
    "createdAt",
    "timestamp",
    "submittedAt",
    "created",
  );
  if (!raw) return "";
  const russian = raw.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (russian) {
    const [, day, month, year, hour, minute, second = "00"] = russian;
    const parsedRussian = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+10:00`,
    );
    if (!Number.isNaN(parsedRussian.getTime())) return parsedRussian.toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

export function normalizeContentLink(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.hash = "";
    const removable: string[] = [];
    url.searchParams.forEach((_value, key) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.startsWith("utm_") ||
        ["igsh", "igshid", "si", "feature", "share"].includes(normalizedKey)
      ) {
        removable.push(key);
      }
    });
    removable.forEach((key) => url.searchParams.delete(key));
    url.searchParams.sort();
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const query = url.searchParams.toString();
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      `${url.protocol.toLowerCase()}//${hostname}` +
      `${url.port ? `:${url.port}` : ""}${path}${query ? `?${query}` : ""}`
    ).toLowerCase();
  } catch {
    return raw.toLowerCase().replace(/\/+$/, "");
  }
}

export function isValidContentLink(value: unknown) {
  try {
    const url = new URL(String(value ?? "").trim());
    return (
      ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export function buildWorkingState(rows: RemoteRow[]): WorkingState {
  const prepared = (Array.isArray(rows) ? rows : []).filter(
    (row): row is RemoteRow => Boolean(row && typeof row === "object"),
  );
  const bookingRows = resolveEffectiveBookingRows(
    prepared.filter((row) => rowString(row, "type") !== "content_report"),
  );

  const bookings = bookingRows
    .filter(
      (row) =>
        !isExcludedTour(row.tour) &&
        normalizeDate(row.date) >= SEASON_START &&
        normalizeDate(row.date) <= SEASON_END,
    )
    .map((row) => {
      const creator = normalizeCreator(row.telegram);
      const date = normalizeDate(row.date);
      const tourName = canonicalTourName(row.tour);
      const tourId = getTourByName(tourName)?.id ?? "";
      const sourceKey = bookingFingerprint(date, creator, tourName);
      return {
        id: rowString(row, "requestId", "dedupeKey") || sourceKey,
        sourceKey,
        creator,
        date,
        tourId,
        tourName,
        status: "active" as const,
        createdAt: rowCreatedAt(row),
      };
    })
    .filter((booking) => booking.creator && booking.date && booking.tourId);

  const seenLinks = new Set<string>();
  const reportRows = prepared
    .filter((row) => rowString(row, "type") === "content_report")
    .reverse();
  const content = reportRows
    .map((row, index) => {
      const creator = normalizeCreator(
        row.telegram ?? row.creator ?? row.nickname ?? row.name,
      );
      const link = rowString(row, "link", "url", "contentUrl");
      const linkKey = normalizeContentLink(link);
      const matchStatus = rowString(row, "matchStatus");
      if (
        !creator ||
        isDeletedCreator(creator) ||
        !isValidContentLink(link) ||
        seenLinks.has(linkKey) ||
        (matchStatus &&
          matchStatus !== "Есть запись" &&
          matchStatus !== "Запись не найдена")
      ) {
        return null;
      }
      seenLinks.add(linkKey);

      const tourName = canonicalTourName(row.tour ?? row.tourName);
      const tourId = getTourByName(tourName)?.id ?? "";
      let date = normalizeDate(row.date);
      if (matchStatus === "Запись не найдена") {
        const match = [...bookings]
          .filter(
            (booking) =>
              booking.creator === creator && booking.tourId === tourId,
          )
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        if (match) date = match.date;
      }

      return {
        id:
          rowString(row, "requestId", "dedupeKey") ||
          `content-${index}-${linkKey}`,
        creator,
        date,
        tourId,
        tourName,
        link,
        createdAt: rowCreatedAt(row),
      };
    })
    .filter((item): item is ContentItem => Boolean(item?.tourId));

  return { bookings, content };
}

export function getTodayKey() {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Vladivostok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  }
}

export const DEMO_TODAY = getTodayKey();

export function getDefaultBookableDate() {
  const today = getTodayKey();
  return (
    Object.keys(SCHEDULE)
      .sort()
      .find(
        (date) =>
          date >= BOOKING_START &&
          date >= today &&
          date <= SEASON_END &&
          SCHEDULE[date].length > 0,
      ) ?? BOOKING_START
  );
}

export function formatDateRu(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00+10:00`));
}

export function formatMonthRu(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function platformFromLink(link: string) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("vk.com")) return "VK";
    return "Публикация";
  } catch {
    return "Публикация";
  }
}
