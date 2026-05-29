import CrudModule from "../components/CrudModule";
import { getKpiTemplatesByAreaAndCargo, getManagerByArea } from "../services/relationsService";
import { sameArea } from "../services/permissionsService";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function templatesToAssignedIndicators(templates) {
  return templates.map((template) => ({
    templateId: template.id,
    areaId: template.areaId || "",
    areaNombre: template.areaNombre || template.area || "",
    cargo: template.cargo || template.puesto || "",
    indicador: template.indicador,
    tipoIndicador: template.tipoIndicador,
    peso: Number(template.peso || 0),
    meta: Number(template.meta || 0),
    menorEsMejor: Boolean(template.menorEsMejor),
  }));
}

function hasInvalidTemplateIds(colaborador, kpiTemplates) {
  if (!Array.isArray(colaborador.kpiTemplateIds) || !colaborador.kpiTemplateIds.length) return false;
  return !colaborador.kpiTemplateIds.some((id) => kpiTemplates.some((template) => template.id === id));
}

export default function Colaboradores({
  colaboradores,
  areas,
  encargados,
  kpiTemplates = [],
  canCreate,
  canEdit,
  onSave,
}) {
  const rows = colaboradores.map((colaborador) => {
    const area = areas.find((item) => item.id === colaborador.areaId || sameArea(item.nombre, colaborador.areaNombre || colaborador.area));
    const manager = encargados.find((item) => {
      return item.id === colaborador.encargadoId || item.nombre === colaborador.encargadoNombre || item.nombre === colaborador.encargado;
    });

    return {
      ...colaborador,
      codigoEmpleado: colaborador.codigoEmpleado || colaborador.id,
      areaId: colaborador.areaId || area?.id || "",
      areaNombre: colaborador.areaNombre || colaborador.area || area?.nombre || "",
      area: colaborador.areaNombre || colaborador.area || area?.nombre || "",
      encargadoId: colaborador.encargadoId || manager?.id || "",
      encargadoNombre: colaborador.encargadoNombre || colaborador.encargado || manager?.nombre || "Sin asignar",
      fechaIngreso: colaborador.fechaIngreso || colaborador.fechaEntrada || "",
      indicadoresTexto: Array.isArray(colaborador.indicadoresAsignados)
        ? colaborador.indicadoresAsignados.map((indicator) => indicator.indicador).join(", ")
        : "",
    };
  });

  function completeFormRelations(name, value, next) {
    const area = areas.find((item) => item.id === next.areaId);
    const areaName = area?.nombre || next.areaNombre || next.area || "";
    let current = {
      ...next,
      areaNombre: areaName,
      area: areaName,
    };

    if (name === "areaId") {
      const manager = getManagerByArea(areas, encargados, value);
      current = {
        ...current,
        encargadoId: manager?.id || "",
        encargadoNombre: manager?.nombre || "",
        encargado: manager?.nombre || "",
        cargo: "",
        kpiTemplateIds: [],
        indicadoresAsignados: [],
      };
    }

    if (name === "cargo" || name === "areaId") {
      const matchingTemplates = getKpiTemplatesByAreaAndCargo(kpiTemplates, current.areaNombre || current.areaId, current.cargo);
      current = {
        ...current,
        kpiTemplateIds: matchingTemplates.map((template) => template.id),
        indicadoresAsignados: templatesToAssignedIndicators(matchingTemplates),
      };
    }

    return current;
  }

  function normalizeCollaborator(form) {
    if (!form.nombre || !form.areaId || !form.cargo) return form;
    return completeFormRelations("cargo", form.cargo, {
      ...form,
      fechaEntrada: form.fechaIngreso || form.fechaEntrada || "",
      estado: form.estado || "Activo",
    });
  }

  function renderFormHint(form) {
    if (!form.areaId) return null;

    if (!form.encargadoId) {
      return <p className="template-warning">Esta área no tiene encargado asignado. Configúrelo primero.</p>;
    }

    if (form.cargo && !form.indicadoresAsignados?.length) {
      return <p className="template-warning">No hay plantilla KPI configurada para este cargo en esta área.</p>;
    }

    if (hasInvalidTemplateIds(form, kpiTemplates)) {
      return (
        <p className="template-warning">
          Este colaborador no tiene plantilla KPI válida asignada. Debe asignarse una nueva plantilla.
        </p>
      );
    }

    if (form.indicadoresAsignados?.length) {
      return (
        <p className="form-hint">
          KPI asignados: {form.indicadoresAsignados.map((indicator) => indicator.indicador).join(", ")}
        </p>
      );
    }

    return null;
  }

  return (
    <CrudModule
      title="Colaboradores"
      subtitle="Ficha básica del personal operativo y relación con su área, encargado y plantilla KPI."
      rows={rows}
      canCreate={canCreate}
      canEdit={canEdit}
      createLabel="Nuevo colaborador"
      columns={[
        { key: "codigoEmpleado", label: "Código" },
        { key: "nombre", label: "Nombre completo" },
        { key: "areaNombre", label: "Área" },
        { key: "cargo", label: "Cargo" },
        { key: "encargadoNombre", label: "Encargado directo" },
        { key: "turno", label: "Turno" },
        { key: "fechaIngreso", label: "Fecha de ingreso" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { name: "codigoEmpleado", label: "Código de empleado" },
        { name: "nombre", label: "Nombre completo", required: true },
        {
          name: "areaId",
          label: "Área asignada",
          type: "select",
          required: true,
          options: areas.map((area) => ({ value: area.id, label: area.nombre })),
        },
        {
          name: "encargadoNombre",
          label: "Encargado asignado",
          readOnly: true,
          help: "Se completa automáticamente desde el área seleccionada.",
        },
        {
          name: "cargo",
          label: "Cargo / puesto",
          type: "select",
          required: true,
          options: (form) =>
            unique(
              kpiTemplates
                .filter((template) => {
                  return (
                    template.estado !== "Inactivo" &&
                    (template.areaId === form.areaId || sameArea(template.areaNombre || template.area, form.areaNombre))
                  );
                })
                .map((template) => template.cargo || template.puesto)
            ),
        },
        { name: "turno", label: "Turno", type: "select", required: true, options: ["Mañana", "Tarde", "Noche", "Mixto"] },
        { name: "fechaIngreso", label: "Fecha de ingreso", type: "date", required: true },
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] },
      ]}
      initialForm={{
        codigoEmpleado: "",
        nombre: "",
        areaId: "",
        areaNombre: "",
        encargadoId: "",
        encargadoNombre: "",
        cargo: "",
        turno: "Mañana",
        fechaIngreso: "",
        estado: "Activo",
        kpiTemplateIds: [],
        indicadoresAsignados: [],
      }}
      onFormChange={completeFormRelations}
      onBeforeSave={normalizeCollaborator}
      renderFormHint={renderFormHint}
      onCreate={onSave}
      onSave={onSave}
    />
  );
}
