import { getManagerByArea } from "./relationsService";
import { sameArea } from "./permissionsService";

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function calculateRequestedDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

export function resolveCollaboratorHrData(colaborador = {}, areas = [], encargados = []) {
  const area = areas.find((item) => {
    return item.id === colaborador.areaId || sameArea(item.nombre, colaborador.areaNombre || colaborador.area);
  });
  const areaId = colaborador.areaId || area?.id || "";
  const areaNombre = colaborador.areaNombre || colaborador.area || area?.nombre || "";
  const manager =
    encargados.find((encargado) => encargado.id === colaborador.encargadoId) ||
    getManagerByArea(areas, encargados, areaId || areaNombre);

  return {
    colaboradorId: colaborador.id || "",
    colaboradorNombre: colaborador.nombre || "",
    areaId,
    areaNombre,
    encargadoId: colaborador.encargadoId || manager?.id || "",
    encargadoNombre: colaborador.encargadoNombre || colaborador.encargado || manager?.nombre || "",
  };
}

export function normalizeHrRecord(record = {}, activeUser, colaboradores = [], areas = [], encargados = []) {
  const selected = colaboradores.find((colaborador) => colaborador.id === record.colaboradorId);
  const collaboratorData = selected ? resolveCollaboratorHrData(selected, areas, encargados) : {};
  const now = new Date().toISOString();

  return {
    ...record,
    ...collaboratorData,
    creadoPorId: record.creadoPorId || activeUser?.id || "",
    creadoPorNombre: record.creadoPorNombre || activeUser?.nombre || "",
    creadoPorRol: record.creadoPorRol || activeUser?.rol || "",
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
}

export function normalizeVacationRecord(record = {}, activeUser, colaboradores = [], areas = [], encargados = []) {
  return normalizeHrRecord(
    {
      fechaSolicitud: today(),
      estado: "Borrador",
      ...record,
      diasSolicitados: record.diasSolicitados || calculateRequestedDays(record.fechaInicio, record.fechaFin),
    },
    activeUser,
    colaboradores,
    areas,
    encargados
  );
}

export function normalizePermitRecord(record = {}, activeUser, colaboradores = [], areas = [], encargados = []) {
  const normalized = normalizeHrRecord(
    {
      fechaSolicitud: today(),
      estado: "Borrador",
      tipoNovedad: record.tipoNovedad || record.tipoPermiso || [],
      licencia: {
        motivo: "",
        duracion: "",
        fecha: "",
        desde: "",
        hasta: "",
        totalDias: "",
        numero: "",
        medico: "",
        exequatur: "",
        ...(record.licencia || {}),
      },
      permisoCD: {
        motivo: "",
        duracion: "",
        fecha: "",
        desde: "",
        hasta: "",
        totalDias: "",
        ...(record.permisoCD || {}),
      },
      permisoSD: {
        motivo: "",
        duracion: "",
        fecha: "",
        desde: "",
        hasta: "",
        totalDias: "",
        ...(record.permisoSD || {}),
      },
      observaciones: "",
      firmaColaborador: "",
      supervisorInmediato: "",
      gerenteArea: "",
      gerenteGestionHumana: "",
      ...record,
    },
    activeUser,
    colaboradores,
    areas,
    encargados
  );

  const selected = colaboradores.find((colaborador) => colaborador.id === normalized.colaboradorId);
  return {
    ...normalized,
    posicion: normalized.posicion || selected?.cargo || "",
    departamento: normalized.departamento || normalized.areaNombre || selected?.areaNombre || selected?.area || "",
    divisionNegocio: normalized.divisionNegocio || "",
    supervisorInmediato: normalized.supervisorInmediato || normalized.encargadoNombre || "",
    tipoNovedad: normalized.tipoNovedad || normalized.tipoPermiso || [],
  };
}

export function normalizeWarningRecord(record = {}, activeUser, colaboradores = [], areas = [], encargados = []) {
  return normalizeHrRecord(
    {
      fechaAmonestacion: today(),
      estado: "Borrador",
      ...record,
    },
    activeUser,
    colaboradores,
    areas,
    encargados
  );
}
