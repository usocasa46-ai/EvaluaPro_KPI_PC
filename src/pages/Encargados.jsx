import CrudModule from "../components/CrudModule";
import { formatPercentage } from "../services/kpiService";
import { getCollaboratorsByArea } from "../services/relationsService";

export default function Encargados({
  encargados,
  areas,
  subgerentes = [],
  colaboradores = [],
  encargadoSummary,
  canCreate,
  canEdit,
  onSave,
}) {
  const rows = encargados.map((encargado) => {
    const summary = encargadoSummary.find((item) => item.id === encargado.id);
    const area = areas.find((item) => item.id === encargado.areaId || item.nombre === encargado.areaNombre || item.nombre === encargado.area);
    const areaName = encargado.areaNombre || encargado.area || area?.nombre || "";

    return {
      ...encargado,
      areaId: encargado.areaId || area?.id || "",
      areaNombre: areaName,
      subgerenteNombre: encargado.subgerenteNombre || "",
      colaboradores: getCollaboratorsByArea(colaboradores, encargado.areaId || areaName).length,
      kpi: summary ? formatPercentage(summary.kpi) : "Sin KPI",
      resultado: summary?.resultado || "Sin evaluación",
      incidencias: summary?.incidencias || 0,
    };
  });

  function normalizeManager(form) {
    const area = areas.find((item) => item.id === form.areaId);
    const subgerente = subgerentes.find((item) => item.id === form.subgerenteId);
    const areaName = area?.nombre || form.areaNombre || form.area || "";

    return {
      ...form,
      areaId: form.areaId || "",
      areaNombre: areaName,
      area: areaName,
      subgerenteId: form.subgerenteId || "",
      subgerenteNombre: subgerente?.nombre || "",
      usuarioId: form.usuarioId || "",
    };
  }

  return (
    <CrudModule
      title="Encargados"
      subtitle="Responsables directos por área y seguimiento del equipo."
      rows={rows}
      canCreate={canCreate}
      canEdit={canEdit}
      createLabel="Nuevo encargado"
      columns={[
        { key: "id", label: "ID" },
        { key: "nombre", label: "Nombre completo" },
        { key: "areaNombre", label: "Área responsable" },
        { key: "subgerenteNombre", label: "Subgerente" },
        { key: "colaboradores", label: "Colaboradores" },
        { key: "telefono", label: "Teléfono" },
        { key: "correo", label: "Correo" },
        { key: "kpi", label: "KPI área" },
        { key: "incidencias", label: "Incidencias" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { name: "nombre", label: "Nombre completo", required: true },
        {
          name: "areaId",
          label: "Área responsable",
          type: "select",
          required: true,
          options: areas.map((area) => ({ value: area.id, label: area.nombre })),
        },
        {
          name: "subgerenteId",
          label: "Subgerente responsable",
          type: "select",
          options: [
            { value: "", label: "Sin asignar" },
            ...subgerentes.map((subgerente) => ({ value: subgerente.id, label: subgerente.nombre })),
          ],
        },
        { name: "usuarioId", label: "Usuario vinculado", help: "Opcional: se llena al vincular desde Usuarios y Roles." },
        { name: "telefono", label: "Teléfono" },
        { name: "correo", label: "Correo", type: "email" },
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] },
      ]}
      initialForm={{
        nombre: "",
        areaId: "",
        subgerenteId: "",
        usuarioId: "",
        telefono: "",
        correo: "",
        estado: "Activo",
      }}
      onCreate={onSave}
      onSave={onSave}
      onBeforeSave={normalizeManager}
    />
  );
}
