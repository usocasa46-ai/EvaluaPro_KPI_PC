import { useEffect, useState } from "react";

export const STORAGE_KEYS = {
  areas: "kpi_areas",
  encargados: "kpi_encargados",
  colaboradores: "kpi_colaboradores",
  evaluaciones: "kpi_evaluaciones",
  evaluacionesTrimestrales: "evaluaciones_trimestrales",
  kpiAreaTemplates: "kpi_area_templates",
  kpiMonthlyEvaluations: "kpi_monthly_evaluations",
  kpiDailyRecords: "kpi_daily_records",
  vacacionesRecords: "vacaciones_records",
  permisosRecords: "permisos_records",
  amonestacionesRecords: "amonestaciones_records",
  incidencias: "kpi_incidencias",
  subgerentes: "kpi_subgerentes",
  evaluacionesSubgerente: "kpi_evaluaciones_subgerente",
  evaluacionesEncargado: "kpi_evaluaciones_encargado",
  gerentes: "kpi_gerentes",
  usuarios: "app_users",
  companies: "app_companies",
  legacyUsuarios: "kpi_usuarios",
  configuracion: "system_config",
  legacyConfiguracion: "kpi_configuracion",
  activeUserId: "active_user",
  legacyActiveUserId: "kpi_usuario_activo",
  operationalResetVersion: "operational_reset_keep_users_v1",
};

export const OPERATIONAL_STORAGE_KEYS = [
  STORAGE_KEYS.encargados,
  STORAGE_KEYS.colaboradores,
  STORAGE_KEYS.evaluaciones,
  STORAGE_KEYS.evaluacionesTrimestrales,
  STORAGE_KEYS.kpiMonthlyEvaluations,
  STORAGE_KEYS.kpiDailyRecords,
  STORAGE_KEYS.incidencias,
  STORAGE_KEYS.subgerentes,
  STORAGE_KEYS.evaluacionesSubgerente,
  STORAGE_KEYS.evaluacionesEncargado,
  STORAGE_KEYS.gerentes,
];

export const PRESERVED_STORAGE_KEYS = [
  STORAGE_KEYS.areas,
  STORAGE_KEYS.kpiAreaTemplates,
  STORAGE_KEYS.usuarios,
  STORAGE_KEYS.companies,
  STORAGE_KEYS.configuracion,
  STORAGE_KEYS.activeUserId,
];

export function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    if (key === STORAGE_KEYS.configuracion) {
      const legacy = localStorage.getItem(STORAGE_KEYS.legacyConfiguracion);
      return legacy ? JSON.parse(legacy) : fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function resetOperationalDataKeepUsers() {
  OPERATIONAL_STORAGE_KEYS.forEach((key) => writeStorage(key, []));
  localStorage.removeItem(STORAGE_KEYS.legacyUsuarios);
  localStorage.removeItem(STORAGE_KEYS.legacyActiveUserId);
  writeStorage(STORAGE_KEYS.operationalResetVersion, true);
}

export function resetKpiTemplatesOnly(nextTemplates = []) {
  writeStorage(STORAGE_KEYS.kpiAreaTemplates, nextTemplates);
  return nextTemplates;
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue));

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue];
}

export function createId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
