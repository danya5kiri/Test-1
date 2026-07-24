import {
  API_URL,
  Booking,
  bookingFingerprint,
  bookingSlotFingerprint,
  buildWorkingState,
  CALL_PHONE_NUMBER,
  ContentItem,
  formatDateRu,
  getTourName,
  normalizeContentLink,
  RemoteRow,
  WHATSAPP_NUMBER,
  WorkingState,
} from "./creacloud-data";

export type ContactMode = "whatsapp" | "call";
export type BookingWriteMode = "new" | "transfer";

type JsonpWindow = Window &
  typeof globalThis &
  Record<string, ((rows: RemoteRow[]) => void) | undefined>;

function requestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fetchWorkingState(timeoutMs = 12_000): Promise<WorkingState> {
  return new Promise((resolve, reject) => {
    const callbackName = `creacloudTest1_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const script = document.createElement("script");
    const jsonpWindow = window as JsonpWindow;
    let settled = false;
    let timer = 0;

    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      try {
        delete jsonpWindow[callbackName];
      } catch {
        jsonpWindow[callbackName] = undefined;
      }
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Рабочая база не ответила вовремя."));
    };

    jsonpWindow[callbackName] = (rows: RemoteRow[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(buildWorkingState(Array.isArray(rows) ? rows : []));
    };

    script.id = callbackName;
    script.async = true;
    script.src = `${API_URL}?callback=${callbackName}&t=${Date.now()}`;
    script.onerror = fail;
    timer = window.setTimeout(fail, timeoutMs);
    document.body.appendChild(script);
  });
}

export async function sendWorkingPayload(payload: Record<string, unknown>) {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(payload),
  });
}

export function createBookingPayload({
  mode,
  creator,
  date,
  tourId,
  source,
  contactMode,
}: {
  mode: BookingWriteMode;
  creator: string;
  date: string;
  tourId: string;
  source?: Booking;
  contactMode: ContactMode;
}) {
  const tourName = getTourName(tourId);
  const targetKey = bookingFingerprint(date, creator, tourName);
  const sourceKey = source?.sourceKey ?? "";
  const dedupeKey =
    mode === "transfer"
      ? `transfer:${sourceKey}=>${targetKey}`
      : `booking:${targetKey}`;
  const payload: Record<string, unknown> = {
    date,
    telegram: creator,
    tour: tourName,
    name: "",
    phone: "",
    count: 1,
    participants: 1,
    status: mode === "transfer" ? "Перенос" : "Новая заявка",
    contactChannel: contactMode === "call" ? "phone" : "whatsapp",
    slotKey: bookingSlotFingerprint(date, tourName),
    slotCapacity: 1,
    comment:
      mode === "transfer" && source
        ? `Перенос с ${source.date} · ${source.tourName} [transferFrom:${encodeURIComponent(sourceKey)}]`
        : "",
    dedupeKey,
    requestId: requestId(mode === "transfer" ? "transfer" : "booking"),
  };

  if (mode === "transfer" && source) {
    payload.operation = "transfer";
    payload.transferFromKey = sourceKey;
    payload.previousDate = source.date;
    payload.previousTour = source.tourName;
    payload.previousTelegram = source.creator;
  }

  return { payload, targetKey, dedupeKey, tourName };
}

export function createCancellationPayload({
  source,
  contactMode,
}: {
  source: Booking;
  contactMode: ContactMode;
}) {
  const dedupeKey = `cancel:${source.sourceKey}`;
  return {
    dedupeKey,
    payload: {
      date: source.date,
      telegram: source.creator,
      tour: source.tourName,
      name: "",
      phone: "",
      count: 1,
      participants: 1,
      status: "Отмена",
      operation: "cancel",
      contactChannel: contactMode === "call" ? "phone" : "whatsapp",
      cancelBookingKey: source.sourceKey,
      previousDate: source.date,
      previousTour: source.tourName,
      previousTelegram: source.creator,
      comment: `Удаление бронирования креатором [cancelBooking:${encodeURIComponent(source.sourceKey)}]`,
      dedupeKey,
      requestId: requestId("cancel"),
    },
  };
}

export function createContentPayload({
  creator,
  booking,
  link,
}: {
  creator: string;
  booking: Booking;
  link: string;
}) {
  const linkKey = normalizeContentLink(link);
  const payload = {
    type: "content_report",
    createdAt: new Date().toLocaleString("ru-RU"),
    telegram: creator,
    date: booking.date,
    tour: booking.tourName,
    link: link.trim(),
    matchStatus: "Есть запись",
    dedupeKey: `content:${linkKey}`,
    requestId: requestId("content"),
  };
  const optimistic: ContentItem = {
    id: String(payload.requestId),
    creator,
    date: booking.date,
    tourId: booking.tourId,
    tourName: booking.tourName,
    link: link.trim(),
    createdAt: new Date().toISOString(),
  };
  return { payload, optimistic, linkKey };
}

function bookingMessage({
  mode,
  creator,
  date,
  tourName,
  source,
}: {
  mode: "new" | "transfer" | "cancel";
  creator: string;
  date: string;
  tourName: string;
  source?: Booking;
}) {
  if (mode === "cancel") {
    return [
      "Здравствуйте! Креатор удалил бронирование на морскую поездку.",
      "",
      `Креатор: ${creator}`,
      `Дата: ${formatDateRu(date)}`,
      `Тур: ${tourName}`,
      "",
      "Прошу учесть отмену бронирования.",
    ].join("\n");
  }
  if (mode === "transfer" && source) {
    return [
      "Здравствуйте! Перенос записи креатора на морскую поездку.",
      "",
      `Креатор: ${creator}`,
      `Было: ${formatDateRu(source.date)} — ${source.tourName}`,
      `Новая дата: ${formatDateRu(date)}`,
      `Новый тур: ${tourName}`,
      "",
      "Прошу согласовать перенос.",
    ].join("\n");
  }
  return [
    "Здравствуйте! Заявка на бронирование поездки блогера.",
    "",
    `Креатор: ${creator}`,
    `Дата: ${formatDateRu(date)}`,
    `Тур: ${tourName}`,
    "",
    "Прошу согласовать участие.",
  ].join("\n");
}

export function bookingContactUrl({
  contactMode,
  mode,
  creator,
  date,
  tourName,
  source,
}: {
  contactMode: ContactMode;
  mode: "new" | "transfer" | "cancel";
  creator: string;
  date: string;
  tourName: string;
  source?: Booking;
}) {
  if (contactMode === "call") return `tel:+${CALL_PHONE_NUMBER}`;
  const text = bookingMessage({ mode, creator, date, tourName, source });
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export type WeatherSummary = {
  temperature: string;
  label: string;
  icon: string;
};

export type WeatherDay = {
  date: string;
  label: string;
  icon: string;
  temperatureMin: string;
  temperatureMax: string;
};

export type WeatherForecast = Record<string, WeatherDay>;

export type VladivostokWeather = {
  current: WeatherSummary;
  forecast: WeatherForecast;
};

function signedTemperature(value: number) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}°`;
}

function weatherAppearance(code: number) {
  if (code === 0) return { label: "Ясно", icon: "☀️" };
  if (code <= 2) return { label: "Малооблачно", icon: "🌤️" };
  if (code === 3) return { label: "Облачно", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Туман", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Морось", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Дождь", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Снег", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Ливень", icon: "🌧️" };
  if (code >= 85 && code <= 86) return { label: "Снегопад", icon: "🌨️" };
  if (code >= 95) return { label: "Гроза", icon: "⛈️" };
  return { label: "Переменная облачность", icon: "⛅" };
}

export async function fetchVladivostokWeather(): Promise<VladivostokWeather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", "43.1155");
  url.searchParams.set("longitude", "131.8855");
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min",
  );
  url.searchParams.set("forecast_days", "16");
  url.searchParams.set("timezone", "Asia/Vladivostok");
  const response = await fetch(url);
  if (!response.ok) throw new Error("weather");
  const data = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };
  const temperature = Number(data.current?.temperature_2m);
  const code = Number(data.current?.weather_code);
  const appearance = weatherAppearance(code);
  const forecast: WeatherForecast = {};
  const dates = data.daily?.time ?? [];

  dates.forEach((date, index) => {
    const dayAppearance = weatherAppearance(
      Number(data.daily?.weather_code?.[index]),
    );
    forecast[date] = {
      date,
      ...dayAppearance,
      temperatureMin: signedTemperature(
        Number(data.daily?.temperature_2m_min?.[index]),
      ),
      temperatureMax: signedTemperature(
        Number(data.daily?.temperature_2m_max?.[index]),
      ),
    };
  });

  return {
    current: {
      temperature: signedTemperature(temperature),
      ...appearance,
    },
    forecast,
  };
}
