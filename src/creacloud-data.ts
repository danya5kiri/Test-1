export type Tour = {
  id: string;
  name: string;
  short: string;
  emoji: string;
  uniqueKey: string;
};

export type Booking = {
  id: string;
  creator: string;
  date: string;
  tourId: string;
  status: "active" | "cancelled";
  createdAt: string;
};

export type ContentItem = {
  id: string;
  creator: string;
  date: string;
  tourId: string;
  link: string;
  createdAt: string;
};

export type DemoState = {
  bookings: Booking[];
  content: ContentItem[];
};

export const DEMO_TODAY = "2026-07-24";
export const SEASON_START = "2026-04-01";
export const SEASON_END = "2026-10-20";
export const TOTAL_UNIQUE_TOURS = 8;

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

export const SCHEDULE: Record<string, string[]> = {
  "2026-07-24": ["saxophone", "captain", "fishing"],
  "2026-07-25": ["saxophone", "captain", "shkota"],
  "2026-07-26": ["saxophone", "captain"],
  "2026-07-27": ["saxophone", "captain", "shkota"],
  "2026-07-28": ["saxophone", "captain", "fishing", "ricorda"],
  "2026-07-29": ["saxophone", "captain", "askold", "shkota"],
  "2026-07-30": ["barbecue", "saxophone", "captain", "archipelago"],
  "2026-07-31": ["saxophone", "captain", "fishing", "ricorda"],
  "2026-08-01": ["saxophone", "captain", "shkota"],
  "2026-08-02": ["barbecue", "saxophone", "captain"],
  "2026-08-03": ["saxophone", "captain", "ricorda"],
  "2026-08-04": ["saxophone"],
  "2026-08-05": ["saxophone", "captain", "ricorda"],
  "2026-08-06": ["barbecue", "saxophone", "captain", "archipelago"],
  "2026-08-07": ["saxophone", "captain", "askold"],
  "2026-08-08": ["saxophone", "captain", "shkota"],
  "2026-08-09": ["saxophone", "captain", "askold", "ricorda"],
  "2026-08-10": ["saxophone", "captain", "fishing", "ricorda"],
  "2026-08-11": ["saxophone", "captain"],
  "2026-08-12": ["barbecue", "saxophone", "captain", "archipelago"],
};

const booking = (
  id: string,
  creator: string,
  date: string,
  tourId: string,
  createdAt: string,
): Booking => ({
  id,
  creator,
  date,
  tourId,
  status: "active",
  createdAt,
});

export const INITIAL_DEMO_STATE: DemoState = {
  bookings: [
    booking("b01", "@evgivi", "2026-04-18", "archipelago", "2026-04-10T04:00:00Z"),
    booking("b02", "@evgivi", "2026-04-26", "shkota", "2026-04-19T05:10:00Z"),
    booking("b03", "@evgivi", "2026-05-10", "askold", "2026-05-02T08:00:00Z"),
    booking("b04", "@evgivi", "2026-05-23", "ricorda", "2026-05-15T07:30:00Z"),
    booking("b05", "@evgivi", "2026-06-05", "saxophone", "2026-05-27T06:00:00Z"),
    booking("b06", "@evgivi", "2026-06-26", "barbecue", "2026-06-18T03:45:00Z"),
    booking("b07", "@evgivi", "2026-07-08", "fishing", "2026-06-30T09:20:00Z"),
    booking("b08", "@evgivi", "2026-07-28", "ricorda", "2026-07-23T06:25:00Z"),
    booking("b09", "@mishka", "2026-04-19", "fishing", "2026-04-11T08:00:00Z"),
    booking("b10", "@mishka", "2026-05-03", "archipelago", "2026-04-25T03:00:00Z"),
    booking("b11", "@mishka", "2026-05-17", "shkota", "2026-05-10T04:00:00Z"),
    booking("b12", "@mishka", "2026-06-07", "ricorda", "2026-05-29T06:00:00Z"),
    booking("b13", "@mishka", "2026-06-20", "askold", "2026-06-12T06:00:00Z"),
    booking("b14", "@mishka", "2026-07-05", "barbecue", "2026-06-27T04:00:00Z"),
    booking("b15", "@mishka", "2026-08-01", "shkota", "2026-07-23T10:10:00Z"),
    booking("b16", "@lera.photo", "2026-04-20", "saxophone", "2026-04-13T04:00:00Z"),
    booking("b17", "@lera.photo", "2026-05-02", "askold", "2026-04-24T04:00:00Z"),
    booking("b18", "@lera.photo", "2026-05-24", "archipelago", "2026-05-17T04:00:00Z"),
    booking("b19", "@lera.photo", "2026-06-03", "shkota", "2026-05-25T04:00:00Z"),
    booking("b20", "@lera.photo", "2026-06-28", "ricorda", "2026-06-20T04:00:00Z"),
    booking("b21", "@lera.photo", "2026-08-02", "saxophone", "2026-07-23T11:10:00Z"),
    booking("b22", "@danya5kiri", "2026-05-11", "fishing", "2026-05-03T04:00:00Z"),
    booking("b23", "@danya5kiri", "2026-06-12", "archipelago", "2026-06-04T04:00:00Z"),
    booking("b24", "@danya5kiri", "2026-07-10", "askold", "2026-07-02T04:00:00Z"),
    booking("b25", "@danya5kiri", "2026-07-30", "barbecue", "2026-07-23T12:00:00Z"),
    booking("b26", "@a4fashion", "2026-05-14", "russkiy", "2026-05-06T04:00:00Z"),
    booking("b27", "@a4fashion", "2026-06-24", "ricorda", "2026-06-16T04:00:00Z"),
    booking("b28", "@a4fashion", "2026-07-29", "askold", "2026-07-23T13:00:00Z"),
    booking("b29", "@makar", "2026-06-15", "shkota", "2026-06-07T04:00:00Z"),
    booking("b30", "@makar", "2026-08-06", "archipelago", "2026-07-23T14:00:00Z"),
  ],
  content: [
    {
      id: "c01",
      creator: "@evgivi",
      date: "2026-07-08",
      tourId: "fishing",
      link: "https://example.com/evgivi-fishing",
      createdAt: "2026-07-09T05:00:00Z",
    },
    {
      id: "c02",
      creator: "@evgivi",
      date: "2026-06-26",
      tourId: "barbecue",
      link: "https://example.com/evgivi-barbecue",
      createdAt: "2026-06-28T06:00:00Z",
    },
    {
      id: "c03",
      creator: "@mishka",
      date: "2026-07-05",
      tourId: "barbecue",
      link: "https://example.com/mishka-barbecue",
      createdAt: "2026-07-07T05:00:00Z",
    },
    {
      id: "c04",
      creator: "@lera.photo",
      date: "2026-06-28",
      tourId: "ricorda",
      link: "https://example.com/lera-ricorda",
      createdAt: "2026-06-30T05:00:00Z",
    },
    {
      id: "c05",
      creator: "@danya5kiri",
      date: "2026-07-10",
      tourId: "askold",
      link: "https://example.com/danya-askold",
      createdAt: "2026-07-12T05:00:00Z",
    },
  ],
};

export function normalizeCreator(value: string) {
  const normalized = value.trim().toLowerCase().replace(/^@+/, "");
  return normalized ? `@${normalized}` : "";
}

export function getTour(tourId: string) {
  return TOURS.find((tour) => tour.id === tourId);
}

export function formatDateRu(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00+10:00`));
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
