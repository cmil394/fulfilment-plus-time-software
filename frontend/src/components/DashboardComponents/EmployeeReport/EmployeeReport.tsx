import { useState, useEffect, useRef } from "react";
import {
  Download,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Calendar,
} from "lucide-react";
import styles from "./EmployeeReport.module.css";
import {
  reportService,
  type EmployeeReportSummary,
} from "../../../services/report.service";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function monthToRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(mon)}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${pad(mon)}-${pad(lastDay)}`;
  return { start, end };
}

export default function EmployeeReport() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [summary, setSummary] = useState<EmployeeReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  useEffect(() => {
    const { start, end } = monthToRange(month);
    setLoading(true);
    setError(null);
    reportService
      .getEmployeeReportSummary(start, end)
      .then(setSummary)
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Failed to load summary",
        ),
      )
      .finally(() => setLoading(false));
  }, [month]);

  const toggleCustomer = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { start, end } = monthToRange(month);
      const { blob, filename } = await reportService.downloadEmployeeReport(
        start,
        end,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to download report.";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  const selectMonth = (monthIndex: number) => {
    setMonth(`${pickerYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setPickerOpen(false);
  };

  const [selYear, selMon] = month.split("-").map(Number);
  const monthLabel = new Date(selYear, selMon - 1, 1).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" },
  );

  return (
    <div className={styles.root}>
      <div ref={pickerRef} className={styles.pickerWrap}>
        <div
          className={styles.monthBanner}
          onClick={() => {
            setPickerYear(selYear);
            setPickerOpen((o) => !o);
          }}
        >
          <Calendar size={13} className={styles.monthIcon} />
          <span className={styles.monthLabel}>{monthLabel}</span>
          <ChevronDown
            size={13}
            className={`${styles.monthChevron} ${pickerOpen ? styles.monthChevronOpen : ""}`}
          />
        </div>

        {pickerOpen && (
          <div className={styles.pickerPopover}>
            <div className={styles.pickerHeader}>
              <button
                className={styles.pickerNavBtn}
                onClick={() => setPickerYear((y) => y - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span className={styles.pickerYear}>{pickerYear}</span>
              <button
                className={styles.pickerNavBtn}
                onClick={() => setPickerYear((y) => y + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className={styles.pickerGrid}>
              {MONTHS.map((name, i) => {
                const isSelected = pickerYear === selYear && i + 1 === selMon;
                return (
                  <button
                    key={name}
                    className={`${styles.pickerMonth} ${isSelected ? styles.pickerMonthSelected : ""}`}
                    onClick={() => selectMonth(i)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <Loader2 size={14} className={styles.spinner} />
        </div>
      )}

      {!loading && summary && (
        <>
          <div className={styles.totalCard}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalHours}>
              {fmtHours(summary.totalSeconds)}
            </span>
          </div>

          {summary.customers.length === 0 ? (
            <p className={styles.emptyText}>No hours logged this month.</p>
          ) : (
            <div className={styles.customerList}>
              {summary.customers.map((c) => {
                const isOpen = expanded.has(c.customerId);
                return (
                  <div key={c.customerId} className={styles.customerBlock}>
                    <button
                      className={styles.customerRow}
                      onClick={() => toggleCustomer(c.customerId)}
                    >
                      {isOpen ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      <span className={styles.customerName}>
                        {c.customerName}
                      </span>
                      <span className={styles.customerHours}>
                        {fmtHours(c.totalSeconds)}
                      </span>
                    </button>
                    {isOpen && (
                      <div className={styles.taskList}>
                        {c.tasks.map((t) => (
                          <div key={t.taskId} className={styles.taskRow}>
                            <span className={styles.taskName}>
                              {t.taskName}
                            </span>
                            <span className={styles.taskHours}>
                              {fmtHours(t.seconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {error && <span className={styles.errorText}>{error}</span>}

      <button
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={downloading}
      >
        <Download size={13} />
        {downloading ? "Generating…" : "Download Report"}
      </button>
    </div>
  );
}
