import { useState } from "react";
import { Plus, Save } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { buildEvaluationIndicators, calculateMonthlyKpi } from "../services/kpiMonthlyService";
import { canEvaluateCollaborator } from "../services/permissionsService";
import { calculateCompliance, formatPercentage, getKpiResult } from "../services/kpiService";
import { getAssignedKpisForCollaborator } from "../services/relationsService";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function templatesForCollaborator(templates, collaborator) {
  return getAssignedKpisForCollaborator(collaborator, templates);
}

export default function EvaluacionColaboradores({
  evaluaciones,
  colaboradores,
  templates,
  activeUser,
  onCreateEvaluation,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: today(),
    colaboradorId: "",
    comentario: "",
    indicadores: [],
  });
  const [error, setError] = useState("");

  const canCreate = canEvaluateCollaborator(activeUser);

  function openModal() {
    const firstCollaborator = colaboradores[0];
    setForm({
      fecha: today(),
      colaboradorId: firstCollaborator?.id || "",
      comentario: "",
      indicadores: firstCollaborator ? buildEvaluationIndicators(templatesForCollaborator(templates, firstCollaborator)) : [],
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm(name, value) {
    if (name === "colaboradorId") {
      const selected = colaboradores.find((colaborador) => colaborador.id === value);
      setForm((current) => ({
        ...current,
        colaboradorId: value,
        indicadores: selected ? buildEvaluationIndicators(templatesForCollaborator(templates, selected)) : [],
      }));
      setError("");
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function updateIndicator(index, name, value) {
    setForm((current) => {
      const indicadores = current.indicadores.map((indicator, indicatorIndex) => {
        if (indicatorIndex !== index) return indicator;
        const nextIndicator = {
          ...indicator,
          [name]: ["meta", "resultado", "peso"].includes(name) ? Number(value || 0) : value,
        };

        return {
          ...nextIndicator,
          cumplimiento: calculateCompliance({
            meta: nextIndicator.meta,
            resultado: nextIndicator.resultado,
            menorEsMejor: nextIndicator.menorEsMejor || nextIndicator.tipoIndicador === "Menor es mejor",
          }),
        };
      });

      return { ...current, indicadores };
    });
    setError("");
  }

  function saveEvaluation(event) {
    event.preventDefault();
    const collaborator = colaboradores.find((item) => item.id === form.colaboradorId);

    if (!collaborator) {
      setError("Selecciona un colaborador.");
      return;
    }
    if (!form.indicadores.length) {
      setError("No hay plantilla KPI configurada para este cargo en esta área.");
      return;
    }

    const kpi = calculateMonthlyKpi(form.indicadores);
    onCreateEvaluation({
      fecha: form.fecha,
      colaboradorId: collaborator.id,
      colaborador: collaborator.nombre,
      colaboradorNombre: collaborator.nombre,
      area: collaborator.area,
      encargado: activeUser?.nombre || collaborator.encargado,
      evaluadorId: activeUser?.id || "",
      evaluadorNombre: activeUser?.nombre || "",
      evaluadorRol: activeUser?.rol || "",
      indicadores: form.indicadores,
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
          <h1>Evaluación Colaboradores</h1>
          <p>Evaluaciones que realiza el encargado a colaboradores de su área.</p>
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
            { key: "colaborador", label: "Colaborador" },
            { key: "area", label: "Área" },
            { key: "evaluadorNombre", label: "Evaluador", render: (row) => row.evaluadorNombre || row.encargado },
            { key: "kpi", label: "KPI", render: (row) => formatPercentage(row.kpi) },
            { key: "resultado", label: "Resultado" },
            { key: "comentario", label: "Comentario" },
          ]}
        />
      </section>

      {modalOpen ? (
        <Modal title="Evaluación de colaborador" onClose={() => setModalOpen(false)}>
          <form className="entity-form" onSubmit={saveEvaluation}>
            <div className="form-grid">
              <FormField
                field={{ name: "fecha", label: "Fecha", type: "date", required: true }}
                value={form.fecha}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "colaboradorId",
                  label: "Colaborador",
                  type: "select",
                  required: true,
                  options: colaboradores.map((colaborador) => ({ value: colaborador.id, label: colaborador.nombre })),
                }}
                value={form.colaboradorId}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "comentario", label: "Comentario", type: "textarea" }}
                value={form.comentario}
                onChange={updateForm}
              />
            </div>

            <div className="data-table kpi-monthly-table">
              <table>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Peso %</th>
                    <th>Meta</th>
                    <th>Resultado</th>
                    <th>Cumplimiento %</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {form.indicadores.map((indicator, index) => (
                    <tr key={indicator.templateId || indicator.indicador}>
                      <td>
                        <strong>{indicator.indicador}</strong>
                        <small>{indicator.puesto}</small>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={indicator.peso}
                          onChange={(event) => updateIndicator(index, "peso", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={indicator.meta}
                          onChange={(event) => updateIndicator(index, "meta", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={indicator.resultado}
                          onChange={(event) => updateIndicator(index, "resultado", event.target.value)}
                        />
                      </td>
                      <td>
                        <strong>{formatPercentage(indicator.cumplimiento)}</strong>
                      </td>
                      <td>
                        <textarea
                          rows={2}
                          value={indicator.comentario}
                          onChange={(event) => updateIndicator(index, "comentario", event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="form-hint">KPI calculado: {formatPercentage(calculateMonthlyKpi(form.indicadores))}</p>
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
