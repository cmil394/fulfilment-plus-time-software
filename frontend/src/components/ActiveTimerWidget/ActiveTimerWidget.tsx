import { useEffect, useRef, useState } from "react";
import { useActiveTimer } from "../../context/ActiveTimerContext";
import styles from "./ActiveTimerWidget.module.css";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ActiveTimerWidget() {
  const {
    activeTimer,
    elapsedSeconds,
    widgetVisible,
    setWidgetVisible,
    stopTimer,
  } = useActiveTimer();

  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    const rect = widgetRef.current!.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  if (!activeTimer || !widgetVisible) return null;

  return (
    <div
      ref={widgetRef}
      className={styles.widget}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      <div className={styles.header}>
        <span className={styles.pulse} />
        <span className={styles.label}>Live Timer</span>
        <button
          className={styles.closeBtn}
          onClick={() => setWidgetVisible(false)}
          title="Hide widget (timer keeps running)"
        >
          ×
        </button>
      </div>

      <div className={styles.time}>{formatTime(elapsedSeconds)}</div>

      <div className={styles.meta}>
        <span className={styles.taskName}>{activeTimer.taskName}</span>
        {activeTimer.customerName && (
          <span className={styles.customerName}>
            {activeTimer.customerName}
          </span>
        )}
      </div>

      <button className={styles.stopBtn} onClick={stopTimer}>
        ■ Stop
      </button>
    </div>
  );
}
