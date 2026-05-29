import { ChartColumn, Download, FileText } from "lucide-react";

const reportOptions = [
  { id: "general", title: "Reporte general", description: "Resumen ejecutivo de todas las áreas." },
  { id: "area", title: "Reporte por área", description: "KPI, colaboradores e incidencias por departamento." },
  { id: "encargado", title: "Reporte por encargado", description: "Resultado de área y seguimiento del responsable." },
  { id: "subgerente", title: "Reporte por subgerente", description: "Áreas supervisadas y evaluación gerencial." },
  { id: "colaborador", title: "Reporte por colaborador", description: "Detalle individual de evaluaciones." },
  { id: "incidencias", title: "Reporte de incidencias", description: "Eventos abiertos, gravedad y acciones correctivas." },
  { id: "mensual", title: "Reporte mensual", description: "Corte consolidado por periodo de evaluación." },
];

export default function Reportes({ activeUser }) {
  const limitedToArea = activeUser?.rol === "Encargado";

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Reportes</h1>
          <p>{limitedToArea ? `Reportes limitados al área ${activeUser.areaAsignada}.` : "Centro visual de reportes ejecutivos."}</p>
        </div>
      </header>

      <div className="reports-grid">
        {reportOptions.map((report) => {
          const disabled = limitedToArea && !["area", "colaborador", "incidencias"].includes(report.id);

          return (
            <article className={`report-card ${disabled ? "is-disabled" : ""}`} key={report.id}>
              <div className="report-card__icon">
                {report.id === "mensual" ? <ChartColumn size={20} /> : <FileText size={20} />}
              </div>
              <h2>{report.title}</h2>
              <p>{disabled ? "No disponible para el rol Encargado." : report.description}</p>
              <button className="button button--ghost" type="button" disabled={disabled}>
                <Download size={15} />
                Preparar exportación
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
