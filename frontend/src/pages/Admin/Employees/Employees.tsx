import { useState, useEffect } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Employees.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";
import { authService } from "../../../services/auth.service";
import type { User } from "../../../services/auth.service";

type Tab = "employees" | "pending";

function Employees() {
  const [activeTab, setActiveTab] = useState<Tab>("employees");
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "pending") {
      setLoading(true);

      const fetchPendingUsers = async () => {
        try {
          const response = await authService.getPendingUsers();
          setPendingUsers(response.data.users);
        } catch (err) {
          console.error("Failed to fetch pending users:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchPendingUsers();
    }
  }, [activeTab]);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await authService.approveUser(userId);
      // Remove from pending list after approval
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to approve user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await authService.rejectUser(userId);
      // Remove from pending list after rejection
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to reject user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.employeesContainer}>
      <Navbar />
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h2 className={tableStyles.pageTitle1}>Employees</h2>
          <h3 className={styles.tableCount}>
            {activeTab === "employees"
              ? "1 Employee"
              : `${pendingUsers.length} Pending`}
          </h3>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "employees" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            Employees
          </button>
          <button
            className={`${styles.tab} ${activeTab === "pending" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending employees
          </button>
        </div>

        {activeTab === "employees" && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Date Registered</th>
                <th>Hours This Week</th>
                <th>Overview</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1.</td>
                <td>Carson</td>
                <td>Mills</td>
                <td>Carsonkmills5@gmail.com</td>
                <td>
                  <span className={styles.roleBadge}>Picker</span>
                </td>
                <td>09/02/2004</td>
                <td>
                  <span className={styles.hours}>24h</span>
                </td>
                <td>
                  <button>Overview</button>
                </td>
                <td>
                  <button>Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {activeTab === "pending" && (
          <div>
            {loading ? (
              <p>Loading pending users...</p>
            ) : pendingUsers.length === 0 ? (
              <p>No pending users</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Date Registered</th>
                    <th>Status</th>
                    <th>Approve</th>
                    <th>Reject</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.firstName}</td>
                      <td>{user.lastName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={styles.roleBadge}>{user.role}</span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span>{user.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? "..." : "Approve"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? "..." : "Reject"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Employees;
