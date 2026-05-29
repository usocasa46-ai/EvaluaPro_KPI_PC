import { useState } from "react";
import { Plus, Save } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { canEvaluateManager, sameArea } from "../services/permissionsService";
import { clampPercentage, formatPercentage, getKpiResult, roundKpi } from "../services/kpiService";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function average(values) {
  const clean = values.map((value) => clampPercentage(value || 0)).filter((value) => value > 0);
  if (!clean.length) return 0;
  return roundKpi(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function getAreaKpi(area, areaSummary) {
  return areaSummary.find((item) => sameArea(item.area, area))?.kpi || 0;
}

function getMonthlyAreaKpi(area, monthlyKpi) {
  const rows = monthlyKpi.filter((item) => sameArea(item.area, area));
  return average(rows.map((item) => item.kpiMensual));
}

export default function EvaluacionEncargados({
  evaluaciones,
  encargados,
  areaSummary,
  monthlyKpi,
  activeUser,
  onCreateEvaluation,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: today(),
    encargadoId: "",
    area: "",
    seguimiento: 80,
    liderazgo: 80,
    procesos: 80,
    comentario: "",
  });
  const [error, setError] = useState("");
  const canCreate = canEvaluateManager(activeUser);

  function openModal() {
    const first = encargados[0];
    setForm({
      fecha: today(),
      encargadoId: first?.id || "",
      area: first?.area || "",
      seguimiento: 80,
      liderazgo: 80,
      procesos: 80,
      comentario: "",
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm(name, value) {
    if (name === "encargadoId") {
      const selected = encargados.find((encargado) => encargado.id === value);
      setForm((current) => ({ ...current, encargadoId: value, area: selected?.area || "" }));
      setError("");
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function saveEvaluation(event) {
    event.preventDefault();
    const encargado = encargados.find((item) => item.id === form.encargadoId);

    if (!encargado) {
      setError("Selecciona un encargado.");
      return;
    }

    const kpiArea = getAreaKpi(encargado.area, areaSummary);
    const kpiMensual = getMonthlyAreaKpi(encargado.area, monthlyKpi);
    const kpiManual = average([form.seguimiento, form.liderazgo, form.procesos]);
    const kpi = average([kpiArea, kpiMensual, kpiManual]);

    onCreateEvaluation({
      fecha: form.fecha,
      encargadoId: encargado.id,
      encargado: encargado.nombre,
      area: encargado.area,
      evaluadorId: activeUser?.id || "",
      evaluadorNombre: activeUser?.nombre || "",
      evaluadorRol: activeUser?.rol || "",
      kpiArea,
      kpiMensual,
      seguimiento: Number(form.seguimiento || 0),
      liderazgo: Number(form.liderazgo || 0),
      procesos: Number(form.procesos || 0),
      kpi,
      resultado: getKpiResult(kpi),
      comentario: form.comentario,
      estado: "Completada",
    });
    setModalOpen(false);
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Evaluación Encargados</h1>
          <p>Evaluaciones que realiza el subgerente a encargados bajo su supervisión.</p>
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
            { key: "encargado", label: "Encargado" },
            { key: "area", label: "Área" },
            { key: "evaluadorNombre", label: "Evaluador" },
            { key: "kpiArea", label: "KPI Área", render: (row) => formatPercentage(row.kpiArea || 0) },
            { key: "kpiMensual", label: "KPI Mensual", render: (row) => formatPercentage(row.kpiMensual || 0) },
            { key: "kpi", label: "KPI Final", render: (row) => formatPercentage(row.kpi || 0) },
            { key: "resultado", label: "Resultado" },
          ]}
        />
      </section>

      {modalOpen ? (
        <Modal title="Evaluación de encargado" onClose={() => setModalOpen(false)}>
          <form className="entity-form" onSubmit={saveEvaluation}>
            <div className="form-grid">
              <FormField
                field={{ name: "fecha", label: "Fecha", type: "date", required: true }}
                value={form.fecha}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "encargadoId",
                  label: "Encargado",
                  type: "select",
                  required: true,
                  options: encargados.map((encargado) => ({ value: encargado.id, label: `${encargado.nombre} - ${encargado.area}` })),
                }}
                value={form.encargadoId}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "seguimiento", label: "Seguimiento operativo", type: "number", min: 0, max: 100 }}
                value={form.seguimiento}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "liderazgo", label: "Liderazgo", type: "number", min: 0, max: 100 }}
                value={form.liderazgo}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "procesos", label: "Cumplimiento de procesos", type: "number", min: 0, max: 100 }}
                value={form.procesos}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "comentario", label: "Comentario", type: "textarea" }}
                value={form.comentario}
                onChange={updateForm}
              />
            </div>
            <p className="form-hint">
              Base automática: KPI área {formatPercentage(getAreaKpi(form.area, areaSummary))} · KPI mensual {formatPercentage(getMonthlyAreaKpi(form.area, monthlyKpi))}
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
