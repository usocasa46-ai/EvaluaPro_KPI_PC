export function clampPercentage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

export function roundKpi(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

export function formatPercentage(value) {
  return `${roundKpi(clampPercentage(value))}%`;
}

export function calculateCompliance({ meta, resultado, menorEsMejor }) {
  const target = Number(meta);
  const actual = Number(resultado);

  if (!Number.isFinite(target) || !Number.isFinite(actual)) return 0;

  let compliance = 0;

  if (menorEsMejor) {
    if (target === 0) {
      compliance = actual === 0 ? 100 : 0;
    } else if (actual <= target) {
      compliance = 100;
    } else {
      compliance = (target / actual) * 100;
    }
  } else if (target > 0) {
    compliance = (actual / target) * 100;
  }

  return roundKpi(clampPercentage(compliance));
}

export function calculateWeightedKpi(indicators = []) {
  if (!Array.isArray(indicators) || indicators.length === 0) return 0;

  const normalizedIndicators = indicators.map((item) => {
    const peso = Number(item.peso ?? item.weight ?? 0);
    const cumplimiento = calculateCompliance({
      meta: item.meta,
      resultado: item.resultado ?? item.resultadoObtenido,
      menorEsMejor: Boolean(item.menorEsMejor ?? item.tipoIndicador === "Menor es mejor"),
    });

    return {
      ...item,
      peso,
      cumplimiento,
    };
  });

  const totalPeso = normalizedIndicators.reduce((sum, item) => sum + Number(item.peso || 0), 0);

  if (totalPeso <= 0) {
    const average =
      normalizedIndicators.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) /
      normalizedIndicators.length;

    return roundKpi(clampPercentage(average));
  }

  const weighted = normalizedIndicators.reduce((sum, item) => {
    return sum + (Number(item.cumplimiento || 0) * Number(item.peso || 0)) / totalPeso;
  }, 0);

  return roundKpi(clampPercentage(weighted));
}

export function calculateCollaboratorKpi(evaluation) {
  if (!evaluation) return 0;
  if (evaluation.kpi !== undefined && evaluation.kpi !== null && evaluation.kpi !== "") {
    return roundKpi(clampPercentage(evaluation.kpi));
  }
  if (evaluation.kpiMensual !== undefined && evaluation.kpiMensual !== null && evaluation.kpiMensual !== "") {
    return roundKpi(clampPercentage(evaluation.kpiMensual));
  }

  const value =
    Number(evaluation.puntualidad || 0) * 0.1 +
    Number(evaluation.asistencia || 0) * 0.1 +
    Number(evaluation.productividad || 0) * 0.3 +
    Number(evaluation.calidad || 0) * 0.2 +
    Number(evaluation.procesos || 0) * 0.15 +
    Number(evaluation.servicio || 0) * 0.1 +
    Number(evaluation.incidencias || 0) * 0.05;

  return roundKpi(clampPercentage(value));
}

export function calculateSubgerenteKpi(evaluation) {
  if (!evaluation) return 0;

  const value =
    Number(evaluation.cumplimientoOperativo || 0) * 0.25 +
    Number(evaluation.seguimientoEncargados || 0) * 0.2 +
    Number(evaluation.controlIncidencias || 0) * 0.15 +
    Number(evaluation.cumplimientoMetas || 0) * 0.2 +
    Number(evaluation.liderazgo || 0) * 0.1 +
    Number(evaluation.comunicacion || 0) * 0.1;

  return roundKpi(clampPercentage(value));
}

export function getKpiResult(kpi) {
  const safeKpi = clampPercentage(kpi);
  if (safeKpi >= 90) return "Excelente";
  if (safeKpi >= 80) return "Bueno";
  if (safeKpi >= 70) return "Regular";
  if (safeKpi >= 60) return "Bajo";
  return "Crítico";
}

export function getKpiTone(kpi) {
  const safeKpi = clampPercentage(kpi);
  if (safeKpi >= 85) return "success";
  if (safeKpi >= 70) return "warning";
  return "danger";
}

export function withCollaboratorKpi(evaluations) {
  return evaluations.map((evaluation) => {
    const kpi = calculateCollaboratorKpi(evaluation);

    return {
      ...evaluation,
      kpi,
      resultado: getKpiResult(kpi),
    };
  });
}

export function withSubgerenteKpi(evaluations) {
  return evaluations.map((evaluation) => {
    const kpi = calculateSubgerenteKpi(evaluation);

    return {
      ...evaluation,
      kpi,
      resultado: getKpiResult(kpi),
    };
  });
}

export function calculateAreaKpi(areaName, evaluationsKpi, incidencias) {
  const areaEvaluations = evaluationsKpi.filter((evaluation) => evaluation.area === areaName);
  const average = areaEvaluations.length
    ? areaEvaluations.reduce((sum, evaluation) => sum + clampPercentage(evaluation.kpi || 0), 0) / areaEvaluations.length
    : 0;

  const openIncidents = incidencias.filter((incident) => incident.area === areaName && incident.estado !== "Cerrada");
  const incidentPenalty = openIncidents.reduce((sum, incident) => {
    if (incident.gravedad === "Crítica") return sum + 4;
    if (incident.gravedad === "Alta") return sum + 3;
    if (incident.gravedad === "Media") return sum + 2;
    return sum + 1;
  }, 0);

  return roundKpi(clampPercentage(average - incidentPenalty));
}

export function getAreaSummary(areas, evaluationsKpi, encargados, colaboradores, incidencias) {
  return areas
    .map((area) => {
      const areaName = area.nombre || area.area;
      const areaCollaborators = colaboradores.filter((collaborator) => collaborator.area === areaName);
      const areaIncidents = incidencias.filter((incident) => incident.area === areaName && incident.estado !== "Cerrada");
      const encargado = area.encargado || encargados.find((item) => item.area === areaName)?.nombre || "Sin asignar";

      return {
        id: area.id || areaName,
        area: areaName,
        estado: area.estado || "Activo",
        encargado,
        colaboradores: areaCollaborators.length,
        incidencias: areaIncidents.length,
        kpi: calculateAreaKpi(areaName, evaluationsKpi, incidencias),
      };
    })
    .sort((a, b) => b.kpi - a.kpi);
}

export function getEncargadoSummary(encargados, areaSummary) {
  return encargados.map((encargado) => {
    const area = areaSummary.find((item) => item.area === encargado.area);
    const kpi = area?.kpi || 0;

    return {
      ...encargado,
      kpi,
      resultado: getKpiResult(kpi),
      incidencias: area?.incidencias || 0,
      colaboradores: area?.colaboradores || 0,
    };
  });
}

export function getSubgerenteSummary(subgerentes, areaSummary, manualEvaluations) {
  return subgerentes.map((subgerente) => {
    const areas = Array.isArray(subgerente.areas) ? subgerente.areas : [];
    const coveredAreas = areaSummary.filter((area) => areas.includes(area.area));
    const operationalKpi = coveredAreas.length
      ? coveredAreas.reduce((sum, area) => sum + area.kpi, 0) / coveredAreas.length
      : 0;
    const latestManual = manualEvaluations
      .filter((evaluation) => evaluation.subgerenteId === subgerente.id)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
    const manualKpi = latestManual?.kpi ?? calculateSubgerenteKpi(latestManual);
    const finalKpi = latestManual ? roundKpi(clampPercentage((operationalKpi + manualKpi) / 2)) : roundKpi(clampPercentage(operationalKpi));

    return {
      ...subgerente,
      areasTexto: areas.join(", "),
      kpiOperativo: roundKpi(clampPercentage(operationalKpi)),
      kpiManual: latestManual ? roundKpi(clampPercentage(manualKpi)) : "Sin evaluación",
      kpi: finalKpi,
      resultado: getKpiResult(finalKpi),
    };
  });
}

export function getGeneralKpi(evaluationsKpi) {
  if (!evaluationsKpi.length) return 0;
  return roundKpi(
    clampPercentage(evaluationsKpi.reduce((sum, evaluation) => sum + clampPercentage(evaluation.kpi || 0), 0) / evaluationsKpi.length)
  );
}
