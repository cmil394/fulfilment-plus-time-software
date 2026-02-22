import Navbar from "../../components/Navbar/Navbar.tsx";
import styles from "./Customers.module.css";

function Customers() {
  return (
    <div className={styles.landingContainer}>
      <Navbar />
      <h1 className={styles.customersTitle}>Customers</h1>
      <div className={styles.customerList}>
        <div className={styles.customerCard}>
          <img
            src="https://www.iconpacks.net/icons/2/free-search-icon-2903-thumb.png"
            alt="Customer"
            className={styles.customerIcon}
          />
          <p className={styles.customerName}>Customer 1</p>
          <button className={styles.viewBtn}>View</button>
        </div>
      </div>
    </div>
  );
}

export default Customers;
