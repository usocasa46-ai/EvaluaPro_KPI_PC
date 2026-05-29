import { useState } from "react";
import { Edit3, Plus } from "lucide-react";
import DataTable from "./DataTable";
import FormField from "./FormField";
import Modal from "./Modal";
import { getPermissionMessage } from "../services/permissionsService";

function isEmpty(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function isFieldVisible(field, form) {
  if (typeof field.visible === "function") return field.visible(form);
  if (field.visible === undefined) return true;
  return Boolean(field.visible);
}

function isRequired(field, form) {
  if (typeof field.required === "function") return field.required(form);
  return Boolean(field.required);
}

export default function CrudModule({
  title,
  subtitle,
  columns,
  rows,
  fields,
  initialForm,
  createLabel = "Nuevo registro",
  canView = true,
  canCreate = true,
  canEdit = false,
  onCreate,
  onSave,
  onBeforeSave,
  onFormChange,
  renderFormHint,
  toolbar,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  if (!canView) {
    return (
      <section className="page-shell">
        <div className="permission-card">{getPermissionMessage()}</div>
      </section>
    );
  }

  const visibleFields = fields.filter((field) => isFieldVisible(field, form));
  const resolvedFields = visibleFields.map((field) => ({
    ...field,
    required: isRequired(field, form),
    options: typeof field.options === "function" ? field.options(form) : field.options,
  }));
  const tableColumns = canEdit
    ? [
        ...columns,
        {
          key: "acciones",
          label: "Acciones",
          render: (row) => (
            <button className="text-button" type="button" onClick={() => openEdit(row)}>
              <Edit3 size={13} />
              Editar
            </button>
          ),
        },
      ]
    : columns;

  function updateField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      return onFormChange ? onFormChange(name, value, next) : next;
    });
    setError("");
  }

  function openModal() {
    setForm(initialForm);
    setEditingId("");
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(row) {
    setForm({ ...initialForm, ...row });
    setEditingId(row.id || "");
    setError("");
    setIsModalOpen(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const missingField = visibleFields.find((field) => isRequired(field, form) && isEmpty(form[field.name]));
    if (missingField) {
      setError(`${missingField.label} es obligatorio.`);
      return;
    }

    const payload = onBeforeSave ? onBeforeSave(form) : form;
    const save = onSave || onCreate;
    save(payload);
    setIsModalOpen(false);
    setEditingId("");
    setForm(initialForm);
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="module-actions">
          {toolbar}
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={openModal}>
              <Plus size={16} />
              {createLabel}
            </button>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <DataTable columns={tableColumns} rows={rows} />
      </section>

      {isModalOpen ? (
        <Modal title={editingId ? `Editar ${title}` : createLabel} onClose={() => setIsModalOpen(false)}>
          <form className="entity-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              {resolvedFields.map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
              ))}
            </div>
            {renderFormHint ? renderFormHint(form) : null}
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                Guardar
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
