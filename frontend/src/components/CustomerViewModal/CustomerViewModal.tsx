import { useEffect, useState } from "react";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import type { Customer } from "./../../services/admin-customer.service";
import { taskService, type Task } from "./../../services/task.service";
import styles from "./CustomerViewModal.module.css";

interface Props {
  customer: Customer;
  onClose: () => void;
}

function CustomerViewModal({ customer, onClose }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await taskService.getByCustomer(customer.id);
        setTasks(data);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setTasksError("Could not load tasks.");
      } finally {
        setTasksLoading(false);
      }
    };
    fetchTasks();
  }, [customer.id]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarCircle}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className={styles.customerName}>{customer.name}</h2>
              <span className={styles.customerSince}>
                Customer since{" "}
                {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Details */}
        <div className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <div className={styles.infoGrid}>
            <InfoRow
              icon={<Building2 size={15} />}
              label="Company"
              value={customer.name}
            />
            <InfoRow
              icon={<User size={15} />}
              label="Owner"
              value={customer.ownerName ?? "—"}
            />
            <InfoRow
              icon={<Mail size={15} />}
              label="Email"
              value={customer.email ?? "—"}
            />
            <InfoRow
              icon={<Phone size={15} />}
              label="Phone"
              value={customer.phone ?? "—"}
            />
            <InfoRow
              icon={<CalendarDays size={15} />}
              label="Registered"
              value={new Date(customer.createdAt).toLocaleDateString("en-NZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          </div>
        </div>

        {/* Tasks */}
        <div className={styles.tasksSection}>
          <h3 className={styles.sectionTitle}>
            <ClipboardList size={15} />
            Tasks
            {!tasksLoading && (
              <span className={styles.taskCount}>{tasks.length}</span>
            )}
          </h3>

          {tasksLoading ? (
            <p className={styles.loadingMsg}>Loading tasks…</p>
          ) : tasksError ? (
            <p className={styles.errorMsg}>{tasksError}</p>
          ) : tasks.length === 0 ? (
            <p className={styles.emptyMsg}>No tasks for this customer.</p>
          ) : (
            <div className={styles.tasksTableWrapper}>
              <table className={styles.tasksTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <tr key={task.id}>
                      <td>{i + 1}.</td>
                      <td>{task.name}</td>
                      <td className={styles.descriptionCell}>
                        {task.description || (
                          <span className={styles.noDesc}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles[`status_${task.status?.toLowerCase().replace(/\s+/g, "_")}`]}`}
                        >
                          {task.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoIcon}>{icon}</span>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

export default CustomerViewModal;
