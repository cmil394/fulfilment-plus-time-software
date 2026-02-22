import Navbar from "../../components/Navbar/Navbar.tsx";
import CustomerModal from "../../components/CustomersModal/CustomersModal.tsx";
import styles from "./Customers.module.css";

function Customers() {
  return (
    <div className={styles.landingContainer}>
      <Navbar />
      <h1 className={styles.customersTitle}>Customers</h1>
      <CustomerModal />
    </div>
  );
}

export default Customers;
