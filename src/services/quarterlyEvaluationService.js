export const QUARTERLY_EVALUATION_STORAGE_KEY = "evaluaciones_trimestrales";

export const QUARTERLY_EVALUATION_FACTORS = [
  {
    id: 1,
    nombre: "Conocimiento del puesto de trabajo",
    descripcion: "Habilidades sobre prácticas, técnicas, información y procesos utilizados en el puesto.",
  },
  {
    id: 2,
    nombre: "Responsabilidad",
    descripcion:
      "Cumple con las funciones de su puesto de trabajo siguiendo las instrucciones y comunicando a su supervisor inmediato las novedades que se presentan.",
  },
  {
    id: 3,
    nombre: "Calidad del trabajo",
    descripcion:
      "Aceptabilidad del trabajo desempeñado en un periodo de tiempo determinado, va más allá de lo exigido para obtener un mejor resultado.",
  },
  {
    id: 4,
    nombre: "Cumplimiento de normas y políticas",
    descripcion: "Cumple con las normas, procedimientos, política y objetivos establecidos por la empresa.",
  },
  {
    id: 5,
    nombre: "Cooperación y Trabajo en Equipo",
    descripcion:
      "Capacidad y disposición para compartir responsabilidad y asistir y dar apoyo en actividades y tareas de las cuales tiene conocimiento.",
  },
  {
    id: 6,
    nombre: "Comunicación",
    descripcion: "Habilidad para comunicarse y escuchar activamente.",
  },
  {
    id: 7,
    nombre: "Aptitud para el aprendizaje",
    descripcion: "Habilidad para aprender, aplicar y desarrollar nuevos conceptos e ideas.",
  },
  {
    id: 8,
    nombre: "Relaciones Humanas",
    descripcion: "Mantiene buenas relaciones humanas con sus compañeros y fomenta el trabajo en equipo.",
  },
  {
    id: 9,
    nombre: "Asistencia y puntualidad",
    descripcion: "Asiste diariamente a su lugar de trabajo en el horario establecido por la empresa.",
  },
  {
    id: 10,
    nombre: "Uso y cuidado de los equipos",
    descripcion: "Disposición y capacidad de brindar el cuidado necesario a los equipos con los cuales realiza el trabajo.",
  },
];

export const QUARTERLY_SCORE_OPTIONS = ["1", "2", "3", "4", "5", "N/A"];

export const QUARTERLY_RATING_ROWS = [
  { calificacion: "Excelente = Sobresaliente", puntos: "50 puntos" },
  { calificacion: "Muy Bueno = Supera las Expectativas", puntos: "40-49 puntos" },
  { calificacion: "Bueno = Cumple las Expectativas", puntos: "30-39 puntos" },
  { calificacion: "Necesita Mejorar", puntos: "20-29 puntos" },
  { calificacion: "Inaceptable", puntos: "19 puntos y/o menos" },
];

export function normalizeFactorValue(value) {
  if (value === "N/A" || value === "NA") return "N/A";
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) return String(numeric);
  return "";
}

export function buildQuarterlyFactors(factors = []) {
  return QUARTERLY_EVALUATION_FACTORS.map((baseFactor) => {
    const savedFactor = factors.find((factor) => Number(factor.id) === baseFactor.id) || {};
    return {
      ...baseFactor,
      valor: normalizeFactorValue(savedFactor.valor),
    };
  });
}

export function calculateQuarterlyTotals(factors = []) {
  const normalizedFactors = buildQuarterlyFactors(factors);
  const numericValues = normalizedFactors
    .map((factor) => Number(factor.valor))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);

  const puntuacion = numericValues.reduce((total, value) => total + value, 0);

  return {
    puntuacion,
    factoresEvaluados: numericValues.length,
    factoresNoAplica: normalizedFactors.filter((factor) => factor.valor === "N/A").length,
    totalFactores: normalizedFactors.length,
    puntuacionMaxima: 50,
  };
}

export function getQuarterlyEvaluationCalificacion(puntuacion, factoresEvaluados = 1) {
  const score = Number(puntuacion) || 0;
  if (!factoresEvaluados) return "Sin calcular";
  if (score === 50) return "Excelente / Sobresaliente";
  if (score >= 40) return "Muy Bueno / Supera las Expectativas";
  if (score >= 30) return "Bueno / Cumple las Expectativas";
  if (score >= 20) return "Necesita Mejorar";
  return "Inaceptable";
}

export function getQuarterlyRatingTone(calificacion) {
  if (calificacion?.startsWith("Excelente") || calificacion?.startsWith("Muy Bueno")) return "success";
  if (calificacion?.startsWith("Bueno")) return "info";
  if (calificacion?.startsWith("Necesita")) return "warning";
  if (calificacion?.startsWith("Inaceptable")) return "danger";
  return "neutral";
}

export function createQuarterlyEvaluationDraft(overrides = {}) {
  const today = new Date().toISOString().slice(0, 10);

  return normalizeQuarterlyEvaluation({
    id: "",
    fechaEvaluacion: today,
    nombreColaborador: "",
    colaboradorId: "",
    evaluatedType: "",
    createdByRole: "",
    createdByUserId: "",
    createdByName: "",
    evaluatedUserId: "",
    evaluatedName: "",
    evaluatedRole: "",
    areasSupervisadas: [],
    cargo: "",
    area: "",
    fechaIngreso: "",
    evaluador: "",
    puestoEvaluador: "",
    factores: buildQuarterlyFactors(),
    observacionGeneral: "",
    aplicaReajuste: "No",
    salario: "",
    firmaColaborador: "",
    puestoColaborador: "",
    fechaFirmaColaborador: "",
    evaluadoPor: "",
    fechaFirmaEvaluador: "",
    gestionHumanaPuntuacion: "",
    gestionHumanaCalificacion: "",
    firmaFinal: "",
    puestoFirmaFinal: "",
    nombresFirmaFinal: "",
    estado: "Borrador",
    ...overrides,
  });
}

export function normalizeQuarterlyEvaluation(evaluation = {}) {
  const factores = buildQuarterlyFactors(evaluation.factores);
  const totals = calculateQuarterlyTotals(factores);
  const calificacion = getQuarterlyEvaluationCalificacion(totals.puntuacion, totals.factoresEvaluados);
  const aplicaReajuste =
    evaluation.aplicaReajuste === "Si" || evaluation.aplicaReajuste === "Sí" || evaluation.aplicaReajuste === "SÃ­"
      ? "Sí"
      : "No";

  return {
    id: evaluation.id || "",
    fechaEvaluacion: evaluation.fechaEvaluacion || "",
    nombreColaborador: evaluation.nombreColaborador || "",
    colaboradorId: evaluation.colaboradorId || "",
    evaluatedType: evaluation.evaluatedType || "colaborador",
    createdByRole: evaluation.createdByRole || "",
    createdByUserId: evaluation.createdByUserId || "",
    createdByName: evaluation.createdByName || evaluation.evaluador || "",
    evaluatedUserId: evaluation.evaluatedUserId || evaluation.colaboradorId || "",
    evaluatedName: evaluation.evaluatedName || evaluation.nombreColaborador || "",
    evaluatedRole: evaluation.evaluatedRole || evaluation.cargo || "",
    areasSupervisadas: evaluation.areasSupervisadas || [],
    cargo: evaluation.cargo || "",
    area: evaluation.area || "",
    fechaIngreso: evaluation.fechaIngreso || "",
    evaluador: evaluation.evaluador || "",
    puestoEvaluador: evaluation.puestoEvaluador || "",
    factores,
    observacionGeneral: evaluation.observacionGeneral || "",
    aplicaReajuste,
    salario: evaluation.salario || "",
    firmaColaborador: evaluation.firmaColaborador || "",
    puestoColaborador: evaluation.puestoColaborador || "",
    fechaFirmaColaborador: evaluation.fechaFirmaColaborador || "",
    evaluadoPor: evaluation.evaluadoPor || evaluation.evaluador || "",
    fechaFirmaEvaluador: evaluation.fechaFirmaEvaluador || "",
    puntuacion: totals.puntuacion,
    factoresEvaluados: totals.factoresEvaluados,
    factoresNoAplica: totals.factoresNoAplica,
    calificacion,
    gestionHumanaPuntuacion: evaluation.gestionHumanaPuntuacion || "",
    gestionHumanaCalificacion: evaluation.gestionHumanaCalificacion || "",
    firmaFinal: evaluation.firmaFinal || "",
    puestoFirmaFinal: evaluation.puestoFirmaFinal || "",
    nombresFirmaFinal: evaluation.nombresFirmaFinal || "",
    estado: evaluation.estado || "Borrador",
  };
}
