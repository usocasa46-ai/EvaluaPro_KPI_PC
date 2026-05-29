import CrudModule from "../components/CrudModule";

export default function Incidencias({ incidencias, areas, colaboradores, canCreate, onCreate }) {
  return (
    <CrudModule
      title="Incidencias"
      subtitle="Registro de eventos, gravedad, estado y acciones correctivas."
      rows={incidencias}
      canCreate={canCreate}
      createLabel="Nueva incidencia"
      columns={[
        { key: "id", label: "ID" },
        { key: "fecha", label: "Fecha" },
        { key: "area", label: "Área" },
        { key: "colaborador", label: "Colaborador relacionado" },
        { key: "tipo", label: "Tipo" },
        { key: "gravedad", label: "Gravedad" },
        { key: "estado", label: "Estado" },
        { key: "descripcion", label: "Descripción" },
        { key: "accionCorrectiva", label: "Acción correctiva" },
      ]}
      fields={[
        { name: "fecha", label: "Fecha", type: "date", required: true },
        { name: "area", label: "Área", type: "select", required: true, options: areas.map((area) => area.nombre) },
        {
          name: "colaboradorId",
          label: "Colaborador relacionado",
          type: "select",
          options: [{ value: "", label: "Sin colaborador" }, ...colaboradores.map((item) => ({ value: item.id, label: item.nombre }))],
        },
        { name: "tipo", label: "Tipo de incidencia", type: "select", required: true, options: ["KPI bajo", "Ausencia", "Retraso", "Proceso incumplido", "Reclamo", "Otro"] },
        { name: "gravedad", label: "Gravedad", type: "select", required: true, options: ["Baja", "Media", "Alta", "Crítica"] },
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Abierta", "En seguimiento", "Cerrada"] },
        { name: "descripcion", label: "Descripción", type: "textarea", required: true },
        { name: "accionCorrectiva", label: "Acción correctiva", type: "textarea", required: true },
      ]}
      initialForm={{
        fecha: "",
        area: "",
        colaboradorId: "",
        tipo: "",
        gravedad: "Media",
        estado: "Abierta",
        descripcion: "",
        accionCorrectiva: "",
      }}
      onBeforeSave={(form) => {
        const collaborator = colaboradores.find((item) => item.id === form.colaboradorId);
        return {
          ...form,
          colaborador: collaborator?.nombre || "",
        };
      }}
      onCreate={onCreate}
    />
  );
}
