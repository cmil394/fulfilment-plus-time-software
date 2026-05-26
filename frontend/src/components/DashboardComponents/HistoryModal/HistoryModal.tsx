import { useState, useEffect, useRef } from "react";
import { Clock, Filter, X, ChevronDown, RefreshCw } from "lucide-react";
import styles from "./HistoryModal.module.css";
import {
  timeEntryService,
  type TimeEntry,
} from "../../../services/time-entry.service";
import {
  customerService,
  type Customer,
} from "../../../services/customer.service";
import { taskService, type Task } from "../../../services/task.service";

// Helpers

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startTime: string, endTime?: string | null): string {
  if (!endTime) return "—";
  const mins = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function minsToLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "YYYY-MM" key for an entry */
function monthKey(entry: TimeEntry): string {
  const d = new Date(entry.startTime);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthRange(
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function prevMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

function mergeEntries(prev: TimeEntry[], incoming: TimeEntry[]): TimeEntry[] {
  const ids = new Set(prev.map((e) => e.id));
  const toAdd = incoming.filter((e) => !ids.has(e.id));
  return [...prev, ...toAdd].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

const MAX_MONTHS_BACK = 24;

// Filter popover

interface FilterPopoverProps {
  customers: Customer[];
  tasks: Task[];
  filterCustomerId: string;
  filterTaskId: string;
  filterMonthYear: string;
  onFilterCustomerChange: (id: string) => void;
  onFilterTaskChange: (id: string) => void;
  onFilterMonthYearChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  loadingTasks: boolean;
}

function FilterPopover({
  customers,
  tasks,
  filterCustomerId,
  filterTaskId,
  filterMonthYear,
  onFilterCustomerChange,
  onFilterTaskChange,
  onFilterMonthYearChange,
  onClear,
  onClose,
  loadingTasks,
}: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const hasFilter = !!filterCustomerId || !!filterTaskId || !!filterMonthYear;

  return (
    <div ref={ref} className={styles.filterPopover}>
      <div className={styles.filterPopoverHeader}>
        <span>Filter entries</span>
        {hasFilter && (
          <button className={styles.filterClearBtn} onClick={onClear}>
            Clear all
          </button>
        )}
      </div>
      <div className={styles.filterPopoverBody}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Customer</label>
          <select
            className={styles.selectInput}
            value={filterCustomerId}
            onChange={(e) => onFilterCustomerChange(e.target.value)}
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {filterCustomerId && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Task</label>
            <select
              className={styles.selectInput}
              value={filterTaskId}
              onChange={(e) => onFilterTaskChange(e.target.value)}
              disabled={loadingTasks}
            >
              <option value="">
                {loadingTasks
                  ? "Loading tasks…"
                  : tasks.length === 0
                    ? "No tasks"
                    : "All tasks"}
              </option>
              {tasks.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Month & Year</label>
          <input
            type="month"
            className={styles.monthInput}
            value={filterMonthYear}
            onChange={(e) => onFilterMonthYearChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// Main component
export default function HistoryModal() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const [oldestMonth, setOldestMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterTasks, setFilterTasks] = useState<Task[]>([]);
  const [loadingFilterTasks, setLoadingFilterTasks] = useState(false);

  const fetchMonth = async (year: number, month: number): Promise<number> => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (loadedMonthsRef.current.has(key)) return 0;
    const { startDate, endDate } = monthRange(year, month);
    const data = await timeEntryService.getMyEntries(startDate, endDate);
    loadedMonthsRef.current.add(key);
    setEntries((prev) => mergeEntries(prev, data));
    return data.length;
  };

  // Initial load: current month
  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth() + 1)
      .catch((err: any) => setError(err?.message ?? "Failed to load history"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    customerService.getAll().then(setCustomers).catch(console.error);
  }, []);

  useEffect(() => {
    if (!filterCustomerId) {
      setFilterTasks([]);
      setFilterTaskId("");
      return;
    }
    setLoadingFilterTasks(true);
    taskService
      .getByCustomer(filterCustomerId)
      .then((t) => {
        setFilterTasks(t);
        setFilterTaskId("");
      })
      .catch(console.error)
      .finally(() => setLoadingFilterTasks(false));
  }, [filterCustomerId]);

  // When user picks a specific month in the filter, fetch it if not yet loaded
  useEffect(() => {
    if (!filterMonthYear) return;
    const [yearStr, monthStr] = filterMonthYear.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    if (loadedMonthsRef.current.has(filterMonthYear)) return;
    fetchMonth(year, month).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonthYear]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const next = prevMonth(oldestMonth.year, oldestMonth.month);
    try {
      await fetchMonth(next.year, next.month);
      setOldestMonth(next);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      timeEntryService.invalidateMyEntriesCache();
      loadedMonthsRef.current.clear();
      setEntries([]);
      setOldestMonth({ year, month });
      const { startDate, endDate } = monthRange(year, month);
      const data = await timeEntryService.getMyEntries(startDate, endDate);
      loadedMonthsRef.current.add(`${year}-${String(month).padStart(2, "0")}`);
      setEntries(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load history");
    } finally {
      setRefreshing(false);
    }
  };

  // Filter logic

  const filteredEntries = entries.filter((e) => {
    if (filterCustomerId) {
      const matchById = e.customer?.id === filterCustomerId;
      const customerName = customers.find(
        (c) => c.id === filterCustomerId,
      )?.name;
      const matchByName =
        customerName != null && e.customer?.name === customerName;
      if (!matchById && !matchByName) return false;
    }
    if (filterTaskId && e.task?.name !== filterTaskId) return false;
    if (filterMonthYear) {
      const d = new Date(e.startTime);
      const emy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (emy !== filterMonthYear) return false;
    }
    return true;
  });

  const hasActiveFilter =
    !!filterCustomerId || !!filterTaskId || !!filterMonthYear;
  const activeFilterCount =
    (filterCustomerId ? 1 : 0) +
    (filterTaskId ? 1 : 0) +
    (filterMonthYear ? 1 : 0);

  const clearFilters = () => {
    setFilterCustomerId("");
    setFilterTaskId("");
    setFilterMonthYear("");
  };

  // How many months back we've loaded (used to cap the "show more" button)
  const now = new Date();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth() + 1;
  const oldestMonthIndex = oldestMonth.year * 12 + oldestMonth.month;
  const canLoadMore =
    !filterMonthYear && currentMonthIndex - oldestMonthIndex < MAX_MONTHS_BACK;

  const nextToLoad = prevMonth(oldestMonth.year, oldestMonth.month);
  const nextMonthLabel = new Date(
    nextToLoad.year,
    nextToLoad.month - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Group entries by month → day (all loaded months are displayed)
  const allMonths = Array.from(new Set(filteredEntries.map(monthKey))).sort(
    (a, b) => (a < b ? 1 : -1),
  );

  // Build: month → day → entries
  const byMonth: Record<string, Record<string, TimeEntry[]>> = {};
  for (const entry of filteredEntries) {
    const mk = monthKey(entry);
    if (!byMonth[mk]) byMonth[mk] = {};
    const dk = new Date(entry.startTime).toDateString();
    if (!byMonth[mk][dk]) byMonth[mk][dk] = [];
    byMonth[mk][dk].push(entry);
  }

  // Total tracked mins across all displayed entries
  const totalDisplayedMins = filteredEntries.reduce((acc, e) => {
    if (!e.endTime) return acc;
    return (
      acc +
      Math.round(
        (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
          60000,
      )
    );
  }, 0);

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.spinner} />
        <span>Loading history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <span className={styles.errorText}>{error}</span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.summaryLeft}>
          {filteredEntries.length > 0 && (
            <>
              <span className={styles.summaryCount}>
                {filteredEntries.length} entries
              </span>
              {totalDisplayedMins > 0 && (
                <>
                  <span className={styles.summarySep}>·</span>
                  <span className={styles.summaryTotal}>
                    {minsToLabel(totalDisplayedMins)} total
                  </span>
                </>
              )}
            </>
          )}
        </div>

        <div className={styles.topBarActions}>
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh entries"
          >
            <RefreshCw
              size={12}
              className={refreshing ? styles.refreshSpinning : ""}
            />
          </button>

          <div className={styles.filterWrap}>
            <button
              className={`${styles.filterBtn} ${hasActiveFilter ? styles.filterBtnActive : ""}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter size={12} />
              Filter
              {activeFilterCount > 0 && (
                <span className={styles.filterCount}>{activeFilterCount}</span>
              )}
              <ChevronDown
                size={11}
                className={filterOpen ? styles.filterChevronOpen : ""}
              />
            </button>

            {filterOpen && (
              <FilterPopover
                customers={customers}
                tasks={filterTasks}
                filterCustomerId={filterCustomerId}
                filterTaskId={filterTaskId}
                filterMonthYear={filterMonthYear}
                onFilterCustomerChange={setFilterCustomerId}
                onFilterTaskChange={setFilterTaskId}
                onFilterMonthYearChange={setFilterMonthYear}
                onClear={clearFilters}
                onClose={() => setFilterOpen(false)}
                loadingTasks={loadingFilterTasks}
              />
            )}
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilter && (
        <div className={styles.filterActiveBanner}>
          {filterCustomerId &&
            customers.find((c) => c.id === filterCustomerId) && (
              <span className={styles.filterPill}>
                {customers.find((c) => c.id === filterCustomerId)!.name}
              </span>
            )}
          {filterTaskId && filterTasks.find((t) => t.name === filterTaskId) && (
            <span className={styles.filterPill}>
              {filterTasks.find((t) => t.name === filterTaskId)!.name}
            </span>
          )}
          {filterMonthYear && (
            <span className={styles.filterPill}>
              {new Date(filterMonthYear + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
          <button className={styles.filterActiveClear} onClick={clearFilters}>
            <X size={10} /> Clear
          </button>
        </div>
      )}

      {/* Empty states */}
      {entries.length === 0 ? (
        <div className={styles.stateWrap}>
          <Clock size={28} strokeWidth={1.2} className={styles.emptyIcon} />
          <span className={styles.emptyText}>No time entries yet</span>
          <span className={styles.emptyHint}>
            Start a timer to see your history here
          </span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className={styles.stateWrap}>
          <Filter size={22} strokeWidth={1.2} className={styles.emptyIcon} />
          <span className={styles.emptyText}>
            No entries match your filters
          </span>
          <button className={styles.clearFiltersBtn} onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Month sections */}
          <div className={styles.groups}>
            {allMonths.map((mk) => {
              const dayMap = byMonth[mk] ?? {};
              const sortedDays = Object.keys(dayMap).sort(
                (a, b) => new Date(b).getTime() - new Date(a).getTime(),
              );

              const monthEntries = sortedDays.flatMap((dk) => dayMap[dk]);
              const monthMins = monthEntries.reduce((acc, e) => {
                if (!e.endTime) return acc;
                return (
                  acc +
                  Math.round(
                    (new Date(e.endTime).getTime() -
                      new Date(e.startTime).getTime()) /
                      60000,
                  )
                );
              }, 0);
              const monthEntryCount = monthEntries.length;

              return (
                <div key={mk} className={styles.monthSection}>
                  {/* Month header */}
                  <div className={styles.monthHeader}>
                    <span className={styles.monthTitle}>{monthLabel(mk)}</span>
                    <div className={styles.monthStats}>
                      <span className={styles.monthEntryCount}>
                        {monthEntryCount}{" "}
                        {monthEntryCount === 1 ? "entry" : "entries"}
                      </span>
                      {monthMins > 0 && (
                        <span className={styles.monthTotal}>
                          {minsToLabel(monthMins)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day groups within month */}
                  {sortedDays.map((dk) => {
                    const date = new Date(dk);
                    const dayEntries = dayMap[dk]
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.startTime).getTime() -
                          new Date(a.startTime).getTime(),
                      );

                    const dayMins = dayEntries.reduce((acc, e) => {
                      if (!e.endTime) return acc;
                      return (
                        acc +
                        Math.round(
                          (new Date(e.endTime).getTime() -
                            new Date(e.startTime).getTime()) /
                            60000,
                        )
                      );
                    }, 0);

                    return (
                      <div key={dk} className={styles.group}>
                        <div className={styles.groupHeader}>
                          <div className={styles.groupDateWrap}>
                            <span
                              className={`${styles.groupDayNum} ${isToday(date) ? styles.groupDayNumToday : ""}`}
                            >
                              {date.getDate()}
                            </span>
                            <span className={styles.groupDateLabel}>
                              {getDayLabel(date)}
                            </span>
                          </div>
                          {dayMins > 0 && (
                            <span className={styles.groupTotal}>
                              {minsToLabel(dayMins)}
                            </span>
                          )}
                        </div>

                        <div className={styles.entryList}>
                          {dayEntries.map((entry) => {
                            const start = new Date(entry.startTime);
                            const end = entry.endTime
                              ? new Date(entry.endTime)
                              : null;
                            const active = !entry.endTime;

                            return (
                              <div
                                key={entry.id}
                                className={`${styles.entry} ${active ? styles.entryActive : ""}`}
                              >
                                <div className={styles.entryAccent} />
                                <div className={styles.entryTime}>
                                  <span className={styles.entryStart}>
                                    {formatTime(start)}
                                  </span>
                                  {end ? (
                                    <span className={styles.entryEnd}>
                                      {formatTime(end)}
                                    </span>
                                  ) : (
                                    <span className={styles.entryLive}>
                                      Live
                                    </span>
                                  )}
                                </div>
                                <div className={styles.entryBody}>
                                  <span className={styles.entryTask}>
                                    {entry.task?.name ?? "—"}
                                  </span>
                                  {entry.customer?.name && (
                                    <span className={styles.entryCustomer}>
                                      {entry.customer.name}
                                    </span>
                                  )}
                                  {entry.notes && (
                                    <span className={styles.entryNotes}>
                                      {entry.notes}
                                    </span>
                                  )}
                                </div>
                                <span className={styles.entryDur}>
                                  {active ? (
                                    <span className={styles.entryDurLive}>
                                      ●
                                    </span>
                                  ) : (
                                    formatDuration(
                                      entry.startTime,
                                      entry.endTime,
                                    )
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Load more months button */}
          {canLoadMore && (
            <button
              className={styles.showMoreBtn}
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              <ChevronDown size={13} />
              {isLoadingMore ? "Loading…" : `Show ${nextMonthLabel}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
