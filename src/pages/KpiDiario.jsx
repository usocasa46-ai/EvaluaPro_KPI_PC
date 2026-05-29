import { useMemo, useState } from "react";
import { Edit3, Eye, Plus, Printer, Save } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { resolveCollaboratorHrData, today } from "../services/hrRecordsService";
import {
  canCreateDailyKpi,
  canEditDailyKpi,
  isWithinEditWindow,
  sameArea,
} from "../services/permissionsService";
import {
  DAILY_EVENT_TYPES,
  getAllowedDailyEventTypesForUser,
} from "../services/dailyKpiService";

function currentPeriod() {
  return today().slice(0, 7);
}

function makeInitialForm(activeUser) {
  const fecha = today();
  return {
    id: "",
    fecha,
    periodo: fecha.slice(0, 7),
    areaId: "",
    areaNombre: activeUser?.areaAsignada || "",
    colaboradorId: "",
    colaboradorNombre: "",
    cargoColaborador: "",
    encargadoId: "",
    encargadoNombre: activeUser?.rol === "Encargado" ? activeUser.nombre : "",
    tipoEvento: "",
    indicadorRelacionado: "",
    gravedad: "Media",
    cantidad: 1,
    descripcion: "",
    accionCorrectiva: "",
  };
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function uniqueOptions(items) {
  return [...new Set(items.filter(Boolean))];
}

function collaboratorArea(colaborador) {
  return colaborador?.areaNombre || colaborador?.area || "";
}

function filterByFormArea(colaboradores, areaNombre) {
  if (!areaNombre) return colaboradores;
  return colaboradores.filter((colaborador) => sameArea(collaboratorArea(colaborador), areaNombre));
}

export default function KpiDiario({
  records,
  colaboradores,
  areas,
  encargados,
  templates,
  activeUser,
  onSaveRecord,
}) {
  const [modalMode, setModalMode] = useState("closed");
  const [form, setForm] = useState(() => makeInitialForm(activeUser));
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    fecha: "",
    periodo: currentPeriod(),
    area: activeUser?.rol === "Encargado" ? activeUser.areaAsignada || "" : "",
    colaboradorId: "",
    tipoEvento: "",
  });

  const readOnly = modalMode === "view";
  const canCreate = canCreateDailyKpi(activeUser);
  const selectedCollaborator = colaboradores.find((colaborador) => colaborador.id === form.colaboradorId);
  const allowedEvents = selectedCollaborator
    ? getAllowedDailyEventTypesForUser(activeUser, selectedCollaborator, templates)
    : [];
  const eventTypeOptions = uniqueOptions(allowedEvents.map((event) => event.tipoEvento));
  const indicatorOptions = uniqueOptions(
    allowedEvents
      .filter((event) => !form.tipoEvento || event.tipoEvento === form.tipoEvento)
      .map((event) => event.indicadorRelacionado)
  );
  const areaOptions = useMemo(() => {
    const areaNames = areas.map((area) => area.nombre || area.areaNombre || area.area).filter(Boolean);
    const recordAreas = records.map((record) => record.areaNombre || record.area).filter(Boolean);
    const collaboratorAreas = colaboradores.map((colaborador) => collaboratorArea(colaborador)).filter(Boolean);
    const options = uniqueOptions([...areaNames, ...recordAreas, ...collaboratorAreas]);
    if (activeUser?.rol === "Encargado") return activeUser.areaAsignada ? [activeUser.areaAsignada] : [];
    return options;
  }, [activeUser, areas, colaboradores, records]);

  const collaboratorOptions = filterByFormArea(colaboradores, form.areaNombre).map((colaborador) => ({
    value: colaborador.id,
    label: `${colaborador.nombre} · ${colaborador.cargo || "Sin cargo"}`,
  }));

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const byDate = !filters.fecha || record.fecha === filters.fecha;
      const byPeriod = !filters.periodo || record.periodo === filters.periodo;
      const byArea = !filters.area || sameArea(record.areaNombre || record.area, filters.area);
      const byCollaborator = !filters.colaboradorId || record.colaboradorId === filters.colaboradorId;
      const byEvent = !filters.tipoEvento || record.tipoEvento === filters.tipoEvento;
      return byDate && byPeriod && byArea && byCollaborator && byEvent;
    });
  }, [filters, records]);

  const filterCollaborators = filterByFormArea(colaboradores, filters.area);
  const filterEventOptions = uniqueOptions(records.map((record) => record.tipoEvento)).filter((eventType) =>
    DAILY_EVENT_TYPES.some((allowedType) => allowedType === eventType)
  );

  function fillCollaboratorData(next, colaboradorId) {
    const colaborador = colaboradores.find((item) => item.id === colaboradorId);
    if (!colaborador) {
      return {
        ...next,
        colaboradorId,
        colaboradorNombre: "",
        cargoColaborador: "",
        tipoEvento: "",
        indicadorRelacionado: "",
      };
    }

    const data = resolveCollaboratorHrData(colaborador, areas, encargados);
    const dynamicEvents = getAllowedDailyEventTypesForUser(activeUser, colaborador, templates);
    const firstEvent = dynamicEvents[0] || {};

    return {
      ...next,
      ...data,
      colaboradorId,
      cargoColaborador: colaborador.cargo || "",
      tipoEvento: firstEvent.tipoEvento || "",
      indicadorRelacionado: firstEvent.indicadorRelacionado || "",
    };
  }

  function openCreate() {
    if (!canCreate) {
      setError("No tienes permiso para crear registros de KPI Diario.");
      return;
    }
    setForm(makeInitialForm(activeUser));
    setError("");
    setModalMode("edit");
  }

  function openView(record) {
    setForm({ ...makeInitialForm(activeUser), ...record });
    setError("");
    setModalMode("view");
  }

  function openEdit(record) {
    if (!canEditDailyKpi(activeUser, record)) {
      setError("Este registro esta bloqueado o no tienes permiso para editarlo.");
      return;
    }
    setForm({ ...makeInitialForm(activeUser), ...record });
    setError("");
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setError("");
  }

  function updateFilter(name, value) {
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "area") next.colaboradorId = "";
      return next;
    });
  }

  function updateForm(name, value) {
    setForm((current) => {
      let next = { ...current, [name]: value };

      if (name === "fecha") {
        next.periodo = String(value || "").slice(0, 7);
      }

      if (name === "colaboradorId") {
        next = fillCollaboratorData(next, value);
      }

      if (name === "tipoEvento") {
        const firstIndicator = allowedEvents.find((event) => event.tipoEvento === value)?.indicadorRelacionado || "";
        next.indicadorRelacionado = firstIndicator;
      }

      return next;
    });
    setError("");
  }

  function saveRecord(event) {
    event.preventDefault();
    if (form.id && !canEditDailyKpi(activeUser, form)) {
      setError("Este registro ya no puede editarse porque supero el periodo de 48 horas o no te pertenece.");
      return;
    }
    if (!form.colaboradorId) {
      setError("Selecciona un colaborador.");
      return;
    }
    if (!form.tipoEvento) {
      setError("Selecciona el tipo de evento.");
      return;
    }
    if (!form.indicadorRelacionado) {
      setError("Selecciona el indicador relacionado.");
      return;
    }
    if (Number(form.cantidad || 0) <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    onSaveRecord(form);
    closeModal();
  }

  function printPrepared() {
    window.alert("La impresion quedara disponible cuando se cargue el formulario oficial del modulo.");
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>KPI Diario</h1>
          <p>Registro diario de eventos operativos conectados a las plantillas KPI y a la evaluacion mensual.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <button className="button button--primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              Nuevo registro
            </button>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h2>Filtros</h2>
            <span>Los registros se filtran automaticamente por el alcance del usuario activo.</span>
          </div>
        </div>
        <div className="form-grid form-grid--compact">
          <FormField
            field={{ name: "fecha", label: "Fecha", type: "date" }}
            value={filters.fecha}
            onChange={updateFilter}
          />
          <FormField
            field={{ name: "periodo", label: "Periodo", type: "month" }}
            value={filters.periodo}
            onChange={updateFilter}
          />
          {activeUser?.rol === "Encargado" ? (
            <div className="kpi-locked-field">
              <span>Area</span>
              <strong>{activeUser.areaAsignada || "Sin area asignada"}</strong>
            </div>
          ) : (
            <FormField
              field={{ name: "area", label: "Area", type: "select", options: areaOptions }}
              value={filters.area}
              onChange={updateFilter}
            />
          )}
          <FormField
            field={{
              name: "colaboradorId",
              label: "Colaborador",
              type: "select",
              options: filterCollaborators.map((colaborador) => ({
                value: colaborador.id,
                label: colaborador.nombre,
              })),
            }}
            value={filters.colaboradorId}
            onChange={updateFilter}
          />
          <FormField
            field={{ name: "tipoEvento", label: "Tipo de evento", type: "select", options: filterEventOptions }}
            value={filters.tipoEvento}
            onChange={updateFilter}
          />
        </div>
      </section>

      <section className="content-panel">
        <DataTable
          rows={filteredRecords}
          emptyText="No hay registros de KPI Diario."
          columns={[
            { key: "fecha", label: "Fecha", render: (row) => formatDate(row.fecha) },
            { key: "periodo", label: "Periodo" },
            { key: "areaNombre", label: "Area" },
            { key: "colaboradorNombre", label: "Colaborador" },
            { key: "cargoColaborador", label: "Cargo" },
            { key: "tipoEvento", label: "Tipo de evento" },
            { key: "indicadorRelacionado", label: "Indicador relacionado" },
            { key: "cantidad", label: "Cantidad" },
            {
              key: "estadoEdicion",
              label: "Estado",
              render: (row) =>
                canEditDailyKpi(activeUser, row)
                  ? "Editable"
                  : row.creadoPorRol === "Encargado" && !isWithinEditWindow(row.createdAt, 48)
                    ? "Bloqueado"
                    : "Bloqueado",
            },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" type="button" onClick={() => openView(row)}>
                    <Eye size={13} />
                    Ver
                  </button>
                  {canEditDailyKpi(activeUser, row) ? (
                    <button className="text-button" type="button" onClick={() => openEdit(row)}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                  ) : (
                    <span
                      className="text-button text-button--locked"
                      title="Esta evaluacion ya no puede editarse porque supero el periodo de 48 horas o no te pertenece."
                    >
                      Bloqueado
                    </span>
                  )}
                  <button className="text-button" type="button" onClick={printPrepared}>
                    <Printer size={13} />
                    Imprimir
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {modalMode !== "closed" ? (
        <Modal title={readOnly ? "Ver KPI Diario" : form.id ? "Editar KPI Diario" : "Nuevo registro KPI Diario"} onClose={closeModal}>
          <form className="entity-form" onSubmit={saveRecord}>
            <div className="form-grid">
              <FormField
                field={{
                  name: "fecha",
                  label: "Fecha",
                  type: "date",
                  required: true,
                  readOnly,
                }}
                value={form.fecha}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "periodo", label: "Periodo", type: "month", readOnly: true }}
                value={form.periodo}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "colaboradorId",
                  label: "Colaborador",
                  type: "select",
                  required: true,
                  disabled: readOnly,
                  options: collaboratorOptions,
                }}
                value={form.colaboradorId}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "areaNombre", label: "Area", readOnly: true }}
                value={form.areaNombre}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "cargoColaborador", label: "Cargo", readOnly: true }}
                value={form.cargoColaborador}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "encargadoNombre", label: "Encargado", readOnly: true }}
                value={form.encargadoNombre}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "tipoEvento",
                  label: "Tipo de evento",
                  type: "select",
                  required: true,
                  disabled: readOnly || !form.colaboradorId,
                  options: eventTypeOptions,
                }}
                value={form.tipoEvento}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "indicadorRelacionado",
                  label: "Indicador relacionado",
                  type: "select",
                  required: true,
                  disabled: readOnly || !form.tipoEvento,
                  options: indicatorOptions,
                }}
                value={form.indicadorRelacionado}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "gravedad",
                  label: "Gravedad",
                  type: "select",
                  required: true,
                  disabled: readOnly,
                  options: ["Baja", "Media", "Alta", "Critica"],
                }}
                value={form.gravedad}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "cantidad", label: "Cantidad", type: "number", min: 1, required: true, readOnly }}
                value={form.cantidad}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "descripcion", label: "Descripcion", type: "textarea", readOnly }}
                value={form.descripcion}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "accionCorrectiva", label: "Accion correctiva", type: "textarea", readOnly }}
                value={form.accionCorrectiva}
                onChange={updateForm}
              />
            </div>

            {!colaboradores.length ? (
              <p className="template-warning">No hay colaboradores registrados en tu alcance actual.</p>
            ) : null}
            {form.colaboradorId && !allowedEvents.length ? (
              <p className="template-warning">No hay plantilla KPI configurada para este cargo en esta área.</p>
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}

            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="button button--secondary" type="button" onClick={printPrepared}>
                <Printer size={16} />
                Imprimir
              </button>
              {!readOnly ? (
                <button className="button button--primary" type="submit">
                  <Save size={16} />
                  Guardar
                </button>
              ) : null}
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
