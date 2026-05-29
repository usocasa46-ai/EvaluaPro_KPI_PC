import {
  calculateCompliance as calculateCentralCompliance,
  calculateWeightedKpi,
  clampPercentage,
  roundKpi,
} from "./kpiService";

export function normalizeTemplate(template = {}) {
  const menorEsMejor = Boolean(template.menorEsMejor ?? template.tipoIndicador === "Menor es mejor");

  return {
    id: template.id || template.templateId || "",
    areaId: template.areaId || "",
    areaNombre: template.areaNombre || template.area || "",
    area: template.areaNombre || template.area || "",
    cargo: template.cargo || template.puesto || "",
    puesto: template.cargo || template.puesto || "",
    indicador: template.indicador || "",
    tipoIndicador: menorEsMejor ? "Menor es mejor" : template.tipoIndicador || "Mayor es mejor",
    menorEsMejor,
    peso: Number(template.peso || 0),
    meta: Number(template.meta || 0),
    estado: template.estado || "Activo",
    createdAt: template.createdAt || "",
    updatedAt: template.updatedAt || "",
  };
}

export function calculateMonthlyCompliance(meta, resultado, tipoIndicador = "Mayor es mejor", menorEsMejor = false) {
  return calculateCentralCompliance({
    meta,
    resultado,
    menorEsMejor: menorEsMejor || tipoIndicador === "Menor es mejor",
  });
}

export function calculateMonthlyKpi(indicators = []) {
  return calculateWeightedKpi(indicators);
}

export function buildEvaluationIndicators(templates = [], savedIndicators = []) {
  return templates.map((template) => {
    const normalizedTemplate = normalizeTemplate(template);
    const saved = savedIndicators.find((indicator) => {
      return indicator.templateId === normalizedTemplate.id || indicator.indicador === normalizedTemplate.indicador;
    });
    const meta = Number(saved?.meta ?? normalizedTemplate.meta ?? 0);
    const resultado = Number(saved?.resultado ?? 0);
    const tipoIndicador = saved?.tipoIndicador || normalizedTemplate.tipoIndicador;
    const menorEsMejor = Boolean(saved?.menorEsMejor ?? normalizedTemplate.menorEsMejor);
    const cumplimiento = calculateCentralCompliance({ meta, resultado, menorEsMejor });

    return {
      templateId: normalizedTemplate.id,
      areaId: normalizedTemplate.areaId,
      areaNombre: normalizedTemplate.areaNombre,
      area: normalizedTemplate.area,
      cargo: normalizedTemplate.cargo,
      puesto: normalizedTemplate.puesto,
      indicador: normalizedTemplate.indicador,
      tipoIndicador,
      menorEsMejor,
      peso: Number(saved?.peso ?? normalizedTemplate.peso ?? 0),
      meta,
      resultado,
      cumplimiento,
      comentario: saved?.comentario || "",
    };
  });
}

function normalizeEvaluationIndicators(indicators = []) {
  return indicators.map((indicator) => {
    const meta = Number(indicator.meta || 0);
    const resultado = Number(indicator.resultado || 0);
    const menorEsMejor = Boolean(indicator.menorEsMejor ?? indicator.tipoIndicador === "Menor es mejor");
    const tipoIndicador = menorEsMejor ? "Menor es mejor" : indicator.tipoIndicador || "Mayor es mejor";

    return {
      ...indicator,
      peso: Number(indicator.peso || 0),
      meta,
      resultado,
      tipoIndicador,
      menorEsMejor,
      cumplimiento: calculateCentralCompliance({ meta, resultado, menorEsMejor }),
      comentario: indicator.comentario || "",
    };
  });
}

function normalizeEvaluationMember(member = {}) {
  const indicadores = normalizeEvaluationIndicators(member.indicadores || []);

  return {
    ...member,
    colaboradorId: member.colaboradorId || "",
    colaboradorNombre: member.colaboradorNombre || member.colaborador || "",
    puesto: member.puesto || member.cargo || "",
    indicadores,
    kpiMensual: calculateMonthlyKpi(indicadores),
  };
}

export function normalizeMonthlyEvaluation(evaluation = {}) {
  const normalizedIndicators = normalizeEvaluationIndicators(evaluation.indicadores || []);
  const rawMode = evaluation.modo || evaluation.modoEvaluacion || "";
  const sourceMembers = rawMode === "equipo" && Array.isArray(evaluation.colaboradoresEvaluados)
    ? evaluation.colaboradoresEvaluados
    : rawMode === "equipo" && Array.isArray(evaluation.equipo)
      ? evaluation.equipo
      : [];

  const normalizedMembers = sourceMembers.map((member) => normalizeEvaluationMember(member));
  const mode = rawMode || (normalizedMembers.length ? "equipo" : "individual");
  const individualMember =
    mode !== "equipo" && !normalizedMembers.length && (evaluation.colaboradorId || evaluation.colaboradorNombre)
      ? [
          normalizeEvaluationMember({
            colaboradorId: evaluation.colaboradorId,
            colaboradorNombre: evaluation.colaboradorNombre || evaluation.colaborador,
            puesto: evaluation.puesto || evaluation.cargo || "",
            indicadores: normalizedIndicators,
          }),
        ]
      : [];
  const colaboradoresEvaluados = normalizedMembers.length ? normalizedMembers : individualMember;

  const kpiMensual = colaboradoresEvaluados.length
    ? roundKpi(
        clampPercentage(
          colaboradoresEvaluados.reduce((sum, member) => sum + clampPercentage(member.kpiMensual || 0), 0) /
            colaboradoresEvaluados.length
        )
      )
    : calculateMonthlyKpi(normalizedIndicators);

  return {
    id: evaluation.id || "",
    periodo: evaluation.periodo || "",
    area: evaluation.area || "",
    modo: mode,
    modoEvaluacion: mode,
    colaboradorId: evaluation.colaboradorId || "",
    colaboradorNombre: evaluation.colaboradorNombre || evaluation.colaborador || "",
    colaborador: evaluation.colaboradorNombre || evaluation.colaborador || "",
    evaluadorId: evaluation.evaluadorId || "",
    evaluadorNombre: evaluation.evaluadorNombre || "",
    evaluadorRol: evaluation.evaluadorRol || "",
    createdByUserId: evaluation.createdByUserId || evaluation.evaluadorId || "",
    createdByName: evaluation.createdByName || evaluation.evaluadorNombre || "",
    createdByRole: evaluation.createdByRole || evaluation.evaluadorRol || "",
    indicadores: normalizedIndicators,
    colaboradoresEvaluados,
    equipo: mode === "equipo" ? colaboradoresEvaluados : [],
    kpiMensual,
    kpiPromedioEquipo: mode === "equipo" ? kpiMensual : 0,
    estado: evaluation.estado || "Borrador",
    createdAt: evaluation.createdAt || "",
  };
}
