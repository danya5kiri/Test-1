"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  bookingContactUrl,
  ContactMode,
  createBookingPayload,
  createCancellationPayload,
  createContentPayload,
  fetchVladivostokWeather,
  fetchWorkingState,
  sendWorkingPayload,
  WeatherDay,
  WeatherForecast,
  WeatherSummary,
} from "./creacloud-api";
import {
  Booking,
  BOOKING_START,
  ContentItem,
  DEMO_TODAY,
  formatDateRu,
  formatMonthRu,
  getDefaultBookableDate,
  getTour,
  isDeletedCreator,
  isValidContentLink,
  normalizeCreator,
  normalizeContentLink,
  platformFromLink,
  SEASON_END,
  SEASON_MONTHS,
  SCHEDULE,
  TOURS,
  TOTAL_UNIQUE_TOURS,
  WorkingState,
} from "./creacloud-data";

type Panel =
  | "booking"
  | "profile-login"
  | "profile"
  | "content"
  | "rating"
  | "results"
  | "story"
  | "notices"
  | null;

type BookingView = "new" | "manage" | "transfer";
type RatingMode = "visits" | "unique" | "content";
type DataStatus = "loading" | "live" | "cached" | "error";

const CACHE_KEY = "creacloud-portal-working-cache-v3";
const RECENT_WRITES_KEY = "creacloud-portal-recent-writes-v3";
const TEAM_DAILY_NOTICE_KEY = "creacloud-portal-team-daily-notice-v2";
const RECENT_WRITE_TTL = 15 * 60 * 1000;

function emptyWorkingState(): WorkingState {
  return { bookings: [], content: [] };
}

type RecentWrite = { key: string; timestamp: number };

function readRecentWrites() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_WRITES_KEY) ?? "[]",
    ) as RecentWrite[];
    const cutoff = Date.now() - RECENT_WRITE_TTL;
    return parsed.filter(
      (item) =>
        item &&
        typeof item.key === "string" &&
        Number(item.timestamp) >= cutoff,
    );
  } catch {
    return [];
  }
}

function wasRecentlyWritten(key: string) {
  return readRecentWrites().some((item) => item.key === key);
}

function rememberWrite(key: string) {
  try {
    const next = [
      ...readRecentWrites().filter((item) => item.key !== key),
      { key, timestamp: Date.now() },
    ].slice(-30);
    window.localStorage.setItem(RECENT_WRITES_KEY, JSON.stringify(next));
  } catch {
    // The server-side dedupe key still protects the shared base.
  }
}

function pluralRu(
  value: number,
  one: string,
  few: string,
  many: string,
): string {
  const absolute = Math.abs(value);
  const mod100 = absolute % 100;
  const mod10 = absolute % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function Icon({
  name,
  size = 24,
}: {
  name:
    | "arrow"
    | "calendar"
    | "user"
    | "plus"
    | "cloud"
    | "file"
    | "star"
    | "close"
    | "left"
    | "right"
    | "link"
    | "check"
    | "trash"
    | "map"
    | "bell";
  size?: number;
}) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c.7-4.2 3.1-6.3 7.5-6.3s6.8 2.1 7.5 6.3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    cloud: <path d="M6.5 18H18a4 4 0 0 0 .4-8 6.5 6.5 0 0 0-12.2-1.7A4.8 4.8 0 0 0 6.5 18Zm3 2-1 2m5-2-1 2m5-2-1 2" />,
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
      </>
    ),
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
        <path d="M9 3v15m6-12v15" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo${compact ? " logo--compact" : ""}`} aria-label="CREACLOUD">
      <strong>CREA</strong>
      <span>CLOUD</span>
    </div>
  );
}

function SplitTitle({
  strong,
  light,
  as: Tag = "h2",
}: {
  strong: string;
  light: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className="split-title">
      <strong>{strong}</strong> <span>{light}</span>
    </Tag>
  );
}

function Splash({ hidden }: { hidden: boolean }) {
  const phrases = useMemo(
    () => [
      "собираем креаторов",
      "вдохновляем креаторов",
      "респектуем креаторам",
    ],
    [],
  );
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [erasing, setErasing] = useState(false);
  const phrase = phrases[phraseIndex];

  useEffect(() => {
    const isComplete = visibleChars >= phrase.length;
    const isEmpty = visibleChars <= 0;
    const delay = erasing ? 38 : isComplete ? 620 : 64;
    const timer = window.setTimeout(() => {
      if (!erasing && isComplete) {
        setErasing(true);
        return;
      }
      if (erasing && isEmpty) {
        setErasing(false);
        setPhraseIndex((current) => (current + 1) % phrases.length);
        return;
      }
      setVisibleChars((current) => current + (erasing ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [erasing, phrase.length, phrases.length, visibleChars]);

  return (
    <div className={`splash${hidden ? " splash--hidden" : ""}`} aria-hidden={hidden}>
      <div className="splash__stage">
        <div className="splash__logo" aria-label="CREACLOUD">
          <strong>CREA</strong>
          <span>CLOUD</span>
        </div>
        <div className="splash__typing">
          <span className="splash__pulse" aria-hidden="true" />
          <p>{phrase.slice(0, visibleChars)}</p>
          <span className="splash__caret" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

type InteractionAura = {
  id: number;
  x: number;
  y: number;
};

function InteractionAuras() {
  const [auras, setAuras] = useState<InteractionAura[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest(
        "button:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])",
      );
      if (!control) return;

      const id = nextId.current++;
      setAuras((current) => [
        ...current.slice(-5),
        { id, x: event.clientX, y: event.clientY },
      ]);
      window.setTimeout(() => {
        setAuras((current) => current.filter((aura) => aura.id !== id));
      }, 900);
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return (
    <div className="interaction-auras" aria-hidden="true">
      {auras.map((aura) => (
        <span
          key={aura.id}
          className="interaction-aura"
          style={{ left: aura.x, top: aura.y }}
        />
      ))}
    </div>
  );
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="welcome">
      <div className="ambient ambient--lime" />
      <div className="ambient ambient--violet" />
      <div className="welcome__inner">
        <Logo />
        <div className="welcome__copy">
          <SplitTitle strong="Привет," light="креатор!" as="h1" />
          <p>Ты здесь впервые или уже с нами?</p>
        </div>
        <div className="welcome__actions">
          <a
            className="status-card status-card--new"
            href="https://t.me/+nYzsW9t8e38xZGJi"
            target="_blank"
            rel="noreferrer"
          >
            <span className="status-card__index">01</span>
            <SplitTitle strong="Я новый" light="участник" as="h2" />
            <p>Познакомиться с командой в Telegram</p>
            <span className="status-card__arrow">
              <Icon name="arrow" />
            </span>
          </a>
          <button className="status-card status-card--team" onClick={onEnter}>
            <span className="status-card__index">02</span>
            <SplitTitle strong="Я уже" light="в команде" as="h2" />
            <p>Открыть дашборд CREACLOUD</p>
            <span className="status-card__arrow">
              <Icon name="arrow" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function Toolbar({
  active,
  hidden,
  onBooking,
  onProfile,
  onContent,
}: {
  active: Panel;
  hidden: boolean;
  onBooking: () => void;
  onProfile: () => void;
  onContent: () => void;
}) {
  return (
    <nav
      className={`toolbar${hidden ? " toolbar--hidden" : ""}`}
      aria-label="Основные действия"
    >
      <button
        className={active === "booking" ? "is-active" : ""}
        onClick={onBooking}
      >
        <Icon name="calendar" />
        <span>Бронь</span>
      </button>
      <button
        className={
          active === "profile" || active === "profile-login" ? "is-active" : ""
        }
        onClick={onProfile}
      >
        <Icon name="user" />
        <span>ЛК</span>
      </button>
      <button
        className={
          active === "content" || active === "results" || active === "story"
            ? "is-active"
            : ""
        }
        onClick={onContent}
      >
        <Icon name="plus" />
        <span>Контент</span>
      </button>
    </nav>
  );
}

type RankingRow = {
  creator: string;
  visits: number;
  unique: number;
  materials: number;
};

function getRankings(state: WorkingState): RankingRow[] {
  const map = new Map<string, RankingRow & { uniqueKeys: Set<string> }>();
  state.bookings
    .filter((booking) => booking.status === "active")
    .forEach((booking) => {
      const current = map.get(booking.creator) ?? {
        creator: booking.creator,
        visits: 0,
        unique: 0,
        materials: 0,
        uniqueKeys: new Set<string>(),
      };
      current.visits += 1;
      const tour = getTour(booking.tourId);
      if (tour) current.uniqueKeys.add(tour.uniqueKey);
      current.unique = current.uniqueKeys.size;
      map.set(booking.creator, current);
    });
  state.content.forEach((item) => {
    const current = map.get(item.creator) ?? {
      creator: item.creator,
      visits: 0,
      unique: 0,
      materials: 0,
      uniqueKeys: new Set<string>(),
    };
    current.materials += 1;
    map.set(item.creator, current);
  });
  return [...map.values()]
    .map((row) => ({
      creator: row.creator,
      visits: row.visits,
      unique: row.unique,
      materials: row.materials,
    }))
    .sort(
      (a, b) =>
        b.visits - a.visits ||
        b.unique - a.unique ||
        a.creator.localeCompare(b.creator, "ru"),
    );
}

function getSeasonProgress() {
  const start = new Date("2026-04-01T00:00:00+10:00").getTime();
  const end = new Date("2026-10-20T23:59:59+10:00").getTime();
  const current = Date.now();
  return Math.max(
    0,
    Math.min(100, Math.round(((current - start) / (end - start)) * 100)),
  );
}

function Dashboard({
  state,
  weather,
  onOpen,
}: {
  state: WorkingState;
  weather: WeatherSummary;
  onOpen: (panel: Exclude<Panel, null>) => void;
}) {
  const rankings = getRankings(state);
  const leaderSlides = [
    {
      tone: "visits",
      label: "Лидер по поездкам",
      row: [...rankings].sort(
        (a, b) =>
          b.visits - a.visits ||
          b.unique - a.unique ||
          a.creator.localeCompare(b.creator, "ru"),
      )[0],
      value: (row: RankingRow) =>
        `${row.visits} ${pluralRu(row.visits, "поездка", "поездки", "поездок")}`,
    },
    {
      tone: "unique",
      label: "Лидер по уникальным турам",
      row: [...rankings].sort(
        (a, b) =>
          b.unique - a.unique ||
          b.visits - a.visits ||
          a.creator.localeCompare(b.creator, "ru"),
      )[0],
      value: (row: RankingRow) =>
        `${row.unique} ${pluralRu(row.unique, "тур", "тура", "туров")} из ${TOTAL_UNIQUE_TOURS}`,
    },
    {
      tone: "content",
      label: "Лидер по контенту",
      row: [...rankings].sort(
        (a, b) =>
          b.materials - a.materials ||
          b.visits - a.visits ||
          a.creator.localeCompare(b.creator, "ru"),
      )[0],
      value: (row: RankingRow) =>
        `${row.materials} ${pluralRu(row.materials, "работа", "работы", "работ")}`,
    },
  ];
  const loopedLeaderSlides = [
    leaderSlides[leaderSlides.length - 1],
    ...leaderSlides,
    leaderSlides[0],
  ];
  const [leaderSlide, setLeaderSlide] = useState(1);
  const [carouselAnimated, setCarouselAnimated] = useState(true);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragDelta = useRef({ x: 0, y: 0 });
  const slideWasSwiped = useRef(false);
  const visibleLeaderSlide =
    ((leaderSlide - 1) % leaderSlides.length + leaderSlides.length) %
    leaderSlides.length;
  const activeBookings = state.bookings.filter(
    (booking) => booking.status === "active",
  );
  const creators = new Set(activeBookings.map((booking) => booking.creator)).size;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeaderSlide((current) => current + 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [leaderSlides.length]);

  function finishCarouselTransition() {
    if (leaderSlide !== 0 && leaderSlide !== leaderSlides.length + 1) return;
    const resetTo = leaderSlide === 0 ? leaderSlides.length : 1;
    setCarouselAnimated(false);
    setLeaderSlide(resetTo);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setCarouselAnimated(true));
    });
  }

  function beginLeaderSwipe(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    dragDelta.current = { x: 0, y: 0 };
    slideWasSwiped.current = false;
  }

  function moveLeaderSwipe(event: React.PointerEvent<HTMLElement>) {
    if (!dragStart.current) return;
    dragDelta.current = {
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    };
    if (
      Math.abs(dragDelta.current.x) >= 42 &&
      Math.abs(dragDelta.current.x) > Math.abs(dragDelta.current.y)
    ) {
      slideWasSwiped.current = true;
    }
  }

  function endLeaderSwipe(event: React.PointerEvent<HTMLElement>) {
    if (!dragStart.current) return;
    moveLeaderSwipe(event);
    const { x: deltaX } = dragDelta.current;
    dragStart.current = null;
    if (!slideWasSwiped.current) return;
    setLeaderSlide((current) => current + (deltaX < 0 ? 1 : -1));
    window.setTimeout(() => {
      slideWasSwiped.current = false;
    }, 120);
  }

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <Logo compact />
        </div>
        <button
          className="round-button"
          aria-label="Вернуться наверх"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      </header>

      <section className="bento" aria-label="Дашборд креатора">
        <button className="tile tile--hero" onClick={() => onOpen("booking")}>
          <div>
            <SplitTitle strong="Выбрать" light="тур" as="h1" />
            <p>Календарь и запись</p>
          </div>
          <span className="hero-arrow">
            <Icon name="arrow" />
          </span>
        </button>

        <article className="tile tile--weather">
          <strong>Погода</strong>
          <span className="weather-temp">{weather.temperature}</span>
          <Icon name="cloud" size={42} />
          <small>{weather.label}</small>
        </article>

        <article className="tile tile--season">
          <strong>Сезон</strong>
          <div
            className="season-ring"
            style={{
              background: `conic-gradient(var(--violet) 0 ${getSeasonProgress()}%, rgba(255, 255, 255, 0.82) ${getSeasonProgress()}% 100%)`,
            }}
          >
            <span>{getSeasonProgress()}%</span>
          </div>
        </article>

        <section
          className="tile tile--rating rating-carousel"
          aria-label="Лидеры CREACLOUD"
          onPointerDown={beginLeaderSwipe}
          onPointerMove={moveLeaderSwipe}
          onPointerUp={endLeaderSwipe}
          onPointerCancel={() => {
            dragStart.current = null;
            dragDelta.current = { x: 0, y: 0 };
            slideWasSwiped.current = false;
          }}
        >
          <div
            className={`rating-carousel__track${
              carouselAnimated ? "" : " is-jumping"
            }`}
            style={{ transform: `translateX(-${leaderSlide * 100}%)` }}
            onTransitionEnd={finishCarouselTransition}
          >
            {loopedLeaderSlides.map((slide, index) => {
              const logicalIndex =
                ((index - 1) % leaderSlides.length + leaderSlides.length) %
                leaderSlides.length;
              return (
                <button
                  key={`${slide.label}-${index}`}
                  className={`rating-slide rating-slide--${slide.tone}`}
                  onClick={(event) => {
                    if (slideWasSwiped.current) {
                      event.preventDefault();
                      return;
                    }
                    onOpen("rating");
                  }}
                >
                  <div>
                    <SplitTitle strong="Рейтинг" light="креаторов" as="h2" />
                    {slide.row ? (
                      <p className="leader-highlight">
                        <small>{slide.label}</small>
                        <strong className="leader-nick">
                          {slide.row.creator}
                        </strong>
                        <span>{slide.value(slide.row)}</span>
                      </p>
                    ) : (
                      <p>Рейтинг формируется</p>
                    )}
                  </div>
                  <span className="top-badge">ТОП · {logicalIndex + 1}</span>
                  <div className="podium" aria-hidden="true">
                    <span />
                    <span>
                      <Icon name="star" />
                    </span>
                    <span />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="leader-dots" aria-label="Переключить показатель">
            {leaderSlides.map((slide, index) => (
              <button
                key={slide.label}
                className={index === visibleLeaderSlide ? "is-active" : ""}
                aria-label={slide.label}
                onClick={() => setLeaderSlide(index + 1)}
              />
            ))}
          </div>
        </section>

        <button
          className="tile tile--metric"
          onClick={() => onOpen("results")}
        >
          <span className="metric-icon metric-icon--lime">
            <Icon name="file" />
          </span>
          <strong>{state.content.length}</strong>
          <span>
            {pluralRu(state.content.length, "материал", "материала", "материалов")}
          </span>
        </button>

        <button
          className="tile tile--metric"
          onClick={() => onOpen("notices")}
        >
          <span className="metric-icon metric-icon--violet">
            <Icon name="user" />
          </span>
          <strong>{creators}</strong>
          <span>{pluralRu(creators, "креатор", "креатора", "креаторов")}</span>
        </button>
      </section>
    </main>
  );
}

function ModalShell({
  strong,
  light,
  kicker,
  onClose,
  children,
  className = "",
}: {
  strong: string;
  light: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className="modal-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`${strong} ${light}`}
    >
      <button
        className="modal-layer__backdrop"
        onClick={onClose}
        aria-label="Закрыть окно"
      />
      <section className={`modal ${className}`}>
        <header className="modal__header">
          <div>
            <span className="modal__kicker">{kicker}</span>
            <SplitTitle strong={strong} light={light} as="h2" />
          </div>
          <button
            className="round-button"
            onClick={onClose}
            aria-label="Закрыть и вернуться на главную"
          >
            ↑
          </button>
        </header>
        <div className="demo-mode-note">
          <span />
          CREACLOUD · данные синхронизированы
        </div>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}

function CalendarMonth({
  month,
  selectedDate,
  state,
  onMonth,
  onSelect,
}: {
  month: string;
  selectedDate: string;
  state: WorkingState;
  onMonth: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const cells: Array<{ date: string; day: number } | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      return {
        date: `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        day,
      };
    }),
  ];
  const monthIndex = (SEASON_MONTHS as readonly string[]).indexOf(month);
  const activeBookings = state.bookings.filter(
    (booking) => booking.status === "active",
  );

  return (
    <section className="calendar-card" aria-label="Календарь туров">
      <div className="calendar-card__controls">
        <button
          aria-label="Предыдущий месяц"
          disabled={monthIndex <= 0}
          onClick={() => onMonth(SEASON_MONTHS[monthIndex - 1])}
        >
          <Icon name="left" />
        </button>
        <strong>{formatMonthRu(month)}</strong>
        <button
          aria-label="Следующий месяц"
          disabled={monthIndex >= SEASON_MONTHS.length - 1}
          onClick={() => onMonth(SEASON_MONTHS[monthIndex + 1])}
        >
          <Icon name="right" />
        </button>
      </div>
      <div className="calendar-weekdays">
        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} />;
          const scheduled = SCHEDULE[cell.date] ?? [];
          const occupied = scheduled.filter((tourId) =>
            activeBookings.some(
              (booking) =>
                booking.date === cell.date && booking.tourId === tourId,
            ),
          ).length;
          const disabled =
            cell.date < BOOKING_START ||
            cell.date < DEMO_TODAY ||
            cell.date > SEASON_END ||
            scheduled.length === 0;
          return (
            <button
              key={cell.date}
              className={[
                selectedDate === cell.date ? "is-selected" : "",
                scheduled.length ? "has-tours" : "",
                scheduled.length > 0 && occupied === scheduled.length
                  ? "is-full"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => onSelect(cell.date)}
              aria-label={`${cell.day} число${scheduled.length ? `, ${scheduled.length} тура` : ""}`}
            >
              <span>{cell.day}</span>
              {scheduled.length > 0 && <i />}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="is-free" /> Есть туры
        </span>
        <span>
          <i className="is-selected" /> Выбрано
        </span>
        <span>
          <i className="is-full" /> Нет мест
        </span>
      </div>
    </section>
  );
}

function BookingPanel({
  state,
  forecast,
  view,
  activeCreator,
  selectedDate,
  selectedTour,
  transferSourceId,
  onView,
  onDate,
  onTour,
  onCreator,
  onTransferSource,
  onSubmit,
  onCancelBooking,
  busy,
}: {
  state: WorkingState;
  forecast: WeatherForecast;
  view: BookingView;
  activeCreator: string;
  selectedDate: string;
  selectedTour: string;
  transferSourceId: string;
  onView: (view: BookingView) => void;
  onDate: (date: string) => void;
  onTour: (tourId: string) => void;
  onCreator: (creator: string) => void;
  onTransferSource: (bookingId: string) => void;
  onSubmit: (contactMode: ContactMode) => void;
  onCancelBooking: (bookingId: string) => void;
  busy: boolean;
}) {
  const selectedMonth = selectedDate.slice(0, 7);
  const [month, setMonth] = useState(
    (SEASON_MONTHS as readonly string[]).includes(selectedMonth)
      ? selectedMonth
      : getDefaultBookableDate().slice(0, 7),
  );
  const activeBookings = state.bookings.filter(
    (booking) => booking.status === "active",
  );
  const upcoming = activeBookings
    .filter(
      (booking) =>
        booking.creator === normalizeCreator(activeCreator) &&
        booking.date >= DEMO_TODAY,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const schedule = SCHEDULE[selectedDate] ?? [];
  const selectedWeather: WeatherDay | undefined = forecast[selectedDate];

  if (view === "manage") {
    return (
      <div className="booking-manage">
        <div className="section-intro">
          <strong>{activeCreator || "Ваши брони"}</strong>
          <p>Перенос и отмена работают только с будущими активными записями.</p>
        </div>
        {upcoming.length ? (
          <div className="booking-list">
            {upcoming.map((booking) => (
              <article key={booking.id} className="booking-card">
                <span className="booking-card__date">
                  {formatDateRu(booking.date)}
                </span>
                <strong>{getTour(booking.tourId)?.name}</strong>
                <div className="booking-card__actions">
                  <button
                    disabled={busy}
                    onClick={() => {
                      onTransferSource(booking.id);
                      onView("transfer");
                    }}
                  >
                    Перенести
                  </button>
                  <button
                    className="is-danger"
                    disabled={busy}
                    onClick={() => onCancelBooking(booking.id)}
                  >
                    <Icon name="trash" size={18} />
                    Отменить
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="calendar" size={34} />
            <strong>Активных броней нет</strong>
            <p>Выберите новый тур в календаре.</p>
          </div>
        )}
        <button className="secondary-button" onClick={() => onView("new")}>
          Новая запись
        </button>
      </div>
    );
  }

  return (
    <div className="booking-layout">
      <CalendarMonth
        month={month}
        selectedDate={selectedDate}
        state={state}
        onMonth={(nextMonth) => {
          setMonth(nextMonth);
          const fallback =
            Object.keys(SCHEDULE)
              .sort()
              .find(
                (date) =>
                  date.startsWith(nextMonth) &&
                  date >= BOOKING_START &&
                  date >= DEMO_TODAY &&
                  SCHEDULE[date].length > 0,
              ) ?? `${nextMonth}-01`;
          onDate(fallback);
          onTour("");
        }}
        onSelect={(date) => {
          onDate(date);
          onTour("");
        }}
      />
      <section className="booking-side">
        <div className="selected-date-head">
          <div>
            <small>{view === "transfer" ? "Новая дата" : "Выбранная дата"}</small>
            <SplitTitle
              strong={selectedDate.slice(-2)}
              light={formatDateRu(selectedDate).replace(/^\d+\s/, "")}
              as="h3"
            />
          </div>
          <span>{schedule.length} тура</span>
        </div>
        {selectedWeather && (
          <div className="selected-date-weather" aria-label="Прогноз погоды">
            <span className="selected-date-weather__icon" aria-hidden="true">
              {selectedWeather.icon}
            </span>
            <div>
              <strong>{selectedWeather.label}</strong>
              <span>
                {selectedWeather.temperatureMin}…{selectedWeather.temperatureMax}
              </span>
            </div>
            <small>Владивосток</small>
          </div>
        )}
        {view === "transfer" && (
          <label className="field">
            <span>Какую бронь перенести</span>
            <select
              value={transferSourceId}
              onChange={(event) => onTransferSource(event.target.value)}
            >
              <option value="">Выберите активную запись</option>
              {upcoming.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {formatDateRu(booking.date)} · {getTour(booking.tourId)?.short}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="tour-options">
          {schedule.map((tourId, index) => {
            const tour = getTour(tourId);
            const occupant = activeBookings.find(
              (booking) =>
                booking.date === selectedDate &&
                booking.tourId === tourId &&
                booking.id !== transferSourceId,
            );
            if (!tour) return null;
            return (
              <button
                key={tourId}
                disabled={Boolean(occupant)}
                className={[
                  selectedTour === tourId ? "is-selected" : "",
                  `is-tone-${(index % 3) + 1}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onTour(tourId)}
              >
                <span className="tour-option__symbol">{tour.emoji}</span>
                <span>
                  <strong>{tour.name}</strong>
                  <small>{occupant ? "Занято" : "Свободно"}</small>
                </span>
                <Icon name="right" />
              </button>
            );
          })}
        </div>
        <label className="field">
          <span>Ник креатора</span>
          <input
            value={activeCreator}
            onChange={(event) => onCreator(event.target.value)}
            placeholder="@username"
            autoCapitalize="none"
          />
        </label>
        <div className="booking-submit-actions">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => onSubmit("whatsapp")}
          >
            {busy
              ? "Сохраняем..."
              : view === "transfer"
                ? "Перенести и открыть WhatsApp"
                : "Забронировать и открыть WhatsApp"}
          </button>
          <button
            className="booking-call-button"
            disabled={busy}
            onClick={() => onSubmit("call")}
          >
            Позвонить для записи
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => onView(view === "transfer" ? "new" : "manage")}
        >
          {view === "transfer" ? "Отменить перенос" : "Управлять текущей бронью"}
        </button>
      </section>
    </div>
  );
}

function ProfileLogin({
  creators,
  value,
  error,
  onChange,
  onSubmit,
}: {
  creators: string[];
  value: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="profile-login-layout">
      <section className="profile-login-card">
        <label className="field">
          <span>Введите ник</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="@username"
            autoCapitalize="none"
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
          />
        </label>
        <p>
          Покажем поездки, контент, рейтинг, текущую бронь и персональную
          рекомендацию.
        </p>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" onClick={onSubmit}>
          Открыть профиль
        </button>
      </section>
      <section className="profile-suggestions">
        <small>Профили из действующей базы</small>
        <div>
          {creators.slice(0, 4).map((creator) => (
            <button key={creator} onClick={() => onChange(creator)}>
              {creator}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePanel({
  state,
  creator,
  onManage,
  onAddContent,
  onBookRecommendation,
}: {
  state: WorkingState;
  creator: string;
  onManage: () => void;
  onAddContent: () => void;
  onBookRecommendation: (date: string, tourId: string) => void;
}) {
  const bookings = state.bookings
    .filter(
      (booking) =>
        booking.status === "active" && booking.creator === creator,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const content = state.content
    .filter((item) => item.creator === creator)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rankings = getRankings(state);
  const rank = rankings.findIndex((row) => row.creator === creator) + 1;
  const uniqueKeys = new Set(
    bookings
      .map((booking) => getTour(booking.tourId)?.uniqueKey)
      .filter(Boolean),
  );
  const upcoming = bookings.find((booking) => booking.date >= DEMO_TODAY);
  const availableRecommendation = Object.entries(SCHEDULE)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, tourIds]) => tourIds.map((tourId) => ({ date, tourId })))
    .find(({ date, tourId }) => {
      const tour = getTour(tourId);
      const occupied = state.bookings.some(
        (booking) =>
          booking.status === "active" &&
          booking.date === date &&
          booking.tourId === tourId,
      );
      return (
        date >= DEMO_TODAY &&
        tour &&
        !uniqueKeys.has(tour.uniqueKey) &&
        !occupied
      );
    });
  const missingTour = TOURS.find(
    (tour) => !uniqueKeys.has(tour.uniqueKey),
  );
  const achievement =
    uniqueKeys.size >= TOTAL_UNIQUE_TOURS || bookings.length >= 10
      ? "Гуру"
      : bookings.length >= 5 || content.length >= 3
        ? "Достигатор"
        : bookings.length >= 2 || content.length >= 1
          ? "Продвинутый"
          : "Новичок";

  return (
    <div className="profile-dashboard">
      <section className="profile-hero">
        <div className="profile-avatar">
          <Icon name="user" size={42} />
          <span />
        </div>
        <div className="profile-identity">
          <small>Профиль сезона</small>
          <strong>{creator}</strong>
          <div className="achievement-row">
            <span>{achievement}</span>
            {rank === 1 && <span className="is-leader">Лидер сезона</span>}
          </div>
        </div>
        <div className="profile-score">
          <strong>{uniqueKeys.size}</strong>
          <span>/ {TOTAL_UNIQUE_TOURS}</span>
        </div>
        <div className="profile-metrics">
          <article>
            <strong>{rank || "—"}</strong>
            <span>место</span>
          </article>
          <article>
            <strong>{bookings.length}</strong>
            <span>поездок</span>
          </article>
          <article>
            <strong>{content.length}</strong>
            <span>материалов</span>
          </article>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-block profile-block--progress">
          <small>Охват программ</small>
          <strong>
            {uniqueKeys.size} из {TOTAL_UNIQUE_TOURS} уникальных туров
          </strong>
          <div className="tour-stars">
            {Array.from({ length: TOTAL_UNIQUE_TOURS }, (_, index) => (
              <Icon
                key={index}
                name="star"
                size={18}
              />
            )).map((star, index) => (
              <span
                key={index}
                className={index < uniqueKeys.size ? "is-filled" : ""}
              >
                {star}
              </span>
            ))}
          </div>
          <p>
            Две вечерние программы учитываются как одна уникальная категория.
          </p>
        </section>

        <section className="profile-block profile-block--booking">
          <small>Ближайшая бронь</small>
          {upcoming ? (
            <>
              <strong>{formatDateRu(upcoming.date)}</strong>
              <p>{getTour(upcoming.tourId)?.name ?? upcoming.tourName}</p>
            </>
          ) : (
            <>
              <strong>Будущих записей нет</strong>
              <p>Выберите свободное окно в календаре.</p>
            </>
          )}
        </section>

        <section className="profile-block profile-block--recommendation">
          <small>Следующий уникальный тур</small>
          {availableRecommendation ? (
            <>
              <strong>
                {getTour(availableRecommendation.tourId)?.name}
              </strong>
              <p>
                Ближайшее свободное окно:{" "}
                {formatDateRu(availableRecommendation.date)}.
              </p>
              <button
                onClick={() =>
                  onBookRecommendation(
                    availableRecommendation.date,
                    availableRecommendation.tourId,
                  )
                }
              >
                Записаться
                <Icon name="arrow" />
              </button>
            </>
          ) : missingTour ? (
            <>
              <strong>{missingTour.name}</strong>
              <p>
                Новых свободных дат пока нет — покажем ближайшую, как только она
                появится в расписании.
              </p>
            </>
          ) : (
            <>
              <strong>Все доступные категории пройдены</strong>
              <p>Можно повторить любимый маршрут.</p>
            </>
          )}
        </section>

        <section className="profile-block profile-block--material">
          <small>Последний материал</small>
          {content[0] ? (
            <>
              <strong>{getTour(content[0].tourId)?.short}</strong>
              <p>
                {platformFromLink(content[0].link)} ·{" "}
                {formatDateRu(content[0].date)}
              </p>
            </>
          ) : (
            <>
              <strong>Публикаций пока нет</strong>
              <p>Добавьте готовую работу после тура.</p>
            </>
          )}
        </section>
      </div>

      <div className="profile-actions">
        <button className="dark-button" onClick={onManage}>
          <Icon name="calendar" />
          Управлять бронью
          <Icon name="arrow" />
        </button>
        <button className="light-button" onClick={onAddContent}>
          <Icon name="plus" />
          Добавить контент
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function ContentPanel({
  state,
  creator,
  tourId,
  link,
  error,
  onCreator,
  onTour,
  onLink,
  onSubmit,
  onResults,
  busy,
}: {
  state: WorkingState;
  creator: string;
  tourId: string;
  link: string;
  error: string;
  onCreator: (value: string) => void;
  onTour: (value: string) => void;
  onLink: (value: string) => void;
  onSubmit: () => void;
  onResults: () => void;
  busy: boolean;
}) {
  const knownCreators = [
    ...new Set(
      state.bookings
        .filter((booking) => booking.status === "active")
        .map((booking) => booking.creator),
    ),
  ].sort();
  const normalized = normalizeCreator(creator);
  const creatorBookings = state.bookings.filter(
    (booking) =>
      booking.status === "active" && booking.creator === normalized,
  );
  const visitedTourIds = [
    ...new Set(creatorBookings.map((booking) => booking.tourId)),
  ];

  return (
    <div className="content-layout">
      <section className="content-form">
        <label className="field">
          <span>Ник креатора из записи</span>
          <input
            list="creator-list"
            value={creator}
            onChange={(event) => onCreator(event.target.value)}
            placeholder="@username"
            autoCapitalize="none"
          />
          <datalist id="creator-list">
            {knownCreators.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Название посещённого тура</span>
          <select
            value={tourId}
            onChange={(event) => onTour(event.target.value)}
          >
            <option value="">Выберите тур</option>
            {visitedTourIds.map((id) => (
              <option key={id} value={id}>
                {getTour(id)?.name ?? id}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ссылка на готовый контент</span>
          <div className="input-with-icon">
            <Icon name="link" />
            <input
              value={link}
              onChange={(event) => onLink(event.target.value)}
              placeholder="https://..."
              inputMode="url"
            />
          </div>
        </label>
        <div className="inline-note">
          Дата поездки будет найдена автоматически по нику и выбранному туру.
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" disabled={busy} onClick={onSubmit}>
          {busy ? "Добавляем..." : "Добавить готовый контент"}
        </button>
      </section>
      <aside className="content-aside">
        <div className="content-aside__plus">
          <Icon name="plus" size={40} />
        </div>
        <small>Материалы мастерской</small>
        <SplitTitle
          strong={String(state.content.length)}
          light="публикаций"
          as="h3"
        />
        <p>
          После добавления работа появится в итогах, ЛК и рейтинге контента.
        </p>
        <button onClick={onResults}>Смотреть все работы</button>
      </aside>
    </div>
  );
}

function RatingPanel({
  state,
  mode,
  onMode,
}: {
  state: WorkingState;
  mode: RatingMode;
  onMode: (mode: RatingMode) => void;
}) {
  const rows = getRankings(state);
  const sorted = [...rows].sort((a, b) => {
    if (mode === "unique")
      return b.unique - a.unique || b.visits - a.visits;
    if (mode === "content")
      return b.materials - a.materials || b.visits - a.visits;
    return b.visits - a.visits || b.unique - a.unique;
  });

  return (
    <div className="rating-layout">
      <div className="segmented-control" aria-label="Вид рейтинга">
        <button
          className={mode === "visits" ? "is-active" : ""}
          onClick={() => onMode("visits")}
        >
          Поездки
        </button>
        <button
          className={mode === "unique" ? "is-active" : ""}
          onClick={() => onMode("unique")}
        >
          Уникальные
        </button>
        <button
          className={mode === "content" ? "is-active" : ""}
          onClick={() => onMode("content")}
        >
          Контент
        </button>
      </div>
      <p className="rating-explain">
        Основное место определяется по количеству поездок. Уникальные маршруты
        и материалы показываются дополнительными показателями.
      </p>
      <div className="ranking-list">
        {sorted.map((row, index) => {
          const score =
            mode === "unique"
              ? row.unique
              : mode === "content"
                ? row.materials
                : row.visits;
          const scoreLabel =
            mode === "unique"
              ? pluralRu(row.unique, "тур", "тура", "туров")
              : mode === "content"
                ? pluralRu(row.materials, "работа", "работы", "работ")
                : pluralRu(row.visits, "поездка", "поездки", "поездок");
          const achievement =
            index === 0
              ? mode === "unique"
                ? "Лидер по уникальным турам"
                : mode === "content"
                  ? "Лидер по контенту"
                  : "Лидер по поездкам"
              : row.unique >= TOTAL_UNIQUE_TOURS
                ? "Все маршруты сезона"
                : row.materials >= 5
                  ? "Автор сезона"
                  : row.visits >= 3
                    ? "Постоянный участник"
                    : "Вклад в CREACLOUD";

          return (
            <article
              key={row.creator}
              className={index < 3 ? `is-top-${index + 1}` : ""}
            >
              <header className="ranking-card__head">
                <span className="ranking-place">
                  #{String(index + 1).padStart(2, "0")}
                </span>
                <span className="ranking-achievement">{achievement}</span>
                <span className="ranking-score">
                  <strong>{score}</strong>
                  <small>{scoreLabel}</small>
                </span>
              </header>
              <div className="ranking-person">
                <small>Креатор</small>
                <strong>{row.creator}</strong>
              </div>
              <div className="ranking-metrics">
                <span>
                  <strong>{row.visits}</strong>
                  {pluralRu(row.visits, "поездка", "поездки", "поездок")}
                </span>
                <span>
                  <strong>{row.unique}</strong>
                  уникальных из {TOTAL_UNIQUE_TOURS}
                </span>
                <span>
                  <strong>{row.materials}</strong>
                  {pluralRu(row.materials, "работа", "работы", "работ")}
                </span>
              </div>
              <div className="ranking-progress">
                <div className="ranking-stars" aria-label="Уникальные туры">
                  {Array.from({ length: TOTAL_UNIQUE_TOURS }, (_, starIndex) => (
                    <span
                      key={starIndex}
                      className={starIndex < row.unique ? "is-filled" : ""}
                    >
                      <Icon name="star" size={13} />
                    </span>
                  ))}
                </div>
                <span>
                  {row.unique}{" "}
                  {pluralRu(
                    row.unique,
                    "уникальный тур",
                    "уникальных тура",
                    "уникальных туров",
                  )}{" "}
                  из {TOTAL_UNIQUE_TOURS}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ResultsPanel({
  state,
  filter,
  onFilter,
  onStory,
}: {
  state: WorkingState;
  filter: string;
  onFilter: (value: string) => void;
  onStory: (item: ContentItem) => void;
}) {
  const creators = [...new Set(state.content.map((item) => item.creator))].sort();
  const visible = filter
    ? state.content.filter((item) => item.creator === filter)
    : state.content;
  const grouped = visible.reduce<Record<string, ContentItem[]>>((result, item) => {
    result[item.creator] = [...(result[item.creator] ?? []), item];
    return result;
  }, {});

  return (
    <div className="results-layout">
      <div className="results-tools">
        <label className="field">
          <span>Фильтр по креатору</span>
          <select
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
          >
            <option value="">Все креаторы</option>
            {creators.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </select>
        </label>
        <strong>
          {Object.keys(grouped).length}{" "}
          {pluralRu(
            Object.keys(grouped).length,
            "креатор",
            "креатора",
            "креаторов",
          )}{" "}
          · {visible.length}{" "}
          {pluralRu(visible.length, "материал", "материала", "материалов")}
        </strong>
      </div>
      <div className="creator-groups">
        {Object.entries(grouped)
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([creator, items], groupIndex) => (
            <section
              key={creator}
              className={`creator-group is-tone-${(groupIndex % 3) + 1}`}
            >
              <header>
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                <strong>{creator}</strong>
                <small>
                  {items.length}{" "}
                  {pluralRu(items.length, "работа", "работы", "работ")}
                </small>
              </header>
              <div>
                {items.map((item, index) => (
                  <button key={item.id} onClick={() => onStory(item)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <small>{platformFromLink(item.link)}</small>
                      <strong>{getTour(item.tourId)?.name}</strong>
                    </span>
                    <time>{formatDateRu(item.date)}</time>
                    <Icon name="right" />
                  </button>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

function StoryPanel({
  item,
  onBack,
}: {
  item: ContentItem | null;
  onBack: () => void;
}) {
  if (!item) return null;
  const tour = getTour(item.tourId);
  return (
    <div className="story-layout">
      <section className="story-visual">
        <div className="story-visual__top">
          <span>{platformFromLink(item.link)}</span>
          <span>01 / 01</span>
        </div>
        <div className="story-visual__symbol">{tour?.emoji}</div>
        <div className="story-visual__copy">
          <strong>{item.creator}</strong>
          <p>{tour?.name}</p>
        </div>
        <div className="story-visual__meta">
          <span>{formatDateRu(item.date)}</span>
          <span>Материал сезона</span>
        </div>
      </section>
      <div className="story-actions">
        <button className="secondary-button" onClick={onBack}>
          <Icon name="left" />
          Назад к итогам
        </button>
        <a href={item.link} target="_blank" rel="noreferrer">
          Открыть публикацию
          <Icon name="arrow" />
        </a>
      </div>
    </div>
  );
}

type RecentTourEvent = {
  id: string;
  kind: "booking" | "content";
  creator: string;
  tourName: string;
  date: string;
  createdAt: string;
};

function getRecentTourEvents(state: WorkingState) {
  const events: RecentTourEvent[] = [
    ...state.bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      kind: "booking" as const,
      creator: booking.creator,
      tourName: booking.tourName,
      date: booking.date,
      createdAt: booking.createdAt,
    })),
    ...state.content.map((item) => ({
      id: `content-${item.id}`,
      kind: "content" as const,
      creator: item.creator,
      tourName: item.tourName,
      date: item.date,
      createdAt: item.createdAt,
    })),
  ];

  return events
    .sort((a, b) => {
      const aTimestamp = Date.parse(a.createdAt);
      const bTimestamp = Date.parse(b.createdAt);
      if (Number.isFinite(aTimestamp) || Number.isFinite(bTimestamp)) {
        return (Number.isFinite(bTimestamp) ? bTimestamp : 0) -
          (Number.isFinite(aTimestamp) ? aTimestamp : 0);
      }
      return b.date.localeCompare(a.date);
    })
    .slice(0, 5);
}

function NoticesPanel({
  state,
  dataStatus,
  lastSynced,
  refreshing,
  onRefresh,
}: {
  state: WorkingState;
  dataStatus: DataStatus;
  lastSynced: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const rankings = getRankings(state);
  const recentEvents = getRecentTourEvents(state);
  return (
    <div className="notices-layout">
      <section className="notice-card notice-card--daily">
        <span className="notice-icon">
          <Icon name="bell" />
        </span>
        <small>Ежедневное уведомление</small>
        <SplitTitle strong="5 последних" light="событий" as="h3" />
        {recentEvents.length ? (
          <ol className="recent-events">
            {recentEvents.map((event) => (
              <li key={event.id}>
                <span className="recent-events__icon">
                  <Icon
                    name={event.kind === "booking" ? "calendar" : "file"}
                    size={16}
                  />
                </span>
                <span>
                  <strong>{event.creator}</strong>
                  <small>
                    {event.kind === "booking"
                      ? "записался на тур"
                      : "добавил материал"}{" "}
                    · {event.tourName}
                  </small>
                </span>
                <time>{formatDateRu(event.date)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="recent-events__empty">Новых событий пока нет.</p>
        )}
      </section>
      <section className="notice-card notice-card--leader">
        <span className="notice-icon">
          <Icon name="star" />
        </span>
        <small>Событие дня</small>
        <SplitTitle strong="Новый" light="лидер сезона" as="h3" />
        <div className="leader-change">
          <span>01</span>
          <strong>{rankings[0]?.creator}</strong>
          <small>
            {rankings[0]?.visits}{" "}
            {pluralRu(
              rankings[0]?.visits ?? 0,
              "поездка",
              "поездки",
              "поездок",
            )}
          </small>
        </div>
      </section>
      <section className="sync-status">
        <div>
          <strong>
            {dataStatus === "live"
              ? "Рабочая база подключена"
              : dataStatus === "cached"
                ? "Показана последняя сохранённая копия"
                : "Проверяем подключение"}
          </strong>
          <p>
            Бронирования, переносы, отмены и публикации синхронизируются с общей
            базой CREACLOUD.
            {lastSynced ? ` Последняя синхронизация: ${lastSynced}.` : ""}
          </p>
        </div>
        <button disabled={refreshing} onClick={onRefresh}>
          {refreshing ? "Обновляем..." : "Обновить данные"}
        </button>
      </section>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={`toast${message ? " toast--visible" : ""}`} role="status">
      <span>
        <Icon name="check" size={18} />
      </span>
      {message}
    </div>
  );
}

export default function CreacloudApp() {
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [state, setState] = useState<WorkingState>(() => emptyWorkingState());
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [lastSynced, setLastSynced] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [writeBusy, setWriteBusy] = useState(false);
  const [weather, setWeather] = useState<WeatherSummary>({
    temperature: "—",
    label: "Владивосток",
    icon: "☁️",
  });
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast>({});
  const [activeCreator, setActiveCreator] = useState("");
  const [profileInput, setProfileInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [bookingView, setBookingView] = useState<BookingView>("new");
  const [selectedDate, setSelectedDate] = useState(getDefaultBookableDate);
  const [selectedTour, setSelectedTour] = useState("");
  const [transferSourceId, setTransferSourceId] = useState("");
  const [contentCreator, setContentCreator] = useState("");
  const [contentTour, setContentTour] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [contentError, setContentError] = useState("");
  const [ratingMode, setRatingMode] = useState<RatingMode>("visits");
  const [resultsFilter, setResultsFilter] = useState("");
  const [story, setStory] = useState<ContentItem | null>(null);
  const [toast, setToast] = useState("");
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const lastScroll = useRef(0);

  const activeBookings = state.bookings.filter(
    (booking) => booking.status === "active",
  );
  const knownCreators = useMemo(
    () => [...new Set(activeBookings.map((booking) => booking.creator))].sort(),
    [activeBookings],
  );

  function saveCachedState(next: WorkingState, syncedAt = new Date()) {
    setState(next);
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ state: next, savedAt: syncedAt.toISOString() }),
      );
    } catch {
      // A cache failure must not block the live working base.
    }
  }

  function notify(message: string) {
    setToast(message);
  }

  function syncLabel(value = new Date()) {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  }

  async function refreshWorkingData(showMessage = true) {
    setRefreshing(true);
    try {
      const next = await fetchWorkingState();
      saveCachedState(next);
      setDataStatus("live");
      setLastSynced(syncLabel());
      if (showMessage) notify("Данные рабочей базы обновлены.");
      return next;
    } catch {
      setDataStatus(state.bookings.length || state.content.length ? "cached" : "error");
      if (showMessage) {
        notify("Не удалось обновить базу. Показаны последние сохранённые данные.");
      }
      return null;
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    try {
      const saved = window.localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          state?: WorkingState;
          savedAt?: string;
        };
        if (
          parsed.state &&
          Array.isArray(parsed.state.bookings) &&
          Array.isArray(parsed.state.content)
        ) {
          const cachedState = parsed.state;
          const cachedAt = parsed.savedAt ? new Date(parsed.savedAt) : null;
          window.queueMicrotask(() => {
            if (cancelled) return;
            setState(cachedState);
            setDataStatus("cached");
            if (cachedAt && !Number.isNaN(cachedAt.getTime())) {
              setLastSynced(syncLabel(cachedAt));
            }
          });
        }
      }
    } catch {
      // Continue with a live load when the isolated cache is unavailable.
    }

    const dataRequest = fetchWorkingState()
      .then((next) => {
        if (cancelled) return;
        saveCachedState(next);
        setDataStatus("live");
        setLastSynced(syncLabel());
      })
      .catch(() => {
        if (cancelled) return;
        setDataStatus((current) => (current === "cached" ? "cached" : "error"));
      });

    const weatherRequest = fetchVladivostokWeather()
      .then((next) => {
        if (!cancelled) {
          setWeather(next.current);
          setWeatherForecast(next.forecast);
        }
      })
      .catch(() => {
        // Weather is informative and must not block the main data.
      });

    Promise.allSettled([dataRequest, weatherRequest]).then(() => {
      const remaining = Math.max(0, 1450 - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, remaining);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const current = Math.max(0, window.scrollY);
      const delta = current - lastScroll.current;
      if (current < 80 || delta < -4) setToolbarHidden(false);
      if (current > 140 && delta > 4) setToolbarHidden(true);
      lastScroll.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closePanel() {
    setPanel(null);
    setToolbarHidden(false);
  }

  function enterTeamPortal() {
    let showDailyNotice = true;
    try {
      showDailyNotice =
        window.localStorage.getItem(TEAM_DAILY_NOTICE_KEY) !== DEMO_TODAY;
      if (showDailyNotice) {
        window.localStorage.setItem(TEAM_DAILY_NOTICE_KEY, DEMO_TODAY);
      }
    } catch {
      // The notification remains available when browser storage is unavailable.
    }
    setEntered(true);
    if (showDailyNotice) setPanel("notices");
  }

  function openBooking(view: BookingView = "new") {
    setBookingView(view);
    if (!activeCreator && view !== "new") setActiveCreator(profileInput);
    setPanel("booking");
  }

  function openProfile() {
    setProfileError("");
    if (activeCreator) setProfileInput(activeCreator);
    setPanel("profile-login");
  }

  function submitProfile() {
    const normalized = normalizeCreator(profileInput);
    if (!normalized || !knownCreators.includes(normalized)) {
      setProfileError(
        "ЛК открывается после первого бронирования. Пока этот ник не найден в базе.",
      );
      return;
    }
    setActiveCreator(normalized);
    setContentCreator(normalized);
    setProfileError("");
    setPanel("profile");
  }

  async function submitBooking(contactMode: ContactMode) {
    let creator = normalizeCreator(activeCreator);
    const mode = bookingView === "transfer" ? "transfer" : "new";
    if (!creator) {
      notify("Введите ник креатора.");
      return;
    }
    if (isDeletedCreator(creator)) {
      notify("Этот профиль удалён и недоступен для бронирования.");
      return;
    }
    if (!selectedDate || !selectedTour) {
      notify("Выберите дату и свободный тур.");
      return;
    }
    if (
      selectedDate < BOOKING_START ||
      selectedDate < DEMO_TODAY ||
      selectedDate > SEASON_END ||
      !(SCHEDULE[selectedDate] ?? []).includes(selectedTour)
    ) {
      notify("Эта дата или программа уже недоступна для записи.");
      return;
    }

    const localSource =
      mode === "transfer"
        ? state.bookings.find((booking) => booking.id === transferSourceId)
        : undefined;
    if (mode === "transfer" && !localSource) {
      notify("Выберите активную бронь для переноса.");
      return;
    }
    if (localSource && localSource.creator !== creator) {
      notify("Выбранная бронь принадлежит другому нику.");
      return;
    }

    const localConflict = state.bookings.some(
      (booking) =>
        booking.status === "active" &&
        booking.date === selectedDate &&
        booking.tourId === selectedTour &&
        booking.sourceKey !== localSource?.sourceKey,
    );
    if (localConflict) {
      notify("Это окно уже занято. Выберите другой тур.");
      return;
    }

    setWriteBusy(true);
    try {
      const latest = await fetchWorkingState();
      const existingCreator = latest.bookings.find(
        (booking) => booking.creator === creator,
      );
      if (existingCreator) creator = existingCreator.creator;

      const source =
        mode === "transfer" && localSource
          ? latest.bookings.find(
              (booking) => booking.sourceKey === localSource.sourceKey,
            )
          : undefined;
      if (mode === "transfer" && !source) {
        saveCachedState(latest);
        notify("Исходная бронь уже была изменена. Выберите её заново.");
        return;
      }
      if (source && source.creator !== creator) {
        notify("Исходная бронь больше не принадлежит указанному нику.");
        return;
      }

      const conflict = latest.bookings.some(
        (booking) =>
          booking.date === selectedDate &&
          booking.tourId === selectedTour &&
          booking.sourceKey !== source?.sourceKey,
      );
      if (conflict) {
        saveCachedState(latest);
        notify("Этот тур уже занял другой креатор. Выберите другое окно.");
        return;
      }

      const { payload, targetKey, dedupeKey, tourName } =
        createBookingPayload({
          mode,
          creator,
          date: selectedDate,
          tourId: selectedTour,
          source,
          contactMode,
        });
      if (source?.sourceKey === targetKey) {
        notify("Для переноса выберите другую дату или программу.");
        return;
      }
      if (wasRecentlyWritten(dedupeKey)) {
        notify(mode === "transfer" ? "Такой перенос уже отправлен." : "Такая бронь уже отправлена.");
        return;
      }

      await sendWorkingPayload(payload);
      rememberWrite(dedupeKey);

      const optimistic: Booking = {
        id: String(payload.requestId),
        sourceKey: targetKey,
        creator,
        date: selectedDate,
        tourId: selectedTour,
        tourName,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const nextBookings =
        mode === "transfer" && source
          ? latest.bookings.filter(
              (booking) => booking.sourceKey !== source.sourceKey,
            )
          : [...latest.bookings];
      nextBookings.push(optimistic);
      saveCachedState({ ...latest, bookings: nextBookings });
      setDataStatus("live");
      setLastSynced(syncLabel());
      setActiveCreator(creator);
      setProfileInput(creator);
      setSelectedTour("");
      setTransferSourceId("");
      setBookingView("manage");
      notify(
        mode === "transfer"
          ? "Запись перенесена в рабочей базе."
          : "Бронь создана в рабочей базе.",
      );

      const contactUrl = bookingContactUrl({
        contactMode,
        mode,
        creator,
        date: selectedDate,
        tourName,
        source,
      });
      window.setTimeout(() => {
        window.location.href = contactUrl;
      }, 450);
      window.setTimeout(() => {
        void refreshWorkingData(false);
      }, 2200);
    } catch {
      notify("Не удалось проверить или сохранить бронь. Повторите попытку.");
    } finally {
      setWriteBusy(false);
    }
  }

  async function cancelBooking(bookingId: string) {
    const localSource = state.bookings.find(
      (booking) => booking.id === bookingId,
    );
    if (!localSource) {
      notify("Бронь уже не найдена.");
      return;
    }
    if (
      !window.confirm(
        `Удалить бронь ${formatDateRu(localSource.date)} — ${localSource.tourName}?`,
      )
    ) {
      return;
    }

    setWriteBusy(true);
    try {
      const latest = await fetchWorkingState();
      const source = latest.bookings.find(
        (booking) => booking.sourceKey === localSource.sourceKey,
      );
      if (!source || source.date < DEMO_TODAY) {
        saveCachedState(latest);
        notify("Эта бронь уже изменена или недоступна для отмены.");
        return;
      }
      const { payload, dedupeKey } = createCancellationPayload({
        source,
        contactMode: "whatsapp",
      });
      if (wasRecentlyWritten(dedupeKey)) {
        notify("Удаление этой брони уже отправлено.");
        return;
      }

      await sendWorkingPayload(payload);
      rememberWrite(dedupeKey);
      saveCachedState({
        ...latest,
        bookings: latest.bookings.filter(
          (booking) => booking.sourceKey !== source.sourceKey,
        ),
      });
      setDataStatus("live");
      setLastSynced(syncLabel());
      notify("Бронь удалена из рабочей базы, место снова свободно.");

      const contactUrl = bookingContactUrl({
        contactMode: "whatsapp",
        mode: "cancel",
        creator: source.creator,
        date: source.date,
        tourName: source.tourName,
        source,
      });
      window.setTimeout(() => {
        window.location.href = contactUrl;
      }, 450);
      window.setTimeout(() => {
        void refreshWorkingData(false);
      }, 2200);
    } catch {
      notify("Не удалось проверить или удалить бронь. Повторите попытку.");
    } finally {
      setWriteBusy(false);
    }
  }

  function openContent(creator = activeCreator) {
    setContentCreator(creator);
    setContentTour("");
    setContentLink("");
    setContentError("");
    setPanel("content");
  }

  async function submitContent() {
    let creator = normalizeCreator(contentCreator);
    if (!creator || !knownCreators.includes(creator)) {
      setContentError("Выберите ник, который уже записывался на тур.");
      return;
    }
    if (isDeletedCreator(creator)) {
      setContentError("Этот профиль удалён и не может добавлять публикации.");
      return;
    }
    if (!contentTour) {
      setContentError("Выберите посещённый тур этого креатора.");
      return;
    }
    if (!isValidContentLink(contentLink)) {
      setContentError("Укажите корректную прямую ссылку на публикацию.");
      return;
    }
    const linkKey = normalizeContentLink(contentLink);
    if (
      state.content.some(
        (item) => normalizeContentLink(item.link) === linkKey,
      )
    ) {
      setContentError("Такая ссылка уже добавлена.");
      return;
    }

    setWriteBusy(true);
    try {
      const latest = await fetchWorkingState();
      const existingCreator = latest.bookings.find(
        (booking) => booking.creator === creator,
      );
      if (existingCreator) creator = existingCreator.creator;
      const booking = latest.bookings
        .filter(
          (item) =>
            item.creator === creator && item.tourId === contentTour,
        )
        .sort((a, b) => {
          const aCompleted = a.date <= DEMO_TODAY ? 1 : 0;
          const bCompleted = b.date <= DEMO_TODAY ? 1 : 0;
          return bCompleted - aCompleted || b.date.localeCompare(a.date);
        })[0];
      if (!booking) {
        saveCachedState(latest);
        setContentError(
          "Ник не найден среди актуальных записей на выбранный тур.",
        );
        return;
      }
      if (
        latest.content.some(
          (item) => normalizeContentLink(item.link) === linkKey,
        )
      ) {
        saveCachedState(latest);
        setContentError("Такая ссылка уже добавлена.");
        return;
      }

      const { payload, optimistic } = createContentPayload({
        creator,
        booking,
        link: contentLink,
      });
      const dedupeKey = String(payload.dedupeKey);
      if (wasRecentlyWritten(dedupeKey)) {
        setContentError("Такая ссылка уже отправлена.");
        return;
      }

      await sendWorkingPayload(payload);
      rememberWrite(dedupeKey);
      saveCachedState({
        ...latest,
        content: [optimistic, ...latest.content],
      });
      setDataStatus("live");
      setLastSynced(syncLabel());
      setActiveCreator(creator);
      setProfileInput(creator);
      setContentTour("");
      setContentLink("");
      setContentError("");
      notify("Контент добавлен в рабочую базу и связан с поездкой.");
      window.setTimeout(() => {
        void refreshWorkingData(false);
      }, 2200);
    } catch {
      setContentError(
        "Не удалось проверить или добавить материал. Повторите попытку.",
      );
    } finally {
      setWriteBusy(false);
    }
  }

  function renderPanel() {
    if (!panel) return null;
    if (panel === "booking") {
      return (
        <ModalShell
          strong={bookingView === "manage" ? "Мои" : "Выбрать"}
          light={bookingView === "manage" ? "брони" : "тур"}
          kicker={
            bookingView === "manage"
              ? "Управление текущими записями"
              : bookingView === "transfer"
                ? "Перенос бронирования"
                : "Календарь и бронирование"
          }
          onClose={closePanel}
          className="modal--booking"
        >
          <BookingPanel
            state={state}
            forecast={weatherForecast}
            view={bookingView}
            activeCreator={activeCreator}
            selectedDate={selectedDate}
            selectedTour={selectedTour}
            transferSourceId={transferSourceId}
            onView={setBookingView}
            onDate={setSelectedDate}
            onTour={setSelectedTour}
            onCreator={setActiveCreator}
            onTransferSource={setTransferSourceId}
            onSubmit={submitBooking}
            onCancelBooking={cancelBooking}
            busy={writeBusy}
          />
        </ModalShell>
      );
    }
    if (panel === "profile-login") {
      return (
        <ModalShell
          strong="ЛК"
          light="креатора"
          kicker="Вход по нику из базы"
          onClose={closePanel}
          className="modal--profile-login"
        >
          <ProfileLogin
            creators={knownCreators}
            value={profileInput}
            error={profileError}
            onChange={setProfileInput}
            onSubmit={submitProfile}
          />
        </ModalShell>
      );
    }
    if (panel === "profile") {
      return (
        <ModalShell
          strong="ЛК"
          light="креатора"
          kicker="Персональный профиль"
          onClose={closePanel}
          className="modal--profile"
        >
          <ProfilePanel
            state={state}
            creator={activeCreator}
            onManage={() => {
              setBookingView("manage");
              setPanel("booking");
            }}
            onAddContent={() => openContent(activeCreator)}
            onBookRecommendation={(date, tourId) => {
              setSelectedDate(date);
              setSelectedTour(tourId);
              setBookingView("new");
              setPanel("booking");
            }}
          />
        </ModalShell>
      );
    }
    if (panel === "content") {
      return (
        <ModalShell
          strong="Добавить"
          light="контент"
          kicker="Готовый материал после тура"
          onClose={closePanel}
          className="modal--content"
        >
          <ContentPanel
            state={state}
            creator={contentCreator}
            tourId={contentTour}
            link={contentLink}
            error={contentError}
            onCreator={setContentCreator}
            onTour={setContentTour}
            onLink={setContentLink}
            onSubmit={submitContent}
            onResults={() => setPanel("results")}
            busy={writeBusy}
          />
        </ModalShell>
      );
    }
    if (panel === "rating") {
      return (
        <ModalShell
          strong="Рейтинг"
          light="креаторов"
          kicker="Статистика сезона"
          onClose={closePanel}
          className="modal--rating"
        >
          <RatingPanel
            state={state}
            mode={ratingMode}
            onMode={setRatingMode}
          />
        </ModalShell>
      );
    }
    if (panel === "results") {
      return (
        <ModalShell
          strong="Смотреть"
          light="результаты"
          kicker="Итоги морских туров"
          onClose={closePanel}
          className="modal--results"
        >
          <ResultsPanel
            state={state}
            filter={resultsFilter}
            onFilter={setResultsFilter}
            onStory={(item) => {
              setStory(item);
              setPanel("story");
            }}
          />
        </ModalShell>
      );
    }
    if (panel === "story") {
      return (
        <ModalShell
          strong="История"
          light="креатора"
          kicker="Материал мастерской"
          onClose={closePanel}
          className="modal--story"
        >
          <StoryPanel item={story} onBack={() => setPanel("results")} />
        </ModalShell>
      );
    }
    return (
      <ModalShell
        strong="Сводка"
        light="мастерской"
        kicker="События и синхронизация"
        onClose={closePanel}
        className="modal--notices"
      >
        <NoticesPanel
          state={state}
          dataStatus={dataStatus}
          lastSynced={lastSynced}
          refreshing={refreshing}
          onRefresh={() => {
            void refreshWorkingData();
          }}
        />
      </ModalShell>
    );
  }

  return (
    <>
      <Splash hidden={!loading} />
      {!loading && !entered ? (
        <Welcome onEnter={enterTeamPortal} />
      ) : (
        <div className="site-shell">
          <div
            className={
              panel ? "site-shell__surface is-dimmed" : "site-shell__surface"
            }
          >
            <Dashboard
              state={state}
              weather={weather}
              onOpen={(next) => {
                if (next === "booking") openBooking("new");
                else setPanel(next);
              }}
            />
            <Toolbar
              active={panel}
              hidden={toolbarHidden}
              onBooking={() => openBooking("new")}
              onProfile={openProfile}
              onContent={() => openContent()}
            />
          </div>
          {renderPanel()}
        </div>
      )}
      <Toast message={toast} />
      <InteractionAuras />
    </>
  );
}
