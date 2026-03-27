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

// Modal
interface TemplateModalProps {
  mode: "create" | "edit";
  initial: FormState;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}

function TemplateModal({
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: TemplateModalProps) {
  const [form, setForm] = useState<FormState>(initial);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          {mode === "create" ? "New Task Template" : "Edit Task Template"}
        </h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            className={styles.input}
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Onboarding checklist"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className={styles.textarea}
            value={form.description}
            onChange={handleChange}
            placeholder="Optional description…"
          />
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.btnGhost}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => onSubmit(form)}
            disabled={saving || !form.name.trim()}
          >
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create Template"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Confirm delete modal
interface ConfirmDeleteModalProps {
  template: TaskTemplate;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteModal({
  template,
  saving,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Delete Template</h2>
        <p className={styles.confirmText}>
          Are you sure you want to delete <strong>{template.name}</strong>? This
          action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button
            className={styles.btnGhost}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={styles.btnDanger}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
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
    setSelected(null);
    setModalMode("create");
  };

  const openEdit = (t: TaskTemplate) => {
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
  };

  const handleCreate = async (form: FormState) => {
    setSaving(true);
    try {
      const payload: CreateTaskTemplatePayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      const created = await taskTemplateService.create(payload);
      setTemplates((prev) => [...prev, created]);
      closeModal();
    } catch {
      setError("Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: FormState) => {
    if (!selected) return;
    setSaving(true);
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
    } catch {
      setError("Failed to update template.");
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
    } catch {
      setError("Failed to delete template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <h1 className={titles.pageTitle1}>Manage Tasks</h1>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.btnPrimary} onClick={openCreate}>
            + New Template
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <SkeletonList />
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <p>No task templates yet. Create your first one.</p>
          </div>
        ) : (
          <div className={styles.templateList}>
            {templates.map((t) => (
              <div key={t.id} className={styles.templateCard}>
                <div className={styles.templateInfo}>
                  <p className={styles.templateName}>{t.name}</p>
                  {t.description && (
                    <p className={styles.templateDesc}>{t.description}</p>
                  )}
                </div>
                <div className={styles.templateActions}>
                  <button
                    className={styles.btnGhost}
                    onClick={() => openEdit(t)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => openDelete(t)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <TemplateModal
          mode={modalMode}
          initial={
            modalMode === "edit" && selected
              ? { name: selected.name, description: selected.description ?? "" }
              : EMPTY_FORM
          }
          saving={saving}
          onClose={closeModal}
          onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
        />
      )}

      {/* Delete confirm modal */}
      {modalMode === "delete" && selected && (
        <ConfirmDeleteModal
          template={selected}
          saving={saving}
          onClose={closeModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default AdminTasks;
