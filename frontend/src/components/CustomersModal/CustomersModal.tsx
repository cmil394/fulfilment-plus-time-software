import { useEffect, useState } from "react";
import { customerService } from "../../services/customer.service.ts";
import type { Customer } from "../../services/customer.service.ts";
import styles from "./CustomersModal.module.css";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "./../../assets/icons/default.png";

interface Props {
  compact?: boolean;
  onSelectCustomer?: (id: string) => void;
}

function CustomersModal({ compact = false, onSelectCustomer }: Props) {
  const BASE_URL =
    import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ??
    "http://localhost:3001";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

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

  const handleTasksClick = (id: string) => {
    if (compact && onSelectCustomer) {
      onSelectCustomer(id);
    } else {
      navigate(`/tasks/${id}`);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={compact ? styles.boardCompact : styles.board}>
      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={compact ? styles.searchBarCompact : styles.searchBar}
      />
      <div className={styles.customerList}>
        {filteredCustomers.length === 0 ? (
          <div
            className={
              compact ? styles.customerCardCompact : styles.customerCard
            }
          >
            <p
              className={
                compact ? styles.customerNameCompact : styles.customerName
              }
            >
              No existing customers.
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className={
                compact ? styles.customerCardCompact : styles.customerCard
              }
            >
              <img
                src={
                  customer.avatarUrl
                    ? `${BASE_URL}${customer.avatarUrl}`
                    : defaultAvatar
                }
                alt="Customer"
                className={
                  compact ? styles.customerIconCompact : styles.customerIcon
                }
              />
              <p
                className={
                  compact ? styles.customerNameCompact : styles.customerName
                }
              >
                {customer.name}
              </p>
              <button
                className={compact ? styles.viewBtnCompact : styles.viewBtn}
                onClick={() => handleTasksClick(String(customer.id))}
              >
                Tasks
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CustomersModal;
