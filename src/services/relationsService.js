import { sameArea, getUserScopeAreas } from "./permissionsService";

export function normalizeCargoName(cargo = "") {
  return String(cargo)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sameCargo(left, right) {
  const leftName = normalizeCargoName(left);
  const rightName = normalizeCargoName(right);
  return Boolean(leftName && rightName && leftName === rightName);
}

export function getAreaById(areas = [], areaId) {
  return areas.find((area) => area.id === areaId) || null;
}

export function getAreaName(area) {
  return area?.nombre || area?.areaNombre || area?.area || "";
}

export function getManagerByArea(areas = [], encargados = [], areaIdOrName) {
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

export function getCollaboratorsByArea(colaboradores = [], areaIdOrName) {
  return colaboradores.filter((colaborador) => {
    return colaborador.areaId === areaIdOrName || sameArea(colaborador.areaNombre || colaborador.area, areaIdOrName);
  });
}

export function getKpiTemplatesByAreaAndCargo(templates = [], areaIdOrName, cargo = "") {
  const cargoName = normalizeCargoName(cargo);
  if (!cargoName) return [];

  return templates.filter((template) => {
    const sameTemplateArea = template.areaId === areaIdOrName || sameArea(template.areaNombre || template.area, areaIdOrName);
    return template.estado !== "Inactivo" && sameTemplateArea && sameCargo(template.cargo || template.puesto, cargoName);
  });
}

export function getAssignedKpisForCollaborator(collaborator = {}, templates = []) {
  const areaName = collaborator.areaNombre || collaborator.area || "";
  const areaIdOrName = areaName || collaborator.areaId;
  const cargo = collaborator.cargo || "";
  const exactTemplates = getKpiTemplatesByAreaAndCargo(templates, areaIdOrName, cargo);

  function matchesCollaboratorScope(template = {}) {
    const templateAreaName = template.areaNombre || template.area;
    const sameTemplateAreaById = Boolean(template.areaId && collaborator.areaId && template.areaId === collaborator.areaId);
    const sameTemplateAreaByName = sameArea(templateAreaName, areaName);
    const sameTemplateArea = sameTemplateAreaById || sameTemplateAreaByName;
    return template.estado !== "Inactivo" && sameTemplateArea && sameCargo(template.cargo || template.puesto, cargo);
  }

  if (Array.isArray(collaborator.kpiTemplateIds) && collaborator.kpiTemplateIds.length) {
    const assignedTemplates = exactTemplates.filter((template) => collaborator.kpiTemplateIds.includes(template.id));
    if (assignedTemplates.length) return assignedTemplates;
  }

  if (Array.isArray(collaborator.indicadoresAsignados) && collaborator.indicadoresAsignados.length) {
    const assignedIndicators = collaborator.indicadoresAsignados.filter((indicator) => {
      const hasScopeData = indicator.areaId || indicator.areaNombre || indicator.area || indicator.cargo || indicator.puesto;
      return Boolean(hasScopeData && matchesCollaboratorScope(indicator));
    });
    if (assignedIndicators.length) return assignedIndicators;
  }

  return exactTemplates;
}

export function getAreasBySubManager(user, areas = [], subgerentes = []) {
  const scopeAreas = getUserScopeAreas(user, subgerentes);
  return areas.filter((area) => scopeAreas.some((scopeArea) => sameArea(scopeArea, getAreaName(area))));
}

export function getManagersBySubManager(user, encargados = [], subgerentes = []) {
  const scopeAreas = getUserScopeAreas(user, subgerentes);
  return encargados.filter((encargado) => {
    return scopeAreas.some((scopeArea) => sameArea(scopeArea, encargado.areaNombre || encargado.area));
  });
}
