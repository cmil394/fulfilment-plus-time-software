import { useState, useEffect, useRef } from "react";
import { Clock, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
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

  // How many months are currently visible (month-pagination mode only)
  const [visibleMonths, setVisibleMonths] = useState(1);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterTasks, setFilterTasks] = useState<Task[]>([]);
  const [loadingFilterTasks, setLoadingFilterTasks] = useState(false);

  useEffect(() => {
    timeEntryService
      .getMyEntries()
      .then(setEntries)
      .catch((err: any) => setError(err?.message ?? "Failed to load history"))
      .finally(() => setLoading(false));
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

  // Reset month pagination when filters change
  useEffect(() => {
    setVisibleMonths(1);
  }, [filterCustomerId, filterTaskId, filterMonthYear]);

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

  const useMonthPagination = !filterMonthYear;

  const clearFilters = () => {
    setFilterCustomerId("");
    setFilterTaskId("");
    setFilterMonthYear("");
  };

  // Group entries by month → day

  // All distinct months, sorted newest first
  const allMonths = Array.from(new Set(filteredEntries.map(monthKey))).sort(
    (a, b) => (a < b ? 1 : -1),
  );

  const displayedMonths = useMonthPagination
    ? allMonths.slice(0, visibleMonths)
    : allMonths;

  const hiddenMonthCount = allMonths.length - displayedMonths.length;

  // Build: month → day → entries
  const byMonth: Record<string, Record<string, TimeEntry[]>> = {};
  for (const entry of filteredEntries) {
    const mk = monthKey(entry);
    if (!byMonth[mk]) byMonth[mk] = {};
    const dk = new Date(entry.startTime).toDateString();
    if (!byMonth[mk][dk]) byMonth[mk][dk] = [];
    byMonth[mk][dk].push(entry);
  }

  // Total tracked mins across displayed entries
  const totalDisplayedMins = filteredEntries
    .filter((e) => displayedMonths.includes(monthKey(e)))
    .reduce((acc, e) => {
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
            {displayedMonths.map((mk) => {
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

          {/* Show more months button */}
          {useMonthPagination && hiddenMonthCount > 0 && (
            <button
              className={styles.showMoreBtn}
              onClick={() => setVisibleMonths((v) => v + 1)}
            >
              <ChevronDown size={13} />
              {allMonths[visibleMonths]
                ? `Show ${monthLabel(allMonths[visibleMonths])}`
                : `Show ${hiddenMonthCount} more month${hiddenMonthCount !== 1 ? "s" : ""}`}
            </button>
          )}

          {/* Collapse back when all shown */}
          {useMonthPagination &&
            visibleMonths > 1 &&
            hiddenMonthCount === 0 && (
              <button
                className={styles.showMoreBtn}
                onClick={() => setVisibleMonths(1)}
              >
                <ChevronUp size={13} />
                Show less
              </button>
            )}
        </>
      )}
    </div>
  );
}
