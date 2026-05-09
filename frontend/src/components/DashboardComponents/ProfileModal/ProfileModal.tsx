import { useEffect, useState } from "react";
import { authService } from "./../../../services/auth.service";
import type { User } from "./../../../services/auth.service";
import styles from "./ProfileModal.module.css";

export default function ProfileModal() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    authService
      .getProfile()
      .then((res) => setUser(res.data.user))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error || !user)
    return (
      <p
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.85rem",
          textAlign: "center",
          padding: "12px 0",
        }}
      >
        Could not load profile.
      </p>
    );

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const year = user.createdAt.slice(0, 4);
  const month = user.createdAt.slice(5, 7);
  const day = user.createdAt.slice(8, 10);
  const createdAt = day + "-" + month + "-" + year;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.headerText}>
          <p className={styles.name}>{user.fullName}</p>
          <span className={styles.badge}>{user.role}</span>
        </div>
      </div>
      <hr className={styles.divider} />
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{user.email}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Code</span>
          <span className={styles.value}>{user.employeeCode ?? "—"}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>registered</span>
          <span className={styles.value}>{createdAt}</span>
        </div>
      </div>
    </div>
  );
}
