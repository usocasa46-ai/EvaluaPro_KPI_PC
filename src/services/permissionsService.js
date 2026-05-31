export const ROLES = {
  GERENTE: "Gerente",
  SUBGERENTE: "Subgerente",
  ENCARGADO: "Encargado",
};

export const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "areas", label: "Áreas" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "encargados", label: "Encargados" },
  { id: "subgerentes", label: "Subgerentes" },
  { id: "kpiDiario", label: "KPI Diario" },
  { id: "analisisMovimientoProductos", label: "Análisis Movimientos" },
  { id: "trasladosPendientes", label: "Traslados Pendientes" },
  { id: "evaluacionKpiMensual", label: "Evaluación KPI Mensual" },
  { id: "evaluacionTrimestral", label: "Evaluación Trimestral" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "evaluacionEncargados", label: "Evaluación Encargados" },
  { id: "evaluacionSubgerentes", label: "Evaluación Subgerentes" },
  { id: "plantillasKpiArea", label: "Plantillas KPI por Área" },
  { id: "vacaciones", label: "Vacaciones" },
  { id: "permisos", label: "Permisos" },
  { id: "amonestaciones", label: "Amonestaciones" },
  { id: "incidencias", label: "Incidencias" },
  { id: "gerentes", label: "Gerentes" },
  { id: "usuarios-roles", label: "Usuarios y Roles" },
  { id: "reportes", label: "Reportes" },
  { id: "configuracion", label: "Configuración" },
];

export function normalizeAreaName(area = "") {
  const normalized = String(area)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+de\s+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const aliases = {
    "servicio y caja": "caja y servicio",
    hogar: "hogar y decoraciones",
  };

  const compact = normalized.replace(/[^a-z0-9]+/g, "");
  if (compact.includes("recepci") && compact.includes("mercanc")) return "recepcion mercancia";
  if (compact.includes("carnicer")) return "carniceria";
  if (compact.includes("almacen")) return "almacen";
  if (compact.includes("abarrotes")) return "abarrotes";

  return aliases[normalized] || normalized;
}

export function sameArea(left, right) {
  return normalizeAreaName(left) === normalizeAreaName(right);
}

function includesArea(areas = [], area) {
  return areas.some((item) => sameArea(item, area));
}

export function getUserScopeAreas(user, subgerentes = []) {
  if (!user || user.rol === ROLES.GERENTE) return [];

  if (user.rol === ROLES.ENCARGADO) {
    return user.areaAsignada ? [user.areaAsignada] : [];
  }

  const directAreas = user.areasSupervisadas || user.areasAsignadas || user.areas || (user.areaAsignada ? [user.areaAsignada] : []);
  if (Array.isArray(directAreas) && directAreas.length) return directAreas;

  const linkedSubgerente = subgerentes.find((subgerente) => {
    return subgerente.nombre === user.nombre || subgerente.usuario === user.usuario || subgerente.id === user.subgerenteId;
  });

  return linkedSubgerente?.areas || [];
}

export function canViewAllData(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canViewAllEvaluations(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canAccessSettings(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canCreateUsers(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canEditMasterData(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canManageUsers(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canAccessUserManagement(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canCreateSubgerentes(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canEvaluateCollaborator(user) {
  return user?.rol === ROLES.ENCARGADO;
}

export function canEvaluateManager(user) {
  return user?.rol === ROLES.SUBGERENTE;
}

export function canEvaluateSubManager(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canEvaluateSubgerente(user) {
  return canEvaluateSubManager(user);
}

export function canCreateOperationalEvaluation(user) {
  return [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

export function canViewKpiMonthly(user) {
  return [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

export function canEditKpiMonthly(user) {
  return user?.rol === ROLES.ENCARGADO;
}

export function canAccessQuarterlyEvaluation(user) {
  return [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

export function canCreateQuarterlyEvaluation(user) {
  return [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

export function getQuarterlyEvaluationTargetType(user) {
  if (user?.rol === ROLES.GERENTE) return "subgerente";
  if (user?.rol === ROLES.SUBGERENTE) return "encargado";
  if (user?.rol === ROLES.ENCARGADO) return "colaborador";
  return "";
}

function uniqueByKey(items, makeKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = makeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAllowedQuarterlyTargets(user, colaboradores = [], encargados = [], subgerentes = [], usuarios = []) {
  const targetType = getQuarterlyEvaluationTargetType(user);

  if (targetType === "subgerente") {
    const operationalTargets = subgerentes.map((subgerente) => ({
      id: subgerente.id,
      nombre: subgerente.nombre,
      cargo: "Subgerente",
      rol: ROLES.SUBGERENTE,
      area: Array.isArray(subgerente.areas) ? subgerente.areas[0] || "" : "",
      areasSupervisadas: subgerente.areas || [],
      fechaEntrada: "",
      source: subgerente,
    }));
    const userTargets = usuarios
      .filter((targetUser) => targetUser.rol === ROLES.SUBGERENTE && targetUser.estado !== "Inactivo")
      .map((targetUser) => ({
        id: targetUser.id,
        nombre: targetUser.nombre,
        cargo: "Subgerente",
        rol: ROLES.SUBGERENTE,
        area: (targetUser.areasSupervisadas || targetUser.areasAsignadas || [])[0] || "",
        areasSupervisadas: targetUser.areasSupervisadas || targetUser.areasAsignadas || [],
        fechaEntrada: "",
        source: targetUser,
      }));

    return uniqueByKey([...operationalTargets, ...userTargets], (item) => item.id || `${item.nombre}-${item.area}`);
  }

  if (targetType === "encargado") {
    const scopeAreas = getUserScopeAreas(user, subgerentes);
    const operationalTargets = encargados
      .filter((encargado) => includesArea(scopeAreas, encargado.area))
      .map((encargado) => ({
        id: encargado.id,
        nombre: encargado.nombre,
        cargo: "Encargado",
        rol: ROLES.ENCARGADO,
        area: encargado.area,
        areasSupervisadas: [],
        fechaEntrada: "",
        source: encargado,
      }));
    const userTargets = usuarios
      .filter((targetUser) => {
        return (
          targetUser.rol === ROLES.ENCARGADO &&
          targetUser.estado !== "Inactivo" &&
          includesArea(scopeAreas, targetUser.areaAsignada)
        );
      })
      .map((targetUser) => ({
        id: targetUser.id,
        nombre: targetUser.nombre,
        cargo: "Encargado",
        rol: ROLES.ENCARGADO,
        area: targetUser.areaAsignada,
        areasSupervisadas: [],
        fechaEntrada: "",
        source: targetUser,
      }));

    return uniqueByKey([...operationalTargets, ...userTargets], (item) => item.id || `${item.nombre}-${item.area}`);
  }

  if (targetType === "colaborador") {
    const scopeAreas = getUserScopeAreas(user, subgerentes);
    return colaboradores
      .filter((colaborador) => includesArea(scopeAreas, colaborador.area))
      .map((colaborador) => ({
        id: colaborador.id,
        nombre: colaborador.nombre,
        cargo: colaborador.cargo || "Colaborador",
        rol: "Colaborador",
        area: colaborador.area,
        areasSupervisadas: [],
        fechaEntrada: colaborador.fechaEntrada || "",
        source: colaborador,
      }));
  }

  return [];
}

export function getQuarterlyScopeAreas(user, subgerentes = []) {
  return getUserScopeAreas(user, subgerentes);
}

export function canViewQuarterlyEvaluation(user, evaluation, scopeAreas) {
  if (!canAccessQuarterlyEvaluation(user)) return false;
  if (user.rol === ROLES.GERENTE) return true;

  const evaluationArea = evaluation?.area;
  const areas = Array.isArray(scopeAreas) ? scopeAreas : getUserScopeAreas(user);
  const evaluatedType = evaluation?.evaluatedType || "colaborador";
  const createdByUserId = evaluation?.createdByUserId || "";

  if (user.rol === ROLES.SUBGERENTE) {
    if (evaluatedType === "subgerente") return false;
    if (evaluatedType === "encargado") {
      return createdByUserId === user.id || includesArea(areas, evaluationArea);
    }
    return includesArea(areas, evaluationArea);
  }

  if (user.rol === ROLES.ENCARGADO) {
    return Boolean(
      evaluatedType === "colaborador" &&
        user.areaAsignada &&
        sameArea(evaluationArea, user.areaAsignada) &&
        (!createdByUserId || createdByUserId === user.id)
    );
  }

  return false;
}

export function filterQuarterlyEvaluationsByUser(user, evaluations, subgerentes = []) {
  if (!Array.isArray(evaluations)) return [];
  const scopeAreas = getUserScopeAreas(user, subgerentes);
  return evaluations.filter((evaluation) => canViewQuarterlyEvaluation(user, evaluation, scopeAreas));
}

export function canViewArea(user, area, subgerentes = []) {
  const areaName = area?.nombre || area?.area || area;
  if (user?.rol === ROLES.GERENTE) return true;
  const scopeAreas = getUserScopeAreas(user, subgerentes);
  return includesArea(scopeAreas, areaName);
}

export function canViewCollaboratorEvaluation(user, evaluation, subgerentes = []) {
  if (user?.rol === ROLES.GERENTE) return true;

  if (user?.rol === ROLES.SUBGERENTE) {
    return includesArea(getUserScopeAreas(user, subgerentes), evaluation?.area);
  }

  if (user?.rol === ROLES.ENCARGADO) {
    const sameAssignedArea = sameArea(evaluation?.area, user.areaAsignada);
    const evaluatorMatches = !evaluation?.evaluadorId || evaluation.evaluadorId === user.id;
    return Boolean(sameAssignedArea && evaluatorMatches);
  }

  return false;
}

export function canViewManagerEvaluation(user, evaluation, subgerentes = []) {
  if (user?.rol === ROLES.GERENTE) return true;
  if (user?.rol !== ROLES.SUBGERENTE) return false;

  const evaluatorMatches = evaluation?.evaluadorId === user.id || evaluation?.evaluadorNombre === user.nombre;
  return Boolean(evaluatorMatches && includesArea(getUserScopeAreas(user, subgerentes), evaluation?.area));
}

export function canViewSubManagerEvaluation(user) {
  return user?.rol === ROLES.GERENTE;
}

export function canAccessTransferPendingModule(user) {
  if (!user) return false;
  const receivingArea = "Recepción de Mercancía";

  if (user.rol === ROLES.GERENTE) return true;
  if (user.rol === ROLES.SUBGERENTE) return includesArea(getUserScopeAreas(user), receivingArea);
  if (user.rol === ROLES.ENCARGADO) return sameArea(user.areaAsignada, receivingArea);

  return false;
}

export function canViewProductMovementAnalysis(user) {
  return [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

export function canImportProductMovementAnalysis(user) {
  if (user?.rol === ROLES.GERENTE) return true;
  return Boolean(user?.rol === ROLES.ENCARGADO && sameArea(user.areaAsignada, "Recepción de Mercancía"));
}

export function canPrintProductMovementAnalysis(user) {
  return canViewProductMovementAnalysis(user);
}

export function canAccessModule(user, moduleId) {
  if (!user) return false;
  if (moduleId === "trasladosPendientes") return canAccessTransferPendingModule(user);
  if (moduleId === "analisisMovimientoProductos") return canViewProductMovementAnalysis(user);

  if (user.rol === ROLES.GERENTE) {
    return [
      "dashboard",
      "areas",
      "subgerentes",
      "encargados",
      "colaboradores",
      "evaluacionSubgerentes",
      "evaluacionTrimestral",
      "plantillasKpiArea",
      "evaluacionKpiMensual",
      "kpiDiario",
      "analisisMovimientoProductos",
      "trasladosPendientes",
      "vacaciones",
      "permisos",
      "amonestaciones",
      "usuarios-roles",
      "reportes",
      "configuracion",
    ].includes(moduleId);
  }

  if (user.rol === ROLES.SUBGERENTE) {
    return [
      "dashboard",
      "areas",
      "encargados",
      "colaboradores",
      "evaluacionEncargados",
      "evaluacionTrimestral",
      "evaluacionKpiMensual",
      "kpiDiario",
      "analisisMovimientoProductos",
      "trasladosPendientes",
      "vacaciones",
      "permisos",
      "amonestaciones",
      "reportes",
      "configuracion",
    ].includes(moduleId);
  }

  if (user.rol === ROLES.ENCARGADO) {
    return [
      "dashboard",
      "areas",
      "colaboradores",
      "evaluacionTrimestral",
      "evaluacionKpiMensual",
      "kpiDiario",
      "analisisMovimientoProductos",
      "trasladosPendientes",
      "vacaciones",
      "permisos",
      "amonestaciones",
      "reportes",
      "configuracion",
    ].includes(moduleId);
  }

  return false;
}

export function canAccessSystemConfig(user) {
  return user ? [ROLES.GERENTE, ROLES.SUBGERENTE, ROLES.ENCARGADO].includes(user.rol) : false;
}

export function canEditSystemConfig(user) {
  return user?.rol === ROLES.GERENTE;
}

export function isWithinEditWindow(createdAt, hours = 48) {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  return Date.now() - createdTime <= hours * 60 * 60 * 1000;
}

export function canEditEvaluation(user, evaluation) {
  if (!user || !evaluation) return false;
  const createdByUserId = evaluation.createdByUserId || evaluation.evaluadorId || "";
  if (!createdByUserId || createdByUserId !== user.id) return false;

  if (user.rol === ROLES.ENCARGADO) {
    return isWithinEditWindow(evaluation.createdAt, 48);
  }

  return false;
}

export function canViewCollaborator(user, collaborator, subgerentes = []) {
  if (user?.rol === ROLES.GERENTE) return true;
  const areaName = collaborator?.areaNombre || collaborator?.area;
  return includesArea(getUserScopeAreas(user, subgerentes), areaName);
}

export function canViewMonthlyKpi(user, monthlyEvaluation, subgerentes = []) {
  if (user?.rol === ROLES.GERENTE) return true;
  const areaName = monthlyEvaluation?.areaNombre || monthlyEvaluation?.area;
  return includesArea(getUserScopeAreas(user, subgerentes), areaName);
}

export function canViewDailyKpi(user, record, subgerentes = []) {
  if (!user || !record) return false;
  if (user.rol === ROLES.GERENTE) return true;
  return includesArea(getUserScopeAreas(user, subgerentes), record.areaNombre || record.area);
}

export function canCreateDailyKpi(user) {
  return user?.rol === ROLES.ENCARGADO;
}

export function canEditDailyKpi(user, record) {
  if (!user || !record) return false;
  const createdBy = record.creadoPorId || record.createdByUserId || "";
  return Boolean(user.rol === ROLES.ENCARGADO && createdBy === user.id && isWithinEditWindow(record.createdAt, 48));
}

export function filterDailyKpiByUser(user, records = [], subgerentes = []) {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => canViewDailyKpi(user, record, subgerentes));
}

export function filterRecordsByUserArea(user, records = [], subgerentes = []) {
  if (!Array.isArray(records)) return [];
  if (user?.rol === ROLES.GERENTE) return records;
  const scopeAreas = getUserScopeAreas(user, subgerentes);
  return records.filter((record) => includesArea(scopeAreas, record?.areaNombre || record?.area));
}

function canViewHrRecord(user, record, subgerentes = []) {
  if (!user || !record) return false;
  if (user.rol === ROLES.GERENTE) return true;
  return includesArea(getUserScopeAreas(user, subgerentes), record.areaNombre || record.area);
}

function canCreateHrRecord(user) {
  return [ROLES.GERENTE, ROLES.ENCARGADO].includes(user?.rol);
}

function canEditHrRecord(user, record, subgerentes = []) {
  if (!user || !record) return false;
  if (user.rol === ROLES.GERENTE) return true;
  if (user.rol === ROLES.ENCARGADO) {
    const createdBy = record.creadoPorId || record.createdByUserId || "";
    const inScope = includesArea(getUserScopeAreas(user, subgerentes), record.areaNombre || record.area);
    return inScope && createdBy === user.id;
  }
  return false;
}

export function canViewVacation(user, record, subgerentes = []) {
  return canViewHrRecord(user, record, subgerentes);
}

export function canCreateVacation(user) {
  return canCreateHrRecord(user);
}

export function canEditVacation(user, record, subgerentes = []) {
  return canEditHrRecord(user, record, subgerentes);
}

export function canViewPermit(user, record, subgerentes = []) {
  return canViewHrRecord(user, record, subgerentes);
}

export function canCreatePermit(user) {
  return canCreateHrRecord(user);
}

export function canEditPermit(user, record, subgerentes = []) {
  return canEditHrRecord(user, record, subgerentes);
}

export function canViewWarning(user, record, subgerentes = []) {
  return canViewHrRecord(user, record, subgerentes);
}

export function canCreateWarning(user) {
  return canCreateHrRecord(user);
}

export function canEditWarning(user, record, subgerentes = []) {
  return canEditHrRecord(user, record, subgerentes);
}

export function getVisibleModules(user) {
  return MODULES.filter((module) => canAccessModule(user, module.id));
}

export function filterAreasByUser(areas, user, subgerentes = []) {
  if (!Array.isArray(areas)) return [];
  if (user?.rol === ROLES.GERENTE) return areas;
  return areas.filter((area) => canViewArea(user, area, subgerentes));
}

export function filterAreasByUserRole(areas, user, subgerentes = []) {
  return filterAreasByUser(areas, user, subgerentes);
}

export function filterDataByUserRole(data, user, areaField = "area", subgerentes = []) {
  if (!Array.isArray(data)) return [];
  if (user?.rol === ROLES.GERENTE) return data;

  const scopeAreas = getUserScopeAreas(user, subgerentes);
  if (!scopeAreas.length) return [];

  return data.filter((item) => {
    const fieldValue = item?.[areaField];
    if (Array.isArray(fieldValue)) return fieldValue.some((area) => includesArea(scopeAreas, area));
    return includesArea(scopeAreas, fieldValue);
  });
}

export function filterByRoleAndArea(data, user, areaField = "area", subgerentes = []) {
  return filterDataByUserRole(data, user, areaField, subgerentes);
}

export function filterCollaboratorsByUser(user, colaboradores, subgerentes = []) {
  return filterDataByUserRole(colaboradores, user, "area", subgerentes);
}

export function filterEvaluationsByUser(user, evaluations, subgerentes = []) {
  if (!Array.isArray(evaluations)) return [];
  return evaluations.filter((evaluation) => canViewCollaboratorEvaluation(user, evaluation, subgerentes));
}

export function filterMonthlyKpiByUser(user, monthlyKpi, subgerentes = []) {
  if (!Array.isArray(monthlyKpi)) return [];
  if (user?.rol === ROLES.GERENTE) return monthlyKpi;

  const scopeAreas = getUserScopeAreas(user, subgerentes);
  if (!scopeAreas.length) return [];

  return monthlyKpi.filter((evaluation) => {
    const inScope = includesArea(scopeAreas, evaluation?.area);
    if (user?.rol === ROLES.ENCARGADO && evaluation?.evaluadorId) {
      return inScope && evaluation.evaluadorId === user.id;
    }
    return inScope;
  });
}

export function filterManagerEvaluationsByUser(user, managerEvaluations, subgerentes = []) {
  if (!Array.isArray(managerEvaluations)) return [];
  return managerEvaluations.filter((evaluation) => canViewManagerEvaluation(user, evaluation, subgerentes));
}

export function filterSubManagerEvaluationsByUser(user, subManagerEvaluations) {
  if (!Array.isArray(subManagerEvaluations)) return [];
  return canViewSubManagerEvaluation(user) ? subManagerEvaluations : [];
}

export function getPermissionMessage() {
  return "No tienes permiso para ver esta información";
}
