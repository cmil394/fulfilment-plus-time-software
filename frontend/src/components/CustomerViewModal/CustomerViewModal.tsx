import { useEffect, useState, useCallback } from "react";
import { extractApiError } from "../../utils/apiError";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  CalendarDays,
  ClipboardList,
  Plus,
  ArrowLeft,
  Loader2,
  LayoutTemplate,
  PencilLine,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import type { Customer } from "./../../services/admin-customer.service";
import { taskService, type Task } from "./../../services/task.service";
import {
  taskTemplateService,
  type TaskTemplate,
} from "./../../services/task-template.service";
import { reportService } from "./../../services/report.service";
import styles from "./CustomerViewModal.module.css";

// Types
interface Props {
  customer: Customer;
  onClose: () => void;
}

type View = "details" | "pick-template" | "custom-form";

// Component
function CustomerViewModal({ customer, onClose }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [view, setView] = useState<View>("details");

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Report state
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
  const [reportStart, setReportStart] = useState(firstOfMonth);
  const [reportEnd, setReportEnd] = useState(today);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleDownloadReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const { blob, filename } = await reportService.downloadCustomerReport(
        customer.id,
        reportStart,
        reportEnd,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  // Delete confirmation state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await taskService.getByCustomer(customer.id);
      setTasks(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not load tasks.";
      setTasksError(msg);
    } finally {
      setTasksLoading(false);
    }
  }, [customer.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openTemplatePicker = async () => {
    setView("pick-template");
    if (templates.length > 0) return;
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const data = await taskTemplateService.getAll();
      setTemplates(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not load task presets.";
      setTemplatesError(msg);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleAssignTemplate = async (template: TaskTemplate) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await taskTemplateService.assign(template.id, {
        customerId: customer.id,
      });
      await fetchTasks();
      setView("details");
    } catch (err: unknown) {
      console.error("Failed to assign template:", err);
      setSubmitError(
        extractApiError(err, "Could not assign preset. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await taskService.create({
        name: customName.trim(),
        description: customDescription.trim() || undefined,
        customerId: customer.id,
      });
      await fetchTasks();
      setCustomName("");
      setCustomDescription("");
      setView("details");
    } catch (err: unknown) {
      setSubmitError(
        extractApiError(err, "Could not create task. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await taskService.delete(taskToDelete.id);
      await fetchTasks();
      setTaskToDelete(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not delete task. Please try again.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const goBack = () => {
    setSubmitError(null);
    setView(view === "custom-form" ? "pick-template" : "details");
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {view !== "details" && (
              <button className={styles.backBtn} onClick={goBack} title="Back">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className={styles.avatarCircle}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className={styles.customerName}>{customer.name}</h2>
              <span className={styles.customerSince}>
                {view === "details"
                  ? `Customer since ${new Date(customer.createdAt).toLocaleDateString()}`
                  : view === "pick-template"
                    ? "Add a task"
                    : "Custom task"}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Details view */}
        {view === "details" && (
          <>
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
                  value={new Date(customer.createdAt).toLocaleDateString(
                    "en-NZ",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                />
              </div>
            </div>

            <div className={styles.tasksSection}>
              <h3 className={styles.sectionTitle}>
                <ClipboardList size={15} />
                Tasks
                {!tasksLoading && (
                  <span className={styles.taskCount}>{tasks.length}</span>
                )}
                <button
                  className={styles.addTaskBtn}
                  onClick={openTemplatePicker}
                  title="Add task"
                >
                  <Plus size={14} />
                  Add task
                </button>
              </h3>

              {tasksLoading ? (
                <div className={styles.centeredLoader}>
                  <Loader2 size={20} className={styles.spin} />
                  <span>Loading tasks…</span>
                </div>
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
                        <th>Delete</th>
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
                          <td className={styles.deleteCell}>
                            <button
                              className={styles.deleteTaskBtn}
                              onClick={() => {
                                setDeleteError(null);
                                setTaskToDelete(task);
                              }}
                              title="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Report Section */}
            <div className={styles.reportSection}>
              <h3 className={styles.sectionTitle}>
                <FileSpreadsheet size={15} />
                Export Report
              </h3>
              <div className={styles.reportControls}>
                <div className={styles.reportDateGroup}>
                  <label className={styles.reportLabel}>From</label>
                  <input
                    type="date"
                    className={styles.reportDateInput}
                    value={reportStart}
                    max={reportEnd}
                    onChange={(e) => setReportStart(e.target.value)}
                    disabled={reportLoading}
                  />
                </div>
                <div className={styles.reportDateGroup}>
                  <label className={styles.reportLabel}>To</label>
                  <input
                    type="date"
                    className={styles.reportDateInput}
                    value={reportEnd}
                    min={reportStart}
                    onChange={(e) => setReportEnd(e.target.value)}
                    disabled={reportLoading}
                  />
                </div>
                <button
                  className={styles.reportDownloadBtn}
                  onClick={handleDownloadReport}
                  disabled={reportLoading || !reportStart || !reportEnd}
                  title="Download Excel report"
                >
                  {reportLoading ? (
                    <Loader2 size={14} className={styles.spin} />
                  ) : (
                    <Download size={14} />
                  )}
                  {reportLoading ? "Generating…" : "Download .xlsx"}
                </button>
              </div>
              {reportError && <p className={styles.errorMsg}>{reportError}</p>}
            </div>
          </>
        )}

        {/* Template picker view */}
        {view === "pick-template" && (
          <div className={styles.addSection}>
            {templatesLoading ? (
              <div className={styles.centeredLoader}>
                <Loader2 size={20} className={styles.spin} />
                <span>Loading presets…</span>
              </div>
            ) : templatesError ? (
              <p className={styles.errorMsg}>{templatesError}</p>
            ) : (
              <>
                {templates.length > 0 && (
                  <>
                    <p className={styles.pickerLabel}>
                      <LayoutTemplate size={14} />
                      Task presets
                    </p>
                    <div className={styles.templateList}>
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          className={styles.templateCard}
                          onClick={() => handleAssignTemplate(t)}
                          disabled={submitting}
                        >
                          <span className={styles.templateName}>{t.name}</span>
                          {t.description && (
                            <span className={styles.templateDesc}>
                              {t.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className={styles.divider}>
                      <span>or</span>
                    </div>
                  </>
                )}
                <button
                  className={styles.customTaskBtn}
                  onClick={() => setView("custom-form")}
                  disabled={submitting}
                >
                  <PencilLine size={15} />
                  Create a custom task
                </button>
                {submitError && (
                  <p className={styles.errorMsg}>{submitError}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Custom task form view */}
        {view === "custom-form" && (
          <div className={styles.addSection}>
            <form onSubmit={handleCreateCustomTask} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="task-name">
                  Task name <span className={styles.required}>*</span>
                </label>
                <input
                  id="task-name"
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Picker"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="task-desc">
                  Description
                </label>
                <textarea
                  id="task-desc"
                  className={styles.textarea}
                  placeholder="Optional details…"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                />
              </div>
              {submitError && <p className={styles.errorMsg}>{submitError}</p>}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={goBack}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting || !customName.trim()}
                >
                  {submitting ? (
                    <Loader2 size={14} className={styles.spin} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {submitting ? "Adding…" : "Add task"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {taskToDelete && (
        <div
          className={styles.dialogOverlay}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>Delete task?</h3>
            <p className={styles.dialogBody}>
              <strong>{taskToDelete.name}</strong> will be permanently removed
              from this customer. All time entries logged against this task will
              also be deleted. This cannot be undone.
            </p>
            {deleteError && <p className={styles.errorMsg}>{deleteError}</p>}
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setTaskToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.deleteConfirmBtn}
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 size={14} className={styles.spin} />
                ) : (
                  <Trash2 size={14} />
                )}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
