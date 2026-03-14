import { useEffect, useState, useRef } from "react";
import { taskService } from "../../services/task.service.ts";
import { customerService } from "../../services/customer.service.ts";
import type { Task } from "../../services/task.service.ts";
import { useActiveTimer } from "../../context/ActiveTimerContext.tsx";
import styles from "./TasksModal.module.css";
import titleStyles from "./../CSS Components/titles.module.css";
import backarrow from "../../assets/icons/backarrow.svg";

interface Props {
  customerId: string;
  onBack: () => void;
  compact?: boolean;
}

function TasksModal({ customerId, onBack, compact = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState<string>("");
  const [openPopup, setOpenPopup] = useState<number | null>(null);
  const [shakeTaskId, setShakeTaskId] = useState<number | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const { activeTimer, elapsedSeconds, startTimer, stopTimer } =
    useActiveTimer();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const [data, customer] = await Promise.all([
          taskService.getByCustomer(customerId),
          customerService.getById(customerId),
        ]);
        setTasks(data);
        setCustomerName(customer.name);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch tasks.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [customerId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStart = async (taskId: number) => {
    if (activeTimer !== null) {
      setShakeTaskId(taskId);
      setTimeout(() => setShakeTaskId(null), 450);
      return;
    }
    try {
      await startTimer(taskId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to start timer.";
      setError(msg);
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to stop timer.");
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
    <div className={compact ? styles.boardCompact : styles.board}>
      {!compact && <h2 className={titleStyles.subheading1}>{customerName}</h2>}
      <div className={styles.topRow}>
        <button onClick={onBack} className={styles.backBtn}>
          <img src={backarrow} alt="back" className={styles.backArrow} />
          {compact ? customerName : "Back"}
        </button>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={compact ? styles.searchBarCompact : styles.searchBar}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={compact ? styles.taskCardCompact : styles.taskCard}>
          <p className={styles.taskTitle}>No tasks found.</p>
        </div>
      ) : (
        filtered.map((task) => {
          const isActive = activeTimer?.taskId === task.id;
          return (
            <div
              key={task.id}
              className={compact ? styles.taskCardCompact : styles.taskCard}
            >
              <div className={styles.taskInfo}>
                <div className={styles.titleRow}>
                  <p
                    className={
                      compact ? styles.taskTitleCompact : styles.taskTitle
                    }
                  >
                    {task.name}
                  </p>
                  <div className={styles.descWrapper}>
                    <img
                      src="/info.svg"
                      alt="info"
                      className={
                        compact ? styles.descBtnIconCompact : styles.descBtnIcon
                      }
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
                {isActive ? (
                  <>
                    <span className={styles.timer}>
                      {formatTime(elapsedSeconds)}
                    </span>
                    <button className={styles.stopBtn} onClick={handleStop}>
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    className={`${styles.startBtn} ${shakeTaskId === task.id ? styles.shake : ""}`}
                    onClick={() => handleStart(task.id)}
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default TasksModal;
