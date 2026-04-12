import { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import styles from "./Dashboard.module.css";
import titleStyles from "./../../components/CSS Components/titles.module.css";
import CustomersModal from "./../../components/CustomersModal/CustomersModal";
import TasksModal from "./../../components/TasksModal/TasksModal";
import HistoryModal from "./../../components/DashboardComponents/HistoryModal/HistoryModal";

function Dashboard() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  return (
    <div className={styles.dashboardContainer}>
      <Navbar />
      <h1 className={titleStyles.pageTitle1}>Dashboard</h1>
      <div className={styles.tabsRow}>
        <div className={styles.customersTab}>
          <h2 className={titleStyles.subheading1}>
            {selectedCustomerId ? "Tasks" : "Customers"}
          </h2>
          {selectedCustomerId ? (
            <TasksModal
              compact
              customerId={selectedCustomerId}
              onBack={() => setSelectedCustomerId(null)}
            />
          ) : (
            <CustomersModal
              compact
              onSelectCustomer={(id) => setSelectedCustomerId(id)}
            />
          )}
        </div>
        <div className={styles.historyTab}>
          <h2 className={titleStyles.subheading1}>History</h2>
          <HistoryModal />
        </div>
        <div className={styles.rightStack}>
          <div className={styles.profileTab}>
            <h2 className={titleStyles.subheading1}>Profile</h2>
          </div>
          <div className={styles.reportsTab}>
            <h2 className={titleStyles.subheading1}>Reports</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
