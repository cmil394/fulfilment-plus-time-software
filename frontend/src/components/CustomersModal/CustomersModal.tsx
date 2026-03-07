import { useEffect, useState } from "react";
import { customerService } from "../../services/customer.service.ts";
import type { Customer } from "../../services/customer.service.ts";
import styles from "./CustomersModal.module.css";

const AVATAR =
  "data:image/png;base64,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";

function CustomersModal() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.board}>
      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchBar}
      />
      {filteredCustomers.length === 0 ? (
        <div className={styles.customerCard}>
          <p className={styles.customerName}>No existing customers.</p>
        </div>
      ) : (
        filteredCustomers.map((customer) => (
          <div key={customer.id} className={styles.customerCard}>
            <img src={AVATAR} alt="Customer" className={styles.customerIcon} />
            <p className={styles.customerName}>{customer.name}</p>
            <button className={styles.viewBtn}>Tasks</button>
          </div>
        ))
      )}
    </div>
  );
}

export default CustomersModal;
