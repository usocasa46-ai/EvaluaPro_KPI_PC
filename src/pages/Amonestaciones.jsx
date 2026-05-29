import HrRecordsModule from "../components/HrRecordsModule";
import { canCreateWarning, canEditWarning } from "../services/permissionsService";

export default function Amonestaciones({ records, colaboradores, areas, encargados, activeUser, onSaveRecord }) {
  return (
    <HrRecordsModule
      kind="amonestaciones"
      title="Amonestaciones"
      subtitle="Estructura base temporal para registros disciplinarios."
      createLabel="Nueva amonestación"
      emptyText="No hay amonestaciones registradas."
      records={records}
      colaboradores={colaboradores}
      areas={areas}
      encargados={encargados}
      activeUser={activeUser}
      canCreate={canCreateWarning(activeUser)}
      canEditRecord={(record) => canEditWarning(activeUser, record)}
      onSave={onSaveRecord}
      statusOptions={["Borrador", "Emitida", "Revisada", "Anulada"]}
      dateColumn={{ key: "fechaAmonestacion", label: "Fecha" }}
      typeColumn={{ key: "tipoAmonestacion", label: "Tipo" }}
      extraFields={[
        { name: "fechaAmonestacion", label: "Fecha amonestación", type: "date", required: true },
        {
          name: "tipoAmonestacion",
          label: "Tipo de amonestación",
          type: "select",
          required: true,
          options: ["Verbal", "Escrita", "Suspensión", "Otra"],
        },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "accionCorrectiva", label: "Acción correctiva", type: "textarea" },
      ]}
    />
  );
}
