import styles from "./LoadingSpinner.module.css";

interface Props {
  label?: string;
  dark?: boolean;
}

function LoadingSpinner({ label = "Loading…", dark = false }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={dark ? styles.spinnerDark : styles.spinner} />
      <span>{label}</span>
    </div>
  );
}

export default LoadingSpinner;
