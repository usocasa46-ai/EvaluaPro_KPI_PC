import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";
import { isSuperadmin } from "./permissionsService";

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
