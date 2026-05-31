import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Printer, Save } from "lucide-react";
import FormOfficialLogo from "./FormOfficialLogo";
import {
  QUARTERLY_RATING_ROWS,
  QUARTERLY_SCORE_OPTIONS,
  calculateQuarterlyTotals,
  createQuarterlyEvaluationDraft,
  getQuarterlyEvaluationCalificacion,
  normalizeQuarterlyEvaluation,
} from "../services/quarterlyEvaluationService";

const PAGE_COUNT = 6;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeInitialEvaluation(evaluation, activeUser, targetType) {
  if (evaluation) return normalizeQuarterlyEvaluation(evaluation);

  return createQuarterlyEvaluationDraft({
    evaluador: activeUser?.nombre || "",
    evaluadoPor: activeUser?.nombre || "",
    puestoEvaluador: activeUser?.rol || "",
    fechaFirmaEvaluador: today(),
    evaluatedType: targetType,
    createdByRole: activeUser?.rol || "",
    createdByUserId: activeUser?.id || "",
    createdByName: activeUser?.nombre || "",
  });
}

function validateEvaluation(payload) {
  if (!payload.nombreColaborador) return "Selecciona o escribe el colaborador evaluado.";
  if (!payload.cargo) return "Completa el cargo del colaborador.";
  if (!payload.fechaEvaluacion) return "Completa la fecha de evaluación.";
  if (payload.factores.some((factor) => !factor.valor)) {
    return "Completa la calificación de los 10 factores o marca N/A.";
  }
  return "";
}

function Header({ page }) {
  return (
    <header className="evaluation-header">
      <div className="evaluation-header__logo">
        <FormOfficialLogo />
      </div>
      <div className="evaluation-header__title">
        Evaluación de Desempeño Nivel
        <br />
        Operativo
      </div>
      <table className="evaluation-header__meta" aria-label="Datos del documento">
        <tbody>
          <tr>
            <th>CÓDIGO</th>
            <td>GH01-FO-03</td>
          </tr>
          <tr>
            <th>Fecha Emisión</th>
            <td>13/10/2025</td>
          </tr>
          <tr>
            <th>Revisión</th>
            <td>00</td>
          </tr>
          <tr>
            <th>Fecha Revisión</th>
            <td>dd/mm/aaaa</td>
          </tr>
          <tr>
            <th>Página</th>
            <td>
              {page} de {PAGE_COUNT}
            </td>
          </tr>
        </tbody>
      </table>
    </header>
  );
}

function Page({ page, children }) {
  return (
    <section className="evaluation-page print-page" aria-label={`Página ${page} de ${PAGE_COUNT}`}>
      <Header page={page} />
      {children}
    </section>
  );
}

function TextField({ value, onChange, readOnly, type = "text", className = "" }) {
  return (
    <input
      className={`evaluation-field ${className}`}
      type={type}
      value={value || ""}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TextAreaField({ value, onChange, readOnly, rows = 4 }) {
  return (
    <textarea
      className="evaluation-field evaluation-field--textarea"
      rows={rows}
      value={value || ""}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RatingRadio({ factorId, option, value, readOnly, onChange }) {
  const id = `factor-${factorId}-${option}`;

  return (
    <label className="rating-radio" htmlFor={id}>
      <input
        id={id}
        type="radio"
        name={`factor-${factorId}`}
        value={option}
        checked={value === option}
        disabled={readOnly}
        onChange={() => onChange(factorId, option)}
      />
      <span aria-hidden="true"></span>
      <b>{option}</b>
    </label>
  );
}

function RatingOptions({ factor, readOnly, onChange }) {
  return (
    <div className="rating-options">
      {QUARTERLY_SCORE_OPTIONS.map((option) => (
        <RatingRadio
          key={option}
          factorId={factor.id}
          option={option}
          value={factor.valor}
          readOnly={readOnly}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function FactorsTable({ factors, readOnly, onChange, showHeader = true }) {
  return (
    <table className="evaluation-table evaluation-table--factors">
      {showHeader ? (
        <thead>
          <tr>
            <th className="factor-number">NO.</th>
            <th>FACTORES GENERALES</th>
            <th className="factor-rating">CALIFICACIÓN</th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {factors.map((factor) => (
          <tr key={factor.id}>
            <td className="factor-number">{factor.id}</td>
            <td>
              <strong>{factor.nombre}</strong>
              <p>{factor.descripcion}</p>
            </td>
            <td className="factor-rating">
              <RatingOptions factor={factor} readOnly={readOnly} onChange={onChange} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataTable({ form, readOnly, onChange }) {
  return (
    <table className="evaluation-table evaluation-table--data">
      <thead>
        <tr>
          <th>Nombre y Apellidos</th>
          <th>Cargo</th>
          <th>Fecha de Ingreso</th>
          <th>Fecha Evaluación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <TextField value={form.nombreColaborador} readOnly={readOnly} onChange={(value) => onChange("nombreColaborador", value)} />
          </td>
          <td>
            <TextField value={form.cargo} readOnly={readOnly} onChange={(value) => onChange("cargo", value)} />
          </td>
          <td>
            <TextField
              type="date"
              value={form.fechaIngreso}
              readOnly={readOnly}
              onChange={(value) => onChange("fechaIngreso", value)}
            />
          </td>
          <td>
            <TextField
              type="date"
              value={form.fechaEvaluacion}
              readOnly={readOnly}
              onChange={(value) => onChange("fechaEvaluacion", value)}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function RatingGuide() {
  return (
    <table className="evaluation-table evaluation-table--rating-guide">
      <tbody>
        <tr>
          <th>1</th>
          <td>Inaceptable, no cumple con el desempeño del puesto.</td>
          <th>4</th>
          <td>Los resultados muy buenos, acorde a los requerimientos del puesto.</td>
        </tr>
        <tr>
          <th>2</th>
          <td>Desempeño deficiente, necesita mejorar.</td>
          <th>5</th>
          <td>El desempeño es excepcional y/o excelente.</td>
        </tr>
        <tr>
          <th>3</th>
          <td>Nivel de desempeño bueno, pero requiere asistencia.</td>
          <th>N/A</th>
          <td>No aplica.</td>
        </tr>
      </tbody>
    </table>
  );
}

function SignatureRow({ form, readOnly, onChange }) {
  return (
    <div className="signature-grid">
      <label>
        <span>Firma Colaborador:</span>
        <TextField value={form.firmaColaborador} readOnly={readOnly} onChange={(value) => onChange("firmaColaborador", value)} />
      </label>
      <label>
        <span>Puesto:</span>
        <TextField value={form.puestoColaborador} readOnly={readOnly} onChange={(value) => onChange("puestoColaborador", value)} />
      </label>
      <label>
        <span>Fecha:</span>
        <TextField
          type="date"
          value={form.fechaFirmaColaborador}
          readOnly={readOnly}
          onChange={(value) => onChange("fechaFirmaColaborador", value)}
        />
      </label>
      <label>
        <span>Evaluado por:</span>
        <TextField value={form.evaluadoPor} readOnly={readOnly} onChange={(value) => onChange("evaluadoPor", value)} />
      </label>
      <label>
        <span>Puesto:</span>
        <TextField value={form.puestoEvaluador} readOnly={readOnly} onChange={(value) => onChange("puestoEvaluador", value)} />
      </label>
      <label>
        <span>Fecha:</span>
        <TextField
          type="date"
          value={form.fechaFirmaEvaluador}
          readOnly={readOnly}
          onChange={(value) => onChange("fechaFirmaEvaluador", value)}
        />
      </label>
    </div>
  );
}

function YesNoBox({ label, selected, readOnly, onChange }) {
  return (
    <label className="document-check">
      <span>{label}</span>
      <input type="radio" name="aplicaReajuste" checked={selected} disabled={readOnly} onChange={onChange} />
      <b aria-hidden="true"></b>
    </label>
  );
}

function PageOne() {
  return (
    <Page page={1}>
      <section className="document-section document-section--page-one">
        <h2>1. CONTROL DE REVISIÓN</h2>
        <table className="evaluation-table">
          <thead>
            <tr>
              <th>Revisión</th>
              <th>Descripción de actualización</th>
              <th>Realizado por:</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>00</td>
              <td>Documento inicial.</td>
              <td>Victor Manzueta</td>
              <td>13/10/2025</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h2>2. APROBACIONES</h2>
        <table className="evaluation-table evaluation-table--approvals">
          <thead>
            <tr>
              <th>Encargado/a del SGCS</th>
              <th>Vicepresidenta Ejecutiva</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nombre:</td>
              <td>Nombre:</td>
            </tr>
            <tr>
              <td>Firma:</td>
              <td>Firma:</td>
            </tr>
          </tbody>
        </table>

        <h2>3. DOCUMENTO</h2>
        <p>GH01-FO-03 Evaluación de Desempeño Nivel Operativo.</p>
        <p>Inicia en la próxima página.</p>
      </section>
    </Page>
  );
}

function PageTwo({ form, readOnly, onChange, onFactorChange }) {
  return (
    <Page page={2}>
      <DataTable form={form} readOnly={readOnly} onChange={onChange} />
      <section className="document-section">
        <h2>1. Objetivos de evaluación</h2>
        <h3>1.1.- Sección 1</h3>
        <p>
          Evalúe cuidadosamente el desempeño del colaborador durante los últimos cuatro (4) meses de labores, acorde con
          los requerimientos de su puesto de trabajo y al cumplimiento de sus tareas y responsabilidades.
        </p>
        <p>
          En esta sección son evaluados los factores generales de la posición. Seleccione el número que según usted
          corresponde del 1 al 5 siendo el (1) el menor y el (5) mayor para indicar el desempeño del colaborador.
        </p>
      </section>
      <section className="document-section">
        <h2>2. Identificación de la calificación</h2>
        <RatingGuide />
      </section>
      <FactorsTable factors={form.factores.slice(0, 3)} readOnly={readOnly} onChange={onFactorChange} />
    </Page>
  );
}

function PageThree({ form, readOnly, onFactorChange }) {
  return (
    <Page page={3}>
      <FactorsTable factors={form.factores.slice(3, 7)} readOnly={readOnly} onChange={onFactorChange} showHeader={false} />
    </Page>
  );
}

function PageFour({ form, readOnly, onFactorChange }) {
  return (
    <Page page={4}>
      <FactorsTable factors={form.factores.slice(7, 10)} readOnly={readOnly} onChange={onFactorChange} showHeader={false} />
    </Page>
  );
}

function PageFive({ form, readOnly, onChange, totals, calificacion }) {
  return (
    <Page page={5}>
      <section className="document-section">
        <h3>Recomendaciones u observación general del evaluador:</h3>
        <TextAreaField
          value={form.observacionGeneral}
          readOnly={readOnly}
          rows={4}
          onChange={(value) => onChange("observacionGeneral", value)}
        />
      </section>

      <section className="salary-row">
        <span>Aplica reajuste salarial:</span>
        <YesNoBox label="Sí" selected={form.aplicaReajuste === "Sí"} readOnly={readOnly} onChange={() => onChange("aplicaReajuste", "Sí")} />
        <YesNoBox label="No" selected={form.aplicaReajuste === "No"} readOnly={readOnly} onChange={() => onChange("aplicaReajuste", "No")} />
        <label className="salary-field">
          <span>Salario RD$</span>
          <TextField value={form.salario} readOnly={readOnly} onChange={(value) => onChange("salario", value)} />
        </label>
      </section>

      <SignatureRow form={form} readOnly={readOnly} onChange={onChange} />

      <section className="document-section document-section--ratings">
        <h2>VII. CALIFICACIONES</h2>
        <table className="evaluation-table evaluation-table--calificaciones">
          <tbody>
            {QUARTERLY_RATING_ROWS.map((row) => (
              <tr key={row.calificacion}>
                <td>{row.calificacion}</td>
                <td>{row.puntos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="document-section document-section--human-resources">
        <h2>VIII. NO ESCRIBA EN ESTE ESPACIO, RESERVADO PARA GESTIÓN HUMANA</h2>
        <div className="human-resources-grid">
          <label>
            <span>Puntuación:</span>
            <TextField
              value={form.gestionHumanaPuntuacion || totals.puntuacion}
              readOnly={readOnly}
              onChange={(value) => onChange("gestionHumanaPuntuacion", value)}
            />
          </label>
          <label>
            <span>Calificación:</span>
            <TextField
              value={form.gestionHumanaCalificacion || calificacion}
              readOnly={readOnly}
              onChange={(value) => onChange("gestionHumanaCalificacion", value)}
            />
          </label>
        </div>
      </section>
    </Page>
  );
}

function PageSix({ form, readOnly, onChange }) {
  return (
    <Page page={6}>
      <section className="document-section document-section--final-signature">
        <label>
          <span>Firma:</span>
          <TextField value={form.firmaFinal} readOnly={readOnly} onChange={(value) => onChange("firmaFinal", value)} />
        </label>
        <label>
          <span>Puesto:</span>
          <TextField value={form.puestoFirmaFinal} readOnly={readOnly} onChange={(value) => onChange("puestoFirmaFinal", value)} />
        </label>
        <label className="final-name">
          <span>(nombres y apellidos)</span>
          <TextField value={form.nombresFirmaFinal} readOnly={readOnly} onChange={(value) => onChange("nombresFirmaFinal", value)} />
        </label>
      </section>
    </Page>
  );
}

export function QuarterlyEvaluationTemplateDocument({ evaluation, readOnly, onChangeField, onChangeFactor }) {
  const form = normalizeQuarterlyEvaluation(evaluation);
  const totals = calculateQuarterlyTotals(form.factores);
  const calificacion = getQuarterlyEvaluationCalificacion(totals.puntuacion, totals.factoresEvaluados);

  return (
    <div className="evaluation-document printable-document">
      <PageOne />
      <PageTwo form={form} readOnly={readOnly} onChange={onChangeField} onFactorChange={onChangeFactor} />
      <PageThree form={form} readOnly={readOnly} onFactorChange={onChangeFactor} />
      <PageFour form={form} readOnly={readOnly} onFactorChange={onChangeFactor} />
      <PageFive
        form={form}
        readOnly={readOnly}
        onChange={onChangeField}
        totals={totals}
        calificacion={calificacion}
      />
      <PageSix form={form} readOnly={readOnly} onChange={onChangeField} />
    </div>
  );
}

export default function QuarterlyEvaluationTemplate({
  evaluation,
  colaboradores,
  activeUser,
  canEdit,
  targetType = "colaborador",
  targetLabel = "Evaluado",
  mode = "new",
  onBack,
  onSave,
  onPrint,
}) {
  const [form, setForm] = useState(() => makeInitialEvaluation(evaluation, activeUser, targetType));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const readOnly = mode === "view" || !canEdit;

  const totals = useMemo(() => calculateQuarterlyTotals(form.factores), [form.factores]);
  const calificacion = getQuarterlyEvaluationCalificacion(totals.puntuacion, totals.factoresEvaluados);

  function updateField(name, value) {
    const selected = name === "colaboradorId" ? colaboradores.find((item) => item.id === value) : null;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(selected
        ? {
            nombreColaborador: selected.nombre || "",
            cargo: selected.cargo || "",
            area: selected.area || "",
            fechaIngreso: selected.fechaEntrada || "",
            puestoColaborador: selected.cargo || "",
            evaluatedType: targetType,
            evaluatedUserId: selected.id || "",
            evaluatedName: selected.nombre || "",
            evaluatedRole: selected.rol || selected.cargo || "",
            areasSupervisadas: selected.areasSupervisadas || [],
          }
        : {}),
    }));
    setError("");
    setMessage("");
  }

  function updateFactor(factorId, value) {
    setForm((current) => ({
      ...current,
      factores: current.factores.map((factor) => (factor.id === factorId ? { ...factor, valor: value } : factor)),
    }));
    setError("");
    setMessage("");
  }

  function save(status) {
    const payload = normalizeQuarterlyEvaluation({
      ...form,
      estado: status,
      evaluatedType: form.evaluatedType || targetType,
      createdByRole: activeUser?.rol || form.createdByRole,
      createdByUserId: activeUser?.id || form.createdByUserId,
      createdByName: activeUser?.nombre || form.createdByName,
      evaluatedUserId: form.evaluatedUserId || form.colaboradorId,
      evaluatedName: form.evaluatedName || form.nombreColaborador,
      evaluatedRole: form.evaluatedRole || form.cargo,
      puntuacion: totals.puntuacion,
      calificacion,
      gestionHumanaPuntuacion: form.gestionHumanaPuntuacion || String(totals.puntuacion),
      gestionHumanaCalificacion: form.gestionHumanaCalificacion || calificacion,
    });

    if (status !== "Borrador") {
      const validationError = validateEvaluation(payload);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    const saved = onSave(payload) || payload;
    setForm(normalizeQuarterlyEvaluation(saved));
    setMessage(status === "Borrador" ? "Borrador guardado." : "Evaluación guardada.");
    setError("");
  }

  function printCurrent() {
    onPrint(
      normalizeQuarterlyEvaluation({
        ...form,
        evaluatedType: form.evaluatedType || targetType,
        createdByRole: activeUser?.rol || form.createdByRole,
        createdByUserId: activeUser?.id || form.createdByUserId,
        createdByName: activeUser?.nombre || form.createdByName,
        evaluatedUserId: form.evaluatedUserId || form.colaboradorId,
        evaluatedName: form.evaluatedName || form.nombreColaborador,
        evaluatedRole: form.evaluatedRole || form.cargo,
        puntuacion: totals.puntuacion,
        calificacion,
        gestionHumanaPuntuacion: form.gestionHumanaPuntuacion || String(totals.puntuacion),
        gestionHumanaCalificacion: form.gestionHumanaCalificacion || calificacion,
      })
    );
  }

  return (
    <div className="template-editor">
      <header className="template-toolbar no-print">
        <button className="button button--ghost" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Volver
        </button>

        {!readOnly ? (
          <label className="template-collaborator-picker">
            <span>{targetLabel}</span>
            <select value={form.colaboradorId || ""} onChange={(event) => updateField("colaboradorId", event.target.value)}>
              <option value="">Seleccionar...</option>
              {colaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="template-score">
          <span>Puntuación</span>
          <strong>{totals.puntuacion}</strong>
          <small>
            {totals.factoresEvaluados} factores · {calificacion}
          </small>
        </div>

        <div className="template-toolbar__actions">
          {!readOnly ? (
            <>
              <button className="button button--ghost" type="button" onClick={() => save("Borrador")}>
                <FileText size={16} />
                Guardar como borrador
              </button>
              <button className="button button--primary" type="button" onClick={() => save("Completada")}>
                <Save size={16} />
                Guardar evaluación
              </button>
            </>
          ) : null}
          <button className="button button--secondary" type="button" onClick={printCurrent}>
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </header>

      {error ? <p className="form-error quarterly-inline-message no-print">{error}</p> : null}
      {message ? <p className="form-success quarterly-inline-message no-print">{message}</p> : null}
      {!readOnly && !colaboradores.length ? (
        <p className="template-warning no-print">
          No hay evaluados disponibles. Primero registre los datos correspondientes.
        </p>
      ) : null}

      <QuarterlyEvaluationTemplateDocument
        evaluation={form}
        readOnly={readOnly}
        onChangeField={updateField}
        onChangeFactor={updateFactor}
      />
    </div>
  );
}
