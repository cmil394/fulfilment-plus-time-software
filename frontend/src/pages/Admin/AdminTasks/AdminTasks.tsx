import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./AdminTasks.module.css";
import titles from "./../../../components/CSS Components/titles.module.css";
import { taskTemplateService } from "./../../../services/task-template.service";
import type {
  TaskTemplate,
  CreateTaskTemplatePayload,
  UpdateTaskTemplatePayload,
} from "../../../services/task-template.service";
import {
  FilePlus,
  Pencil,
  AlertTriangle,
  Trash2,
  ClipboardList,
} from "lucide-react";

// Types
type ModalMode = "create" | "edit" | "delete" | null;

interface FormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", description: "" };

// Skeleton
function SkeletonList() {
  return (
    <div className={styles.skeleton}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonCard} />
      ))}
    </div>
  );
}

// Main page
function AdminTasks() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<TaskTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Fetch
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskTemplateService.getAll();
      setTemplates(data);
    } catch {
      setError("Failed to load task templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handlers
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setSelected(null);
    setModalMode("create");
  };

  const openEdit = (t: TaskTemplate) => {
    setForm({ name: t.name, description: t.description ?? "" });
    setError(null);
    setSelected(t);
    setModalMode("edit");
  };

  const openDelete = (t: TaskTemplate) => {
    setSelected(t);
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CreateTaskTemplatePayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      const created = await taskTemplateService.create(payload);
      setTemplates((prev) => [...prev, created]);
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create template.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateTaskTemplatePayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      const updated = await taskTemplateService.update(selected.id, payload);
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update template.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await taskTemplateService.delete(selected.id);
      setTemplates((prev) => prev.filter((t) => t.id !== selected.id));
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete template.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isCreateOrEdit = modalMode === "create" || modalMode === "edit";

  return (
    <div className={styles.page}>
      <Navbar />
      <h1 className={titles.pageTitle1}>Manage Tasks</h1>
      <div className={styles.container}>
        <div className={styles.tableWrapper}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.btnPrimary} onClick={openCreate}>
                <FilePlus size={15} />
                New Template
              </button>
              {!loading && (
                <p className={styles.tableCount}>
                  {templates.length}{" "}
                  {templates.length === 1 ? "template" : "templates"}
                </p>
              )}
            </div>
          </div>

          {error && !isCreateOrEdit && (
            <div className={styles.error}>{error}</div>
          )}

          {loading ? (
            <SkeletonList />
          ) : templates.length === 0 ? (
            <div className={styles.empty}>
              <ClipboardList
                size={36}
                strokeWidth={1.2}
                className={styles.emptyIcon}
              />
              <p className={styles.emptyText}>No task templates yet</p>
              <p className={styles.emptyHint}>
                Create your first template to get started
              </p>
            </div>
          ) : (
            <div className={styles.templateList}>
              {templates.map((t) => (
                <div key={t.id} className={styles.templateCard}>
                  <div className={styles.templateCardLeft}>
                    <div className={styles.templateIconWrap}>
                      <ClipboardList size={16} />
                    </div>
                    <div className={styles.templateInfo}>
                      <p className={styles.templateName}>{t.name}</p>
                      {t.description && (
                        <p className={styles.templateDesc}>{t.description}</p>
                      )}
                    </div>
                  </div>
                  <div className={styles.templateActions}>
                    <button
                      className={styles.btnGhost}
                      onClick={() => openEdit(t)}
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => openDelete(t)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isCreateOrEdit && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrap}>
              {modalMode === "create" ? (
                <FilePlus size={22} className={styles.modalIconCreate} />
              ) : (
                <Pencil size={22} className={styles.modalIconCreate} />
              )}
            </div>
            <p className={styles.modalTitle}>
              {modalMode === "create"
                ? "New Task Template"
                : "Edit Task Template"}
            </p>

            <div className={styles.createFormFields}>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  name="name"
                  className={styles.modalInput}
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Picking"
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel}>Description</label>
                <textarea
                  name="description"
                  className={styles.modalTextarea}
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Optional description…"
                  disabled={saving}
                />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={modalMode === "create" ? handleCreate : handleUpdate}
                disabled={saving || !form.name.trim()}
              >
                {saving
                  ? "Saving…"
                  : modalMode === "create"
                    ? "Create Template"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modalMode === "delete" && selected && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrapDelete}>
              <AlertTriangle size={22} className={styles.modalIconDelete} />
            </div>
            <p className={styles.modalTitle}>Delete Template</p>
            <p className={styles.modalSubtitle}>
              You're about to delete <strong>{selected.name}</strong>. This
              action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmDanger}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTasks;
