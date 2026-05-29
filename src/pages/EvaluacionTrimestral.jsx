import { useEffect, useMemo, useState } from "react";
import { Edit3, Eye, Plus, Printer } from "lucide-react";
import DataTable from "../components/DataTable";
import QuarterlyEvaluationPrint from "../components/QuarterlyEvaluationPrint";
import QuarterlyEvaluationTemplate from "../components/QuarterlyEvaluationTemplate";
import {
  getQuarterlyRatingTone,
  normalizeQuarterlyEvaluation,
} from "../services/quarterlyEvaluationService";
import {
  canAccessQuarterlyEvaluation,
  canCreateQuarterlyEvaluation,
  canViewQuarterlyEvaluation,
  getPermissionMessage,
} from "../services/permissionsService";

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function StatusPill({ value }) {
  const state = value || "Borrador";
  const className = state === "Completada" ? "success" : "warning";
  return <span className={`quarterly-status quarterly-status--${className}`}>{state}</span>;
}

export default function EvaluacionTrimestral({
  evaluaciones,
  colaboradores,
  quarterlyTargets,
  targetType,
  activeUser,
  scopeAreas,
  startNewSignal = 0,
  supermarketName,
  onSaveEvaluation,
}) {
  const [mode, setMode] = useState("list");
  const [formMode, setFormMode] = useState("new");
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [printEvaluation, setPrintEvaluation] = useState(null);

  useEffect(() => {
    function clearPrintEvaluation() {
      setPrintEvaluation(null);
    }

    window.addEventListener("afterprint", clearPrintEvaluation);
    return () => window.removeEventListener("afterprint", clearPrintEvaluation);
  }, []);

  const canAccess = canAccessQuarterlyEvaluation(activeUser);
  const canCreate = canCreateQuarterlyEvaluation(activeUser);
  const formIsOutOfScope =
    mode === "form" &&
    ((formMode === "new" && !canCreate) ||
      (selectedEvaluation && !canViewQuarterlyEvaluation(activeUser, selectedEvaluation, scopeAreas)));
  const effectiveMode = formIsOutOfScope ? "list" : mode;

  const visibleEvaluations = useMemo(() => {
    return [...evaluaciones]
      .filter((evaluation) => canViewQuarterlyEvaluation(activeUser, evaluation, scopeAreas))
      .sort((a, b) => String(b.fechaEvaluacion).localeCompare(String(a.fechaEvaluacion)));
  }, [activeUser, evaluaciones, scopeAreas]);

  const visibleCollaborators = useMemo(() => {
    if (Array.isArray(quarterlyTargets)) return quarterlyTargets;
    if (activeUser?.rol === "Gerente") return colaboradores;
    if (activeUser?.rol === "Subgerente") {
      return scopeAreas?.length ? colaboradores.filter((item) => scopeAreas.includes(item.area)) : colaboradores;
    }
    if (activeUser?.rol === "Encargado" && activeUser.areaAsignada) {
      return colaboradores.filter((item) => item.area === activeUser.areaAsignada);
    }
    return [];
  }, [activeUser, colaboradores, quarterlyTargets, scopeAreas]);

  useEffect(() => {
    if (startNewSignal && canCreate) {
      startNewEvaluation();
    }
  }, [canCreate, startNewSignal]);

  const completed = visibleEvaluations.filter((evaluation) => evaluation.estado === "Completada").length;
  const pending = visibleEvaluations.filter((evaluation) => evaluation.estado !== "Completada").length;

  function startNewEvaluation() {
    setSelectedEvaluation(null);
    setFormMode("new");
    setMode("form");
  }

  const targetLabel =
    targetType === "subgerente" ? "Subgerente" : targetType === "encargado" ? "Encargado" : "Colaborador";

  function openEvaluation(evaluation, nextMode) {
    setSelectedEvaluation(normalizeQuarterlyEvaluation(evaluation));
    setFormMode(nextMode);
    setMode("form");
  }

  function saveEvaluation(payload) {
    const saved = onSaveEvaluation(payload);
    setSelectedEvaluation(saved);
    return saved;
  }

  function print(evaluation) {
    setPrintEvaluation(normalizeQuarterlyEvaluation(evaluation));
    window.setTimeout(() => window.print(), 120);
  }

  if (!canAccess) {
    return (
      <section className="page-shell">
        <div className="permission-card">{getPermissionMessage()}</div>
      </section>
    );
  }

  if (effectiveMode === "form") {
    return (
      <section className="page-shell quarterly-page">
        <header className="module-header no-print">
          <div>
            <h1>Evaluación Desempeño Trimestral</h1>
            <p>Formulario digital basado en GH01-FO-03 Evaluación de Desempeño Nivel Operativo.</p>
          </div>
        </header>

        <QuarterlyEvaluationTemplate
          key={`${formMode}-${selectedEvaluation?.id || "nuevo"}`}
          evaluation={selectedEvaluation}
          colaboradores={visibleCollaborators}
          activeUser={activeUser}
          targetType={targetType}
          targetLabel={targetLabel}
          mode={formMode}
          canEdit={canCreate}
          onBack={() => setMode("list")}
          onSave={saveEvaluation}
          onPrint={() => window.setTimeout(() => window.print(), 80)}
        />

        {printEvaluation ? (
          <QuarterlyEvaluationPrint evaluation={printEvaluation} supermarketName={supermarketName} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="page-shell quarterly-page">
      <header className="module-header no-print">
        <div>
          <h1>Evaluación Desempeño Trimestral</h1>
          <p>Gestión, edición e impresión del formulario GH01-FO-03 para personal operativo.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={startNewEvaluation}>
              <Plus size={16} />
              Nueva evaluación
            </button>
          ) : null}
        </div>
      </header>

      <div className="quarterly-summary no-print">
        <article>
          <span>Total</span>
          <strong>{visibleEvaluations.length}</strong>
          <small>Evaluaciones trimestrales visibles</small>
        </article>
        <article>
          <span>Completadas</span>
          <strong>{completed}</strong>
          <small>Listas para impresión y archivo</small>
        </article>
        <article>
          <span>Pendientes</span>
          <strong>{pending}</strong>
          <small>Borradores o en revisión</small>
        </article>
      </div>

      <section className="content-panel no-print">
        <div className="panel-heading">
          <div>
            <h2>Evaluaciones guardadas</h2>
            <span>Datos almacenados por ahora en localStorage: evaluaciones_trimestrales.</span>
          </div>
        </div>
        <DataTable
          rows={visibleEvaluations}
          emptyText="No hay evaluaciones trimestrales guardadas."
          columns={[
            { key: "fechaEvaluacion", label: "Fecha Evaluación", render: (row) => formatDate(row.fechaEvaluacion) },
            { key: "nombreColaborador", label: "Colaborador" },
            { key: "cargo", label: "Cargo" },
            { key: "area", label: "Área" },
            { key: "evaluador", label: "Evaluador" },
            {
              key: "puntuacion",
              label: "Puntuación",
              render: (row) => `${row.puntuacion || 0} pts / ${row.factoresEvaluados || 0} factores`,
            },
            {
              key: "calificacion",
              label: "Calificación",
              render: (row) => (
                <span className={`quarterly-rating quarterly-rating--${getQuarterlyRatingTone(row.calificacion)}`}>
                  {row.calificacion || "Sin calcular"}
                </span>
              ),
            },
            { key: "estado", label: "Estado", render: (row) => <StatusPill value={row.estado} /> },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="quarterly-row-actions">
                  <button className="icon-button" type="button" title="Ver" onClick={() => openEvaluation(row, "view")}>
                    <Eye size={16} />
                  </button>
                  {canCreate ? (
                    <button
                      className="icon-button"
                      type="button"
                      title="Editar"
                      onClick={() => openEvaluation(row, "edit")}
                    >
                      <Edit3 size={16} />
                    </button>
                  ) : null}
                  <button className="icon-button" type="button" title="Imprimir" onClick={() => print(row)}>
                    <Printer size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {printEvaluation ? (
        <QuarterlyEvaluationPrint evaluation={printEvaluation} supermarketName={supermarketName} />
      ) : null}
    </section>
  );
}
