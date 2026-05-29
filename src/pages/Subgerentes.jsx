import CrudModule from "../components/CrudModule";
import { formatPercentage } from "../services/kpiService";

export default function Subgerentes({ subgerentes, subgerenteSummary, areas, usuarios = [], canCreate, canEdit, onSave }) {
  const rows = subgerentes.map((subgerente) => {
    const summary = subgerenteSummary.find((item) => item.id === subgerente.id);
    const supervisedAreas = subgerente.areasSupervisadas || subgerente.areas || [];
    return {
      ...subgerente,
      areasSupervisadas: supervisedAreas,
      areas: supervisedAreas,
      areasTexto: Array.isArray(supervisedAreas) ? supervisedAreas.join(", ") : "",
      kpiOperativo: summary ? formatPercentage(summary.kpiOperativo) : "Sin KPI",
      kpiManual: typeof summary?.kpiManual === "number" ? formatPercentage(summary.kpiManual) : summary?.kpiManual || "Sin evaluación",
      kpiFinal: summary ? formatPercentage(summary.kpi) : "Sin KPI",
      resultado: summary?.resultado || "Sin evaluación",
    };
  });

  function normalizeSubManager(form) {
    const user = usuarios.find((item) => item.id === form.usuarioId);
    const supervisedAreas = form.areasSupervisadas || form.areas || [];

    return {
      ...form,
      nombre: form.nombre || user?.nombre || "",
      usuarioId: form.usuarioId || "",
      areasSupervisadas: supervisedAreas,
      areas: supervisedAreas,
    };
  }

  return (
    <CrudModule
      title="Subgerentes"
      subtitle="Supervisión por grupos de áreas y resultado operativo consolidado."
      rows={rows}
      canCreate={canCreate}
      canEdit={canEdit}
      createLabel="Nuevo subgerente"
      columns={[
        { key: "id", label: "ID" },
        { key: "nombre", label: "Nombre completo" },
        { key: "codigo", label: "Código" },
        { key: "usuarioId", label: "Usuario vinculado" },
        { key: "telefono", label: "Teléfono" },
        { key: "correo", label: "Correo" },
        { key: "areasTexto", label: "Áreas bajo supervisión" },
        { key: "kpiOperativo", label: "KPI operativo" },
        { key: "kpiManual", label: "KPI gerente" },
        { key: "kpiFinal", label: "KPI final" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { name: "nombre", label: "Nombre completo", required: true },
        { name: "codigo", label: "Código/ID" },
        {
          name: "usuarioId",
          label: "Usuario vinculado",
          type: "select",
          options: [
            { value: "", label: "Sin vincular" },
            ...usuarios
              .filter((user) => user.rol === "Subgerente")
              .map((user) => ({ value: user.id, label: `${user.nombre} (${user.usuario})` })),
          ],
        },
        { name: "telefono", label: "Teléfono" },
        { name: "correo", label: "Correo", type: "email" },
        {
          name: "areasSupervisadas",
          label: "Áreas bajo supervisión",
          type: "multiselect",
          required: true,
          options: areas.map((area) => area.nombre),
        },
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] },
      ]}
      initialForm={{
        nombre: "",
        codigo: "",
        usuarioId: "",
        telefono: "",
        correo: "",
        areasSupervisadas: [],
        estado: "Activo",
      }}
      onCreate={onSave}
      onSave={onSave}
      onBeforeSave={normalizeSubManager}
    />
  );
}
