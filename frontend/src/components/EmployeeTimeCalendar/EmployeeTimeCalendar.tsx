import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { extractApiError } from "../../utils/apiError";
import { toLocalDateStr } from "../../utils/date";
import {
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  List,
  CalendarDays,
  Filter,
  ChevronDown,
  Download,
} from "lucide-react";
import styles from "./EmployeeTimeCalendar.module.css";
import {
  timeEntryService,
  flattenGroupedEntries,
} from "../../services/time-entry.service";
import { customerService } from "../../services/customer.service";
import { taskService } from "../../services/task.service";
import { reportService } from "../../services/report.service";
import { useAuth } from "../../context/AuthContext";
import type { TimeEntry } from "../../services/time-entry.service";
import type { Customer } from "../../services/customer.service";
import type { Task } from "../../services/task.service";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Props {
  employee: Employee;
  onClose: () => void;
}

type ViewTab = "calendar" | "list";

const HOUR_START = 0;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const SLOT_HEIGHT = 64;
const GROUP_GAP_MINS = 5;
const MIN_BLOCK_HEIGHT = 32;

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
  return [...prev, ...toAdd];
}

const MAX_LIST_MONTHS_BACK = 24;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHour(hour: number, min: number = 0): string {
  const h = hour % 12 || 12;
  const m = min.toString().padStart(2, "0");
  const period = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${period}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateHeader(date: Date): { day: string; num: string } {
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    num: date.getDate().toString(),
  };
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDuration(startTime: string, endTime?: string | null): string {
  if (!endTime) return "—";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface SingleItem {
  type: "single";
  entry: TimeEntry;
  top: number;
  height: number;
}

interface GroupItem {
  type: "group";
  entries: TimeEntry[];
  top: number;
  height: number;
}

type LayoutItem = SingleItem | GroupItem;

function computeColumnLayout(
  entries: TimeEntry[],
  dayDate: Date,
): LayoutItem[] {
  interface Pos {
    entry: TimeEntry;
    startMins: number;
    endMins: number;
    top: number;
    height: number;
  }

  const positioned: Pos[] = [];

  for (const entry of entries) {
    const start = new Date(entry.startTime);
    const end = entry.endTime
      ? new Date(entry.endTime)
      : new Date(start.getTime() + 3_600_000);

    if (
      start.getDate() !== dayDate.getDate() ||
      start.getMonth() !== dayDate.getMonth() ||
      start.getFullYear() !== dayDate.getFullYear()
    )
      continue;

    const startMins = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
    const endMins = (end.getHours() - HOUR_START) * 60 + end.getMinutes();
    const top = (startMins / 60) * SLOT_HEIGHT;
    const height = Math.max(
      ((endMins - startMins) / 60) * SLOT_HEIGHT,
      MIN_BLOCK_HEIGHT,
    );

    positioned.push({ entry, startMins, endMins, top, height });
  }

  positioned.sort((a, b) => a.startMins - b.startMins);

  const GROUP_GAP_PX = (GROUP_GAP_MINS / 60) * SLOT_HEIGHT;
  const result: LayoutItem[] = [];
  let i = 0;

  while (i < positioned.length) {
    const cluster: Pos[] = [positioned[i]];
    let clusterVisualBottom = positioned[i].top + positioned[i].height;
    let j = i + 1;

    while (j < positioned.length) {
      const next = positioned[j];
      if (next.top < clusterVisualBottom + GROUP_GAP_PX) {
        cluster.push(next);
        clusterVisualBottom = Math.max(
          clusterVisualBottom,
          next.top + next.height,
        );
        j++;
      } else {
        break;
      }
    }

    const top = cluster[0].top;
    const bottom = Math.max(...cluster.map((p) => p.top + p.height));
    const height = Math.max(bottom - top, MIN_BLOCK_HEIGHT);

    if (cluster.length === 1) {
      result.push({ type: "single", entry: cluster[0].entry, top, height });
    } else {
      result.push({
        type: "group",
        entries: cluster.map((p) => p.entry),
        top,
        height,
      });
    }

    i = j;
  }

  return result;
}

// GroupChip
interface GroupChipProps {
  item: GroupItem;
  onSelectEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
  deletingEntryId: string | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

function GroupChip({
  item,
  onSelectEntry,
  onDeleteEntry,
  deletingEntryId,
  isOpen,
  onOpen,
  onClose,
  scrollContainerRef,
}: GroupChipProps) {
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const popoverWidth = 270;
    const popoverMaxHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < popoverMaxHeight && spaceAbove > spaceBelow;
    const left =
      rect.left + popoverWidth > window.innerWidth - 16
        ? rect.right - popoverWidth
        : rect.left;
    const top = openUpward
      ? rect.top - Math.min(popoverMaxHeight, spaceAbove) - 6
      : rect.bottom + 6;
    setPopoverStyle({
      position: "fixed",
      top,
      left,
      zIndex: 9999,
      width: popoverWidth,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    scrollEl.addEventListener("scroll", updatePosition);
    return () => scrollEl.removeEventListener("scroll", updatePosition);
  }, [isOpen, scrollContainerRef, updatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) updatePosition();
    isOpen ? onClose() : onOpen();
  };

  const sorted = item.entries
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const spanStart = formatTime(new Date(sorted[0].startTime));
  const lastEntry = sorted[sorted.length - 1];
  const spanEnd = lastEntry.endTime
    ? formatTime(new Date(lastEntry.endTime))
    : null;

  return (
    <div
      ref={wrapRef}
      className={styles.groupChipWrap}
      style={{
        top: item.top,
        height: item.height,
        zIndex: isOpen ? 100 : undefined,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={chipRef}
        className={`${styles.groupChip} ${isOpen ? styles.groupChipOpen : ""}`}
        onClick={handleToggle}
      >
        <span className={styles.groupChipBadge}>{item.entries.length}</span>
        <div className={styles.groupChipText}>
          <span className={styles.groupChipLabel}>
            {item.entries.length}{" "}
            {item.entries.length === 1 ? "entry" : "entries"}
          </span>
          <span className={styles.groupChipSpan}>
            {spanStart}
            {spanEnd ? ` – ${spanEnd}` : ""}
          </span>
        </div>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.groupPopover}
            style={popoverStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.groupPopoverHeader}>
              {item.entries.length} entries
            </div>
            {sorted.map((entry) => {
              const start = new Date(entry.startTime);
              const end = entry.endTime ? new Date(entry.endTime) : null;
              const dur = end
                ? Math.round((end.getTime() - start.getTime()) / 60000)
                : null;
              return (
                <div key={entry.id} className={styles.groupPopoverItem}>
                  <div className={styles.groupPopoverInfo}>
                    <div className={styles.groupPopoverTop}>
                      <span className={styles.groupPopoverTime}>
                        {formatTime(start)}
                        {end ? ` – ${formatTime(end)}` : ""}
                      </span>
                      {dur !== null && (
                        <span className={styles.groupPopoverDur}>{dur}m</span>
                      )}
                    </div>
                    <span className={styles.groupPopoverTask}>
                      {entry.task?.name ?? "—"}
                    </span>
                    {entry.customer?.name && (
                      <span className={styles.groupPopoverCustomer}>
                        {entry.customer.name}
                      </span>
                    )}
                    {entry.notes && (
                      <span className={styles.groupPopoverNotes}>
                        {entry.notes}
                      </span>
                    )}
                  </div>
                  <div className={styles.groupPopoverActions}>
                    <button
                      className={styles.groupPopoverEdit}
                      title="View / edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onSelectEntry(entry);
                      }}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      className={styles.groupPopoverDelete}
                      title="Delete"
                      disabled={deletingEntryId === entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                    >
                      {deletingEntryId === entry.id ? (
                        <span className={styles.btnSpinner} />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Filter Popover
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
  activeTab: ViewTab;
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
  activeTab,
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
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "list" && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Month & Year</label>
            <input
              type="month"
              className={styles.monthInput}
              value={filterMonthYear}
              onChange={(e) => onFilterMonthYearChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// List View
interface ListViewProps {
  entries: TimeEntry[];
  onSelectEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
  viewingEntryId?: string;
  deletingEntryId: string | null;
}

function ListView({
  entries,
  onSelectEntry,
  onDeleteEntry,
  viewingEntryId,
  deletingEntryId,
}: ListViewProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.listEmpty}>
        <Clock size={32} strokeWidth={1.2} />
        <p>No time entries found</p>
        <span>
          Try adjusting your filters or switch to calendar view to add entries
        </span>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, TimeEntry[]> = {};
  for (const entry of entries) {
    const dateKey = new Date(entry.startTime).toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(entry);
  }

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className={styles.listView}>
      {sortedDates.map((dateKey) => {
        const date = new Date(dateKey);
        const dayEntries = grouped[dateKey]
          .slice()
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          );

        const totalMins = dayEntries.reduce((acc, e) => {
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

        const totalLabel =
          totalMins > 0
            ? totalMins < 60
              ? `${totalMins}m`
              : `${Math.floor(totalMins / 60)}h ${totalMins % 60 > 0 ? `${totalMins % 60}m` : ""}`.trim()
            : null;

        return (
          <div key={dateKey} className={styles.listGroup}>
            <div className={styles.listGroupHeader}>
              <div className={styles.listGroupDate}>
                <span
                  className={`${styles.listGroupDayNum} ${isToday(date) ? styles.listGroupDayNumToday : ""}`}
                >
                  {date.getDate()}
                </span>
                <div className={styles.listGroupDateText}>
                  <span className={styles.listGroupDayName}>
                    {date.toLocaleDateString("en-US", { weekday: "long" })}
                  </span>
                  <span className={styles.listGroupMonthYear}>
                    {date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {totalLabel && (
                <span className={styles.listGroupTotal}>
                  {totalLabel} total
                </span>
              )}
            </div>

            <div className={styles.listGroupEntries}>
              {dayEntries.map((entry) => {
                const start = new Date(entry.startTime);
                const end = entry.endTime ? new Date(entry.endTime) : null;
                const isSelected = viewingEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={`${styles.listEntry} ${isSelected ? styles.listEntryActive : ""}`}
                    onClick={() => onSelectEntry(entry)}
                  >
                    <div className={styles.listEntryAccent} />
                    <div className={styles.listEntryTime}>
                      <span className={styles.listEntryStart}>
                        {formatTime(start)}
                      </span>
                      {end && (
                        <span className={styles.listEntryEnd}>
                          {formatTime(end)}
                        </span>
                      )}
                    </div>
                    <div className={styles.listEntryBody}>
                      <span className={styles.listEntryTask}>
                        {entry.task?.name ?? "—"}
                      </span>
                      {entry.customer?.name && (
                        <span className={styles.listEntryCustomer}>
                          {entry.customer.name}
                        </span>
                      )}
                      {entry.notes && (
                        <span className={styles.listEntryNotes}>
                          {entry.notes}
                        </span>
                      )}
                    </div>
                    <div className={styles.listEntryRight}>
                      <span className={styles.listEntryDur}>
                        {formatDuration(entry.startTime, entry.endTime)}
                      </span>
                      <div className={styles.listEntryActions}>
                        <button
                          className={styles.listEntryEdit}
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry);
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className={styles.listEntryDelete}
                          title="Delete"
                          disabled={deletingEntryId === entry.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEntry(entry.id);
                          }}
                        >
                          {deletingEntryId === entry.id ? (
                            <span className={styles.btnSpinner} />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main component
export default function EmployeeTimeCalendar({ employee, onClose }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Owner";
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Week cache: avoids re-fetching the same week when navigating back
  const fetchedWeeksRef = useRef<Set<string>>(new Set());
  // Month cache for list view incremental loading
  const loadedListMonthsRef = useRef<Set<string>>(new Set());
  const [oldestListMonth, setOldestListMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter state
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState(""); // "YYYY-MM"
  const [filterTasks, setFilterTasks] = useState<Task[]>([]);
  const [loadingFilterTasks, setLoadingFilterTasks] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ col: number; y: number } | null>(
    null,
  );
  const [dragCurrent, setDragCurrent] = useState<{
    col: number;
    y: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // New entry form state
  const [pendingEntry, setPendingEntry] = useState<{
    dayIndex: number;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  // Viewing / editing entry state
  const [viewingEntry, setViewingEntry] = useState<TimeEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [editTasks, setEditTasks] = useState<Task[]>([]);
  const [loadingEditTasks, setLoadingEditTasks] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Customer + task selection (new entry)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const reportWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!reportWrapRef.current?.contains(e.target as Node)) {
        setReportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reportOpen]);

  const today = toLocalDateStr(new Date());
  const firstOfMonth = toLocalDateStr(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [reportStart, setReportStart] = useState(firstOfMonth);
  const [reportEnd, setReportEnd] = useState(today);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const { blob, filename } =
        await reportService.downloadEmployeeReportAsAdmin(
          employee.id,
          reportStart,
          reportEnd,
        );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setReportOpen(false);
    } catch {
      setError("Failed to download report.");
    } finally {
      setDownloading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    if (filterCustomerId && e.customer?.id !== filterCustomerId) return false;
    if (filterTaskId && e.task?.name !== filterTaskId) return false;
    if (filterMonthYear) {
      const d = new Date(e.startTime);
      const entryMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (entryMonthYear !== filterMonthYear) return false;
    }
    return true;
  });

  const hasActiveFilter =
    !!filterCustomerId || !!filterTaskId || !!filterMonthYear;
  const activeFilterCount =
    (filterCustomerId ? 1 : 0) +
    (filterTaskId ? 1 : 0) +
    (filterMonthYear ? 1 : 0);

  // Calendar view: fetch only the visible week (cached)
  useEffect(() => {
    const weekKey = weekStart.toISOString();
    if (fetchedWeeksRef.current.has(weekKey)) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const grouped = await timeEntryService.getEntriesByUser(
          employee.id,
          weekStart.toISOString(),
          weekEnd.toISOString(),
        );
        fetchedWeeksRef.current.add(weekKey);
        setEntries((prev) =>
          mergeEntries(prev, flattenGroupedEntries(grouped)),
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message ??
          err?.message ??
          "Failed to load time entries",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employee.id, weekStart]);

  // List view: fetch current month when switching to list tab
  useEffect(() => {
    if (activeTab !== "list") return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (loadedListMonthsRef.current.has(key)) return;

    const { startDate, endDate } = monthRange(year, month);
    setLoading(true);
    timeEntryService
      .getEntriesByUser(employee.id, startDate, endDate)
      .then((grouped) => {
        loadedListMonthsRef.current.add(key);
        setEntries((prev) =>
          mergeEntries(prev, flattenGroupedEntries(grouped)),
        );
      })
      .catch((err: any) =>
        setError(err?.message ?? "Failed to load time entries"),
      )
      .finally(() => setLoading(false));
  }, [activeTab, employee.id]);

  const handleLoadMoreList = async () => {
    setIsLoadingMore(true);
    const next = prevMonth(oldestListMonth.year, oldestListMonth.month);
    const key = `${next.year}-${String(next.month).padStart(2, "0")}`;
    const { startDate, endDate } = monthRange(next.year, next.month);
    try {
      const grouped = await timeEntryService.getEntriesByUser(
        employee.id,
        startDate,
        endDate,
      );
      loadedListMonthsRef.current.add(key);
      setOldestListMonth(next);
      setEntries((prev) => mergeEntries(prev, flattenGroupedEntries(grouped)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch customers once on mount
  useEffect(() => {
    const load = async () => {
      setLoadingCustomers(true);
      try {
        setCustomers(await customerService.getAll());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    load();
  }, []);

  // Fetch tasks when filter customer changes
  useEffect(() => {
    if (!filterCustomerId) {
      setFilterTasks([]);
      setFilterTaskId("");
      return;
    }
    const load = async () => {
      setLoadingFilterTasks(true);
      try {
        setFilterTasks(await taskService.getByCustomer(filterCustomerId));
        setFilterTaskId("");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFilterTasks(false);
      }
    };
    load();
  }, [filterCustomerId]);

  // Fetch tasks when customer changes (new entry)
  useEffect(() => {
    if (!selectedCustomerId) {
      setTasks([]);
      setSelectedTaskId("");
      return;
    }
    const load = async () => {
      setLoadingTasks(true);
      try {
        setTasks(await taskService.getByCustomer(selectedCustomerId));
        setSelectedTaskId("");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasks(false);
      }
    };
    load();
  }, [selectedCustomerId]);

  // Fetch tasks when edit customer changes
  useEffect(() => {
    if (!editCustomerId) {
      setEditTasks([]);
      setEditTaskId("");
      return;
    }
    const load = async () => {
      setLoadingEditTasks(true);
      try {
        setEditTasks(await taskService.getByCustomer(editCustomerId));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEditTasks(false);
      }
    };
    load();
  }, [editCustomerId]);

  useEffect(() => {
    if (gridScrollRef.current)
      gridScrollRef.current.scrollTop = (8 - HOUR_START) * SLOT_HEIGHT;
  }, []);

  const handleStartEdit = (entry: TimeEntry) => {
    setIsEditing(true);
    setEditError(null);
    setEditStartTime(toLocalDatetimeValue(new Date(entry.startTime)));
    setEditEndTime(
      entry.endTime ? toLocalDatetimeValue(new Date(entry.endTime)) : "",
    );
    setEditNotes(entry.notes ?? "");
    setEditCustomerId(entry.customer?.id ?? "");
    setEditTaskId("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    setEditTaskId("");
    setEditCustomerId("");
    setEditTasks([]);
  };

  const handleSaveEdit = async () => {
    if (!viewingEntry) return;
    if (!editStartTime) {
      setEditError("Start time is required.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      // Preserve original seconds precision when the admin didn't actually
      // change the minute-granularity value shown in the datetime-local input.
      const payload: Record<string, string> = {
        startTime:
          editStartTime ===
          toLocalDatetimeValue(new Date(viewingEntry.startTime))
            ? viewingEntry.startTime
            : new Date(editStartTime).toISOString(),
      };
      if (editEndTime) {
        payload.endTime =
          viewingEntry.endTime &&
          editEndTime === toLocalDatetimeValue(new Date(viewingEntry.endTime))
            ? viewingEntry.endTime
            : new Date(editEndTime).toISOString();
      }
      if (editNotes.trim()) payload.notes = editNotes.trim();
      if (editTaskId) payload.taskId = editTaskId;
      const updated = await timeEntryService.updateEntry(
        viewingEntry.id,
        payload,
      );

      setEntries((prev) =>
        prev.map((e) => (e.id === viewingEntry.id ? updated : e)),
      );
      setViewingEntry(updated);
      setIsEditing(false);
      setEditTaskId("");
      setEditCustomerId("");
      setEditTasks([]);
    } catch (err: unknown) {
      setEditError(extractApiError(err, "Failed to update entry"));
    } finally {
      setEditSaving(false);
    }
  };

  // Drag logic
  const yToTime = useCallback((y: number): { hour: number; min: number } => {
    const clamped = Math.max(0, Math.min(y, TOTAL_HOURS * SLOT_HEIGHT));
    const totalMins = (clamped / SLOT_HEIGHT) * 60;
    const snapped = Math.round(totalMins / 15) * 15;
    const hour = HOUR_START + Math.floor(snapped / 60);
    const min = snapped % 60;
    return { hour: Math.min(hour, HOUR_END - 1), min };
  }, []);

  const getGridY = useCallback((clientY: number): number => {
    if (!gridRef.current) return 0;
    return clientY - gridRef.current.getBoundingClientRect().top;
  }, []);

  const handleMouseDown = (e: React.MouseEvent, colIndex: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    const y = getGridY(e.clientY);
    setDragStart({ col: colIndex, y });
    setDragCurrent({ col: colIndex, y });
    setPendingEntry(null);
    setViewingEntry(null);
    setIsEditing(false);
    setSaveError(null);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) =>
      setDragCurrent({ col: dragStart!.col, y: getGridY(e.clientY) });
    const onUp = (e: MouseEvent) => {
      setDragging(false);
      if (!dragStart) return;
      const startY = Math.min(dragStart.y, getGridY(e.clientY));
      const endY = Math.max(dragStart.y, getGridY(e.clientY));
      const start = yToTime(startY);
      const end = yToTime(endY);
      if (end.hour * 60 + end.min - (start.hour * 60 + start.min) < 15) return;
      setPendingEntry({
        dayIndex: dragStart.col,
        startHour: start.hour,
        startMin: start.min,
        endHour: end.hour,
        endMin: end.min,
      });
      setNotes("Manual Entry");
      setSelectedCustomerId("");
      setSelectedTaskId("");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart, getGridY, yToTime]);

  const ghostStyle = (() => {
    if (!dragging || !dragStart || !dragCurrent) return null;
    return {
      top: Math.min(dragStart.y, dragCurrent.y),
      height: Math.abs(dragCurrent.y - dragStart.y),
      left: 0,
      right: 0,
    };
  })();

  const handleSaveEntry = async () => {
    if (!pendingEntry) return;
    if (!selectedCustomerId) {
      setSaveError("Please select a customer.");
      return;
    }
    if (!selectedTaskId) {
      setSaveError("Please select a task.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const day = weekDays[pendingEntry.dayIndex];
      const startTime = new Date(day);
      startTime.setHours(pendingEntry.startHour, pendingEntry.startMin, 0, 0);
      const endTime = new Date(day);
      endTime.setHours(pendingEntry.endHour, pendingEntry.endMin, 0, 0);
      const created = await timeEntryService.adminCreateEntry({
        userId: employee.id,
        taskId: selectedTaskId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes,
      });

      setEntries((prev) => [...prev, created]);
      setPendingEntry(null);
      setSelectedCustomerId("");
      setSelectedTaskId("");
      setNotes("");
    } catch (err: unknown) {
      setSaveError(extractApiError(err, "Failed to create entry"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeletingEntryId(entryId);
    try {
      await timeEntryService.deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (viewingEntry?.id === entryId) setViewingEntry(null);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ??
        err?.message ??
        "Failed to delete entry",
      );
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleSelectEntry = (entry: TimeEntry) => {
    setPendingEntry(null);
    setSaveError(null);
    setIsEditing(false);
    setEditError(null);
    setViewingEntry((prev) => (prev?.id === entry.id ? null : entry));
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // List view "show more" helpers
  const nowRef = new Date();
  const currentMonthIdx = nowRef.getFullYear() * 12 + nowRef.getMonth() + 1;
  const oldestListMonthIdx = oldestListMonth.year * 12 + oldestListMonth.month;
  const canLoadMoreList =
    currentMonthIdx - oldestListMonthIdx < MAX_LIST_MONTHS_BACK;
  const nextListMonth = prevMonth(oldestListMonth.year, oldestListMonth.month);
  const nextListMonthLabel = new Date(
    nextListMonth.year,
    nextListMonth.month - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const getEntryDateLabel = (entry: TimeEntry) =>
    new Date(entry.startTime).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const getEntryTimeRange = (entry: TimeEntry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : null;
    return `${formatTime(start)}${end ? ` – ${formatTime(end)}` : ""}`;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <h2 className={styles.name}>
                {employee.firstName} {employee.lastName}
              </h2>
              <span className={styles.role}>
                {employee.role} · {employee.email}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs + controls row */}
        <div className={styles.tabsRow}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "calendar" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              <CalendarDays size={14} />
              Calendar
            </button>
            <button
              className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("list")}
            >
              <List size={14} />
              List
            </button>
          </div>

          <div className={styles.tabsRowRight}>
            {/* Download report button */}
            {isAdmin && (
              <div className={styles.reportWrap} ref={reportWrapRef}>
                <button
                  className={styles.downloadBtn}
                  onClick={() => setReportOpen((v) => !v)}
                  title="Download hours report"
                >
                  <Download size={13} />
                  Download Report
                  <ChevronDown
                    size={12}
                    className={reportOpen ? styles.filterChevronOpen : ""}
                  />
                </button>
                {reportOpen && (
                  <div className={styles.reportPopover}>
                    <div className={styles.reportPopoverDates}>
                      <div className={styles.reportDateGroup}>
                        <label className={styles.reportLabel}>From</label>
                        <input
                          type="date"
                          className={styles.reportDateInput}
                          value={reportStart}
                          max={reportEnd}
                          onChange={(e) => setReportStart(e.target.value)}
                          disabled={downloading}
                        />
                      </div>
                      <div className={styles.reportDateGroup}>
                        <label className={styles.reportLabel}>To</label>
                        <input
                          type="date"
                          className={styles.reportDateInput}
                          value={reportEnd}
                          min={reportStart}
                          onChange={(e) => setReportEnd(e.target.value)}
                          disabled={downloading}
                        />
                      </div>
                    </div>
                    <button
                      className={styles.reportPopoverBtn}
                      onClick={handleDownloadReport}
                      disabled={downloading || !reportStart || !reportEnd}
                    >
                      <Download size={13} />
                      {downloading ? "Downloading…" : "Download .xlsx"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Filter button */}
            <div className={styles.filterWrap}>
              <button
                className={`${styles.filterBtn} ${hasActiveFilter ? styles.filterBtnActive : ""}`}
                onClick={() => setFilterOpen((v) => !v)}
              >
                <Filter size={13} />
                Filter
                {activeFilterCount > 0 && (
                  <span className={styles.filterCount}>
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  size={12}
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
                  onClear={() => {
                    setFilterCustomerId("");
                    setFilterTaskId("");
                    setFilterMonthYear("");
                  }}
                  onClose={() => setFilterOpen(false)}
                  loadingTasks={loadingFilterTasks}
                  activeTab={activeTab}
                />
              )}
            </div>

            {/* Week nav — only in calendar tab */}
            {activeTab === "calendar" && (
              <div className={styles.weekNavInline}>
                <button className={styles.navBtn} onClick={prevWeek}>
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.weekLabelInline}>{weekLabel}</span>
                <button className={styles.navBtn} onClick={nextWeek}>
                  <ChevronRight size={16} />
                </button>
                <button
                  className={styles.todayBtn}
                  onClick={() => setWeekStart(getWeekStart(new Date()))}
                >
                  Today
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Active filter pill */}
        {hasActiveFilter && (
          <div className={styles.filterActiveBanner}>
            <Filter size={11} />
            Showing filtered results
            {filterCustomerId &&
              customers.find((c) => c.id === filterCustomerId) && (
                <span className={styles.filterPill}>
                  {customers.find((c) => c.id === filterCustomerId)!.name}
                </span>
              )}
            {filterTaskId &&
              filterTasks.find((t) => t.name === filterTaskId) && (
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
            <button
              className={styles.filterActiveClear}
              onClick={() => {
                setFilterCustomerId("");
                setFilterTaskId("");
                setFilterMonthYear("");
              }}
            >
              <X size={11} />
              Clear
            </button>
          </div>
        )}

        {activeTab === "calendar" && (
          <>
            <p className={styles.hint}>
              <Plus size={13} /> Drag on the calendar to create a time entry
            </p>

            {/* Calendar */}
            <div className={styles.calendarOuter}>
              {/* Day headers */}
              <div className={styles.dayHeaders}>
                <div className={styles.timeGutter} />
                {weekDays.map((day, i) => {
                  const { day: dayName, num } = formatDateHeader(day);
                  return (
                    <div
                      key={i}
                      className={`${styles.dayHeader} ${isToday(day) ? styles.todayHeader : ""}`}
                    >
                      <span className={styles.dayName}>{dayName}</span>
                      <span
                        className={`${styles.dayNum} ${isToday(day) ? styles.todayNum : ""}`}
                      >
                        {num}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable grid */}
              <div className={styles.gridScroll} ref={gridScrollRef}>
                <div className={styles.gridInner}>
                  {/* Time labels */}
                  <div className={styles.timeGutter}>
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className={styles.timeLabel}
                        style={{ top: i * SLOT_HEIGHT }}
                      >
                        {formatHour(HOUR_START + i)}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  <div className={styles.columnsWrapper} ref={gridRef}>
                    {weekDays.map((day, colIdx) => {
                      const layoutItems = computeColumnLayout(
                        filteredEntries,
                        day,
                      );
                      return (
                        <div
                          key={colIdx}
                          className={`${styles.dayColumn} ${isToday(day) ? styles.todayColumn : ""}`}
                          onMouseDown={(e) => handleMouseDown(e, colIdx)}
                        >
                          {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                            <div
                              key={i}
                              className={styles.hourLine}
                              style={{ top: i * SLOT_HEIGHT }}
                            />
                          ))}
                          {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                            <div
                              key={`h${i}`}
                              className={styles.halfLine}
                              style={{ top: i * SLOT_HEIGHT + SLOT_HEIGHT / 2 }}
                            />
                          ))}

                          {dragging &&
                            dragStart?.col === colIdx &&
                            ghostStyle && (
                              <div
                                className={styles.dragGhost}
                                style={ghostStyle}
                              />
                            )}

                          {pendingEntry &&
                            pendingEntry.dayIndex === colIdx &&
                            (() => {
                              const top =
                                (((pendingEntry.startHour - HOUR_START) * 60 +
                                  pendingEntry.startMin) /
                                  60) *
                                SLOT_HEIGHT;
                              const height =
                                (((pendingEntry.endHour -
                                  pendingEntry.startHour) *
                                  60 +
                                  (pendingEntry.endMin -
                                    pendingEntry.startMin)) /
                                  60) *
                                SLOT_HEIGHT;
                              return (
                                <div
                                  className={styles.pendingBlock}
                                  style={{ top, height }}
                                >
                                  <span>
                                    {formatHour(
                                      pendingEntry.startHour,
                                      pendingEntry.startMin,
                                    )}{" "}
                                    –{" "}
                                    {formatHour(
                                      pendingEntry.endHour,
                                      pendingEntry.endMin,
                                    )}
                                  </span>
                                </div>
                              );
                            })()}

                          {layoutItems.map((item, idx) => {
                            if (item.type === "group") {
                              const groupKey = `${colIdx}-${item.entries[0].id}`;
                              return (
                                <GroupChip
                                  key={`group-${idx}`}
                                  item={item}
                                  onSelectEntry={handleSelectEntry}
                                  onDeleteEntry={handleDeleteEntry}
                                  deletingEntryId={deletingEntryId}
                                  isOpen={openGroupKey === groupKey}
                                  onOpen={() => setOpenGroupKey(groupKey)}
                                  onClose={() => setOpenGroupKey(null)}
                                  scrollContainerRef={gridScrollRef}
                                />
                              );
                            }

                            const { entry, top, height } = item;
                            const start = new Date(entry.startTime);
                            const end = entry.endTime
                              ? new Date(entry.endTime)
                              : null;
                            const isViewing = viewingEntry?.id === entry.id;
                            return (
                              <div
                                key={entry.id}
                                className={`${styles.entryBlock} ${isViewing ? styles.entryBlockActive : ""}`}
                                style={{ top, height }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEntry(entry);
                                }}
                              >
                                <div className={styles.entryInner}>
                                  <span className={styles.entryTime}>
                                    {formatTime(start)}
                                    {end ? ` – ${formatTime(end)}` : ""}
                                  </span>
                                  <span className={styles.entryMeta}>
                                    {entry.task?.name}
                                  </span>
                                  {entry.customer?.name && (
                                    <span className={styles.entryCustomer}>
                                      {entry.customer.name}
                                    </span>
                                  )}
                                  {entry.notes && (
                                    <span className={styles.entryDesc}>
                                      {entry.notes}
                                    </span>
                                  )}
                                </div>
                                <button
                                  className={styles.entryDelete}
                                  disabled={deletingEntryId === entry.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEntry(entry.id);
                                  }}
                                >
                                  {deletingEntryId === entry.id ? (
                                    <span className={styles.btnSpinner} />
                                  ) : (
                                    <Trash2 size={11} />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "list" && (
          <div className={styles.listViewOuter}>
            <ListView
              entries={filteredEntries}
              onSelectEntry={handleSelectEntry}
              onDeleteEntry={handleDeleteEntry}
              viewingEntryId={viewingEntry?.id}
              deletingEntryId={deletingEntryId}
            />
            {!filterMonthYear && canLoadMoreList && (
              <button
                className={styles.showMoreBtn}
                onClick={handleLoadMoreList}
                disabled={isLoadingMore}
              >
                <ChevronDown size={13} />
                {isLoadingMore ? "Loading…" : `Show ${nextListMonthLabel}`}
              </button>
            )}
          </div>
        )}

        {/* View / Edit entry panel */}
        {viewingEntry && (
          <div className={styles.newEntryForm}>
            <div className={styles.formHeader}>
              <Clock size={15} />
              <strong>Time Entry</strong>
              {!isEditing && (
                <span className={styles.formTime}>
                  {getEntryDateLabel(viewingEntry)} ·{" "}
                  {getEntryTimeRange(viewingEntry)}
                </span>
              )}
              <div className={styles.formHeaderActions}>
                {!isEditing ? (
                  <>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleStartEdit(viewingEntry)}
                    >
                      <Pencil size={13} style={{ marginRight: 4 }} />
                      Edit
                    </button>
                    <button
                      className={styles.discardBtn}
                      disabled={deletingEntryId === viewingEntry.id}
                      onClick={() => handleDeleteEntry(viewingEntry.id)}
                    >
                      {deletingEntryId === viewingEntry.id ? (
                        <>
                          <span className={styles.btnSpinnerInline} />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <Trash2 size={13} style={{ marginRight: 4 }} />
                          Delete
                        </>
                      )}
                    </button>
                    <button
                      className={styles.discardBtn}
                      onClick={() => setViewingEntry(null)}
                    >
                      <X size={13} style={{ marginRight: 4 }} />
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.saveBtn}
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                    >
                      <Check size={13} style={{ marginRight: 4 }} />
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      className={styles.discardBtn}
                      onClick={handleCancelEdit}
                    >
                      <X size={13} style={{ marginRight: 4 }} />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <>
                {editError && <p className={styles.saveError}>{editError}</p>}
                <div className={styles.formSelects}>
                  <div className={styles.datetimeGroup}>
                    <label className={styles.datetimeLabel}>Start</label>
                    <input
                      type="datetime-local"
                      className={styles.datetimeInput}
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div className={styles.datetimeGroup}>
                    <label className={styles.datetimeLabel}>End</label>
                    <input
                      type="datetime-local"
                      className={styles.datetimeInput}
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formSelects}>
                  <select
                    className={styles.selectInput}
                    value={editCustomerId}
                    onChange={(e) => setEditCustomerId(e.target.value)}
                    disabled={loadingCustomers}
                  >
                    <option value="">
                      {loadingCustomers
                        ? "Loading customers…"
                        : "Change customer…"}
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {editCustomerId && (
                    <select
                      className={styles.selectInput}
                      value={editTaskId}
                      onChange={(e) => setEditTaskId(e.target.value)}
                      disabled={loadingEditTasks}
                    >
                      <option value="">
                        {loadingEditTasks
                          ? "Loading tasks…"
                          : editTasks.length === 0
                            ? "No tasks"
                            : "Change task…"}
                      </option>
                      {editTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={styles.formRow}>
                  <input
                    className={styles.descInput}
                    placeholder="Notes (optional)"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.formSelects}>
                  <select className={styles.selectInput} disabled value="">
                    <option value="">
                      {viewingEntry.customer?.name ?? "No customer"}
                    </option>
                  </select>
                  <select className={styles.selectInput} disabled value="">
                    <option value="">
                      {viewingEntry.task?.name ?? "No task"}
                    </option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <input
                    className={styles.descInput}
                    placeholder="No notes"
                    value={viewingEntry.notes ?? ""}
                    readOnly
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* New entry form */}
        {pendingEntry && (
          <div className={styles.newEntryForm}>
            <div className={styles.formHeader}>
              <Clock size={15} />
              <strong>New Entry</strong>
              <span className={styles.formTime}>
                {weekDays[pendingEntry.dayIndex].toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
                {" · "}
                {formatHour(
                  pendingEntry.startHour,
                  pendingEntry.startMin,
                )} – {formatHour(pendingEntry.endHour, pendingEntry.endMin)}
              </span>
            </div>

            {saveError && <p className={styles.saveError}>{saveError}</p>}

            <div className={styles.formSelects}>
              <select
                className={styles.selectInput}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={loadingCustomers}
              >
                <option value="">
                  {loadingCustomers ? "Loading customers…" : "Select customer…"}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {selectedCustomerId && (
                <select
                  className={styles.selectInput}
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={loadingTasks}
                >
                  <option value="">
                    {loadingTasks
                      ? "Loading tasks…"
                      : tasks.length === 0
                        ? "No tasks for this customer"
                        : "Select task…"}
                  </option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.formRow}>
              <input
                className={styles.descInput}
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                className={styles.saveBtn}
                onClick={handleSaveEntry}
                disabled={saving || !selectedTaskId}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className={styles.discardBtn}
                onClick={() => {
                  setPendingEntry(null);
                  setSaveError(null);
                  setSelectedCustomerId("");
                  setSelectedTaskId("");
                  setNotes("");
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className={styles.loadingOverlay}>Loading entries…</div>
        )}
      </div>
    </div>
  );
}
