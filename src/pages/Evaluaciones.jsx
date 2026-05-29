import { useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { calculateSubgerenteKpi, formatPercentage, getKpiResult } from "../services/kpiService";
import { canEvaluateSubgerente, getPermissionMessage } from "../services/permissionsService";

const scoreFields = [
  { name: "puntualidad", label: "Puntualidad" },
  { name: "asistencia", label: "Asistencia" },
  { name: "productividad", label: "Productividad" },
  { name: "calidad", label: "Calidad del trabajo" },
  { name: "procesos", label: "Cumplimiento de procesos" },
  { name: "servicio", label: "Atención / servicio" },
  { name: "incidencias", label: "Control de incidencias" },
];

const subgerenteScoreFields = [
  { name: "cumplimientoOperativo", label: "Cumplimiento operativo" },
  { name: "seguimientoEncargados", label: "Seguimiento a encargados" },
  { name: "controlIncidencias", label: "Control de incidencias" },
  { name: "cumplimientoMetas", label: "Cumplimiento de metas" },
  { name: "liderazgo", label: "Liderazgo" },
  { name: "comunicacion", label: "Comunicación" },
];

function numberPayload(form, fields) {
  return fields.reduce((payload, field) => ({ ...payload, [field.name]: Number(form[field.name] || 0) }), {});
}

function validate(form, fields) {
  const missing = fields.find((field) => {
    const value = form[field.name];
    return field.required && (value === "" || value === undefined || value === null || (Array.isArray(value) && !value.length));
  });

  return missing ? `${missing.label} es obligatorio.` : "";
}

export default function Evaluaciones({
  evaluaciones,
  evaluacionesSubgerente,
  colaboradores,
  encargados,
  areas,
  subgerentes,
  activeUser,
  canCreate,
  allowCreateSubgerente = false,
  onCreateColaborador,
  onCreateSubgerente,
}) {
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [collaboratorForm, setCollaboratorForm] = useState({
    fecha: "",
    colaboradorId: "",
    area: "",
    encargado: "",
    puntualidad: 80,
    asistencia: 80,
    productividad: 80,
    calidad: 80,
    procesos: 80,
    servicio: 80,
    incidencias: 80,
    comentario: "",
  });
  const [subgerenteForm, setSubgerenteForm] = useState({
    fecha: "",
    subgerenteId: "",
    areas: [],
    cumplimientoOperativo: 80,
    seguimientoEncargados: 80,
    controlIncidencias: 80,
    cumplimientoMetas: 80,
    liderazgo: 80,
    comunicacion: 80,
    comentario: "",
  });

  const collaboratorFields = [
    { name: "fecha", label: "Fecha", type: "date", required: true },
    {
      name: "colaboradorId",
      label: "Colaborador",
      type: "select",
      required: true,
      options: colaboradores.map((item) => ({ value: item.id, label: item.nombre })),
    },
    { name: "area", label: "Área", type: "select", required: true, options: areas.map((area) => area.nombre) },
    { name: "encargado", label: "Encargado", type: "select", required: true, options: encargados.map((item) => item.nombre) },
    ...scoreFields.map((field) => ({ ...field, type: "number", min: 0, max: 100, required: true })),
    { name: "comentario", label: "Comentario del supervisor", type: "textarea", required: true },
  ];

  const subgerenteFields = [
    { name: "fecha", label: "Fecha", type: "date", required: true },
    {
      name: "subgerenteId",
      label: "Subgerente evaluado",
      type: "select",
      required: true,
      options: subgerentes.map((item) => ({ value: item.id, label: item.nombre })),
    },
    { name: "areas", label: "Áreas bajo responsabilidad", type: "multiselect", required: true, options: areas.map((area) => area.nombre) },
    ...subgerenteScoreFields.map((field) => ({ ...field, type: "number", min: 0, max: 100, required: true })),
    { name: "comentario", label: "Comentario del gerente", type: "textarea", required: true },
  ];

  function updateCollaboratorForm(name, value) {
    const selected = name === "colaboradorId" ? colaboradores.find((item) => item.id === value) : null;
    setCollaboratorForm((current) => ({
      ...current,
      [name]: value,
      ...(selected ? { area: selected.area, encargado: selected.encargado } : {}),
    }));
    setError("");
  }

  function updateSubgerenteForm(name, value) {
    const selected = name === "subgerenteId" ? subgerentes.find((item) => item.id === value) : null;
    setSubgerenteForm((current) => ({
      ...current,
      [name]: value,
      ...(selected ? { areas: selected.areas || [] } : {}),
    }));
    setError("");
  }

  function saveCollaboratorEvaluation(event) {
    event.preventDefault();
    const validationError = validate(collaboratorForm, collaboratorFields);
    if (validationError) {
      setError(validationError);
      return;
    }

    const collaborator = colaboradores.find((item) => item.id === collaboratorForm.colaboradorId);
    onCreateColaborador({
      ...collaboratorForm,
      ...numberPayload(collaboratorForm, scoreFields),
      colaborador: collaborator?.nombre || "",
    });
    setModal("");
  }

  function saveSubgerenteEvaluation(event) {
    event.preventDefault();
    const validationError = validate(subgerenteForm, subgerenteFields);
    if (validationError) {
      setError(validationError);
      return;
    }

    const subgerente = subgerentes.find((item) => item.id === subgerenteForm.subgerenteId);
    const payload = {
      ...subgerenteForm,
      ...numberPayload(subgerenteForm, subgerenteScoreFields),
      subgerente: subgerente?.nombre || "",
    };
    const kpi = calculateSubgerenteKpi(payload);

    onCreateSubgerente({
      ...payload,
      kpi,
      resultado: getKpiResult(kpi),
    });
    setModal("");
  }

  if (!canCreate && !evaluaciones.length && !evaluacionesSubgerente.length) {
    return (
      <section className="page-shell">
        <div className="permission-card">{getPermissionMessage()}</div>
      </section>
    );
  }

  const canEvaluateManagers = allowCreateSubgerente && canEvaluateSubgerente(activeUser);

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Evaluaciones</h1>
          <p>Medición por colaborador y evaluación gerencial de subgerentes.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={() => setModal("colaborador")}>
              <Plus size={16} />
              Evaluar colaborador
            </button>
          ) : null}
          {canEvaluateManagers ? (
            <button className="button button--secondary" type="button" onClick={() => setModal("subgerente")}>
              <Plus size={16} />
              Evaluar subgerente
            </button>
          ) : null}
        </div>
      </header>

      <div className="module-stack">
        <section className="content-panel">
          <div className="panel-heading">
            <h2>Evaluaciones de colaboradores</h2>
            <span>Fórmula ponderada oficial del KPI individual.</span>
          </div>
          <DataTable
            rows={evaluaciones}
            columns={[
              { key: "fecha", label: "Fecha" },
              { key: "colaborador", label: "Colaborador" },
              { key: "area", label: "Área" },
              { key: "encargado", label: "Encargado" },
              { key: "kpi", label: "KPI", render: (row) => formatPercentage(row.kpi) },
              { key: "resultado", label: "Resultado" },
              { key: "comentario", label: "Comentario" },
            ]}
          />
        </section>

        {canEvaluateManagers || evaluacionesSubgerente.length ? (
          <section className="content-panel">
            <div className="panel-heading">
              <h2>Evaluaciones de subgerentes</h2>
              <span>Solo el usuario Gerente puede crear estas mediciones.</span>
            </div>
            <DataTable
              rows={evaluacionesSubgerente}
              columns={[
                { key: "fecha", label: "Fecha" },
                { key: "subgerente", label: "Subgerente" },
                { key: "areas", label: "Áreas" },
                { key: "cumplimientoOperativo", label: "Operativo" },
                { key: "seguimientoEncargados", label: "Seguimiento" },
                { key: "controlIncidencias", label: "Incidencias" },
                { key: "cumplimientoMetas", label: "Metas" },
                { key: "kpi", label: "KPI final", render: (row) => formatPercentage(row.kpi) },
                { key: "comentario", label: "Comentario" },
              ]}
            />
          </section>
        ) : null}
      </div>

      {modal === "colaborador" ? (
        <Modal title="Evaluación de colaborador" onClose={() => setModal("")}>
          <form className="entity-form" onSubmit={saveCollaboratorEvaluation}>
            <div className="form-grid">
              {collaboratorFields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={collaboratorForm[field.name]}
                  onChange={updateCollaboratorForm}
                />
              ))}
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setModal("")}>Cancelar</button>
              <button className="button button--primary" type="submit">Guardar</button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {modal === "subgerente" ? (
        <Modal title="Evaluación de subgerente" onClose={() => setModal("")}>
          <form className="entity-form" onSubmit={saveSubgerenteEvaluation}>
            <div className="form-grid">
              {subgerenteFields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={subgerenteForm[field.name]}
                  onChange={updateSubgerenteForm}
                />
              ))}
            </div>
            <p className="form-hint">
              KPI final calculado: {formatPercentage(calculateSubgerenteKpi(subgerenteForm))}
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setModal("")}>Cancelar</button>
              <button className="button button--primary" type="submit">Guardar</button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
