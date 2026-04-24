import { useEffect, useState } from "react";
import { authService } from "./../../../services/auth.service";
import type { User } from "./../../../services/auth.service";
import styles from "./ProfileModal.module.css"

export default function ProfileModal() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        authService.getProfile().then((res) => setUser(res.data.user));
    }, []);

    if (!user) return null;

    return (
        <div>
            <h1 className={styles.names}>Name: {user.fullName}</h1>
            <h1 className={styles.names}>Email: {user.email}</h1>
            <h1 className={styles.names}>Role: {user.role}</h1>
            <h1 className={styles.names}>Employee Code: {user.employeeCode}</h1>
        </div>
    );
}
