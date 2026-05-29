import { useState } from "react";
import { Plus, Save } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { calculateSubgerenteKpi, formatPercentage, getKpiResult } from "../services/kpiService";
import { canEvaluateSubManager } from "../services/permissionsService";

const scoreFields = [
  { name: "cumplimientoOperativo", label: "Cumplimiento operativo" },
  { name: "seguimientoEncargados", label: "Seguimiento a encargados" },
  { name: "controlIncidencias", label: "Control de incidencias" },
  { name: "cumplimientoMetas", label: "Cumplimiento de metas" },
  { name: "liderazgo", label: "Liderazgo" },
  { name: "comunicacion", label: "Comunicación" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EvaluacionSubgerentes({
  evaluaciones,
  subgerentes,
  subgerenteSummary,
  activeUser,
  onCreateEvaluation,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: today(),
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
  const [error, setError] = useState("");
  const canCreate = canEvaluateSubManager(activeUser);

  function openModal() {
    const first = subgerentes[0];
    setForm({
      fecha: today(),
      subgerenteId: first?.id || "",
      areas: first?.areas || [],
      cumplimientoOperativo: 80,
      seguimientoEncargados: 80,
      controlIncidencias: 80,
      cumplimientoMetas: 80,
      liderazgo: 80,
      comunicacion: 80,
      comentario: "",
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm(name, value) {
    if (name === "subgerenteId") {
      const selected = subgerentes.find((subgerente) => subgerente.id === value);
      setForm((current) => ({ ...current, subgerenteId: value, areas: selected?.areas || [] }));
      setError("");
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function saveEvaluation(event) {
    event.preventDefault();
    const subgerente = subgerentes.find((item) => item.id === form.subgerenteId);
    if (!subgerente) {
      setError("Selecciona un subgerente.");
      return;
    }

    const payload = {
      ...form,
      subgerenteId: subgerente.id,
      subgerente: subgerente.nombre,
      areas: subgerente.areas || [],
      evaluadorId: activeUser?.id || "",
      evaluadorNombre: activeUser?.nombre || "",
      evaluadorRol: activeUser?.rol || "",
      ...scoreFields.reduce((values, field) => ({ ...values, [field.name]: Number(form[field.name] || 0) }), {}),
    };
    const kpi = calculateSubgerenteKpi(payload);

    onCreateEvaluation({
      ...payload,
      kpi,
      resultado: getKpiResult(kpi),
      estado: "Completada",
    });
    setModalOpen(false);
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Evaluación Subgerentes</h1>
          <p>Evaluaciones que realiza gerencia a subgerentes.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={openModal}>
              <Plus size={16} />
              Nueva evaluación
            </button>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <DataTable
          rows={evaluaciones}
          columns={[
            { key: "fecha", label: "Fecha" },
            { key: "subgerente", label: "Subgerente" },
            { key: "areas", label: "Áreas" },
            { key: "evaluadorNombre", label: "Evaluador" },
            { key: "cumplimientoOperativo", label: "Operativo" },
            { key: "seguimientoEncargados", label: "Seguimiento" },
            { key: "kpi", label: "KPI Final", render: (row) => formatPercentage(row.kpi || 0) },
            { key: "resultado", label: "Resultado" },
          ]}
        />
      </section>

      {modalOpen ? (
        <Modal title="Evaluación de subgerente" onClose={() => setModalOpen(false)}>
          <form className="entity-form" onSubmit={saveEvaluation}>
            <div className="form-grid">
              <FormField
                field={{ name: "fecha", label: "Fecha", type: "date", required: true }}
                value={form.fecha}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "subgerenteId",
                  label: "Subgerente",
                  type: "select",
                  required: true,
                  options: subgerentes.map((subgerente) => ({ value: subgerente.id, label: subgerente.nombre })),
                }}
                value={form.subgerenteId}
                onChange={updateForm}
              />
              {scoreFields.map((field) => (
                <FormField
                  key={field.name}
                  field={{ ...field, type: "number", min: 0, max: 100 }}
                  value={form[field.name]}
                  onChange={updateForm}
                />
              ))}
              <FormField
                field={{ name: "comentario", label: "Comentario", type: "textarea" }}
                value={form.comentario}
                onChange={updateForm}
              />
            </div>
            <p className="form-hint">
              Resultado operativo actual:{" "}
              {formatPercentage(subgerenteSummary.find((item) => item.id === form.subgerenteId)?.kpiOperativo || 0)}
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                <Save size={16} />
                Guardar
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
