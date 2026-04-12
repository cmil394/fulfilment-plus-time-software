import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import styles from "./EmployeeTimeCalendar.module.css";
import {
  timeEntryService,
  flattenGroupedEntries,
} from "../../services/time-entry.service";
import { customerService } from "../../services/customer.service";
import { taskService } from "../../services/task.service";
import type {
  TimeEntry,
  GroupedByCustomer,
} from "../../services/time-entry.service";
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

const HOUR_START = 0;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const SLOT_HEIGHT = 64;
// Entries that overlap or start within this many minutes of the previous
// entry's end get grouped into a single chip.
const GROUP_GAP_MINS = 5;
// Minimum rendered height (px)
const MIN_BLOCK_HEIGHT = 32;

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

  const result: LayoutItem[] = [];
  let i = 0;

  while (i < positioned.length) {
    const cluster: Pos[] = [positioned[i]];
    let clusterEnd = positioned[i].endMins;
    let j = i + 1;

    while (j < positioned.length) {
      const next = positioned[j];
      if (next.startMins <= clusterEnd + GROUP_GAP_MINS) {
        cluster.push(next);
        clusterEnd = Math.max(clusterEnd, next.endMins);
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
}

function GroupChip({ item, onSelectEntry, onDeleteEntry }: GroupChipProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      setOpenUpward(rect.bottom > window.innerHeight * 0.65);
    }
    setOpen((v) => !v);
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
      style={{ top: item.top, height: item.height }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={chipRef}
        className={`${styles.groupChip} ${open ? styles.groupChipOpen : ""}`}
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

      {open && (
        <div
          className={`${styles.groupPopover} ${openUpward ? styles.groupPopoverUp : ""}`}
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
                      setOpen(false);
                      onSelectEntry(entry);
                    }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    className={styles.groupPopoverDelete}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main component
export default function EmployeeTimeCalendar({ employee, onClose }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Fetch entries
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const grouped: GroupedByCustomer[] =
          await timeEntryService.getEntriesByUser(employee.id);
        setEntries(flattenGroupedEntries(grouped));
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

  // Start editing a viewed entry — pre-populate fields
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
      const payload: Record<string, string> = {
        startTime: new Date(editStartTime).toISOString(),
      };
      if (editEndTime) payload.endTime = new Date(editEndTime).toISOString();
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
    } catch (err: any) {
      setEditError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to update entry",
      );
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
      setNotes("");
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

  // Save new entry
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
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to create entry",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
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

        {/* Week navigation */}
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={prevWeek}>
            <ChevronLeft size={18} />
          </button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={nextWeek}>
            <ChevronRight size={18} />
          </button>
          <button
            className={styles.todayBtn}
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            Today
          </button>
        </div>

        {/* Error banner */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Hint */}
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
                  const layoutItems = computeColumnLayout(entries, day);
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

                      {dragging && dragStart?.col === colIdx && ghostStyle && (
                        <div className={styles.dragGhost} style={ghostStyle} />
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
                            (((pendingEntry.endHour - pendingEntry.startHour) *
                              60 +
                              (pendingEntry.endMin - pendingEntry.startMin)) /
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
                          return (
                            <GroupChip
                              key={`group-${idx}`}
                              item={item}
                              onSelectEntry={handleSelectEntry}
                              onDeleteEntry={handleDeleteEntry}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEntry(entry.id);
                              }}
                            >
                              <Trash2 size={11} />
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
                      onClick={() => handleDeleteEntry(viewingEntry.id)}
                    >
                      <Trash2 size={13} style={{ marginRight: 4 }} />
                      Delete
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

                {/* Date/time pickers */}
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

                {/* Customer + task (optional re-assignment) */}
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
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Notes */}
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
              {/* Customer dropdown */}
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

              {/* Task dropdown, only shown once a customer is selected */}
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
                    <option key={t.id} value={String(t.id)}>
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
