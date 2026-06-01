import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";

export const DEFAULT_GLOBAL_SETTINGS = {
  platformName: "EvaluaPro KPI Plataforma",
  version: "1.0.0",
  defaultTheme: "Claro",
  maintenanceStatus: "Operativa",
  globalMessage: "",
  securityPolicy: "Cambiar la contrasena Superadmin despues del primer acceso real.",
  backupPolicy: "Respaldos globales pendientes de backend.",
  updatedAt: "",
};

export function normalizeGlobalSettings(settings = {}) {
  return {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...settings,
    platformName: String(settings.platformName || settings.nombrePlataforma || DEFAULT_GLOBAL_SETTINGS.platformName).trim(),
    version: String(settings.version || DEFAULT_GLOBAL_SETTINGS.version).trim(),
    defaultTheme: settings.defaultTheme || settings.temaGlobal || DEFAULT_GLOBAL_SETTINGS.defaultTheme,
    maintenanceStatus: settings.maintenanceStatus || settings.estadoMantenimiento || DEFAULT_GLOBAL_SETTINGS.maintenanceStatus,
    globalMessage: String(settings.globalMessage || settings.mensajeGlobal || "").trim(),
    securityPolicy: String(settings.securityPolicy || settings.seguridadGlobal || DEFAULT_GLOBAL_SETTINGS.securityPolicy).trim(),
    backupPolicy: String(settings.backupPolicy || settings.respaldos || DEFAULT_GLOBAL_SETTINGS.backupPolicy).trim(),
  };
}

export function getGlobalSettings() {
  return normalizeGlobalSettings(readStorage(STORAGE_KEYS.globalSettings, DEFAULT_GLOBAL_SETTINGS));
}

export function saveGlobalSettings(settings) {
  const saved = normalizeGlobalSettings({ ...settings, updatedAt: new Date().toISOString() });
  writeStorage(STORAGE_KEYS.globalSettings, saved);
  return saved;
}
