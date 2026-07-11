import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import styles from "./Kiosk.module.css";
import Navbar from "../../components/Navbar/Navbar";
import { authService } from "../../services/auth.service";
import { createAuthedApi } from "../../services/api";
import type { Customer } from "../../services/customer.service";
import type { Task } from "../../services/task.service";

interface LoggedInUser {
  id: string;
  firstName: string;
  lastName: string;
  token: string;
}

interface UserSession extends LoggedInUser {
  customers: Customer[];
  selectedCustomerId: string;
  tasks: Task[];
  selectedTaskId: string;
  loadingCustomers: boolean;
  loadingTasks: boolean;
  timerRunning: boolean;
  timerStartTime: Date | null;
  elapsed: number;
}

type PinState = "idle" | "loading" | "error";

interface PinInputProps {
  onSuccess: (user: LoggedInUser) => void;
}

function PinInput({ onSuccess }: PinInputProps) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [state, setState] = useState<PinState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (employeeCode.length != 4 || pin.length !== 4) return;
    setState("loading");
    setErrorMsg("");

    try {
      const result = await authService.loginWithPin(
        employeeCode.trim().toUpperCase(),
        pin,
      );
      const { user, token } = result.data;

      onSuccess({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        token,
      });

      setEmployeeCode("");
      setPin("");
      setState("idle");
      codeRef.current?.focus();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Login failed";
      setState("error");
      setErrorMsg(message);
      setPin("");
      codeRef.current?.focus();
    }
  };

  const handleCodeChange = (v: string) => {
    setEmployeeCode(v.replace(/\D/g, "").slice(0, 4));
    if (state === "error") {
      setState("idle");
      setErrorMsg("");
    }
  };

  const handlePinChange = (v: string) => {
    const numeric = v.replace(/\D/g, "").slice(0, 4);
    setPin(numeric);
    if (state === "error") {
      setState("idle");
      setErrorMsg("");
    }
  };

  const handleCodeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") pinRef.current?.focus();
  };

  const handlePinKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <tr className={styles.pinRow}>
      <td className={`${styles.cell} ${styles.cellSeq}`}>
        <span className={styles.seqPlus}>+</span>
      </td>
      <td className={styles.cell}>
        <div className={styles.pinWrap}>
          <span className={styles.pinLabel}>Code</span>
          <input
            ref={codeRef}
            type="text"
            autoComplete="nope"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={employeeCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleCodeKey}
            placeholder="Employee code"
            className={`${styles.pinInput} ${state === "error" ? styles.pinInputError : ""}`}
            disabled={state === "loading"}
            aria-label="Employee code"
          />
        </div>
      </td>
      <td className={styles.cell}>
        <div className={styles.pinWrap}>
          <span className={styles.pinLabel}>PIN</span>
          <input
            ref={pinRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyDown={handlePinKey}
            placeholder="4-digit PIN"
            className={`${styles.pinInput} ${state === "error" ? styles.pinInputError : ""}`}
            disabled={state === "loading"}
            aria-label="Employee PIN"
          />
          {state === "error" && (
            <span className={styles.pinError}>{errorMsg}</span>
          )}
        </div>
      </td>
      <td className={styles.cell} colSpan={4}>
        <button
          className={`${styles.btn} ${styles.btnConfirm}`}
          onClick={handleSubmit}
          disabled={
            employeeCode.length != 4 || pin.length !== 4 || state === "loading"
          }
        >
          {state === "loading" ? "Verifying…" : "Clock In →"}
        </button>
      </td>
    </tr>
  );
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

interface UserRowProps {
  session: UserSession;
  index: number;
  onClockOut: (userId: string) => void;
  onCustomerChange: (userId: string, customerId: string) => void;
  onTaskChange: (userId: string, taskId: string) => void;
  onStart: (userId: string) => void;
  onStop: (userId: string) => void;
}

function UserRow({
  session,
  index,
  onClockOut,
  onCustomerChange,
  onTaskChange,
  onStart,
  onStop,
}: UserRowProps) {
  const [clockingOut, setClockingOut] = useState(false);

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      await authService.clockOut(session.token);
      onClockOut(session.id);
    } catch {
      // surface error toast here if available
    } finally {
      setClockingOut(false);
    }
  };

  const canStart =
    !session.timerRunning &&
    session.selectedCustomerId !== "" &&
    session.selectedTaskId !== "";

  return (
    <tr className={`${styles.userRow} ${styles.userRowEnter}`}>
      <td className={`${styles.cell} ${styles.cellSeq}`}>
        <span className={styles.seqNum}>{index + 1}</span>
      </td>
      <td className={`${styles.cell} ${styles.cellFirst}`}>
        {session.firstName}
      </td>
      <td className={`${styles.cell} ${styles.cellLast}`}>
        {session.lastName}
      </td>

      {/* Customer */}
      <td className={styles.cell}>
        {session.loadingCustomers ? (
          <span className={styles.loadingHint}>Loading…</span>
        ) : (
          <select
            className={styles.select}
            value={session.selectedCustomerId}
            onChange={(e) => onCustomerChange(session.id, e.target.value)}
            disabled={session.timerRunning}
          >
            <option value="">Select customer</option>
            {session.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Task */}
      <td className={styles.cell}>
        {session.selectedCustomerId === "" ? (
          <span className={styles.loadingHint}>Select a customer</span>
        ) : session.loadingTasks ? (
          <span className={styles.loadingHint}>Loading…</span>
        ) : (
          <select
            className={styles.select}
            value={session.selectedTaskId}
            onChange={(e) => onTaskChange(session.id, e.target.value)}
            disabled={session.timerRunning}
          >
            <option value="">Select task</option>
            {session.tasks.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Start / Stop + elapsed */}
      <td className={`${styles.cell} ${styles.cellActions}`}>
        <div className={styles.actions}>
          {session.timerRunning && (
            <span className={styles.elapsed}>
              {formatElapsed(session.elapsed)}
            </span>
          )}
          <button
            className={`${styles.btn} ${styles.btnStart}`}
            onClick={() => onStart(session.id)}
            disabled={!canStart}
          >
            Start
          </button>
          <button
            className={`${styles.btn} ${styles.btnStop}`}
            onClick={() => onStop(session.id)}
            disabled={!session.timerRunning}
          >
            Stop
          </button>
        </div>
      </td>

      {/* Clock out */}
      <td className={`${styles.cell} ${styles.cellClockOut}`}>
        <button
          className={`${styles.btn} ${styles.btnClockOut}`}
          onClick={handleClockOut}
          disabled={clockingOut || session.timerRunning}
        >
          {clockingOut ? "Clocking out…" : "Clock Out"}
        </button>
      </td>
    </tr>
  );
}

const STORAGE_KEY = "kioskSessions";

function loadStoredUsers(): LoggedInUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is LoggedInUser =>
        u && typeof u.id === "string" && typeof u.token === "string",
    );
  } catch {
    return [];
  }
}

function saveStoredUsers(users: LoggedInUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function placeholderSession(u: LoggedInUser): UserSession {
  return {
    ...u,
    customers: [],
    selectedCustomerId: "",
    tasks: [],
    selectedTaskId: "",
    loadingCustomers: true,
    loadingTasks: false,
    timerRunning: false,
    timerStartTime: null,
    elapsed: 0,
  };
}

export default function Kiosk() {
  // Seed synchronously from localStorage so the persist effect below never
  // fires with an empty array first and wipes out the stored sessions.
  const [sessions, setSessions] = useState<UserSession[]>(() =>
    loadStoredUsers().map(placeholderSession),
  );

  // Persist the minimal info needed to restore sessions across a refresh/close.
  useEffect(() => {
    saveStoredUsers(
      sessions.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        token: s.token,
      })),
    );
  }, [sessions]);

  // Tick all running timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.timerRunning && s.timerStartTime
            ? {
              ...s,
              elapsed: Math.floor(
                (Date.now() - s.timerStartTime.getTime()) / 1000,
              ),
            }
            : s,
        ),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hydrateSession = async (user: LoggedInUser) => {
    const authedApi = createAuthedApi(user.token);

    try {
      const [customersRes, activeRes] = await Promise.all([
        authedApi.get("/customers"),
        authedApi.get("/time-entries/active"),
      ]);

      const customers = customersRes.data.data;
      const active = activeRes.data.data;

      if (active?.taskId) {
        const startTime = new Date(active.startTime);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);

        let tasks: Task[] = [];
        try {
          const tasksRes = await authedApi.get(
            `/tasks/customer/${active.customerId}`,
          );
          tasks = Array.isArray(tasksRes.data.data) ? tasksRes.data.data : [];
        } catch { }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === user.id
              ? {
                ...s,
                customers,
                loadingCustomers: false,
                tasks,
                selectedCustomerId: active.customerId,
                selectedTaskId: String(active.taskId),
                timerRunning: true,
                timerStartTime: startTime,
                elapsed,
              }
              : s,
          ),
        );
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === user.id ? { ...s, customers, loadingCustomers: false } : s,
          ),
        );
      }
    } catch (err: unknown) {
      // Token likely expired/invalid — drop the stale session instead of
      // leaving it stuck in a loading state.
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 401 || status === 403) {
        setSessions((prev) => prev.filter((s) => s.id !== user.id));
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === user.id ? { ...s, loadingCustomers: false } : s,
          ),
        );
      }
    }
  };

  // Fetch live state (active timer, customer, task) for any sessions that
  // were restored from localStorage on mount. The placeholders themselves
  // are already in `sessions` via the lazy useState initializer above.
  useEffect(() => {
    sessions.forEach((s) => hydrateSession(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinSuccess = async (user: LoggedInUser) => {
    if (sessions.find((s) => s.id === user.id)) return;

    setSessions((prev) => [...prev, placeholderSession(user)]);

    await hydrateSession(user);
  };

  const handleCustomerChange = async (userId: string, customerId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === userId
          ? {
            ...s,
            selectedCustomerId: customerId,
            selectedTaskId: "",
            tasks: [],
            loadingTasks: customerId !== "",
          }
          : s,
      ),
    );

    if (!customerId) return;

    const session = sessions.find((s) => s.id === userId);
    if (!session) return;

    try {
      const authedApi = createAuthedApi(session.token);
      const response = await authedApi.get(`/tasks/customer/${customerId}`);
      const tasks = Array.isArray(response.data.data) ? response.data.data : [];
      setSessions((prev) =>
        prev.map((s) =>
          s.id === userId ? { ...s, tasks, loadingTasks: false } : s,
        ),
      );
    } catch {
      setSessions((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, loadingTasks: false } : s)),
      );
    }
  };

  const handleTaskChange = (userId: string, taskId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === userId ? { ...s, selectedTaskId: taskId } : s)),
    );
  };

  const handleStart = async (userId: string) => {
    const session = sessions.find((s) => s.id === userId);
    if (!session || !session.selectedTaskId) return;

    try {
      const authedApi = createAuthedApi(session.token);
      await authedApi.post("/time-entries/start", {
        taskId: session.selectedTaskId,
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === userId
            ? {
              ...s,
              timerRunning: true,
              timerStartTime: new Date(),
              elapsed: 0,
            }
            : s,
        ),
      );
    } catch { }
  };

  const handleStop = async (userId: string) => {
    const session = sessions.find((s) => s.id === userId);
    if (!session) return;

    try {
      const authedApi = createAuthedApi(session.token);
      await authedApi.patch("/time-entries/active/stop");
      setSessions((prev) =>
        prev.map((s) =>
          s.id === userId
            ? { ...s, timerRunning: false, timerStartTime: null, elapsed: 0 }
            : s,
        ),
      );
    } catch { }
  };

  const handleClockOut = (userId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== userId));
  };

  const activeCount = sessions.length;

  return (
    <div className={styles.root}>
      <Navbar />

      <div className={styles.subheader}>
        <span className={styles.subheaderTitle}>Kiosk</span>
        <span className={styles.subheaderMeta}>
          <span
            className={`${styles.sessionDot} ${activeCount > 0 ? styles.sessionDotActive : ""}`}
          />
          {activeCount === 0
            ? "No active sessions"
            : `${activeCount} active session${activeCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.tableCard}>
          <table className={styles.table} aria-label="Active employee sessions">
            <thead className={styles.thead}>
              <tr>
                <th className={`${styles.th} ${styles.thSeq}`}>#</th>
                <th className={styles.th}>First name</th>
                <th className={styles.th}>Last name</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Task</th>
                <th className={`${styles.th} ${styles.thActions}`}>Actions</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => (
                <UserRow
                  key={session.id}
                  session={session}
                  index={i}
                  onClockOut={handleClockOut}
                  onCustomerChange={handleCustomerChange}
                  onTaskChange={handleTaskChange}
                  onStart={handleStart}
                  onStop={handleStop}
                />
              ))}
              <PinInput onSuccess={handlePinSuccess} />
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyHint}>
                    Enter your PIN above to clock in
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
