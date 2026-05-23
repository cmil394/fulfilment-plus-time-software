import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { timeEntryService } from "../services/time-entry.service";

interface ActiveTimer {
  taskId: number;
  taskName: string;
  customerName: string;
  startTime: string;
}

interface ActiveTimerContextValue {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
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
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [widgetVisible, setWidgetVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTick = (startTime: string) => {
    clearTick();
    const tick = () => {
      setElapsedSeconds(
        Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
      );
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
  };

  // Hydrate from server on mount
  useEffect(() => {
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
        console.log(`[Timer] Resumed — ${taskName} @ ${customerName} (started ${new Date(active.startTime).toLocaleTimeString()})`);
      }
    });
    return clearTick;
  }, []);

  const startTimer = useCallback(async (taskId: number) => {
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
  }, []);

  const stopTimer = useCallback(async () => {
    const duration = Math.floor((Date.now() - (activeTimer ? new Date(activeTimer.startTime).getTime() : Date.now())) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    console.log(`[Timer] Stopped — ${activeTimer?.taskName} @ ${activeTimer?.customerName} (${mins}m ${secs}s)`);
    await timeEntryService.stopTimer();
    clearTick();
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [activeTimer]);

  return (
    <ActiveTimerContext.Provider
      value={{
        activeTimer,
        elapsedSeconds,
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
