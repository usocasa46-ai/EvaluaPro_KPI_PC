import * as XLSX from "xlsx";
import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService.js";
import { sameArea } from "./permissionsService.js";

const REQUIRED_COLUMNS = [
  { key: "codigoEmpleado", label: "Código empleado" },
  { key: "nombre", label: "Nombre completo" },
  { key: "area", label: "Área" },
  { key: "cargo", label: "Cargo" },
  { key: "turno", label: "Turno" },
  { key: "fechaIngreso", label: "Fecha ingreso" },
  { key: "estado", label: "Estado" },
];

const COLUMN_ALIASES = {
  codigoEmpleado: ["Código empleado", "Codigo empleado", "Código", "Codigo", "Empleado"],
  nombre: ["Nombre completo", "Nombre", "Colaborador"],
  area: ["Área", "Area"],
  cargo: ["Cargo", "Puesto", "Posición", "Posicion"],
  turno: ["Turno"],
  fechaIngreso: ["Fecha ingreso", "Fecha de ingreso", "Fecha entrada", "Fecha de entrada"],
  estado: ["Estado"],
  telefono: ["Teléfono", "Telefono", "Tel"],
  correo: ["Correo", "Email", "E-mail"],
  observacion: ["Observación", "Observacion", "Comentario"],
};

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sameCargo(left, right) {
  const leftName = normalizeText(left);
  const rightName = normalizeText(right);
  return Boolean(leftName && rightName && leftName === rightName);
}

function getAreaName(area) {
  return area?.nombre || area?.areaNombre || area?.area || "";
}

function getManagerByArea(areas = [], encargados = [], areaIdOrName) {
  const area = areas.find((item) => item.id === areaIdOrName || sameArea(getAreaName(item), areaIdOrName));
  const areaName = getAreaName(area) || areaIdOrName;
  const areaManagerId = area?.encargadoId || "";

  return (
    encargados.find((encargado) => encargado.id === areaManagerId) ||
    encargados.find((encargado) => encargado.areaId === area?.id) ||
    encargados.find((encargado) => sameArea(encargado.areaNombre || encargado.area, areaName)) ||
    null
  );
}

function hasValue(value) {
  return String(value ?? "").trim() !== "";
}

function normalizeDate(value) {
  if (!value && value !== 0) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const text = String(value).trim();
  if (!text) return "";

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);

  return text;
}

function buildColumnMap(headers = []) {
  const normalizedHeaders = headers.map((header) => compactText(header));
  return Object.entries(COLUMN_ALIASES).reduce((map, [field, aliases]) => {
    const aliasSet = new Set(aliases.map((alias) => compactText(alias)));
    const index = normalizedHeaders.findIndex((header) => aliasSet.has(header));
    if (index >= 0) map[field] = index;
    return map;
  }, {});
}

function findHeaderRow(rows = []) {
  let best = { index: -1, columnMap: {}, score: 0 };

  rows.forEach((row, index) => {
    if (!Array.isArray(row) || !row.some(hasValue)) return;
    const columnMap = buildColumnMap(row);
    const score = REQUIRED_COLUMNS.filter((column) => columnMap[column.key] !== undefined).length;
    if (score > best.score) best = { index, columnMap, score };
  });

  return best;
}

function readCell(row, columnMap, key) {
  const index = columnMap[key];
  return index === undefined ? "" : row[index];
}

function rowIsEmpty(row, columnMap) {
  return Object.keys(COLUMN_ALIASES).every((key) => !hasValue(readCell(row, columnMap, key)));
}

function templatesToAssignedIndicators(templates = []) {
  return templates.map((template) => ({
    templateId: template.id,
    areaId: template.areaId || "",
    areaNombre: template.areaNombre || template.area || "",
    cargo: template.cargo || template.puesto || "",
    indicador: template.indicador,
    tipoIndicador: template.tipoIndicador,
    peso: Number(template.peso || 0),
    meta: Number(template.meta || 0),
    menorEsMejor: Boolean(template.menorEsMejor),
  }));
}

function findAreaByName(areas = [], areaName = "") {
  return areas.find((area) => sameArea(area.nombre || area.areaNombre || area.area, areaName)) || null;
}

function findActiveTemplatesByAreaAndCargo(templates = [], area, cargo = "") {
  if (!area || !normalizeText(cargo)) return [];

  return templates.filter((template) => {
    const templateAreaName = template.areaNombre || template.area || "";
    const sameTemplateAreaById = Boolean(template.areaId && area.id && template.areaId === area.id);
    const sameTemplateAreaByName = sameArea(templateAreaName, area.nombre || area.areaNombre || area.area);
    return template.estado !== "Inactivo" && (sameTemplateAreaById || sameTemplateAreaByName) && sameCargo(template.cargo || template.puesto, cargo);
  });
}

function getExistingCodeSet(colaboradores = []) {
  return new Set(colaboradores.map((colaborador) => normalizeText(colaborador.codigoEmpleado || colaborador.id)).filter(Boolean));
}

export async function parseCollaboratorsExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error("El archivo no contiene hojas para importar.");

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  const header = findHeaderRow(matrix);

  if (header.index < 0 || header.score === 0) {
    throw new Error("El archivo no contiene encabezados válidos para carga masiva.");
  }

  const missing = REQUIRED_COLUMNS.filter((column) => header.columnMap[column.key] === undefined);
  if (missing.length) {
    throw new Error(`El archivo no contiene la columna requerida: ${missing[0].label}.`);
  }

  return matrix
    .slice(header.index + 1)
    .map((row, index) => ({ row, rowNumber: header.index + index + 2 }))
    .filter(({ row }) => !rowIsEmpty(row, header.columnMap))
    .map(({ row, rowNumber }) => ({
      rowNumber,
      codigoEmpleado: String(readCell(row, header.columnMap, "codigoEmpleado") ?? "").trim(),
      nombre: String(readCell(row, header.columnMap, "nombre") ?? "").trim(),
      area: String(readCell(row, header.columnMap, "area") ?? "").trim(),
      cargo: String(readCell(row, header.columnMap, "cargo") ?? "").trim(),
      turno: String(readCell(row, header.columnMap, "turno") ?? "").trim(),
      fechaIngreso: normalizeDate(readCell(row, header.columnMap, "fechaIngreso")),
      estado: String(readCell(row, header.columnMap, "estado") ?? "").trim(),
      telefono: String(readCell(row, header.columnMap, "telefono") ?? "").trim(),
      correo: String(readCell(row, header.columnMap, "correo") ?? "").trim(),
      observacion: String(readCell(row, header.columnMap, "observacion") ?? "").trim(),
    }));
}

export function buildCollaboratorFromRow(row, context = {}) {
  const area = findAreaByName(context.areas, row.area);
  const manager = area ? getManagerByArea(context.areas, context.encargados, area.id || area.nombre) : null;
  const templates = area ? findActiveTemplatesByAreaAndCargo(context.kpiTemplates, area, row.cargo) : [];
  const now = new Date().toISOString();

  return {
    id: `COL-${String(row.codigoEmpleado).replace(/\s+/g, "").toUpperCase()}`,
    codigoEmpleado: row.codigoEmpleado,
    nombre: row.nombre,
    areaId: area?.id || "",
    areaNombre: area?.nombre || row.area,
    area: area?.nombre || row.area,
    encargadoId: manager?.id || "",
    encargadoNombre: manager?.nombre || "",
    encargado: manager?.nombre || "",
    cargo: row.cargo,
    turno: row.turno,
    fechaIngreso: row.fechaIngreso,
    fechaEntrada: row.fechaIngreso,
    estado: row.estado || "Activo",
    telefono: row.telefono || "",
    correo: row.correo || "",
    observacion: row.observacion || "",
    kpiTemplateIds: templates.map((template) => template.id),
    indicadoresAsignados: templatesToAssignedIndicators(templates),
    createdAt: now,
    updatedAt: now,
  };
}

export function validateCollaboratorRows(rows = [], context = {}) {
  const existingCodes = getExistingCodeSet(context.colaboradores);
  const seenCodes = new Set();

  return rows.map((row) => {
    const errors = [];
    const normalizedCode = normalizeText(row.codigoEmpleado);
    const area = findAreaByName(context.areas, row.area);
    const manager = area ? getManagerByArea(context.areas, context.encargados, area.id || area.nombre) : null;
    const templates = area ? findActiveTemplatesByAreaAndCargo(context.kpiTemplates, area, row.cargo) : [];

    REQUIRED_COLUMNS.forEach((column) => {
      if (!hasValue(row[column.key])) errors.push(`${column.label} es obligatorio.`);
    });

    if (normalizedCode && existingCodes.has(normalizedCode)) errors.push("Ya existe otro colaborador con el mismo código empleado.");
    if (normalizedCode && seenCodes.has(normalizedCode)) errors.push("Código empleado duplicado dentro del archivo.");
    if (normalizedCode) seenCodes.add(normalizedCode);
    if (row.area && !area) errors.push("El área no existe.");
    if (area && !manager) errors.push("El área no tiene encargado asignado.");
    if (area && row.cargo && !templates.length) errors.push("No existe plantilla KPI activa para esa área y cargo.");

    const collaborator = errors.length ? null : buildCollaboratorFromRow(row, context);

    return {
      ...row,
      areaId: area?.id || "",
      areaNombre: area?.nombre || row.area,
      encargadoId: manager?.id || "",
      encargadoNombre: manager?.nombre || "",
      plantillaKpiDetectada: templates.map((template) => template.indicador || template.nombre || template.id).join(", "),
      kpiTemplateIds: templates.map((template) => template.id),
      indicadoresAsignados: templatesToAssignedIndicators(templates),
      collaborator,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function importValidCollaborators(validRows = [], options = {}) {
  const collaborators = validRows.map((row) => row.collaborator || buildCollaboratorFromRow(row, options.context));

  if (typeof options.onImport === "function") {
    collaborators.forEach((collaborator) => options.onImport(collaborator));
    return collaborators;
  }

  const current = readStorage(STORAGE_KEYS.colaboradores, []);
  const merged = [...current];
  collaborators.forEach((collaborator) => {
    const index = merged.findIndex((item) => normalizeText(item.codigoEmpleado || item.id) === normalizeText(collaborator.codigoEmpleado));
    if (index >= 0) merged[index] = { ...merged[index], ...collaborator, id: merged[index].id };
    else merged.push(collaborator);
  });
  writeStorage(STORAGE_KEYS.colaboradores, merged);
  return collaborators;
}

export function generateCollaboratorTemplate() {
  const headers = [
    "Código empleado",
    "Nombre completo",
    "Área",
    "Cargo",
    "Turno",
    "Fecha ingreso",
    "Estado",
    "Teléfono",
    "Correo",
    "Observación",
  ];
  const example = ["EMP-001", "Nombre Apellido", "Fruver", "Auxiliar", "Mañana", "2026-01-15", "Activo", "", "", ""];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Carga Colaboradores");
  XLSX.writeFile(workbook, "plantilla_carga_colaboradores.xlsx");
}
