import { normalizeConfig } from "./configService";
import { STORAGE_KEYS, readStorage, writeStorage } from "./storageService";

export function getAllCompanySettings() {
  const settings = readStorage(STORAGE_KEYS.companySettings, {});
  return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
}

export function getCompanySettings(companyId, fallback = {}) {
  if (!companyId) return normalizeConfig(fallback);
  const allSettings = getAllCompanySettings();
  return normalizeConfig(allSettings[companyId] || fallback);
}

export function saveCompanySettings(companyId, settings) {
  if (!companyId) return null;
  const allSettings = getAllCompanySettings();
  const saved = normalizeConfig({ ...settings, updatedAt: new Date().toISOString() });
  writeStorage(STORAGE_KEYS.companySettings, {
    ...allSettings,
    [companyId]: saved,
  });
  return saved;
}
