import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";
import { normalizeCompanyCode } from "./companyService";

export const SYSTEM_MODULE_CATALOG = [
  { id: "dashboard", nombre: "Dashboard", tipo: "Base" },
  { id: "areas", nombre: "Areas y Departamentos", tipo: "Catalogo" },
  { id: "colaboradores", nombre: "Colaboradores", tipo: "Catalogo" },
  { id: "encargados", nombre: "Encargados", tipo: "Catalogo" },
  { id: "subgerentes", nombre: "Subgerentes", tipo: "Catalogo" },
  { id: "evaluacionKpiMensual", nombre: "KPI Mensual", tipo: "Medible KPI" },
  { id: "kpiDiario", nombre: "KPI Diario", tipo: "Control operativo" },
  { id: "plantillasKpiArea", nombre: "Plantillas KPI", tipo: "Medible KPI" },
  { id: "evaluacionTrimestral", nombre: "Evaluacion Trimestral", tipo: "Formulario" },
  { id: "evaluacionEncargados", nombre: "Evaluacion Encargados", tipo: "Evaluacion" },
  { id: "evaluacionSubgerentes", nombre: "Evaluacion Subgerentes", tipo: "Evaluacion" },
  { id: "reportes", nombre: "Reportes", tipo: "Reporte" },
  { id: "permisos", nombre: "Permisos", tipo: "Formulario" },
  { id: "vacaciones", nombre: "Vacaciones", tipo: "Formulario" },
  { id: "amonestaciones", nombre: "Amonestaciones", tipo: "Formulario" },
  { id: "trasladosPendientes", nombre: "Traslados Pendientes", tipo: "Importador Excel" },
  { id: "analisisMovimientoProductos", nombre: "Analisis Movimiento", tipo: "Importador Excel" },
  { id: "analisisPonche", nombre: "Analisis Ponche", tipo: "Importador Excel" },
  { id: "usuarios-roles", nombre: "Usuarios y Roles", tipo: "Administracion empresa" },
  { id: "configuracion", nombre: "Configuracion de Empresa", tipo: "Administracion empresa" },
  { id: "otros", nombre: "Otros", tipo: "Control operativo" },
];

export function normalizeSystemModule(module = {}) {
  return {
    id: module.id || "",
    nombre: String(module.nombre || module.label || module.id || "").trim(),
    tipo: String(module.tipo || "Modulo").trim(),
    estado: module.estado || "Activo",
    descripcion: String(module.descripcion || "").trim(),
    updatedAt: module.updatedAt || "",
  };
}

export function getAvailableSystemModules() {
  const saved = readStorage(STORAGE_KEYS.availableSystemModules, null);
  if (!Array.isArray(saved) || !saved.length) return SYSTEM_MODULE_CATALOG.map(normalizeSystemModule);

  const savedIds = new Set(saved.map((module) => module.id));
  const missingDefaults = SYSTEM_MODULE_CATALOG.filter((module) => !savedIds.has(module.id));
  return [...saved, ...missingDefaults].map(normalizeSystemModule);
}

export function saveAvailableSystemModules(modules = []) {
  const saved = Array.isArray(modules) ? modules.map(normalizeSystemModule) : [];
  writeStorage(STORAGE_KEYS.availableSystemModules, saved);
  return saved;
}

export function upsertSystemModule(modules = [], module = {}) {
  const saved = normalizeSystemModule({ ...module, updatedAt: new Date().toISOString() });
  const exists = modules.some((item) => item.id === saved.id);
  return exists
    ? modules.map((item) => (item.id === saved.id ? saved : item))
    : [...modules, saved];
}

function parseLines(value = "") {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeCustomCompanyModule(module = {}) {
  const now = new Date().toISOString();
  return {
    id: module.id || `CCM-${Date.now().toString(36).toUpperCase()}`,
    empresaId: module.empresaId || "",
    codigoEmpresa: normalizeCompanyCode(module.codigoEmpresa || ""),
    nombreModulo: String(module.nombreModulo || "").trim(),
    descripcion: String(module.descripcion || "").trim(),
    tipoModulo: module.tipoModulo || "Control operativo",
    estado: module.estado || "Activo",
    rolesPermitidos: Array.isArray(module.rolesPermitidos) ? module.rolesPermitidos : [],
    campos: Array.isArray(module.campos) ? module.campos : parseLines(module.camposTexto).map((name) => ({ nombreCampo: name, tipoCampo: "Texto", requerido: false })),
    indicadores: Array.isArray(module.indicadores) ? module.indicadores : parseLines(module.indicadoresTexto),
    createdAt: module.createdAt || now,
    updatedAt: module.updatedAt || now,
  };
}

export function getCustomCompanyModules() {
  const modules = readStorage(STORAGE_KEYS.customCompanyModules, []);
  return Array.isArray(modules) ? modules.map((module) => normalizeCustomCompanyModule(module)) : [];
}

export function saveCustomCompanyModules(modules = []) {
  const saved = Array.isArray(modules) ? modules.map((module) => normalizeCustomCompanyModule(module)) : [];
  writeStorage(STORAGE_KEYS.customCompanyModules, saved);
  return saved;
}

export function upsertCustomCompanyModule(modules = [], module = {}) {
  const saved = normalizeCustomCompanyModule({ ...module, updatedAt: new Date().toISOString() });
  const exists = modules.some((item) => item.id === saved.id);
  return exists
    ? modules.map((item) => (item.id === saved.id ? saved : item))
    : [...modules, saved];
}

export function getCustomModulesForCompany(modules = [], company, role) {
  if (!company) return [];
  return modules.filter((module) => {
    const sameCompany = module.empresaId === company.id || normalizeCompanyCode(module.codigoEmpresa) === normalizeCompanyCode(company.codigoEmpresa);
    const roleAllowed = !module.rolesPermitidos?.length || module.rolesPermitidos.includes(role);
    return sameCompany && roleAllowed && module.estado !== "Inactivo";
  });
}
