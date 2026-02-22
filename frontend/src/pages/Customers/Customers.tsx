import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar.tsx";
import styles from "./Customers.module.css";
import { customerService } from "../../services/customer.service.ts";
import type { Customer } from "../../services/customer.service.ts";

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerService.getAll();
        setCustomers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch customers.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.landingContainer}>
      <Navbar />
      <h1 className={styles.customersTitle}>Customers</h1>
      <div className={styles.customerList}>
        {customers.map((customer) => (
          <div key={customer.id} className={styles.customerCard}>
            <img
              src="https://www.iconpacks.net/icons/2/free-search-icon-2903-thumb.png"
              alt="Customer"
              className={styles.customerIcon}
            />
            <p className={styles.customerName}>{customer.name}</p>
            <button className={styles.viewBtn}>View</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Customers;
