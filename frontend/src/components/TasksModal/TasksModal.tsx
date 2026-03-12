import { useEffect, useState, useRef } from "react";
import { taskService } from "../../services/task.service.ts";
import { customerService } from "../../services/customer.service.ts";
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
  const [openPopup, setOpenPopup] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const intervalRefs = useRef<Record<number, ReturnType<typeof setInterval>>>(
    {},
  );
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await taskService.getByCustomer(customerId);
        setTasks(data);
        const customer = await customerService.getById(customerId);
        setCustomerName(customer.name);
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

  // Close popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStart = (taskId: number) => {
    setActiveTimers((prev) => ({ ...prev, [taskId]: 0 }));
    intervalRefs.current[taskId] = setInterval(() => {
      setActiveTimers((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? 0) + 1,
      }));
    }, 1000);
  };

  const handleStop = (taskId: number) => {
    clearInterval(intervalRefs.current[taskId]);
    delete intervalRefs.current[taskId];
    setActiveTimers((prev) => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
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
                        {task.description
                          ? task.description
                          : "No description available."}
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
                  className={styles.startBtn}
                  onClick={() => handleStart(task.id)}
                >
                  Start
                </button>
              )}
            </div>

            {/* <span className={styles.taskStatus}>{task.status}</span> */}
          </div>
        ))
      )}
    </div>
  );
}

export default TasksModal;
