import { useState, useEffect, useMemo } from "react";
import { Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import styles from "./Timesheets.module.css";
import titles from "../../components/CSS Components/titles.module.css";
import { timeEntryService } from "../../services/time-entry.service";
import type { TimeEntry } from "../../services/time-entry.service";
import { reportService } from "../../services/report.service";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthToRange(month: string): { startDate: string; endDate: string } {
  const [year, mon] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    startDate: `${year}-${pad(mon)}-01T00:00:00.000Z`,
    endDate: `${year}-${pad(mon)}-${pad(lastDay)}T23:59:59.999Z`,
  };
}

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(
  startTime: string,
  endTime: string | null | undefined,
): string {
  if (!endTime) return "In progress";
  const mins = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function toDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isToday(date: Date): boolean {
  const t = new Date();
  return (
    date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
  );
}

function Timesheets() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterTaskName, setFilterTaskName] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const { startDate, endDate } = monthToRange(month);
    setLoading(true);
    setError(null);
    setSelectedKey(null);
    setFilterCustomerId("");
    setFilterTaskName("");
    timeEntryService
      .getMyEntries(startDate, endDate)
      .then(setEntries)
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Failed to load entries.",
        ),
      )
      .finally(() => setLoading(false));
  }, [month]);

  const calendarDays = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++)
      days.push(new Date(year, mon - 1, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [month]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries)
      if (e.customer?.id && e.customer?.name)
        map.set(e.customer.id, e.customer.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const uniqueTaskNames = useMemo(() => {
    if (!filterCustomerId) return [];
    const names = new Set<string>();
    for (const e of entries)
      if (e.customer?.id === filterCustomerId && e.task?.name)
        names.add(e.task.name);
    return Array.from(names);
  }, [entries, filterCustomerId]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (filterCustomerId && e.customer?.id !== filterCustomerId)
          return false;
        if (filterTaskName && e.task?.name !== filterTaskName) return false;
        return true;
      }),
    [entries, filterCustomerId, filterTaskName],
  );

  const entriesByDay = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    for (const e of filtered) {
      const k = toDayKey(new Date(e.startTime));
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    return map;
  }, [filtered]);

  const totalSeconds = useMemo(
    () =>
      filtered.reduce((sum, e) => {
        if (!e.endTime) return sum;
        return (
          sum +
          Math.round(
            (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
              1000,
          )
        );
      }, 0),
    [filtered],
  );

  const uniqueDays = useMemo(
    () => new Set(filtered.map((e) => toDayKey(new Date(e.startTime)))).size,
    [filtered],
  );

  const selectedEntries = useMemo(() => {
    if (!selectedKey) return [];
    return (entriesByDay[selectedKey] ?? []).sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [selectedKey, entriesByDay]);

  // noon avoids any TZ offset shifting the day
  const selectedDate = selectedKey ? new Date(selectedKey + "T12:00:00") : null;

  const goToPrevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { startDate, endDate } = monthToRange(month);
      const { blob, filename } = await reportService.downloadEmployeeReport(
        startDate,
        endDate,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to download report.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const [selYear, selMon] = month.split("-").map(Number);
  const monthLabel = new Date(selYear, selMon - 1, 1).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" },
  );
  const hasFilter = !!filterCustomerId || !!filterTaskName;

  return (
    <div className={styles.page}>
      <Navbar />
      <h1 className={titles.pageTitle1}>Timesheets</h1>

      <div className={styles.container}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={goToPrevMonth}>
              <ChevronLeft size={17} />
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button className={styles.navBtn} onClick={goToNextMonth}>
              <ChevronRight size={17} />
            </button>
          </div>

          <div className={styles.topBarRight}>
            {uniqueCustomers.length > 0 && (
              <select
                className={`${styles.filterSelect} ${filterCustomerId ? styles.filterSelectActive : ""}`}
                value={filterCustomerId}
                onChange={(e) => {
                  setFilterCustomerId(e.target.value);
                  setFilterTaskName("");
                }}
              >
                <option value="">All customers</option>
                {uniqueCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {filterCustomerId && uniqueTaskNames.length > 0 && (
              <select
                className={`${styles.filterSelect} ${filterTaskName ? styles.filterSelectActive : ""}`}
                value={filterTaskName}
                onChange={(e) => setFilterTaskName(e.target.value)}
              >
                <option value="">All tasks</option>
                {uniqueTaskNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
            {hasFilter && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  setFilterCustomerId("");
                  setFilterTaskName("");
                }}
              >
                <X size={12} /> Clear
              </button>
            )}
            <button
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download size={14} />
              {downloading ? "Generating…" : "Download"}
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && entries.length > 0 && (
          <div className={styles.statsRow}>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{fmtHours(totalSeconds)}</span>
              <span className={styles.statLbl}>total hours</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{uniqueDays}</span>
              <span className={styles.statLbl}>
                {uniqueDays === 1 ? "day worked" : "days worked"}
              </span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{filtered.length}</span>
              <span className={styles.statLbl}>
                {filtered.length === 1 ? "entry" : "entries"}
              </span>
            </div>
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Calendar card */}
        <div className={styles.calendarCard}>
          {/* Weekday header row */}
          <div className={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <div key={d} className={styles.weekdayCell}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          {loading ? (
            <div className={styles.calendarGrid}>
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className={styles.skeletonDay} />
              ))}
            </div>
          ) : (
            <div className={styles.calendarGrid}>
              {calendarDays.map((date, idx) => {
                if (!date)
                  return (
                    <div key={`empty-${idx}`} className={styles.emptyCell} />
                  );

                const k = toDayKey(date);
                const dayEntries = entriesByDay[k] ?? [];
                const daySecs = dayEntries.reduce((sum, e) => {
                  if (!e.endTime) return sum;
                  return (
                    sum +
                    Math.round(
                      (new Date(e.endTime).getTime() -
                        new Date(e.startTime).getTime()) /
                        1000,
                    )
                  );
                }, 0);
                const hasEntries = dayEntries.length > 0;
                const isSelected = selectedKey === k;
                const today = isToday(date);
                const hasActive = dayEntries.some((e) => !e.endTime);

                return (
                  <div
                    key={k}
                    className={[
                      styles.dayCell,
                      hasEntries ? styles.dayCellFilled : "",
                      isSelected ? styles.dayCellSelected : "",
                      today ? styles.dayCellToday : "",
                      hasEntries ? styles.dayCellClickable : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      hasEntries && setSelectedKey(isSelected ? null : k)
                    }
                  >
                    <span
                      className={`${styles.dayNum} ${today ? styles.dayNumToday : ""}`}
                    >
                      {date.getDate()}
                    </span>

                    {hasEntries && (
                      <div className={styles.dayMeta}>
                        <span
                          className={`${styles.dayHours} ${hasActive ? styles.dayHoursLive : ""}`}
                        >
                          {hasActive ? "Live" : fmtHours(daySecs)}
                        </span>
                        <span className={styles.dayEntryCount}>
                          {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected day panel */}
        {selectedDate && selectedEntries.length > 0 && (
          <div className={styles.dayPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderLeft}>
                <span className={styles.panelDayNum}>
                  {selectedDate.getDate()}
                </span>
                <div className={styles.panelHeaderText}>
                  <span className={styles.panelWeekday}>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                  </span>
                  <span className={styles.panelMonthYear}>
                    {selectedDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <button
                className={styles.panelClose}
                onClick={() => setSelectedKey(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className={styles.panelEntries}>
              {selectedEntries.map((entry) => {
                const start = new Date(entry.startTime);
                const end = entry.endTime ? new Date(entry.endTime) : null;
                const active = !entry.endTime;
                return (
                  <div
                    key={entry.id}
                    className={`${styles.panelRow} ${active ? styles.panelRowLive : ""}`}
                  >
                    <div
                      className={`${styles.panelDot} ${active ? styles.panelDotLive : ""}`}
                    />
                    <div className={styles.panelBody}>
                      <span className={styles.panelTask}>
                        {entry.task?.name ?? "—"}
                      </span>
                      {entry.customer?.name && (
                        <span className={styles.panelCustomer}>
                          {entry.customer.name}
                        </span>
                      )}
                      {entry.notes && (
                        <span className={styles.panelNotes}>{entry.notes}</span>
                      )}
                    </div>
                    <div className={styles.panelSide}>
                      <span className={styles.panelTime}>
                        {formatTime(start)}
                        {end ? ` – ${formatTime(end)}` : ""}
                      </span>
                      <span
                        className={`${styles.panelDur} ${active ? styles.panelDurLive : ""}`}
                      >
                        {formatDuration(entry.startTime, entry.endTime)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Timesheets;
