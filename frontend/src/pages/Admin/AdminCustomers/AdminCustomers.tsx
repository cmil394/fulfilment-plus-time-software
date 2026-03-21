import { useState, useEffect } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./AdminCustomers.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";
import {
  adminCustomerService,
  type Customer,
  type UpdateCustomerDto,
} from "./../../../services/admincustomer.service";
import { Eye, Pencil, Check, X, AlertTriangle, Trash2 } from "lucide-react";

type SortField = "index" | "name" | "email" | "createdAt";
type SortDir = "asc" | "desc";

function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrder, setCustomerOrder] = useState<Map<string, number>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UpdateCustomerDto | null>(null);

  // Confirm edit modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("index");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setLoading(true);
    const fetchCustomers = async () => {
      try {
        const data = await adminCustomerService.getAll();
        setCustomers(data);
        setCustomerOrder(
          new Map(data.map((c: Customer, i: number) => [c.id, i + 1])),
        );
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Edit handlers
  const handleStartEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditDraft({ name: customer.name, email: customer.email });
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setSaveError(null);
  };

  const handleDraftChange = (field: keyof UpdateCustomerDto, value: string) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleRequestConfirm = (customerId: string) => {
    setPendingConfirmId(customerId);
    setShowConfirmModal(true);
  };

  const handleConfirmEdit = async () => {
    if (!pendingConfirmId || !editDraft) return;
    setShowConfirmModal(false);
    const customerId = pendingConfirmId;
    setPendingConfirmId(null);

    setActionLoading(customerId);
    setSaveError(null);
    try {
      await adminCustomerService.update(customerId, editDraft);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, ...editDraft } : c)),
      );
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      console.error("Failed to update customer:", err);
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEditModal = () => {
    setShowConfirmModal(false);
    setPendingConfirmId(null);
  };

  // Delete handlers
  const handleRequestDelete = (customerId: string) => {
    setPendingDeleteId(customerId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setShowDeleteModal(false);
    const customerId = pendingDeleteId;
    setPendingDeleteId(null);

    setActionLoading(customerId);
    try {
      await adminCustomerService.delete(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (err) {
      console.error("Failed to delete customer:", err);
      setSaveError("Failed to delete customer. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  // Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    const valA =
      sortField === "index"
        ? customerOrder.get(a.id)!
        : (a[sortField as keyof Customer] ?? "");
    const valB =
      sortField === "index"
        ? customerOrder.get(b.id)!
        : (b[sortField as keyof Customer] ?? "");
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className={styles.sortIcon}>
      {field === sortField ? (sortDir === "asc" ? " 🠕" : " 🠗") : " ↕"}
    </span>
  );

  const SortableTh = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <th onClick={() => handleSort(field)} className={styles.sortableTh}>
      {children}
      <SortIcon field={field} />
    </th>
  );

  return (
    <div className={styles.customersContainer}>
      <Navbar />
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h2 className={tableStyles.pageTitle1}>Customers</h2>
          <h3 className={styles.tableCount}>
            {`${customers.length} Customer${customers.length !== 1 ? "s" : ""}`}
          </h3>
        </div>

        {saveError && <p className={styles.errorMsg}>{saveError}</p>}

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers found</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <SortableTh field="index">#</SortableTh>
                <SortableTh field="name">Name</SortableTh>
                <SortableTh field="email">Email</SortableTh>
                <SortableTh field="createdAt">Date Registered</SortableTh>
                <th>View</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer) => {
                const isEditing = editingId === customer.id;
                const isSaving = actionLoading === customer.id;

                return (
                  <tr
                    key={customer.id}
                    className={isEditing ? styles.editingRow : ""}
                  >
                    <td>{customerOrder.get(customer.id)}.</td>

                    {/* Name */}
                    <td>
                      {isEditing ? (
                        <input
                          className={styles.editInput}
                          value={editDraft!.name}
                          onChange={(e) =>
                            handleDraftChange("name", e.target.value)
                          }
                          disabled={isSaving}
                        />
                      ) : (
                        customer.name
                      )}
                    </td>

                    {/* Email */}
                    <td>
                      {isEditing ? (
                        <input
                          className={styles.editInput}
                          type="email"
                          value={editDraft!.email ?? ""}
                          onChange={(e) =>
                            handleDraftChange("email", e.target.value)
                          }
                          disabled={isSaving}
                        />
                      ) : (
                        (customer.email ?? "—")
                      )}
                    </td>

                    {/* Date (not editable) */}
                    <td>{new Date(customer.createdAt).toLocaleDateString()}</td>

                    {/* View */}
                    <td>
                      <button className={styles.viewBtn} disabled={isEditing}>
                        <Eye size={16} />
                      </button>
                    </td>

                    {/* Edit / Confirm / Cancel */}
                    <td>
                      {isEditing ? (
                        <div className={styles.editActions}>
                          <button
                            className={styles.confirmBtn}
                            onClick={() => handleRequestConfirm(customer.id)}
                            disabled={isSaving}
                            title="Confirm"
                          >
                            {isSaving ? "..." : <Check size={16} />}
                          </button>
                          <button
                            className={styles.cancelBtn}
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.editBtn}
                          onClick={() => handleStartEdit(customer)}
                          disabled={!!editingId}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>

                    {/* Delete */}
                    <td>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleRequestDelete(customer.id)}
                        disabled={isEditing || !!actionLoading}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Edit Modal */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIconWrap}>
              <AlertTriangle size={22} className={styles.modalIcon} />
            </div>
            <p className={styles.modalTitle}>Save changes?</p>
            <p className={styles.modalSubtitle}>
              You're about to update this customer's details.
            </p>
            <p className={styles.modalSubtitle1}>Are you sure?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelEditModal}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmEdit}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIconWrap}>
              <AlertTriangle size={22} className={styles.modalIcon} />
            </div>
            <p className={styles.modalTitle}>Delete customer?</p>
            <p className={styles.modalSubtitle}>
              This action cannot be undone.
            </p>
            <p className={styles.modalSubtitle1}>Are you sure?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelDeleteModal}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
