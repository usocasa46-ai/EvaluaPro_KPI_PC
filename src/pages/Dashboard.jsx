import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ChartLine, ClipboardCheck, Plus, Store, Users } from "lucide-react";
import MetricCard from "../components/MetricCard";
import { clampPercentage, formatPercentage, getKpiResult, getKpiTone } from "../services/kpiService";

function CompactToggle({ expanded, onClick, total, limit = 5 }) {
  if (total <= limit) return null;

  return (
    <button className="text-button" type="button" onClick={onClick}>
      {expanded ? "Ver menos" : "Ver más"}
    </button>
  );
}

function severityClass(gravedad) {
  if (gravedad === "Crítica") return "critica";
  if (gravedad === "Alta") return "alta";
  if (gravedad === "Media") return "media";
  return "baja";
}

export default function Dashboard({
  kpiGeneral,
  areaSummary,
  colaboradores,
  evaluaciones,
  evaluacionesTrimestrales = [],
  incidencias,
  topColaboradores,
  tendencia,
  activeUser,
  configuracion,
  canCreateQuarterly,
  onNewQuarterlyEvaluation,
}) {
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const visibleAreas = showAllAreas ? areaSummary : areaSummary.slice(0, 5);
  const visibleTop = showAllTop ? topColaboradores : topColaboradores.slice(0, 5);
  const visibleAlerts = showAllAlerts ? incidencias : incidencias.slice(0, 4);
  const openIncidents = incidencias.filter((incident) => incident.estado !== "Cerrada");
  const pendingQuarterlyEvaluations = evaluacionesTrimestrales.filter((evaluation) => evaluation.estado !== "Completada");
  const dashboardScope = activeUser?.rol === "Encargado" ? `Área: ${activeUser.areaAsignada}` : "Vista ejecutiva completa";
  const kpiTone = getKpiTone(kpiGeneral);

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <span className="section-kicker">{dashboardScope}</span>
          <h1>Panel de control operativo</h1>
          <p>Indicadores clave, ranking, tendencia y alertas recientes.</p>
        </div>
        <div className="dashboard__header-actions">
          <button
            className="button button--primary"
            type="button"
            disabled={!canCreateQuarterly}
            onClick={onNewQuarterlyEvaluation}
          >
            <Plus size={16} />
            Nueva Evaluación Trimestral
          </button>
          <div className={`dashboard__score dashboard__score--${kpiTone}`}>
            <span>KPI general</span>
            <strong>{formatPercentage(kpiGeneral)}</strong>
            <small>{getKpiResult(kpiGeneral)} · mínimo {formatPercentage(configuracion.kpiMinimoAceptable)}</small>
          </div>
        </div>
      </header>

      <div className="metrics-grid">
        <MetricCard title="KPI General" value={formatPercentage(kpiGeneral)} detail={getKpiResult(kpiGeneral)} tone={kpiTone} icon={ChartLine} />
        <MetricCard title="Áreas" value={areaSummary.length} detail="Activas visibles" tone="neutral" icon={Store} />
        <MetricCard title="Colaboradores" value={colaboradores.length} detail="En alcance" tone="success" icon={Users} />
        <MetricCard title="Evaluaciones" value={evaluaciones.length} detail="Registradas" tone="info" icon={ClipboardCheck} />
        <MetricCard
          title="Eval. trimestral"
          value={evaluacionesTrimestrales.length}
          detail={`${pendingQuarterlyEvaluations.length} pendientes`}
          tone={pendingQuarterlyEvaluations.length ? "warning" : "success"}
          icon={ClipboardCheck}
        />
        <MetricCard title="Incidencias" value={openIncidents.length} detail="Abiertas" tone={openIncidents.length ? "danger" : "success"} icon={AlertTriangle} />
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>KPI por área</h2>
              <span>Promedio ajustado por incidencias abiertas.</span>
            </div>
            <CompactToggle expanded={showAllAreas} total={areaSummary.length} onClick={() => setShowAllAreas((value) => !value)} />
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleAreas} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} interval={0} height={44} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [formatPercentage(value), "KPI"]} />
                <Bar dataKey="kpi" fill="var(--primary)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Tendencia KPI general</h2>
              <span>Últimos 7 registros consolidados.</span>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencia} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [formatPercentage(value), "KPI"]} />
                <Line type="monotone" dataKey="kpi" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Top colaboradores</h2>
              <span>Mejores KPI individuales visibles.</span>
            </div>
            <CompactToggle expanded={showAllTop} total={topColaboradores.length} onClick={() => setShowAllTop((value) => !value)} />
          </div>
          <div className="ranking-list">
            {visibleTop.map((item, index) => (
              <article className="ranking-row" key={item.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.colaborador}</strong>
                  <small>{item.area}</small>
                </div>
                <b>{formatPercentage(clampPercentage(item.kpi))}</b>
              </article>
            ))}
            {!visibleTop.length ? <p className="empty-text">Sin evaluaciones en el alcance actual.</p> : null}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Alertas recientes</h2>
              <span>Incidencias que requieren seguimiento.</span>
            </div>
            <CompactToggle expanded={showAllAlerts} total={incidencias.length} limit={4} onClick={() => setShowAllAlerts((value) => !value)} />
          </div>
          <div className="alerts-list">
            {visibleAlerts.map((item) => (
              <article className="alert-row" key={item.id}>
                <span className={`severity-dot severity-dot--${severityClass(item.gravedad)}`}></span>
                <div>
                  <strong>{item.descripcion}</strong>
                  <small>{item.area} · {item.fecha}</small>
                </div>
                <b>{item.gravedad}</b>
              </article>
            ))}
            {!visibleAlerts.length ? <p className="empty-text">Sin alertas abiertas en el alcance actual.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
