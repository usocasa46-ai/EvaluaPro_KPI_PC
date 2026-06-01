import { normalizeConfig } from "./configService";
import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";
import { isSuperadmin } from "./permissionsService";

export const DEFAULT_COMPANY_ID = "COMP-SUPERMIX";
export const DEFAULT_COMPANY_CODE = "SUPERMIX";

export const COMPANY_RECORD_KEYS = [
  STORAGE_KEYS.areas,
  STORAGE_KEYS.encargados,
  STORAGE_KEYS.colaboradores,
  STORAGE_KEYS.evaluaciones,
  STORAGE_KEYS.evaluacionesTrimestrales,
  STORAGE_KEYS.kpiAreaTemplates,
  STORAGE_KEYS.kpiMonthlyEvaluations,
  STORAGE_KEYS.kpiDailyRecords,
  STORAGE_KEYS.vacacionesRecords,
  STORAGE_KEYS.permisosRecords,
  STORAGE_KEYS.amonestacionesRecords,
  STORAGE_KEYS.incidencias,
  STORAGE_KEYS.subgerentes,
  STORAGE_KEYS.evaluacionesSubgerente,
  STORAGE_KEYS.evaluacionesEncargado,
  STORAGE_KEYS.gerentes,
];

export const DEFAULT_COMPANY_MODULES = [
  "dashboard",
  "areas",
  "subgerentes",
  "encargados",
  "colaboradores",
  "kpiDiario",
  "analisisMovimientoProductos",
  "trasladosPendientes",
  "evaluacionKpiMensual",
  "evaluacionTrimestral",
  "evaluaciones",
  "evaluacionEncargados",
  "evaluacionSubgerentes",
  "plantillasKpiArea",
  "vacaciones",
  "permisos",
  "amonestaciones",
  "incidencias",
  "gerentes",
  "usuarios-roles",
  "reportes",
  "configuracion",
];

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeCompanyCode(value = "") {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .toUpperCase();
}

function makeCompanyId(code) {
  return `COMP-${normalizeCompanyCode(code) || Date.now().toString(36).toUpperCase()}`;
}

export function normalizeCompany(company = {}) {
  const now = new Date().toISOString();
  const codigoEmpresa = normalizeCompanyCode(company.codigoEmpresa || company.codigo || company.code);
  const nombreEmpresa = cleanText(company.nombreEmpresa || company.nombre || company.name);

  return {
    id: company.id || makeCompanyId(codigoEmpresa),
    codigoEmpresa,
    nombreEmpresa,
    tipoNegocio: cleanText(company.tipoNegocio || company.tipo || "Supermercado"),
    estado: company.estado || "Activa",
    modulosActivos: Array.isArray(company.modulosActivos) ? company.modulosActivos : DEFAULT_COMPANY_MODULES,
    configuracion: company.configuracion || {},
    creadoPorId: company.creadoPorId || company.createdById || "",
    createdAt: company.createdAt || now,
    updatedAt: company.updatedAt || now,

    // Alias de compatibilidad con la pantalla anterior.
    nombre: nombreEmpresa,
    rnc: cleanText(company.rnc),
    direccion: cleanText(company.direccion || company.address),
    telefono: cleanText(company.telefono || company.phone),
    correo: cleanText(company.correo || company.email),
    responsable: cleanText(company.responsable),
    plan: company.plan || "Local",
    observacion: cleanText(company.observacion),
    createdById: company.createdById || company.creadoPorId || "",
    createdByName: company.createdByName || "",
  };
}

export function createDefaultCompany(config = {}) {
  const normalizedConfig = normalizeConfig(config);
  return normalizeCompany({
    id: DEFAULT_COMPANY_ID,
    codigoEmpresa: DEFAULT_COMPANY_CODE,
    nombreEmpresa: "Supermix",
    tipoNegocio: "Supermercado",
    estado: "Activa",
    modulosActivos: DEFAULT_COMPANY_MODULES,
    configuracion: normalizedConfig,
    responsable: "Superadmin Sistema",
    observacion: "Empresa inicial para conservar los datos actuales del sistema.",
  });
}

export function getCompanies() {
  const companies = readStorage(STORAGE_KEYS.companies, null);
  if (Array.isArray(companies) && companies.length) return companies.map((company) => normalizeCompany(company));

  const legacyCompanies = readStorage(STORAGE_KEYS.legacyCompanies, []);
  if (Array.isArray(legacyCompanies) && legacyCompanies.length) {
    const migrated = legacyCompanies.map((company) => normalizeCompany(company));
    saveCompanies(migrated);
    return migrated;
  }

  return [];
}

export function saveCompanies(companies = []) {
  const normalized = Array.isArray(companies) ? companies.map((company) => normalizeCompany(company)) : [];
  writeStorage(STORAGE_KEYS.companies, normalized);
  return normalized;
}

export function ensureDefaultCompany(companies = getCompanies(), config = {}) {
  const safeCompanies = Array.isArray(companies) ? companies.map((company) => normalizeCompany(company)) : [];
  const existing = safeCompanies.find((company) => company.codigoEmpresa === DEFAULT_COMPANY_CODE);
  if (existing) {
    if (!safeCompanies.length) saveCompanies([existing]);
    return existing;
  }

  const defaultCompany = createDefaultCompany(config);
  saveCompanies([...safeCompanies, defaultCompany]);
  return defaultCompany;
}

export function ensureDefaultCompanies(companies = getCompanies(), config = {}) {
  const safeCompanies = Array.isArray(companies) ? companies.map((company) => normalizeCompany(company)) : [];
  const hasDefault = safeCompanies.some((company) => company.codigoEmpresa === DEFAULT_COMPANY_CODE);
  return hasDefault ? safeCompanies : [...safeCompanies, createDefaultCompany(config)];
}

export function createCompany(companyData = {}) {
  const currentCompanies = getCompanies();
  const saved = normalizeCompany({
    ...companyData,
    id: companyData.id || makeCompanyId(companyData.codigoEmpresa || companyData.codigo),
    createdAt: companyData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const exists = currentCompanies.some((company) => company.codigoEmpresa === saved.codigoEmpresa && company.id !== saved.id);
  if (exists) {
    return { ok: false, message: "Ya existe una empresa con ese codigo.", company: null };
  }

  const nextCompanies = currentCompanies.some((company) => company.id === saved.id)
    ? currentCompanies.map((company) => (company.id === saved.id ? saved : company))
    : [...currentCompanies, saved];
  saveCompanies(nextCompanies);
  return { ok: true, company: saved };
}

export function updateCompany(companyId, updates = {}) {
  const currentCompanies = getCompanies();
  const nextCompanies = currentCompanies.map((company) =>
    company.id === companyId ? normalizeCompany({ ...company, ...updates, updatedAt: new Date().toISOString() }) : company
  );
  saveCompanies(nextCompanies);
  return nextCompanies.find((company) => company.id === companyId) || null;
}

export function getCompanyByCode(code) {
  const normalizedCode = normalizeCompanyCode(code);
  return getCompanies().find((company) => company.codigoEmpresa === normalizedCode) || null;
}

export function getCompanyById(id) {
  return getCompanies().find((company) => company.id === id) || null;
}

export function getActiveCompany() {
  const active = readStorage(STORAGE_KEYS.activeCompany, null);
  return active ? normalizeCompany(active) : null;
}

export function setActiveCompany(company) {
  const normalized = company ? normalizeCompany(company) : null;
  writeStorage(STORAGE_KEYS.activeCompany, normalized);
  return normalized;
}

export function clearActiveCompany() {
  writeStorage(STORAGE_KEYS.activeCompany, null);
}

export function attachCompanyToRecord(record, company) {
  if (!record || !company) return record;
  if (isSuperadmin(record)) {
    return { ...record, empresaId: null, codigoEmpresa: "SISTEMA" };
  }

  return {
    ...record,
    empresaId: record.empresaId || company.id,
    codigoEmpresa: record.codigoEmpresa || company.codigoEmpresa,
  };
}

export function filterByActiveCompany(records = [], company = getActiveCompany()) {
  if (!Array.isArray(records)) return [];
  if (!company) return [];

  return records.filter((record) => {
    if (!record) return false;
    if (isSuperadmin(record)) return false;
    const recordCompanyId = record.empresaId || "";
    const recordCompanyCode = normalizeCompanyCode(record.codigoEmpresa || "");
    if (!recordCompanyId && !recordCompanyCode) return company.codigoEmpresa === DEFAULT_COMPANY_CODE;
    return recordCompanyId === company.id || recordCompanyCode === company.codigoEmpresa;
  });
}

export function migrateExistingDataToDefaultCompany(config = {}) {
  const defaultCompany = ensureDefaultCompany(getCompanies(), config);
  const migrationKeys = [...COMPANY_RECORD_KEYS, STORAGE_KEYS.usuarios];

  migrationKeys.forEach((key) => {
    const records = readStorage(key, []);
    if (!Array.isArray(records)) return;

    const migrated = records.map((record) => attachCompanyToRecord(record, defaultCompany));
    writeStorage(key, migrated);
  });

  return defaultCompany;
}

export function companyHasModule(company, moduleId) {
  if (!company || !moduleId) return false;
  return Array.isArray(company.modulosActivos) ? company.modulosActivos.includes(moduleId) : true;
}

export function getCompanyManagers(company, users = []) {
  if (!company || !Array.isArray(users)) return [];
  return users.filter((user) => {
    if (!user || isSuperadmin(user)) return false;
    const sameCompany =
      user.empresaId === company.id ||
      normalizeCompanyCode(user.codigoEmpresa || "") === normalizeCompanyCode(company.codigoEmpresa);
    return sameCompany && user.rol === "Gerente" && user.estado !== "Inactivo";
  });
}

export function ensureCompanyHasInitialManager(company, users = []) {
  const managers = getCompanyManagers(company, users);
  return {
    hasManager: managers.length > 0,
    manager: managers[0] || null,
    message: managers.length
      ? ""
      : "Esta empresa no tiene gerente inicial. Nadie podra acceder hasta crear uno.",
  };
}
