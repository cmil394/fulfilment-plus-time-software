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
    timerLoading,
    widgetVisible,
    setWidgetVisible,
    stopTimer,
  } = useActiveTimer();

  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const clampPos = (x: number, y: number) => {
    const widget = widgetRef.current;
    if (!widget) return { x, y };
    const maxX = window.innerWidth - widget.offsetWidth;
    const maxY = window.innerHeight - widget.offsetHeight;
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  };

  useEffect(() => {
    const onResize = () => {
      setPos((prev) => clampPos(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rawX = e.clientX - offset.current.x;
      const rawY = e.clientY - offset.current.y;
      setPos(clampPos(rawX, rawY));
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
      <div className={styles.dragHandle}>
        <span className={styles.dragDot} />
        <span className={styles.dragDot} />
        <span className={styles.dragDot} />
        <span className={styles.dragDot} />
        <span className={styles.dragDot} />
      </div>

      <div className={styles.header}>
        <div className={styles.liveBadge}>
          <span className={styles.pulse} />
          <span className={styles.label}>Live</span>
        </div>
        <button
          className={styles.closeBtn}
          onClick={() => setWidgetVisible(false)}
          title="Hide widget (timer keeps running)"
        >
          ×
        </button>
      </div>

      <div className={styles.timeRow}>
        <div className={styles.time}>{formatTime(elapsedSeconds)}</div>
      </div>

      <div className={styles.divider} />

      <div className={styles.meta}>
        <span className={styles.taskName}>{activeTimer.taskName}</span>
        {activeTimer.customerName && (
          <span className={styles.customerName}>
            {activeTimer.customerName}
          </span>
        )}
      </div>

      <button className={styles.stopBtn} onClick={stopTimer} disabled={timerLoading}>
        {timerLoading ? (
          <span className={styles.btnSpinner} />
        ) : (
          <>
            <span className={styles.stopIcon} />
            Stop Timer
          </>
        )}
      </button>
    </div>
  );
}
