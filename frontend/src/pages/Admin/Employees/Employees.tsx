import { useState } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Employees.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";

type Tab = "employees" | "pending" | "stats";

function Employees() {
  const [activeTab, setActiveTab] = useState<Tab>("employees");

  return (
    <div className={styles.employeesContainer}>
      <Navbar />
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h2 className={tableStyles.pageTitle1}>Employees</h2>
          <h3 className={styles.tableCount}>
            {activeTab === "employees"
              ? "1 Employee"
              : activeTab === "pending"
                ? "3 Pending"
                : "Employee Stats"}
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
          <button
            className={`${styles.tab} ${activeTab === "stats" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            Employee Stats
          </button>
        </div>

        {activeTab === "employees" && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Id</th>
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
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Id</th>
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
              <tr>
                <td>2.</td>
                <td>Nicolas</td>
                <td>Yates</td>
                <td>NickYates@gmail.com</td>
                <td>
                  <span className={styles.roleBadge}>Sorter</span>
                </td>
                <td>12/03/2025</td>
                <td>
                  <span>Pending</span>
                </td>
                <td>
                  <button>Approve</button>
                </td>
                <td>
                  <button>Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Employees;
