import { normalizeConfig } from "./configService";

export const DEFAULT_COMPANY_ID = "EMP-DEFAULT";

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeCompany(company = {}) {
  const now = new Date().toISOString();
  return {
    id: company.id || "",
    nombre: cleanText(company.nombre || company.name),
    rnc: cleanText(company.rnc),
    direccion: cleanText(company.direccion || company.address),
    telefono: cleanText(company.telefono || company.phone),
    correo: cleanText(company.correo || company.email),
    responsable: cleanText(company.responsable),
    plan: company.plan || "Local",
    estado: company.estado || "Activa",
    observacion: cleanText(company.observacion),
    createdAt: company.createdAt || now,
    updatedAt: company.updatedAt || now,
    createdById: company.createdById || "",
    createdByName: company.createdByName || "",
  };
}

export function createDefaultCompany(config = {}) {
  const normalizedConfig = normalizeConfig(config);
  return normalizeCompany({
    id: DEFAULT_COMPANY_ID,
    nombre: normalizedConfig.companyName || normalizedConfig.nombreEmpresa || "Empresa principal",
    rnc: normalizedConfig.rnc || "",
    direccion: normalizedConfig.address || normalizedConfig.direccion || "",
    telefono: normalizedConfig.phone || normalizedConfig.telefono || "",
    correo: normalizedConfig.email || normalizedConfig.correo || "",
    responsable: "Superadmin Sistema",
    plan: "Local",
    estado: "Activa",
    observacion: "Empresa base creada para administrar el sistema actual.",
  });
}

export function ensureDefaultCompanies(companies = [], config = {}) {
  const safeCompanies = Array.isArray(companies) ? companies.map((company) => normalizeCompany(company)) : [];
  if (safeCompanies.length) return safeCompanies;
  return [createDefaultCompany(config)];
}

export function upsertCompanyRecord(companies = [], company = {}) {
  const saved = normalizeCompany(company);
  const exists = companies.some((item) => item.id === saved.id);
  if (!exists) return [...companies, saved];
  return companies.map((item) => (item.id === saved.id ? saved : item));
}
