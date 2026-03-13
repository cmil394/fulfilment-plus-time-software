import { useEffect, useState, useRef } from "react";
import { taskService } from "../../services/task.service.ts";
import { customerService } from "../../services/customer.service.ts";
import { timeEntryService } from "../../services/time-entry.service.ts";
import type { Task } from "../../services/task.service.ts";
import styles from "./TasksModal.module.css";
import backarrow from "../../assets/icons/backarrow.svg";

interface Props {
  customerId: string;
  onBack: () => void;
}

function TasksModal({ customerId, onBack }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [openPopup, setOpenPopup] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [shakeTaskId, setShakeTaskId] = useState<number | null>(null);
  const intervalRefs = useRef<Record<number, ReturnType<typeof setInterval>>>(
    {},
  );
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const [data, customer, active] = await Promise.all([
          taskService.getByCustomer(customerId),
          customerService.getById(customerId),
          timeEntryService.getActiveTimer(),
        ]);
        setTasks(data);
        setCustomerName(customer.name);

        // Resumes frontend timer on task load
        if (active && active.taskId) {
          const elapsedSeconds = Math.floor(
            (Date.now() - new Date(active.startTime).getTime()) / 1000,
          );
          setActiveTaskId(active.taskId);
          setActiveTimers({ [active.taskId]: elapsedSeconds });
          intervalRefs.current[active.taskId] = setInterval(() => {
            setActiveTimers((prev) => ({
              ...prev,
              [active.taskId]: (prev[active.taskId] ?? 0) + 1,
            }));
          }, 1000);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch tasks.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, [customerId]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer start and stops
  const handleStart = async (taskId: number) => {
    if (activeTaskId !== null && activeTaskId !== taskId) {
      setShakeTaskId(taskId);
      setTimeout(() => setShakeTaskId(null), 400);
      return;
    }

    try {
      await timeEntryService.startTimer(taskId);
      setActiveTaskId(taskId);
      setActiveTimers((prev) => ({ ...prev, [taskId]: 0 }));

      intervalRefs.current[taskId] = setInterval(() => {
        setActiveTimers((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] ?? 0) + 1,
        }));
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to start timer.";
      setError(msg);
    }
  };

  const handleStop = async (taskId: number) => {
    try {
      await timeEntryService.stopTimer();
      clearInterval(intervalRefs.current[taskId]);
      delete intervalRefs.current[taskId];
      setActiveTimers((prev) => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      setActiveTaskId(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to stop timer.";
      setError(msg);
    }
  };

  const togglePopup = (taskId: number) => {
    setOpenPopup((prev) => (prev === taskId ? null : taskId));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const filtered = tasks.filter((t) =>
    (t.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.board}>
      <h2 className={styles.customerName}>{customerName}</h2>
      <div className={styles.topRow}>
        <button onClick={onBack} className={styles.backBtn}>
          <img src={backarrow} alt="back" className={styles.backArrow} />
          Back
        </button>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchBar}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.taskCard}>
          <p className={styles.taskTitle}>No tasks found.</p>
        </div>
      ) : (
        filtered.map((task) => (
          <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskInfo}>
              <div className={styles.titleRow}>
                <p className={styles.taskTitle}>{task.name}</p>
                <div className={styles.descWrapper}>
                  <img
                    src="/info.svg"
                    alt="info"
                    className={styles.descBtnIcon}
                    onClick={() => togglePopup(task.id)}
                  />
                  {openPopup === task.id && (
                    <div className={styles.descPopup} ref={popupRef}>
                      <button
                        className={styles.descPopupClose}
                        onClick={() => setOpenPopup(null)}
                        aria-label="Close"
                      >
                        ×
                      </button>
                      <p className={styles.descPopupText}>
                        {task.description ?? "No description available."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.taskActions}>
              {activeTimers[task.id] !== undefined ? (
                <>
                  <span className={styles.timer}>
                    {formatTime(activeTimers[task.id])}
                  </span>
                  <button
                    className={styles.stopBtn}
                    onClick={() => handleStop(task.id)}
                  >
                    Stop
                  </button>
                </>
              ) : (
                <button
                  className={`${styles.startBtn} ${
                    shakeTaskId === task.id ? styles.shake : ""
                  }`}
                  onClick={() => handleStart(task.id)}
                >
                  Start
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TasksModal;
