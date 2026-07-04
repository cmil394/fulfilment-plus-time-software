import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import { timeEntryService } from "../services/time-entry.service";
import { useAuth } from "./AuthContext";

interface ActiveTimer {
  taskId: number;
  taskName: string;
  customerName: string;
  startTime: string;
}

interface ActiveTimerContextValue {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  timerLoading: boolean;
  widgetVisible: boolean;
  setWidgetVisible: (v: boolean) => void;
  startTimer: (taskId: number) => Promise<void>;
  stopTimer: () => Promise<void>;
}

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function ActiveTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, loading: authLoading } = useAuth();

  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerLoading, setTimerLoading] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTick = useCallback(
    (startTime: string) => {
      clearTick();
      const tick = () => {
        setElapsedSeconds(
          Math.max(
            0,
            Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
          ),
        );
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    },
    [clearTick],
  );

  // Sync timer state with auth
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      clearTick();
      setActiveTimer(null);
      setElapsedSeconds(0);
      return;
    }
    timeEntryService.getActiveTimer().then((active) => {
      if (active?.taskId) {
        const taskName = active.task?.name ?? "Unknown task";
        const customerName = active.customer?.name ?? "";
        setActiveTimer({
          taskId: active.taskId,
          taskName,
          customerName,
          startTime: active.startTime,
        });
        setWidgetVisible(true);
        startTick(active.startTime);
        console.log(
          `[Timer] Resumed — ${taskName} @ ${customerName} (started ${new Date(active.startTime).toLocaleTimeString()})`,
        );
      }
    });
    return clearTick;
  }, [token, authLoading, clearTick, startTick]);

  const startTimer = useCallback(
    async (taskId: number) => {
      setTimerLoading(true);
      try {
        // Always check with server for active timer
        const serverActive = await timeEntryService.getActiveTimer();
        if (serverActive) {
          try {
            await timeEntryService.stopTimer();
          } catch (err) {
            if (!axios.isAxiosError(err) || err.response?.status !== 404) {
              throw err;
            }
          }
        }
        const entry = await timeEntryService.startTimer(taskId);
        const taskName = entry.task?.name ?? "Unknown task";
        const customerName = entry.customer?.name ?? "";
        setActiveTimer({
          taskId: entry.taskId,
          taskName,
          customerName,
          startTime: entry.startTime,
        });
        setWidgetVisible(true);
        startTick(entry.startTime);
        console.log(`[Timer] Started — ${taskName} @ ${customerName}`);
      } finally {
        setTimerLoading(false);
      }
    },
    [startTick],
  );

  const stopTimer = useCallback(async () => {
    setTimerLoading(true);
    try {
      const duration = Math.floor(
        (Date.now() -
          (activeTimer
            ? new Date(activeTimer.startTime).getTime()
            : Date.now())) /
          1000,
      );
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      console.log(
        `[Timer] Stopped — ${activeTimer?.taskName} @ ${activeTimer?.customerName} (${mins}m ${secs}s)`,
      );
      try {
        await timeEntryService.stopTimer();
      } catch (err) {
        if (!axios.isAxiosError(err) || err.response?.status !== 404) {
          throw err;
        }
      }
      clearTick();
      setActiveTimer(null);
      setElapsedSeconds(0);
    } finally {
      setTimerLoading(false);
    }
  }, [activeTimer]);

  return (
    <ActiveTimerContext.Provider
      value={{
        activeTimer,
        elapsedSeconds,
        timerLoading,
        widgetVisible,
        setWidgetVisible,
        startTimer,
        stopTimer,
      }}
    >
      {children}
    </ActiveTimerContext.Provider>
  );
}

export function useActiveTimer() {
  const ctx = useContext(ActiveTimerContext);
  if (!ctx)
    throw new Error("useActiveTimer must be used within ActiveTimerProvider");
  return ctx;
}
