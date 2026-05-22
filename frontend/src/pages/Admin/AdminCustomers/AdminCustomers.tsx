import { useState, useEffect, useRef } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./AdminCustomers.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";
import defaultAvatar from "./../../../assets/icons/default_pfp.png";
import {
  adminCustomerService,
  type Customer,
  type CustomerDto,
} from "./../../../services/admin-customer.service";
import {
  Eye,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Trash2,
  UserPlus,
  GripVertical,
} from "lucide-react";
import CustomerViewModal from "./../../../components/CustomerViewModal/CustomerViewModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type SortField =
  | "index"
  | "name"
  | "ownerName"
  | "email"
  | "phone"
  | "createdAt";
type SortDir = "asc" | "desc";

const EMPTY_CREATE: CustomerDto = {
  name: "",
  ownerName: "",
  email: "",
  phone: "",
};

interface SortableRowProps {
  id: string;
  disabled: boolean;
  children: React.ReactNode;
  isEditing: boolean;
}

function SortableRow({ id, disabled, children, isEditing }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={isEditing ? styles.editingRow : ""}
    >
      <td className={styles.dragCell}>
        {!disabled && (
          <span className={styles.dragHandle} {...listeners}>
            <GripVertical size={16} />
          </span>
        )}
      </td>
      {children}
    </tr>
  );
}

function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDraft, setCreateDraft] = useState<CustomerDto>(EMPTY_CREATE);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createAvatarRef = useRef<HTMLInputElement>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(
    null,
  );
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CustomerDto | null>(null);

  // Confirm edit modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // View modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("index");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setLoading(true);
    const fetchCustomers = async () => {
      try {
        const data = await adminCustomerService.getAll();
        setCustomers(data);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Avatar handlers
  const handleAvatarClick = () => {
    if (editingId) fileInputRef.current?.click();
  };

  const handleCreateAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateAvatarFile(file);
    setCreateAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;

    setAvatarLoading(true);
    try {
      const updated = await adminCustomerService.uploadAvatar(editingId, file);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingId ? { ...c, avatarUrl: updated.avatarUrl } : c,
        ),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to upload avatar. Please try again.";
      setSaveError(msg);
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  // Create handlers
  const handleOpenCreate = () => {
    setCreateDraft(EMPTY_CREATE);
    setCreateError(null);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateDraft(EMPTY_CREATE);
    setCreateError(null);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
  };

  const handleCreateDraftChange = (field: keyof CustomerDto, value: string) => {
    setCreateDraft((prev) => ({ ...prev, [field]: value }) as CustomerDto);
  };

  const handleCreateSubmit = async () => {
    if (!createDraft.name.trim()) {
      setCreateError("Name is required.");
      return;
    }
    if (!createDraft.ownerName?.trim()) {
      setCreateError("Owner name is required.");
      return;
    }
    if (!createDraft.email?.trim()) {
      setCreateError("Email is required.");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const formData = new FormData();
      formData.append("name", createDraft.name);
      formData.append("ownerName", createDraft.ownerName ?? "");
      formData.append("email", createDraft.email ?? "");
      formData.append("phone", createDraft.phone ?? "");
      if (createAvatarFile) formData.append("avatar", createAvatarFile);

      const newCustomer =
        await adminCustomerService.createWithFormData(formData);
      setCustomers((prev) => [...prev, newCustomer]);
      setShowCreateForm(false);
      setCreateDraft(EMPTY_CREATE);
      setCreateAvatarFile(null);
      setCreateAvatarPreview(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create customer. Please try again.";
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit handlers
  const handleStartEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditDraft({
      name: customer.name,
      ownerName: customer.ownerName,
      email: customer.email,
      phone: customer.phone,
    });
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setSaveError(null);
  };

  const handleDraftChange = (field: keyof CustomerDto, value: string) => {
    setEditDraft((prev: CustomerDto | null) =>
      prev ? { ...prev, [field]: value } : prev,
    );
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save changes. Please try again.";
      setSaveError(msg);
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete customer. Please try again.";
      setSaveError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  // Drag-to-reorder handler (only active when sorted by index)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customers.findIndex((c) => c.id === active.id);
    const newIndex = customers.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(customers, oldIndex, newIndex);
    setCustomers(reordered);
    setReorderError(null);

    try {
      await adminCustomerService.reorder(reordered.map((c) => c.id));
    } catch {
      setReorderError("Failed to save order. Please try again.");
      setCustomers(customers);
    }
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

  const isDraggable = sortField === "index" && sortDir === "asc" && !editingId;

  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortField === "index") return 0; // preserve server order
    const valA = a[sortField as keyof Customer] ?? "";
    const valB = b[sortField as keyof Customer] ?? "";
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

        {/* Create Customer Button */}
        <div className={styles.createRow}>
          <button className={styles.createBtn} onClick={handleOpenCreate}>
            <UserPlus size={16} />
            Create Customer
          </button>
        </div>

        {saveError && <p className={styles.errorMsg}>{saveError}</p>}
        {reorderError && <p className={styles.errorMsg}>{reorderError}</p>}

        {/* Hidden file input for avatar upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarFileChange}
        />

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers found</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.dragHeaderCell}></th>
                  <SortableTh field="index">#</SortableTh>
                  <th>Icon</th>
                  <SortableTh field="name">Company Name</SortableTh>
                  <SortableTh field="ownerName">Owners Name</SortableTh>
                  <SortableTh field="email">Email</SortableTh>
                  <SortableTh field="phone">Phone Number</SortableTh>
                  <SortableTh field="createdAt">Date Registered</SortableTh>
                  <th>View</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <SortableContext
                items={sortedCustomers.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {sortedCustomers.map((customer, index) => {
                    const isEditing = editingId === customer.id;
                    const isSaving = actionLoading === customer.id;

                    return (
                      <SortableRow
                        key={customer.id}
                        id={customer.id}
                        disabled={!isDraggable}
                        isEditing={isEditing}
                      >
                        <td>{index + 1}.</td>

                        {/* Avatar */}
                        <td>
                          <div
                            className={`${styles.avatarWrap} ${isEditing ? styles.avatarEditable : ""}`}
                            onClick={handleAvatarClick}
                            title={
                              isEditing ? "Click to change photo" : undefined
                            }
                          >
                            <img
                              src={
                                customer.avatarUrl
                                  ? customer.avatarUrl.startsWith("http")
                                    ? customer.avatarUrl
                                    : `${BASE_URL}${customer.avatarUrl}`
                                  : defaultAvatar
                              }
                              alt={customer.name}
                              className={styles.avatar}
                            />
                            {isEditing && (
                              <div className={styles.avatarOverlay}>
                                {avatarLoading ? "..." : <Pencil size={12} />}
                              </div>
                            )}
                          </div>
                        </td>

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

                        {/* Owners Name */}
                        <td>
                          {isEditing ? (
                            <input
                              className={styles.editInput}
                              type="text"
                              value={editDraft!.ownerName ?? ""}
                              onChange={(e) =>
                                handleDraftChange("ownerName", e.target.value)
                              }
                              disabled={isSaving}
                            />
                          ) : (
                            (customer.ownerName ?? "—")
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

                        {/* Phone Number */}
                        <td>
                          {isEditing ? (
                            <input
                              className={styles.editInput}
                              type="tel"
                              value={editDraft!.phone ?? ""}
                              onChange={(e) =>
                                handleDraftChange("phone", e.target.value)
                              }
                              disabled={isSaving}
                            />
                          ) : (
                            (customer.phone ?? "—")
                          )}
                        </td>

                        {/* Date (not editable) */}
                        <td>
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>

                        {/* View */}
                        <td>
                          <button
                            className={styles.viewBtn}
                            onClick={() => setViewingCustomer(customer)}
                            disabled={isEditing}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                        </td>

                        {/* Edit / Confirm / Cancel */}
                        <td>
                          {isEditing ? (
                            <div className={styles.editActions}>
                              <button
                                className={styles.confirmBtn}
                                onClick={() =>
                                  handleRequestConfirm(customer.id)
                                }
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
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className={styles.editBtn}
                              onClick={() => handleStartEdit(customer)}
                              disabled={!!editingId}
                            >
                              <Pencil size={18} />
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
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </SortableRow>
                    );
                  })}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <input
              ref={createAvatarRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleCreateAvatarChange}
            />

            <div className={styles.modalIconWrap}>
              {createAvatarPreview ? (
                <div
                  className={`${styles.avatarWrap} ${styles.avatarEditable}`}
                  onClick={() => createAvatarRef.current?.click()}
                >
                  <img
                    src={createAvatarPreview}
                    alt="Avatar preview"
                    className={styles.avatar}
                  />
                  <div className={styles.avatarOverlay}>
                    <Pencil size={12} />
                  </div>
                </div>
              ) : (
                <div
                  className={styles.modalAvatarPlaceholder}
                  onClick={() => createAvatarRef.current?.click()}
                >
                  <UserPlus size={30} className={styles.modalIconCreate} />
                  <div className={styles.modalAvatarOverlay}>
                    <Pencil size={12} />
                  </div>
                </div>
              )}
            </div>

            <p className={styles.modalTitle}>New Customer</p>

            <div className={styles.createFormFields}>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>
                  Name <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.editInput}
                  placeholder="Full name"
                  value={createDraft.name}
                  onChange={(e) =>
                    handleCreateDraftChange("name", e.target.value)
                  }
                  disabled={createLoading}
                />
              </div>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>
                  Owner Name <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.editInput}
                  placeholder="Owners name"
                  value={createDraft.ownerName}
                  onChange={(e) =>
                    handleCreateDraftChange("ownerName", e.target.value)
                  }
                  disabled={createLoading}
                />
              </div>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.editInput}
                  type="email"
                  placeholder="email@example.com"
                  value={createDraft.email ?? ""}
                  onChange={(e) =>
                    handleCreateDraftChange("email", e.target.value)
                  }
                  disabled={createLoading}
                />
              </div>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>Phone</label>
                <input
                  className={styles.editInput}
                  type="tel"
                  placeholder="027 123 4567"
                  value={createDraft.phone ?? ""}
                  onChange={(e) =>
                    handleCreateDraftChange("phone", e.target.value)
                  }
                  disabled={createLoading}
                />
              </div>
            </div>

            {createError && <p className={styles.errorMsg}>{createError}</p>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelCreate}
                disabled={createLoading}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleCreateSubmit}
                disabled={createLoading}
              >
                {createLoading ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* View Customer Modal */}
      {viewingCustomer && (
        <CustomerViewModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}

export default AdminCustomers;
