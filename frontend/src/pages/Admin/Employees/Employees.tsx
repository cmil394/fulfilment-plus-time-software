import { useState, useEffect, useCallback } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Employees.module.css";
import tableStyles from "./../../../components/CSS Components/titles.module.css";
import { authService } from "../../../services/auth.service";
import type { User } from "../../../services/auth.service";
import {
  Eye,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import EmployeeTimeCalendar from "../../../components/EmployeeTimeCalendar/EmployeeTimeCalendar";
import { timeEntryService } from "../../../services/time-entry.service";
import type { TimeEntry } from "../../../services/time-entry.service";

type Tab = "employees" | "pending" | "activeEmployees";
type SortField =
  | "index"
  | "firstName"
  | "lastName"
  | "email"
  | "role"
  | "createdAt";
type SortDir = "asc" | "desc";

interface EditDraft {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toNZTString(date: Date): string {
  return date.toLocaleTimeString("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function ElapsedCell({ startTime }: { startTime: string }) {
  const getSeconds = () =>
    Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);

  const [elapsed, setElapsed] = useState(getSeconds);

  useEffect(() => {
    const id = setInterval(() => setElapsed(getSeconds()), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return <span className={styles.elapsed}>{formatElapsed(elapsed)}</span>;
}

function Employees() {
  const [activeTab, setActiveTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [employeeOrder, setEmployeeOrder] = useState<Map<string, number>>(
    new Map(),
  );
  const [pendingOrder, setPendingOrder] = useState<Map<string, number>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentUserId] = useState<string | null>(() =>
    authService.getCurrentUserId(),
  );
  const [currentUserRole] = useState<string | null>(
    () => authService.getCurrentUserRole?.() ?? null,
  );

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);

  const [empSortField, setEmpSortField] = useState<SortField>("index");
  const [empSortDir, setEmpSortDir] = useState<SortDir>("asc");
  const [pendingSortField, setPendingSortField] = useState<SortField>("index");
  const [pendingSortDir, setPendingSortDir] = useState<SortDir>("asc");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [pendingResetId, setPendingResetId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetPwError, setResetPwError] = useState<string | null>(null);
  const [resetPwLoading, setResetPwLoading] = useState(false);

  // Time calendar state
  const [viewingEmployee, setViewingEmployee] = useState<User | null>(null);

  // Active timers state
  const [activeTimers, setActiveTimers] = useState<TimeEntry[]>([]);
  const [timersLoading, setTimersLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActiveTimers = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setTimersLoading(true);
    try {
      const timers = await timeEntryService.getAllActiveTimers();
      setActiveTimers(timers);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch active timers:", err);
    } finally {
      setTimersLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "employees") {
      setLoading(true);
      const fetchEmployees = async () => {
        try {
          const response = await authService.getAllAcceptedUsers();
          const users = response.data.users ?? response.data ?? [];
          setEmployees(users);
          setEmployeeOrder(
            new Map(users.map((u: User, i: number) => [u.id, i + 1])),
          );
        } catch (err) {
          console.error("Failed to fetch employees:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchEmployees();
    }

    if (activeTab === "pending") {
      setLoading(true);

      const fetchPendingUsers = async () => {
        try {
          const response = await authService.getPendingUsers();
          const users = response.data.users;
          setPendingUsers(users);
          setPendingOrder(
            new Map(users.map((u: User, i: number) => [u.id, i + 1])),
          );
        } catch (err) {
          console.error("Failed to fetch pending users:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchPendingUsers();
    }

    if (activeTab === "activeEmployees") {
      fetchActiveTimers(false);
    }
  }, [activeTab, fetchActiveTimers]);

  // Edit handlers
  const handleStartEdit = (employee: User) => {
    setEditingId(employee.id);
    setEditDraft({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
    });
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setSaveError(null);
  };

  const handleRequestConfirm = (userId: string) => {
    setPendingConfirmId(userId);
    setShowConfirmModal(true);
  };

  const handleConfirmModal = async () => {
    if (!pendingConfirmId || !editDraft) return;
    setShowConfirmModal(false);
    const userId = pendingConfirmId;
    setPendingConfirmId(null);

    setActionLoading(userId);
    setSaveError(null);
    try {
      const employee = employees.find((u) => u.id === userId);
      const payload =
        employee?.role === "Owner"
          ? (({ role: _role, ...rest }) => rest)(editDraft as unknown as Record<string, unknown>)
          : editDraft;
      await authService.updateUser(userId, payload as Partial<typeof editDraft>);
      // Update local state so the table reflects changes immediately
      setEmployees((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...editDraft } : u)),
      );
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      console.error("Failed to update user:", err);
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setPendingConfirmId(null);
  };

  const handleDraftChange = (field: keyof EditDraft, value: string) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await authService.approveUser(userId);
      // Remove from pending list after approval
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to approve user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await authService.rejectUser(userId);
      // Remove from pending list after rejection
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to reject user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestDelete = (userId: string) => {
    setPendingDeleteId(userId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setShowDeleteModal(false);
    const userId = pendingDeleteId;
    setPendingDeleteId(null);
    setActionLoading(userId);
    try {
      await authService.deleteUser(userId);
      setEmployees((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  const handleRequestResetPassword = (userId: string) => {
    setPendingResetId(userId);
    setResetNewPassword("");
    setResetPwError(null);
    setShowResetPwModal(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!pendingResetId) return;
    if (resetNewPassword.length < 6) {
      setResetPwError("Password must be at least 6 characters.");
      return;
    }
    setResetPwLoading(true);
    setResetPwError(null);
    try {
      await authService.resetEmployeePassword(pendingResetId, resetNewPassword);
      setShowResetPwModal(false);
      setPendingResetId(null);
      setResetNewPassword("");
    } catch {
      setResetPwError("Failed to reset password. Please try again.");
    } finally {
      setResetPwLoading(false);
    }
  };

  const handleCancelResetPassword = () => {
    setShowResetPwModal(false);
    setPendingResetId(null);
    setResetNewPassword("");
    setResetPwError(null);
  };

  const makeHandleSort =
    (
      currentField: SortField,
      setField: (f: SortField) => void,
      currentDir: SortDir,
      setDir: (d: SortDir) => void,
    ) =>
      (field: SortField) => {
        if (currentField === field) {
          setDir(currentDir === "asc" ? "desc" : "asc");
        } else {
          setField(field);
          setDir("asc");
        }
      };

  const handleEmpSort = makeHandleSort(
    empSortField,
    setEmpSortField,
    empSortDir,
    setEmpSortDir,
  );
  const handlePendingSort = makeHandleSort(
    pendingSortField,
    setPendingSortField,
    pendingSortDir,
    setPendingSortDir,
  );

  const sortUsers = (
    users: User[],
    field: SortField,
    dir: SortDir,
    orderMap: Map<string, number>,
  ): User[] => {
    return [...users].sort((a, b) => {
      const valA =
        field === "index"
          ? orderMap.get(a.id)!
          : (a[field as keyof User] ?? "");
      const valB =
        field === "index"
          ? orderMap.get(b.id)!
          : (b[field as keyof User] ?? "");
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return dir === "asc" ? cmp : -cmp;
    });
  };

  const sortedEmployees = sortUsers(
    employees,
    empSortField,
    empSortDir,
    employeeOrder,
  );
  const sortedPending = sortUsers(
    pendingUsers,
    pendingSortField,
    pendingSortDir,
    pendingOrder,
  );

  const SortIcon = ({
    field,
    activeField,
    dir,
  }: {
    field: SortField;
    activeField: SortField;
    dir: SortDir;
  }) => (
    <span className={styles.sortIcon}>
      {field === activeField ? (dir === "asc" ? " 🠕" : " 🠗") : " ↕"}
    </span>
  );

  const SortableTh = ({
    field,
    activeField,
    dir,
    onSort,
    children,
  }: {
    field: SortField;
    activeField: SortField;
    dir: SortDir;
    onSort: (f: SortField) => void;
    children: React.ReactNode;
  }) => (
    <th onClick={() => onSort(field)} className={styles.sortableTh}>
      {children}
      <SortIcon field={field} activeField={activeField} dir={dir} />
    </th>
  );

  return (
    <div className={styles.employeesContainer}>
      <Navbar />
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h2 className={tableStyles.pageTitle1}>Employees</h2>
          <h3 className={styles.tableCount}>
            {activeTab === "employees"
              ? `${employees.length} Employee${employees.length !== 1 ? "s" : ""}`
              : activeTab === "pending"
                ? `${pendingUsers.length} Pending`
                : `${activeTimers.length} Active`}
          </h3>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "employees" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            Employees
          </button>
          <button
            className={`${styles.tab} ${activeTab === "pending" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending employees
          </button>
          <button
            className={`${styles.tab} ${activeTab === "activeEmployees" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("activeEmployees")}
          >
            Active Employees
          </button>
        </div>

        {activeTab === "employees" && (
          <>
            {saveError && <p className={styles.errorMsg}>{saveError}</p>}
            {loading ? (
              <p>Loading employees...</p>
            ) : employees.length === 0 ? (
              <p>No employees found</p>
            ) : (
              /* Employees table */
              <table className={`${styles.table} ${styles.employeesTable}`}>
                <thead>
                  <tr>
                    <SortableTh
                      field="index"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      #
                    </SortableTh>
                    <SortableTh
                      field="firstName"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      First Name
                    </SortableTh>
                    <SortableTh
                      field="lastName"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      Last Name
                    </SortableTh>
                    <SortableTh
                      field="email"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      Email
                    </SortableTh>
                    <SortableTh
                      field="role"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      Role
                    </SortableTh>
                    <th className={styles.pinCol}>Code</th>
                    <SortableTh
                      field="createdAt"
                      activeField={empSortField}
                      dir={empSortDir}
                      onSort={handleEmpSort}
                    >
                      Date Registered
                    </SortableTh>
                    <th>View</th>
                    <th>Edit</th>
                    {editingId && <th>Reset PW</th>}
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((employee) => {
                    const isEditing = editingId === employee.id;
                    const isSaving = actionLoading === employee.id;
                    const isSelf = currentUserId === employee.id;
                    const targetIsAdmin =
                      employee.role === "Admin" || employee.role === "Owner";
                    const currentIsOwner = currentUserRole === "Owner";
                    // Owners can change anyone's role except their own
                    // Admins can only change Employees roles
                    const canChangeRole =
                      !isSelf && (currentIsOwner || !targetIsAdmin);

                    return (
                      <tr
                        key={employee.id}
                        className={isEditing ? styles.editingRow : ""}
                      >
                        <td>{employeeOrder.get(employee.id)}.</td>

                        {/* First Name */}
                        <td>
                          {isEditing ? (
                            <input
                              className={styles.editInput}
                              value={editDraft!.firstName}
                              onChange={(e) =>
                                handleDraftChange("firstName", e.target.value)
                              }
                              disabled={isSaving}
                            />
                          ) : (
                            employee.firstName
                          )}
                        </td>

                        {/* Last Name */}
                        <td>
                          {isEditing ? (
                            <input
                              className={styles.editInput}
                              value={editDraft!.lastName}
                              onChange={(e) =>
                                handleDraftChange("lastName", e.target.value)
                              }
                              disabled={isSaving}
                            />
                          ) : (
                            employee.lastName
                          )}
                        </td>

                        {/* Email */}
                        <td>
                          {isEditing ? (
                            <input
                              className={styles.editInput}
                              type="email"
                              value={editDraft!.email}
                              onChange={(e) =>
                                handleDraftChange("email", e.target.value)
                              }
                              disabled={isSaving}
                            />
                          ) : (
                            employee.email
                          )}
                        </td>

                        {/* Role */}
                        <td>
                          {isEditing ? (
                            <select
                              className={styles.editInput}
                              value={editDraft!.role}
                              onChange={(e) =>
                                handleDraftChange("role", e.target.value)
                              }
                              disabled={isSaving || !canChangeRole}
                              title={
                                !canChangeRole && !isSelf
                                  ? "Only Owners can change an Admin's role"
                                  : undefined
                              }
                            >
                              {employee.role === "Owner" && (
                                <option value="Owner" disabled>
                                  Owner
                                </option>
                              )}
                              <option value="Admin">Admin</option>
                              <option value="Employee">Employee</option>
                            </select>
                          ) : (
                            <span className={styles.roleBadge}>
                              {employee.role}
                            </span>
                          )}
                        </td>

                        {/* Employee Code */}
                        <td>
                          {employee.employeeCode ?? (
                            <span style={{ color: "var(--color-text-muted, #aaa)" }}>—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td>
                          {new Date(employee.createdAt).toLocaleDateString()}
                        </td>

                        {/* View — opens the time calendar */}
                        <td>
                          <button
                            className={styles.viewBtn}
                            onClick={() => setViewingEmployee(employee)}
                            disabled={isEditing}
                            title="View time entries"
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
                                  handleRequestConfirm(employee.id)
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
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className={styles.editBtn}
                              onClick={() => handleStartEdit(employee)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </td>

                        {/* Reset Password */}
                        {editingId && (
                          <td>
                            {isEditing && (
                              <button
                                className={styles.resetPwBtn}
                                onClick={() => handleRequestResetPassword(employee.id)}
                                disabled={isSaving}
                                title="Reset password"
                              >
                                <KeyRound size={16} />
                              </button>
                            )}
                          </td>
                        )}

                        {/* Delete */}
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleRequestDelete(employee.id)}
                            disabled={
                              isEditing ||
                              isSaving ||
                              employee.role === "Admin" ||
                              employee.role === "Owner"
                            }
                            title={
                              employee.role === "Admin" ||
                                employee.role === "Owner"
                                ? "Admins cannot be deleted"
                                : "Delete employee"
                            }
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
          </>
        )}

        {activeTab === "pending" && (
          <div>
            {loading ? (
              <p>Loading pending users...</p>
            ) : pendingUsers.length === 0 ? (
              <p>No pending users</p>
            ) : (
              /* Pending table */
              <table className={`${styles.table} ${styles.pendingTable}`}>
                <thead>
                  <tr>
                    <SortableTh
                      field="index"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      #
                    </SortableTh>
                    <SortableTh
                      field="firstName"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      First Name
                    </SortableTh>
                    <SortableTh
                      field="lastName"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      Last Name
                    </SortableTh>
                    <SortableTh
                      field="email"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      Email
                    </SortableTh>
                    <SortableTh
                      field="role"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      Role
                    </SortableTh>
                    <SortableTh
                      field="createdAt"
                      activeField={pendingSortField}
                      dir={pendingSortDir}
                      onSort={handlePendingSort}
                    >
                      Date Registered
                    </SortableTh>
                    <th>Status</th>
                    <th>Approve</th>
                    <th>Reject</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPending.map((user) => (
                    <tr key={user.id}>
                      <td>{pendingOrder.get(user.id)}</td>
                      <td>{user.firstName}</td>
                      <td>{user.lastName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={styles.roleBadge}>{user.role}</span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span>{user.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className={styles.approveBtn}
                        >
                          {actionLoading === user.id ? "..." : "Approve"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={actionLoading === user.id}
                          className={styles.rejectBtn}
                        >
                          {actionLoading === user.id ? "..." : "Reject"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "activeEmployees" && (
          <div>
            <div className={styles.activeTimersHeader}>
              <button
                className={styles.refreshBtn}
                onClick={() => fetchActiveTimers(true)}
                disabled={timersLoading || isRefreshing}
                title="Refresh active timers"
              >
                <RefreshCw
                  size={14}
                  className={`${styles.refreshBtnIcon} ${isRefreshing ? styles.spinning : ""}`}
                />
                Refresh
              </button>
              {lastRefreshed && (
                <span className={styles.lastRefreshed}>
                  Last refreshed: {toNZTString(lastRefreshed)} NZT
                </span>
              )}
            </div>

            {timersLoading ? (
              <p>Loading active timers...</p>
            ) : activeTimers.length === 0 ? (
              <p className={styles.noTimers}>No active timers running.</p>
            ) : (
              <table className={`${styles.table} ${styles.activeTimersTable}`}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Customer</th>
                    <th>Task</th>
                    <th>Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTimers.map((entry, idx) => {
                    const user = (entry as any).user as
                      | { firstName: string; lastName: string }
                      | undefined;
                    const name = user
                      ? `${user.firstName} ${user.lastName}`
                      : "—";

                    return (
                      <tr key={entry.id}>
                        <td>{idx + 1}.</td>
                        <td>{name}</td>
                        <td>{entry.customer?.name ?? "—"}</td>
                        <td>{entry.task?.name ?? "—"}</td>
                        <td>
                          <span className={styles.activeIndicator} />
                          <ElapsedCell startTime={entry.startTime} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
              You're about to update this employee's details.
            </p>
            <p className={styles.modalSubtitle1}>Are you sure?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelModal}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmModal}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIconWrap}>
              <AlertTriangle size={22} className={styles.modalIcon} />
            </div>
            <p className={styles.modalTitle}>Delete employee?</p>
            <p className={styles.modalSubtitle}>
              This action is permanent and cannot be undone.
            </p>
            <p className={styles.modalSubtitle1}>Are you sure?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelDelete}
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

      {showResetPwModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIconWrap}>
              <KeyRound size={22} className={styles.modalIcon} />
            </div>
            <p className={styles.modalTitle}>Reset Password</p>
            <p className={styles.modalSubtitle}>
              Enter a new password for this employee.
            </p>
            <input
              type="password"
              className={styles.resetPwInput}
              placeholder="New password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              autoFocus
            />
            {resetPwError && <p className={styles.errorMsg}>{resetPwError}</p>}
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={handleCancelResetPassword}
                disabled={resetPwLoading}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmResetPassword}
                disabled={resetPwLoading}
              >
                {resetPwLoading ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Time Calendar Panel */}
      {viewingEmployee && (
        <EmployeeTimeCalendar
          employee={viewingEmployee}
          onClose={() => setViewingEmployee(null)}
        />
      )}
    </div>
  );
}

export default Employees;
