import { calculateCompliance } from "./kpiService";
import { normalizeAreaName, sameArea } from "./permissionsService";
import { resolveCollaboratorHrData, today } from "./hrRecordsService";
import { getAssignedKpisForCollaborator, sameCargo } from "./relationsService";

const STORAGE_KEY = "kpi_daily_records";

export const DAILY_EVENT_TYPES = [
  "Error de entrada",
  "Mala manipulación",
  "Tardanza",
  "Ausencia",
  "Incumplimiento de proceso",
  "Traslado no trabajado",
  "Accidente operativo",
];

export const DAILY_EVENT_TO_INDICATORS = {
  "Error de entrada": ["Errores en Entradas"],
  "Mala manipulación": [
    "Accidentes o mala manipulación",
    "Mala manipulación al llevar mercancía a los almacenes",
  ],
  Tardanza: ["Puntualidad"],
  Ausencia: ["Asistencia", "Puntualidad"],
  "Incumplimiento de proceso": ["Auditoria de Procesos", "Cumplimiento de normas/procesos"],
  "Traslado no trabajado": ["Eficiencia en Traslados"],
  "Accidente operativo": ["Accidentes o mala manipulacion"],
};

export const DAILY_EVENT_RULES = [
  {
    area: "Recepcion de Mercancia",
    cargo: "Lider de Recibo",
    eventos: [
      ["Error de entrada", "Errores en Entradas"],
      ["Tardanza", "Puntualidad"],
      ["Ausencia", "Asistencia"],
      ["Incumplimiento de proceso", "Auditoria de Procesos"],
      ["Traslado no trabajado", "Eficiencia en Traslados"],
    ],
  },
  {
    area: "Recepcion de Mercancia",
    cargo: "Encargado de Recibo",
    eventos: [
      ["Error de entrada", "Errores en Entradas"],
      ["Tardanza", "Puntualidad"],
      ["Ausencia", "Asistencia"],
      ["Incumplimiento de proceso", "Auditoria de Procesos"],
      ["Traslado no trabajado", "Eficiencia en Traslados"],
    ],
  },
  {
    area: "Recepcion de Mercancia",
    cargo: "Auxiliar de Recibo",
    eventos: [
      ["Mala manipulación", "Mala manipulación al llevar mercancía a los almacenes"],
      ["Accidente operativo", "Accidentes o mala manipulación"],
      ["Tardanza", "Puntualidad"],
      ["Ausencia", "Asistencia"],
      ["Incumplimiento de proceso", "Auditoria de Procesos"],
    ],
  },
];

function periodFromDate(dateValue) {
  return String(dateValue || today()).slice(0, 7);
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchesCargo(ruleCargo, cargo) {
  return sameCargo(ruleCargo, cargo);
}

function uniqueEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = `${normalizeText(event.tipoEvento)}|${normalizeText(event.indicadorRelacionado)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function templateIndicatorNames(collaborator, templates) {
  return getAssignedKpisForCollaborator(collaborator, templates)
    .filter((template) => template.estado !== "Inactivo")
    .map((template) => template.indicador)
    .filter(Boolean);
}

function findMatchingIndicator(indicator, candidateIndicators) {
  const direct = candidateIndicators.find((candidate) => normalizeText(candidate) === normalizeText(indicator));
  if (direct) return direct;

  const mapped = Object.entries(DAILY_EVENT_TO_INDICATORS).find(([, indicators]) => {
    return indicators.some((item) => normalizeText(item) === normalizeText(indicator));
  });
  if (!mapped) return "";

  return (
    mapped[1].find((item) => candidateIndicators.some((candidate) => normalizeText(candidate) === normalizeText(item))) ||
    ""
  );
}

function ruleToEvents(rule, indicatorNames) {
  return rule.eventos
    .map(([tipoEvento, indicadorRelacionado]) => ({
      tipoEvento,
      indicadorRelacionado: findMatchingIndicator(indicadorRelacionado, indicatorNames),
      source: "specific",
    }))
    .filter((event) => event.indicadorRelacionado);
}

function deriveEventsFromIndicators(indicatorNames) {
  return Object.entries(DAILY_EVENT_TO_INDICATORS).flatMap(([tipoEvento, indicators]) => {
    return indicators
      .map((indicator) => indicatorNames.find((name) => normalizeText(name) === normalizeText(indicator)))
      .filter(Boolean)
      .map((indicadorRelacionado) => ({
        tipoEvento,
        indicadorRelacionado,
        source: "template",
      }));
  });
}

export function getAllowedDailyEventTypesForUser(user, collaborator = {}, templates = []) {
  if (!user || !collaborator?.id) return [];

  const areaName = collaborator.areaNombre || collaborator.area || user.areaAsignada || "";
  const cargo = collaborator.cargo || "";
  const indicatorNames = templateIndicatorNames(collaborator, templates);
  if (!indicatorNames.length) return [];

  const matchingRules = DAILY_EVENT_RULES.filter((rule) => sameArea(rule.area, areaName) && matchesCargo(rule.cargo, cargo));

  if (matchingRules.length) {
    const specificEvents = uniqueEvents(matchingRules.flatMap((rule) => ruleToEvents(rule, indicatorNames)));
    return specificEvents.length ? specificEvents : uniqueEvents(deriveEventsFromIndicators(indicatorNames));
  }

  return uniqueEvents(deriveEventsFromIndicators(indicatorNames));
}

export function hasSpecificDailyEventConfig(collaborator = {}) {
  const areaName = collaborator.areaNombre || collaborator.area || "";
  const cargo = collaborator.cargo || "";
  return DAILY_EVENT_RULES.some((rule) => sameArea(rule.area, areaName) && matchesCargo(rule.cargo, cargo));
}

export function getDailyKpiRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeDailyKpiRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveDailyKpiRecord(record) {
  const records = getDailyKpiRecords();
  const saved = { ...record, id: record.id || `KPD-${Date.now().toString(36).toUpperCase()}` };
  writeDailyKpiRecords([...records, saved]);
  return saved;
}

export function updateDailyKpiRecord(record) {
  const records = getDailyKpiRecords();
  writeDailyKpiRecords(records.map((item) => (item.id === record.id ? record : item)));
  return record;
}

export function filterDailyKpiRecordsByUser(user, records = []) {
  if (!user) return [];
  if (user.rol === "Gerente") return records;

  const scopeAreas = user.rol === "Encargado" ? [user.areaAsignada] : user.areasSupervisadas || [];
  return records.filter((record) => scopeAreas.some((area) => sameArea(area, record.areaNombre || record.area)));
}

export function normalizeDailyKpiRecord(record = {}, activeUser, colaboradores = [], areas = [], encargados = []) {
  const selected = colaboradores.find((colaborador) => colaborador.id === record.colaboradorId);
  const collaboratorData = selected ? resolveCollaboratorHrData(selected, areas, encargados) : {};
  const now = new Date().toISOString();
  const fecha = record.fecha || today();

  return {
    ...record,
    ...collaboratorData,
    fecha,
    periodo: record.periodo || periodFromDate(fecha),
    cargoColaborador: record.cargoColaborador || selected?.cargo || "",
    tipoEvento: record.tipoEvento || "",
    indicadorRelacionado: record.indicadorRelacionado || "",
    gravedad: record.gravedad || "Media",
    cantidad: Number(record.cantidad || 1),
    descripcion: record.descripcion || "",
    accionCorrectiva: record.accionCorrectiva || "",
    creadoPorId: record.creadoPorId || activeUser?.id || "",
    creadoPorNombre: record.creadoPorNombre || activeUser?.nombre || "",
    creadoPorRol: record.creadoPorRol || activeUser?.rol || "",
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
}

const severityOrder = {
  Baja: 1,
  Media: 2,
  Alta: 3,
  Critica: 4,
  "Crítica": 4,
};

function higherSeverity(current, next) {
  return (severityOrder[next] || 0) > (severityOrder[current] || 0) ? next : current;
}

export function getDailyKpiSummaryForMonthlyEvaluation({
  periodo,
  areaId = "",
  areaNombre = "",
  colaboradorId = "",
  records = [],
}) {
  const grouped = new Map();
  const matchingRecords = records.filter((record) => {
    const samePeriod = !periodo || record.periodo === periodo || periodFromDate(record.fecha) === periodo;
    const sameCollaborator = !colaboradorId || record.colaboradorId === colaboradorId;
    const sameAreaId = !areaId || record.areaId === areaId;
    const sameAreaName = !areaNombre || sameArea(record.areaNombre || record.area, areaNombre);
    return samePeriod && sameCollaborator && (sameAreaId || sameAreaName || (!areaId && !areaNombre));
  });

  matchingRecords.forEach((record) => {
    const indicator = record.indicadorRelacionado || "";
    if (!indicator) return;

    const key = normalizeText(indicator);
    const current = grouped.get(key) || {
      indicadorRelacionado: indicator,
      totalEventos: 0,
      eventosPorTipo: {},
      gravedadMaxima: "",
      menorEsMejor: true,
    };

    const cantidad = Number(record.cantidad || 1);
    current.totalEventos += cantidad;
    current.eventosPorTipo[record.tipoEvento] = (current.eventosPorTipo[record.tipoEvento] || 0) + cantidad;
    current.gravedadMaxima = higherSeverity(current.gravedadMaxima, record.gravedad);
    grouped.set(key, current);
  });

  const first = matchingRecords[0] || {};
  return {
    colaboradorId,
    colaboradorNombre: first.colaboradorNombre || "",
    periodo,
    areaId,
    indicadores: [...grouped.values()],
  };
}

export function applyDailySummaryToIndicators(indicators = [], summary) {
  const summaries = summary?.indicadores || [];
  return indicators.map((indicator) => {
    const daily = summaries.find((item) => {
      return normalizeText(item.indicadorRelacionado) === normalizeText(indicator.indicador);
    });
    if (!daily) return indicator;

    const resultado = Number(daily.totalEventos || 0);
    const menorEsMejor = Boolean(daily.menorEsMejor ?? indicator.menorEsMejor);
    const tipoIndicador = menorEsMejor ? "Menor es mejor" : indicator.tipoIndicador;
    const cumplimiento = calculateCompliance({ meta: indicator.meta, resultado, menorEsMejor });
    const dailyComment = `Precargado desde KPI Diario: ${resultado} evento(s).`;

    return {
      ...indicator,
      tipoIndicador,
      menorEsMejor,
      resultado,
      cumplimiento,
      comentario: indicator.comentario || dailyComment,
    };
  });
}

export function isDailyNegativeIndicator(indicator = "") {
  const key = normalizeAreaName(indicator);
  return [
    "errores entradas",
    "accidentes mala manipulacion",
    "mala manipulacion al llevar mercancia a los almacenes",
    "tardanza",
    "ausencia",
    "incumplimiento proceso",
    "traslado no trabajado",
  ].some((item) => key.includes(item));
}
