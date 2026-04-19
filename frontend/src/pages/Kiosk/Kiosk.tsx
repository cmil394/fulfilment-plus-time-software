import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import styles from "./Kiosk.module.css";
import Navbar from "../../components/Navbar/Navbar";
import { authService } from "../../services/auth.service";

interface LoggedInUser {
  id: string;
  firstName: string;
  lastName: string;
  token: string;
}

interface PinInputProps {
  onSuccess: (user: LoggedInUser) => void;
}

type PinState = "idle" | "loading" | "error";

function PinInput({ onSuccess }: PinInputProps) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<PinState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (pin.length !== 5) return;
    setState("loading");
    setErrorMsg("");

    try {
      const result = await authService.loginWithPin(pin);
      const { user, token } = result.data;

      onSuccess({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        token,
      });

      setPin("");
      setState("idle");
      inputRef.current?.focus();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Invalid PIN";
      setState("error");
      setErrorMsg(message);
      setPin("");
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleChange = (v: string) => {
    const numeric = v.replace(/\D/g, "").slice(0, 8);
    setPin(numeric);
    if (state === "error") {
      setState("idle");
      setErrorMsg("");
    }
  };

  return (
    <tr className={styles.pinRow}>
      <td className={`${styles.cell} ${styles.cellSeq}`}>
        <span className={styles.seqPlus}>+</span>
      </td>
      <td className={styles.cell} colSpan={2}>
        <div className={styles.pinWrap}>
          <span className={styles.pinLabel}>PIN</span>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={pin}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Enter PIN"
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
          disabled={pin.length !== 5 || state === "loading"}
        >
          {state === "loading" ? "Verifying…" : "Clock In →"}
        </button>
      </td>
    </tr>
  );
}

interface UserRowProps {
  user: LoggedInUser;
  index: number;
  onClockOut: (userId: string) => void;
}

function UserRow({ user, index, onClockOut }: UserRowProps) {
  const [loading, setLoading] = useState(false);

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await authService.clockOut(user.token);
      onClockOut(user.id);
    } catch {
      // surface an error toast/alert here if you have one
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className={`${styles.userRow} ${styles.userRowEnter}`}>
      <td className={`${styles.cell} ${styles.cellSeq}`}>
        <span className={styles.seqNum}>{index + 1}</span>
      </td>
      <td className={`${styles.cell} ${styles.cellFirst}`}>
        {user.firstName}
      </td>
      <td className={`${styles.cell} ${styles.cellLast}`}>
        {user.lastName}
      </td>
      <td className={`${styles.cell} ${styles.cellPlaceholder}`}>—</td>
      <td className={`${styles.cell} ${styles.cellPlaceholder}`}>—</td>
      <td className={`${styles.cell} ${styles.cellActions}`}>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnStart}`} disabled>
            Start
          </button>
          <button className={`${styles.btn} ${styles.btnStop}`} disabled>
            Stop
          </button>
        </div>
      </td>
      <td className={`${styles.cell} ${styles.cellClockOut}`}>
        <button
          className={`${styles.btn} ${styles.btnClockOut}`}
          onClick={handleClockOut}
          disabled={loading}
        >
          {loading ? "Clocking out…" : "Clock Out"}
        </button>
      </td>
    </tr>
  );
}

export default function Kiosk() {
  const [loggedInUsers, setLoggedInUsers] = useState<LoggedInUser[]>([]);

  const handlePinSuccess = (user: LoggedInUser) => {
    setLoggedInUsers((prev) => {
      if (prev.find((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
  };

  const handleClockOut = (userId: string) => {
    setLoggedInUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const activeCount = loggedInUsers.length;

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
              {loggedInUsers.map((user, i) => (
                <UserRow
                  key={user.id}
                  user={user}
                  index={i}
                  onClockOut={handleClockOut}
                />
              ))}
              <PinInput onSuccess={handlePinSuccess} />
              {loggedInUsers.length === 0 && (
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