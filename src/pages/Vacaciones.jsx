import HrRecordsModule from "../components/HrRecordsModule";
import { canCreateVacation, canEditVacation } from "../services/permissionsService";

export default function Vacaciones({ records, colaboradores, areas, encargados, activeUser, onSaveRecord }) {
  return (
    <HrRecordsModule
      kind="vacaciones"
      title="Vacaciones"
      subtitle="Estructura base temporal para solicitudes de vacaciones."
      createLabel="Nueva solicitud de vacaciones"
      emptyText="No hay vacaciones registradas."
      records={records}
      colaboradores={colaboradores}
      areas={areas}
      encargados={encargados}
      activeUser={activeUser}
      canCreate={canCreateVacation(activeUser)}
      canEditRecord={(record) => canEditVacation(activeUser, record)}
      onSave={onSaveRecord}
      statusOptions={["Borrador", "Pendiente", "Aprobada", "Rechazada", "Cancelada"]}
      dateColumn={{ key: "fechaSolicitud", label: "Fecha solicitud" }}
      typeColumn={{ key: "diasSolicitados", label: "Días" }}
      extraFields={[
        { name: "fechaSolicitud", label: "Fecha solicitud", type: "date", required: true },
        { name: "fechaInicio", label: "Fecha inicio", type: "date", required: true },
        { name: "fechaFin", label: "Fecha fin", type: "date", required: true },
        { name: "diasSolicitados", label: "Días solicitados", type: "number", readOnly: true },
      ]}
    />
  );
}
