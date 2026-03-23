import Navbar from "../../../components/Navbar/Navbar";
import styles from "./AdminTasks.module.css";

function AdminTasks() {
  return (
    <div>
      <Navbar />
      <h1 className={styles.title}>Manage Tasks</h1>
    </div>
  );
}

export default AdminTasks;
