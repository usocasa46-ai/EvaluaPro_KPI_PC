import { useMemo, useState } from "react";
import { ArrowLeft, Edit3, Eye, Plus, Save, Users } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import {
  buildEvaluationIndicators,
  normalizeMonthlyEvaluation,
} from "../services/kpiMonthlyService";
import { calculateCompliance, formatPercentage } from "../services/kpiService";
import {
  applyDailySummaryToIndicators,
  getDailyKpiSummaryForMonthlyEvaluation,
} from "../services/dailyKpiService";
import {
  ROLES,
  canEditEvaluation,
  canEditKpiMonthly,
  canViewAllData,
  isWithinEditWindow,
  sameArea,
} from "../services/permissionsService";
import { getAssignedKpisForCollaborator } from "../services/relationsService";

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function formatPeriod(periodo) {
  if (!periodo || !periodo.includes("-")) return periodo || "—";
  const [year, month] = periodo.split("-");
  return `${month}/${year}`;
}

function templatesForCollaborator(templates, collaborator) {
  return getAssignedKpisForCollaborator(collaborator, templates);
}

function collaboratorsForArea(colaboradores, area) {
  return colaboradores.filter((colaborador) => sameArea(colaborador.areaNombre || colaborador.area, area));
}

function buildIndicatorsForCollaborator(templates, area, collaborator, dailyRecords, periodo) {
  const baseIndicators = buildEvaluationIndicators(templatesForCollaborator(templates, collaborator));
  const dailySummary = getDailyKpiSummaryForMonthlyEvaluation({
    periodo,
    areaId: collaborator?.areaId || "",
    areaNombre: collaborator?.areaNombre || collaborator?.area || area,
    colaboradorId: collaborator?.id || "",
    records: dailyRecords,
  });

  return applyDailySummaryToIndicators(baseIndicators, dailySummary);
}

function buildTeam(area, colaboradores, templates, dailyRecords, periodo) {
  return collaboratorsForArea(colaboradores, area).map((colaborador) => {
    const indicadores = buildIndicatorsForCollaborator(templates, area, colaborador, dailyRecords, periodo);
    return {
      colaboradorId: colaborador.id,
      colaboradorNombre: colaborador.nombre,
      cargo: colaborador.cargo || "",
      indicadores,
    };
  });
}

function buildEmptyEvaluation(area, templates, colaboradores, activeUser) {
  return normalizeMonthlyEvaluation({
    periodo: currentPeriod(),
    area,
    modoEvaluacion: "individual",
    evaluadorId: activeUser?.id || "",
    evaluadorNombre: activeUser?.nombre || "",
    evaluadorRol: activeUser?.rol || "",
    createdByUserId: activeUser?.id || "",
    createdByName: activeUser?.nombre || "",
    createdByRole: activeUser?.rol || "",
    createdAt: new Date().toISOString(),
    indicadores: [],
    estado: "Borrador",
  });
}

function IndicatorTable({ indicators, readOnly, onChange }) {
  return (
    <div className="data-table kpi-monthly-table">
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Tipo</th>
            <th>Peso %</th>
            <th>Meta</th>
            <th>Resultado obtenido</th>
            <th>Cumplimiento %</th>
            <th>Comentario</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((indicator, index) => (
            <tr key={indicator.templateId || `${indicator.indicador}-${index}`}>
              <td>
                <strong>{indicator.indicador}</strong>
                <small>{indicator.puesto}</small>
              </td>
              <td>
                <select
                  value={indicator.tipoIndicador}
                  disabled={readOnly}
                  onChange={(event) => onChange(index, "tipoIndicador", event.target.value)}
                >
                  <option>Mayor es mejor</option>
                  <option>Menor es mejor</option>
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={indicator.peso}
                  readOnly={readOnly}
                  onChange={(event) => onChange(index, "peso", event.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={indicator.meta}
                  readOnly={readOnly}
                  onChange={(event) => onChange(index, "meta", event.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={indicator.resultado}
                  readOnly={readOnly}
                  onChange={(event) => onChange(index, "resultado", event.target.value)}
                />
              </td>
              <td>
                <strong>{formatPercentage(indicator.cumplimiento)}</strong>
              </td>
              <td>
                <textarea
                  rows={2}
                  value={indicator.comentario}
                  readOnly={readOnly}
                  onChange={(event) => onChange(index, "comentario", event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EvaluacionKpiMensual({
  evaluaciones,
  templates,
  colaboradores,
  dailyRecords = [],
  activeUser,
  onSaveEvaluation,
}) {
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const canEdit = canEditKpiMonthly(activeUser);
  const areaOptions = useMemo(() => {
    const templateAreas = [
      ...new Set(templates.filter((item) => item.estado !== "Inactivo").map((item) => item.areaNombre || item.area)),
    ].filter(Boolean);
    if (activeUser?.rol === ROLES.ENCARGADO && activeUser.areaAsignada) return [activeUser.areaAsignada];
    if (canViewAllData(activeUser)) return templateAreas;
    return templateAreas;
  }, [activeUser, templates]);

  const collaboratorsByArea = form?.area ? collaboratorsForArea(colaboradores, form.area) : colaboradores;

  function openNewEvaluation() {
    const selectedArea = activeUser?.rol === ROLES.ENCARGADO ? activeUser.areaAsignada : areaOptions[0] || "";
    setForm(buildEmptyEvaluation(selectedArea, templates, colaboradores, activeUser));
    setMode("edit");
    setError("");
  }

  function openEvaluation(evaluation, nextMode) {
    if (nextMode === "edit" && !canEditEvaluation(activeUser, evaluation)) {
      setError("Esta evaluación está bloqueada o no tienes permiso para editarla.");
      return;
    }
    setForm(normalizeMonthlyEvaluation(evaluation));
    setMode(nextMode);
    setError("");
  }

  function closeForm() {
    setForm(null);
    setMode("list");
    setError("");
  }

  function updateForm(name, value) {
    setForm((current) => {
      if (!current) return current;

      if (name === "periodo") {
        const selected = collaboratorsByArea.find((colaborador) => colaborador.id === current.colaboradorId);
        return normalizeMonthlyEvaluation({
          ...current,
          periodo: value,
          indicadores: selected
            ? buildIndicatorsForCollaborator(templates, current.area, selected, dailyRecords, value)
            : current.indicadores,
          equipo:
            current.modoEvaluacion === "equipo"
              ? buildTeam(current.area, colaboradores, templates, dailyRecords, value)
              : current.equipo,
        });
      }

      if (name === "area") {
        const nextArea = activeUser?.rol === ROLES.ENCARGADO ? activeUser.areaAsignada : value;
        return normalizeMonthlyEvaluation({
          ...current,
          area: nextArea,
          colaboradorId: "",
          colaboradorNombre: "",
          indicadores: [],
          equipo:
            current.modoEvaluacion === "equipo" ? buildTeam(nextArea, colaboradores, templates, dailyRecords, current.periodo) : [],
        });
      }

      if (name === "modoEvaluacion") {
        return normalizeMonthlyEvaluation({
          ...current,
          modoEvaluacion: value,
          colaboradorId: "",
          colaboradorNombre: "",
          indicadores: [],
          equipo: value === "equipo" ? buildTeam(current.area, colaboradores, templates, dailyRecords, current.periodo) : [],
        });
      }

      if (name === "colaboradorId") {
        const selected = collaboratorsByArea.find((colaborador) => colaborador.id === value);
        return normalizeMonthlyEvaluation({
          ...current,
          colaboradorId: value,
          colaboradorNombre: selected?.nombre || "",
          puesto: selected?.cargo || "",
          cargo: selected?.cargo || "",
          indicadores: selected ? buildIndicatorsForCollaborator(templates, current.area, selected, dailyRecords, current.periodo) : [],
        });
      }

      return normalizeMonthlyEvaluation({ ...current, [name]: value });
    });
    setError("");
  }

  function updateIndicator(index, name, value, memberIndex = null) {
    setForm((current) => {
      if (!current) return current;

      function updateOne(indicator, indicatorIndex) {
        if (indicatorIndex !== index) return indicator;
        const nextIndicator = {
          ...indicator,
          [name]: ["peso", "meta", "resultado"].includes(name) ? Number(value || 0) : value,
        };
        const menorEsMejor = name === "tipoIndicador" ? value === "Menor es mejor" : nextIndicator.menorEsMejor;

        return {
          ...nextIndicator,
          menorEsMejor,
          cumplimiento: calculateCompliance({ meta: nextIndicator.meta, resultado: nextIndicator.resultado, menorEsMejor }),
        };
      }

      if (memberIndex !== null) {
        const equipo = current.equipo.map((member, currentMemberIndex) => {
          if (currentMemberIndex !== memberIndex) return member;
          return { ...member, indicadores: member.indicadores.map(updateOne) };
        });
        return normalizeMonthlyEvaluation({ ...current, equipo });
      }

      return normalizeMonthlyEvaluation({ ...current, indicadores: current.indicadores.map(updateOne) });
    });
    setError("");
  }

  function saveEvaluation(status) {
    if (form?.id && !canEditEvaluation(activeUser, form)) {
      setError("Esta evaluación ya no puede editarse porque superó el periodo de 48 horas o no te pertenece.");
      return;
    }
    if (!form?.periodo) {
      setError("El periodo es obligatorio.");
      return;
    }
    if (!form?.area) {
      setError("El área es obligatoria.");
      return;
    }
    if (form.modoEvaluacion === "equipo" && !form.equipo.length) {
      setError("No hay colaboradores para evaluar en esta área.");
      return;
    }
    if (form.modoEvaluacion !== "equipo" && !form.colaboradorId) {
      setError("Selecciona un colaborador para la evaluación individual.");
      return;
    }
    if (form.modoEvaluacion !== "equipo" && !form.indicadores.length) {
      setError("No hay plantilla KPI configurada para este cargo en esta área.");
      return;
    }

    const saved = onSaveEvaluation({
      ...form,
      evaluadorId: activeUser?.id || form.evaluadorId,
      evaluadorNombre: activeUser?.nombre || form.evaluadorNombre,
      evaluadorRol: activeUser?.rol || form.evaluadorRol,
      createdByUserId: form.createdByUserId || activeUser?.id || "",
      createdByName: form.createdByName || activeUser?.nombre || "",
      createdByRole: form.createdByRole || activeUser?.rol || "",
      createdAt: form.createdAt || new Date().toISOString(),
      estado: status,
    });
    setForm(normalizeMonthlyEvaluation(saved));
    setMode("view");
    setError("");
  }

  if (mode !== "list" && form) {
    const readOnly = mode === "view";
    const isTeamMode = form.modoEvaluacion === "equipo";
    const canEditCurrent = canEditEvaluation(activeUser, form);

    return (
      <section className="page-shell">
        <header className="module-header">
          <div>
            <h1>Evaluación KPI Mensual</h1>
            <p>Captura mensual de resultados operativos por área, colaborador o equipo completo.</p>
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
          </div>
        </header>

        <div className="module-stack">
          <section className="content-panel kpi-monthly-panel">
            <div className="panel-heading">
              <div>
                <h2>Datos de la evaluación</h2>
                <span>El modo equipo completo genera un bloque por colaborador del área.</span>
              </div>
              <div className="kpi-monthly-score">
                <span>KPI Mensual</span>
                <strong>{formatPercentage(form.kpiMensual)}</strong>
              </div>
            </div>

            <div className="form-grid form-grid--compact">
              <FormField
                field={{ name: "periodo", label: "Periodo", type: "month", required: true }}
                value={form.periodo}
                onChange={updateForm}
              />
              {activeUser?.rol === ROLES.ENCARGADO ? (
                <div className="kpi-locked-field">
                  <span>Área</span>
                  <strong>{form.area || "Sin área asignada"}</strong>
                </div>
              ) : (
                <FormField
                  field={{ name: "area", label: "Área", type: "select", required: true, options: areaOptions }}
                  value={form.area}
                  onChange={updateForm}
                />
              )}
              <FormField
                field={{
                  name: "modoEvaluacion",
                  label: "Modo",
                  type: "select",
                  options: [
                    { value: "individual", label: "Evaluación individual" },
                    { value: "equipo", label: "Evaluar equipo completo" },
                  ],
                }}
                value={form.modoEvaluacion}
                onChange={updateForm}
              />
              {!isTeamMode ? (
                <FormField
                  field={{
                    name: "colaboradorId",
                    label: "Colaborador",
                    type: "select",
                    options: collaboratorsByArea.map((colaborador) => ({ value: colaborador.id, label: colaborador.nombre })),
                  }}
                  value={form.colaboradorId}
                  onChange={updateForm}
                />
              ) : (
                <div className="kpi-team-count">
                  <Users size={16} />
                  <span>{form.equipo.length} colaboradores</span>
                </div>
              )}
            </div>

            {!isTeamMode && form.area && !collaboratorsByArea.length ? (
              <p className="template-warning kpi-monthly-error">
                No hay colaboradores registrados para esta área.
              </p>
            ) : null}

            {readOnly ? <div className="kpi-monthly-readonly-cover" aria-hidden="true" /> : null}
          </section>

          <section className="content-panel">
            <div className="panel-heading">
              <div>
                <h2>Indicadores del área</h2>
                <span>Los indicadores se cargan desde Plantillas KPI por Área.</span>
              </div>
            </div>

            {isTeamMode ? (
              form.equipo.length ? (
                <div className="kpi-team-stack">
                  {form.equipo.map((member, memberIndex) => (
                    <article className="kpi-team-member" key={member.colaboradorId}>
                      <header>
                        <div>
                          <strong>{member.colaboradorNombre}</strong>
                          <span>{member.cargo || "Colaborador"}</span>
                        </div>
                        <b>{formatPercentage(member.kpiMensual || 0)}</b>
                      </header>
                      {member.indicadores.length ? (
                        <IndicatorTable
                          indicators={member.indicadores}
                          readOnly={readOnly}
                          onChange={(index, name, value) => updateIndicator(index, name, value, memberIndex)}
                        />
                      ) : (
                        <p className="template-warning">No hay plantilla KPI configurada para este cargo en esta área.</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="template-warning">No hay colaboradores registrados para esta área.</p>
              )
            ) : form.indicadores.length ? (
              <IndicatorTable indicators={form.indicadores} readOnly={readOnly} onChange={updateIndicator} />
            ) : !form.colaboradorId ? (
              <p className="template-warning">Selecciona un colaborador para cargar sus indicadores KPI.</p>
            ) : (
              <p className="template-warning">No hay plantilla KPI configurada para este cargo en esta área.</p>
            )}

            {error ? <p className="form-error kpi-monthly-error">{error}</p> : null}

            {readOnly && form.createdByRole === ROLES.ENCARGADO && !isWithinEditWindow(form.createdAt, 48) ? (
              <p className="form-hint">
                Esta evaluación ya no puede editarse porque superó el periodo de 48 horas.
              </p>
            ) : null}

            {!readOnly ? (
              <footer className="kpi-monthly-actions">
                <button className="button button--ghost" type="button" onClick={closeForm}>
                  Volver
                </button>
                <button className="button button--secondary" type="button" onClick={() => saveEvaluation("Borrador")}>
                  <Save size={16} />
                  Guardar borrador
                </button>
                <button className="button button--primary" type="button" onClick={() => saveEvaluation("Completada")}>
                  <Save size={16} />
                  Guardar evaluación
                </button>
              </footer>
            ) : null}
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Evaluación KPI Mensual</h1>
          <p>Evaluaciones mensuales guardadas por periodo, área y colaborador/equipo.</p>
        </div>
        <div className="module-actions">
          {canEdit ? (
            <button className="button button--primary" type="button" onClick={openNewEvaluation}>
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
            { key: "periodo", label: "Periodo", render: (row) => formatPeriod(row.periodo) },
            { key: "area", label: "Área" },
            {
              key: "colaboradorNombre",
              label: "Colaborador",
              render: (row) => (row.modoEvaluacion === "equipo" ? "Equipo completo" : row.colaboradorNombre || row.colaborador || "Evaluación por área"),
            },
            { key: "evaluadorNombre", label: "Evaluador" },
            { key: "kpiMensual", label: "KPI Mensual", render: (row) => formatPercentage(row.kpiMensual) },
            {
              key: "estado",
              label: "Estado",
              render: (row) =>
                row.createdByRole === ROLES.ENCARGADO && !isWithinEditWindow(row.createdAt, 48) ? "Bloqueada" : row.estado,
            },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" type="button" onClick={() => openEvaluation(row, "view")}>
                    <Eye size={13} />
                    Ver
                  </button>
                  {canEditEvaluation(activeUser, row) ? (
                    <button className="text-button" type="button" onClick={() => openEvaluation(row, "edit")}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                  ) : (
                    <span className="text-button text-button--locked" title="Esta evaluación no se puede editar.">
                      Bloqueado
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </section>
    </section>
  );
}
