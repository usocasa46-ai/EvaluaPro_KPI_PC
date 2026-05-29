import CrudModule from "../components/CrudModule";
import { formatPercentage } from "../services/kpiService";

export default function Areas({ areas, areaSummary, encargados, subgerentes = [], canCreate, canEdit, onSave }) {
  const rows = areas.map((area) => {
    const summary = areaSummary.find((item) => item.area === area.nombre);
    const encargado = encargados.find((item) => item.id === area.encargadoId || item.nombre === area.encargadoNombre || item.nombre === area.encargado);
    const subgerente = subgerentes.find((item) => item.id === area.subgerenteId || item.nombre === area.subgerenteNombre);
    return {
      ...area,
      encargadoId: area.encargadoId || encargado?.id || "",
      encargadoNombre: area.encargadoNombre || area.encargado || encargado?.nombre || "Sin asignar",
      subgerenteId: area.subgerenteId || subgerente?.id || "",
      subgerenteNombre: area.subgerenteNombre || subgerente?.nombre || "",
      kpi: summary ? formatPercentage(summary.kpi) : "Sin KPI",
      colaboradores: summary?.colaboradores || 0,
      incidencias: summary?.incidencias || 0,
    };
  });

  function normalizeArea(form) {
    const encargado = encargados.find((item) => item.id === form.encargadoId);
    const subgerente = subgerentes.find((item) => item.id === form.subgerenteId);

    return {
      ...form,
      encargadoId: form.encargadoId || "",
      encargadoNombre: encargado?.nombre || "Sin asignar",
      encargado: encargado?.nombre || "Sin asignar",
      subgerenteId: form.subgerenteId || "",
      subgerenteNombre: subgerente?.nombre || "",
    };
  }

  return (
    <CrudModule
      title="Áreas"
      subtitle="Gestión operativa de departamentos, responsables y estado."
      rows={rows}
      canCreate={canCreate}
      canEdit={canEdit}
      createLabel="Nueva área"
      columns={[
        { key: "nombre", label: "Área" },
        { key: "encargadoNombre", label: "Encargado asignado" },
        { key: "subgerenteNombre", label: "Subgerente" },
        { key: "colaboradores", label: "Colaboradores" },
        { key: "incidencias", label: "Incidencias" },
        { key: "kpi", label: "KPI" },
        { key: "estado", label: "Estado" },
        { key: "observacion", label: "Observación" },
      ]}
      fields={[
        { name: "nombre", label: "Nombre del área", required: true },
        {
          name: "encargadoId",
          label: "Encargado asignado",
          type: "select",
          options: [
            { value: "", label: "Sin asignar" },
            ...encargados.map((encargado) => ({ value: encargado.id, label: encargado.nombre })),
          ],
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
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] },
        { name: "observacion", label: "Observación", type: "textarea", required: true },
      ]}
      initialForm={{ nombre: "", encargadoId: "", subgerenteId: "", estado: "Activo", observacion: "" }}
      onCreate={onSave}
      onSave={onSave}
      onBeforeSave={normalizeArea}
    />
  );
}
