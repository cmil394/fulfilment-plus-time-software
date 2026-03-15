import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Employees.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";

function Employees() {
  return (
    <div className={styles.employeesContainer}>
      <Navbar />
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h2 className={tableStyles.pageTitle1}>Employees</h2>
          <h3 className={styles.tableCount}>1 Employee</h3>
        </div>
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
      </div>
    </div>
  );
}

export default Employees;
