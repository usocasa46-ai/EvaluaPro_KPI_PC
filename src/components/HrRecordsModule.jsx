import { useState } from "react";
import { Edit3, Eye, Printer, Plus, Save } from "lucide-react";
import DataTable from "./DataTable";
import FormField from "./FormField";
import Modal from "./Modal";
import { calculateRequestedDays, resolveCollaboratorHrData, today } from "../services/hrRecordsService";

function makeInitialForm(kind) {
  const base = {
    colaboradorId: "",
    colaboradorNombre: "",
    areaId: "",
    areaNombre: "",
    encargadoId: "",
    encargadoNombre: "",
    fechaSolicitud: today(),
    motivo: "",
    estado: "Borrador",
  };

  if (kind === "vacaciones") {
    return { ...base, fechaInicio: "", fechaFin: "", diasSolicitados: 0 };
  }

  if (kind === "permisos") {
    return { ...base, fechaPermiso: today(), horaInicio: "", horaFin: "", tipoPermiso: "" };
  }

  return {
    ...base,
    fechaAmonestacion: today(),
    tipoAmonestacion: "",
    descripcion: "",
    accionCorrectiva: "",
    estado: "Borrador",
  };
}

function readonlyField(name, label) {
  return { name, label, readOnly: true };
}

export default function HrRecordsModule({
  kind,
  title,
  subtitle,
  createLabel,
  emptyText,
  records,
  colaboradores,
  areas,
  encargados,
  canCreate,
  canEditRecord,
  onSave,
  statusOptions,
  extraFields,
  dateColumn,
  typeColumn,
}) {
  const [modalMode, setModalMode] = useState("closed");
  const [form, setForm] = useState(makeInitialForm(kind));
  const [error, setError] = useState("");

  const readOnly = modalMode === "view";
  const collaboratorOptions = colaboradores.map((colaborador) => ({
    value: colaborador.id,
    label: `${colaborador.nombre} · ${colaborador.areaNombre || colaborador.area || "Sin área"}`,
  }));

  function fillCollaboratorData(next, colaboradorId) {
    const colaborador = colaboradores.find((item) => item.id === colaboradorId);
    if (!colaborador) return { ...next, colaboradorId };
    return { ...next, ...resolveCollaboratorHrData(colaborador, areas, encargados) };
  }

  function openCreate() {
    setForm(makeInitialForm(kind));
    setError("");
    setModalMode("edit");
  }

  function openView(record) {
    setForm({ ...makeInitialForm(kind), ...record });
    setError("");
    setModalMode("view");
  }

  function openEdit(record) {
    if (!canEditRecord(record)) {
      setError("No tienes permiso para editar este registro.");
      return;
    }
    setForm({ ...makeInitialForm(kind), ...record });
    setError("");
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setError("");
  }

  function updateForm(name, value) {
    setForm((current) => {
      let next = { ...current, [name]: value };
      if (name === "colaboradorId") next = fillCollaboratorData(next, value);
      if (kind === "vacaciones" && (name === "fechaInicio" || name === "fechaFin")) {
        next.diasSolicitados = calculateRequestedDays(next.fechaInicio, next.fechaFin);
      }
      return next;
    });
    setError("");
  }

  function saveRecord(event) {
    event.preventDefault();
    if (!form.colaboradorId) {
      setError("Selecciona un colaborador.");
      return;
    }
    if (!form.motivo) {
      setError("El motivo es obligatorio.");
      return;
    }

    onSave(form);
    closeModal();
  }

  function printPrepared() {
    window.alert("La impresión quedará disponible cuando se cargue el formulario oficial.");
  }

  const fields = [
    {
      name: "colaboradorId",
      label: "Colaborador",
      type: "select",
      required: true,
      disabled: readOnly,
      options: collaboratorOptions,
    },
    readonlyField("areaNombre", "Área"),
    readonlyField("encargadoNombre", "Encargado"),
    ...extraFields.map((field) => ({ ...field, disabled: readOnly, readOnly: readOnly || field.readOnly })),
    { name: "motivo", label: "Motivo", type: "textarea", required: true, readOnly },
    { name: "estado", label: "Estado", type: "select", required: true, disabled: readOnly, options: statusOptions },
  ];

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              {createLabel}
            </button>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <DataTable
          rows={records}
          emptyText={emptyText}
          columns={[
            { key: "colaboradorNombre", label: "Colaborador" },
            { key: "areaNombre", label: "Área" },
            { key: "encargadoNombre", label: "Encargado" },
            dateColumn,
            typeColumn,
            { key: "estado", label: "Estado" },
            { key: "creadoPorNombre", label: "Creado por" },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" type="button" onClick={() => openView(row)}>
                    <Eye size={13} />
                    Ver
                  </button>
                  {canEditRecord(row) ? (
                    <button className="text-button" type="button" onClick={() => openEdit(row)}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                  ) : (
                    <span className="text-button text-button--locked">Bloqueado</span>
                  )}
                  <button className="text-button" type="button" onClick={printPrepared}>
                    <Printer size={13} />
                    Imprimir
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {modalMode !== "closed" ? (
        <Modal title={readOnly ? `Ver ${title}` : createLabel} onClose={closeModal}>
          <form className="entity-form" onSubmit={saveRecord}>
            <div className="form-grid">
              {fields.map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateForm} />
              ))}
            </div>
            {!colaboradores.length ? (
              <p className="template-warning">No hay colaboradores registrados en tu alcance actual.</p>
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="button button--secondary" type="button" onClick={printPrepared}>
                <Printer size={16} />
                Imprimir
              </button>
              {!readOnly ? (
                <button className="button button--primary" type="submit">
                  <Save size={16} />
                  Guardar
                </button>
              ) : null}
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
