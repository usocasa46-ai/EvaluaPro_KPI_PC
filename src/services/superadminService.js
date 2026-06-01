import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";
import { isSuperadmin } from "./permissionsService";
import {
  DEFAULT_COMPANY_CODE,
  DEFAULT_COMPANY_ID,
  createDefaultCompany,
  normalizeCompany,
  normalizeCompanyCode,
} from "./companyService";

export const DEFAULT_SUPERADMIN_USER = {
  id: "USR-SUPERADMIN",
  nombre: "Superadmin Sistema",
  usuario: "superadmin",
  password: "admin123",
  rol: "Superadmin",
  role: "superadmin",
  areaAsignada: "",
  areasSupervisadas: [],
  areasAsignadas: [],
  estado: "Activo",
};

function hasDefaultSuperadmin(users = []) {
  return users.some((user) => {
    const username = String(user?.usuario || "").trim().toLowerCase();
    return username === "superadmin" || isSuperadmin(user);
  });
}

export function ensureDefaultSuperadmin(users) {
  const hasExplicitUsers = Array.isArray(users);
  const currentUsers = hasExplicitUsers ? users : readStorage(STORAGE_KEYS.usuarios, []);
  const safeUsers = Array.isArray(currentUsers) ? currentUsers : [];

  if (hasDefaultSuperadmin(safeUsers)) {
    return safeUsers;
  }

  const nextUsers = [...safeUsers, { ...DEFAULT_SUPERADMIN_USER }];
  if (!hasExplicitUsers) {
    writeStorage(STORAGE_KEYS.usuarios, nextUsers);
  }
  return nextUsers;
}

export const SUPERMIX_MANAGER_ACCESS_PATCH_KEY = STORAGE_KEYS.supermixManagerAccessPatch;
export const SUPERMIX_MANAGER_PASSWORD = "Gerente1";

function isGerenteSupermixCandidate(user, supermixCompany) {
  const username = String(user?.usuario || "").trim().toLowerCase();
  if (username !== "gerente") return false;

  const code = normalizeCompanyCode(user?.codigoEmpresa || "");
  const sameCompany =
    user?.empresaId === supermixCompany.id ||
    code === DEFAULT_COMPANY_CODE ||
    (!user?.empresaId && !code);

  return sameCompany;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function ensureSupermixManagerAccess(options = {}) {
  const hasExplicitCompanies = Array.isArray(options.companies);
  const hasExplicitUsers = Array.isArray(options.users);
  const persist = Boolean(options.persist);
  const currentCompanies = hasExplicitCompanies ? options.companies : readStorage(STORAGE_KEYS.companies, []);
  const currentUsers = hasExplicitUsers ? options.users : readStorage(STORAGE_KEYS.usuarios, []);

  const safeCompanies = Array.isArray(currentCompanies) ? currentCompanies.map((company) => normalizeCompany(company)) : [];
  const safeUsers = Array.isArray(currentUsers) ? currentUsers : [];
  const now = new Date().toISOString();

  const existingSupermix = safeCompanies.find(
    (company) =>
      normalizeCompanyCode(company.codigoEmpresa) === DEFAULT_COMPANY_CODE ||
      company.id === DEFAULT_COMPANY_ID
  );

  let supermixCompany = existingSupermix
    ? normalizeCompany({
        ...existingSupermix,
        codigoEmpresa: DEFAULT_COMPANY_CODE,
        nombreEmpresa: "Supermix",
        tipoNegocio: "Supermercado",
        estado: "Activa",
      })
    : createDefaultCompany();
  const companyNeedsUpdate =
    !existingSupermix ||
    normalizeCompanyCode(existingSupermix.codigoEmpresa) !== DEFAULT_COMPANY_CODE ||
    existingSupermix.nombreEmpresa !== "Supermix" ||
    existingSupermix.tipoNegocio !== "Supermercado" ||
    existingSupermix.estado !== "Activa";

  if (existingSupermix && companyNeedsUpdate) {
    supermixCompany = { ...supermixCompany, updatedAt: now };
  }

  const nextCompanies = existingSupermix
    ? safeCompanies.map((company) => (company.id === existingSupermix.id ? supermixCompany : company))
    : [...safeCompanies, supermixCompany];

  const targetIndexes = safeUsers
    .map((user, index) => (isGerenteSupermixCandidate(user, supermixCompany) ? index : -1))
    .filter((index) => index >= 0);

  let nextUsers = safeUsers;
  if (targetIndexes.length) {
    nextUsers = safeUsers.map((user, index) => {
      if (!targetIndexes.includes(index)) return user;
      const patched = {
        ...user,
        nombre: user.nombre || "Gerente Supermix",
        usuario: "gerente",
        password: SUPERMIX_MANAGER_PASSWORD,
        rol: "Gerente",
        empresaId: supermixCompany.id,
        codigoEmpresa: DEFAULT_COMPANY_CODE,
        estado: "Activo",
      };
      return sameJson(user, patched) ? user : { ...patched, updatedAt: now };
    });
  } else {
    nextUsers = [
      ...safeUsers,
      {
        id: safeUsers.some((user) => user.id === "USR-SUPERMIX-GERENTE")
          ? `USR-SUPERMIX-GERENTE-${Date.now().toString(36).toUpperCase()}`
          : "USR-SUPERMIX-GERENTE",
        nombre: "Gerente Supermix",
        usuario: "gerente",
        password: SUPERMIX_MANAGER_PASSWORD,
        rol: "Gerente",
        areaAsignada: "",
        areasSupervisadas: [],
        areasAsignadas: [],
        empresaId: supermixCompany.id,
        codigoEmpresa: DEFAULT_COMPANY_CODE,
        estado: "Activo",
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  const changedCompanies = !sameJson(safeCompanies, nextCompanies);
  const changedUsers = !sameJson(safeUsers, nextUsers);

  if (persist) {
    if (changedCompanies || !hasExplicitCompanies) writeStorage(STORAGE_KEYS.companies, nextCompanies);
    if (changedUsers || !hasExplicitUsers) writeStorage(STORAGE_KEYS.usuarios, nextUsers);
    writeStorage(SUPERMIX_MANAGER_ACCESS_PATCH_KEY, {
      appliedAt: now,
      codigoEmpresa: DEFAULT_COMPANY_CODE,
      usuario: "gerente",
      version: "v1",
    });
  }

  return {
    companies: nextCompanies,
    users: nextUsers,
    company: supermixCompany,
    changedCompanies,
    changedUsers,
    targetCount: targetIndexes.length || 1,
  };
}
