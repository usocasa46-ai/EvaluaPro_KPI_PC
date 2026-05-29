import { useState } from "react";
import { ArrowLeft, Edit3, Eye, Plus, Printer, Save } from "lucide-react";
import DataTable from "../components/DataTable";
import PermitOfficialForm from "../components/PermitOfficialForm";
import { resolveCollaboratorHrData, today } from "../services/hrRecordsService";
import { canCreatePermit, canEditPermit } from "../services/permissionsService";

const EMPTY_PERIOD = {
  motivo: "",
  duracion: "",
  fecha: "",
  desde: "",
  hasta: "",
  totalDias: "",
};

function makeInitialForm(activeUser, configuracion = {}) {
  return {
    id: "",
    colaboradorId: "",
    colaboradorNombre: "",
    posicion: "",
    departamento: activeUser?.rol === "Encargado" ? activeUser.areaAsignada || "" : "",
    divisionNegocio: configuracion.divisionNegocio || configuracion.nombreEmpresa || configuracion.nombreSupermercado || "",
    areaId: "",
    areaNombre: activeUser?.rol === "Encargado" ? activeUser.areaAsignada || "" : "",
    encargadoId: "",
    encargadoNombre: "",
    tipoNovedad: [],
    licencia: {
      ...EMPTY_PERIOD,
      numero: "",
      medico: "",
      exequatur: "",
    },
    permisoCD: { ...EMPTY_PERIOD },
    permisoSD: { ...EMPTY_PERIOD },
    observaciones: "",
    firmaColaborador: "",
    supervisorInmediato: "",
    gerenteArea: "",
    gerenteGestionHumana: "",
    fechaSolicitud: today(),
    estado: "Borrador",
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function safeText(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return value === undefined || value === null || value === "" ? "-" : value;
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getPermitDate(record = {}) {
  return (
    record.licencia?.fecha ||
    record.permisoCD?.fecha ||
    record.permisoSD?.fecha ||
    record.fechaPermiso ||
    record.fechaSolicitud ||
    ""
  );
}

function getPermitTypes(record = {}) {
  return record.tipoNovedad || record.tipoPermiso || [];
}

function normalizeForForm(record, activeUser, configuracion) {
  const base = makeInitialForm(activeUser, configuracion);
  return {
    ...base,
    ...record,
    tipoNovedad: asArray(getPermitTypes(record)),
    posicion: record.posicion || record.cargo || "",
    departamento: record.departamento || record.areaNombre || record.area || "",
    divisionNegocio: record.divisionNegocio || base.divisionNegocio,
    licencia: { ...base.licencia, ...(record.licencia || {}) },
    permisoCD: { ...base.permisoCD, ...(record.permisoCD || {}) },
    permisoSD: { ...base.permisoSD, ...(record.permisoSD || {}) },
    supervisorInmediato: record.supervisorInmediato || record.encargadoNombre || "",
    estado: record.estado || "Borrador",
  };
}

function hasSelectedDate(form) {
  return Boolean(form.licencia?.fecha || form.permisoCD?.fecha || form.permisoSD?.fecha || form.fechaSolicitud);
}

export default function Permisos({
  records,
  colaboradores,
  areas,
  encargados,
  activeUser,
  configuracion = {},
  onSaveRecord,
}) {
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(() => makeInitialForm(activeUser, configuracion));
  const [error, setError] = useState("");

  const readOnly = mode === "view";
  const canCreate = canCreatePermit(activeUser);
  const canEditCurrent = form.id ? canEditPermit(activeUser, form) : canCreate;

  const collaboratorOptions = colaboradores.map((colaborador) => ({
    value: colaborador.id,
    label: `${colaborador.nombre} - ${colaborador.areaNombre || colaborador.area || "Sin área"}`,
  }));

  function openCreate() {
    if (!canCreate) {
      setError("No tienes permiso para crear permisos.");
      return;
    }
    setForm(makeInitialForm(activeUser, configuracion));
    setError("");
    setMode("edit");
  }

  function openView(record) {
    setForm(normalizeForForm(record, activeUser, configuracion));
    setError("");
    setMode("view");
  }

  function openEdit(record) {
    if (!canEditPermit(activeUser, record)) {
      setError("No tienes permiso para editar este permiso.");
      return;
    }
    setForm(normalizeForForm(record, activeUser, configuracion));
    setError("");
    setMode("edit");
  }

  function closeForm() {
    setMode("list");
    setError("");
  }

  function printRecord(record) {
    setForm(normalizeForForm(record, activeUser, configuracion));
    setError("");
    setMode("view");
    window.setTimeout(() => window.print(), 120);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function updateSection(section, name, value) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [name]: value,
      },
    }));
    setError("");
  }

  function toggleType(type) {
    setForm((current) => {
      const currentTypes = asArray(current.tipoNovedad);
      const exists = currentTypes.includes(type);
      return {
        ...current,
        tipoNovedad: exists ? currentTypes.filter((item) => item !== type) : [...currentTypes, type],
      };
    });
    setError("");
  }

  function fillCollaboratorData(colaboradorId) {
    const colaborador = colaboradores.find((item) => item.id === colaboradorId);
    setForm((current) => {
      if (!colaborador) return { ...current, colaboradorId };
      const data = resolveCollaboratorHrData(colaborador, areas, encargados);

      return {
        ...current,
        ...data,
        colaboradorId,
        posicion: colaborador.cargo || colaborador.puesto || current.posicion || "",
        departamento: data.areaNombre || colaborador.areaNombre || colaborador.area || current.departamento || "",
        supervisorInmediato: current.supervisorInmediato || data.encargadoNombre || "",
      };
    });
    setError("");
  }

  function validate(nextForm) {
    if (!nextForm.colaboradorId) return "Selecciona un colaborador.";
    if (!asArray(nextForm.tipoNovedad).length) return "Selecciona el tipo de novedad.";
    if (!hasSelectedDate(nextForm)) return "La fecha es obligatoria.";
    if (!nextForm.estado) return "Selecciona el estado.";
    return "";
  }

  function savePermit(status) {
    if (form.id && !canEditPermit(activeUser, form)) {
      setError("No tienes permiso para editar este permiso.");
      return;
    }

    const nextForm = { ...form, estado: status || form.estado || "Pendiente" };
    const validationError = validate(nextForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    const saved = onSaveRecord(nextForm);
    setForm(normalizeForForm(saved, activeUser, configuracion));
    setMode("view");
    setError("");
  }

  if (mode !== "list") {
    return (
      <section className="page-shell permit-official-module">
        <header className="module-header no-print">
          <div>
            <h1>Permisos / Formulario de Novedades</h1>
            <p>Formulario oficial editable para registro de novedades del colaborador.</p>
          </div>
          <div className="module-actions">
            <button className="button button--ghost" type="button" onClick={closeForm}>
              <ArrowLeft size={16} />
              Volver
            </button>
            {readOnly && canEditCurrent ? (
              <button className="button button--secondary" type="button" onClick={() => setMode("edit")}>
                <Edit3 size={16} />
                Editar
              </button>
            ) : null}
            <button className="button button--secondary" type="button" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </header>

        <section className="content-panel permit-form-toolbar no-print">
          <div className="form-grid form-grid--compact">
            <label className="form-field">
              <span>Colaborador</span>
              <select value={form.colaboradorId} disabled={readOnly} onChange={(event) => fillCollaboratorData(event.target.value)}>
                <option value="">Seleccionar...</option>
                {collaboratorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Estado</span>
              <select value={form.estado} disabled={readOnly} onChange={(event) => updateField("estado", event.target.value)}>
                {["Borrador", "Pendiente", "Aprobado", "Rechazado", "Cancelado"].map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!colaboradores.length ? (
            <p className="template-warning">No hay colaboradores registrados en tu alcance actual.</p>
          ) : null}
          {error ? <p className="form-error permit-inline-error">{error}</p> : null}
        </section>

        <PermitOfficialForm
          form={form}
          readOnly={readOnly}
          configuracion={configuracion}
          onFieldChange={updateField}
          onSectionChange={updateSection}
          onTypeToggle={toggleType}
        />

        {!readOnly ? (
          <footer className="permit-actions no-print">
            {error ? <p className="form-error permit-inline-error">{error}</p> : null}
            <button className="button button--ghost" type="button" onClick={closeForm}>
              Volver
            </button>
            <button className="button button--secondary" type="button" onClick={() => savePermit("Borrador")}>
              <Save size={16} />
              Guardar como borrador
            </button>
            <button className="button button--primary" type="button" onClick={() => savePermit("Pendiente")}>
              <Save size={16} />
              Guardar
            </button>
            <button className="button button--secondary" type="button" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimir
            </button>
          </footer>
        ) : null}
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Permisos / Formulario de Novedades</h1>
          <p>Solicitudes y novedades registradas para colaboradores según el alcance del usuario activo.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              Nuevo permiso
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="form-error permit-list-error">{error}</p> : null}

      <section className="content-panel">
        <DataTable
          rows={records}
          emptyText="No hay permisos registrados."
          columns={[
            { key: "fecha", label: "Fecha", render: (row) => formatDate(getPermitDate(row)) },
            { key: "colaboradorNombre", label: "Colaborador", render: (row) => safeText(row.colaboradorNombre) },
            { key: "areaNombre", label: "Área", render: (row) => safeText(row.areaNombre || row.area) },
            { key: "tipoNovedad", label: "Tipo de novedad", render: (row) => safeText(getPermitTypes(row)) },
            { key: "estado", label: "Estado", render: (row) => safeText(row.estado) },
            { key: "creadoPorNombre", label: "Creado por", render: (row) => safeText(row.creadoPorNombre) },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" type="button" onClick={() => openView(row)}>
                    <Eye size={13} />
                    Ver
                  </button>
                  {canEditPermit(activeUser, row) ? (
                    <button className="text-button" type="button" onClick={() => openEdit(row)}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                  ) : (
                    <span className="text-button text-button--locked">Bloqueado</span>
                  )}
                  <button className="text-button" type="button" onClick={() => printRecord(row)}>
                    <Printer size={13} />
                    Imprimir
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    </section>
  );
}
