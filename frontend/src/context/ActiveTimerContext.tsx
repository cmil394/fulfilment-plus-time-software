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
        setActiveTimer({
          taskId: active.taskId,
          taskName: active.task?.name ?? "Unknown task",
          customerName: active.customer?.name ?? "",
          startTime: active.startTime,
        });
        setWidgetVisible(true);
        startTick(active.startTime);
      }
    });
    return clearTick;
  }, []);

  const startTimer = useCallback(async (taskId: number) => {
    const entry = await timeEntryService.startTimer(taskId);
    setActiveTimer({
      taskId: entry.taskId,
      taskName: entry.task?.name ?? "Unknown task",
      customerName: entry.customer?.name ?? "",
      startTime: entry.startTime,
    });
    setWidgetVisible(true);
    startTick(entry.startTime);
  }, []);

  const stopTimer = useCallback(async () => {
    await timeEntryService.stopTimer();
    clearTick();
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, []);

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
