import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Edit3, Plus, RotateCcw, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { KPI_AREAS } from "../data/kpiAreaTemplates";
import { canEditMasterData, canViewAllData, sameArea } from "../services/permissionsService";
import { normalizeCargoName } from "../services/relationsService";

const initialForm = {
  id: "",
  areaId: "",
  area: "",
  areaNombre: "",
  cargo: "",
  indicador: "",
  tipoIndicador: "Mayor es mejor",
  menorEsMejor: false,
  peso: "",
  meta: "",
  estado: "Activo",
};

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueAreaNames(items = []) {
  const seen = new Set();
  return items.filter(Boolean).filter((item) => {
    const key = normalizeText(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stateLabel(value) {
  return value === "Inactivo" ? "Inactiva" : "Activa";
}

function makeAreaName(form, areas) {
  const area = areas.find((item) => item.id === form.areaId);
  return area?.nombre || form.areaNombre || form.area || "";
}

function hasRequiredNumber(value) {
  if (value === "" || value === undefined || value === null) return false;
  return Number.isFinite(Number(value));
}

function isDuplicateTemplate(templates, form, areas) {
  const areaName = makeAreaName(form, areas);
  const cargoKey = normalizeCargoName(form.cargo || form.puesto);
  const indicatorKey = normalizeText(form.indicador);

  return templates.some((template) => {
    if (template.id && template.id === form.id) return false;
    return (
      sameArea(template.areaNombre || template.area, areaName) &&
      normalizeCargoName(template.cargo || template.puesto) === cargoKey &&
      normalizeText(template.indicador) === indicatorKey
    );
  });
}

function validateTemplate(form, templates, areas) {
  if (!makeAreaName(form, areas)) return "El área es obligatoria.";
  if (!form.cargo && !form.puesto) return "El cargo es obligatorio.";
  if (!form.indicador) return "El indicador es obligatorio.";
  if (!hasRequiredNumber(form.peso)) return "El peso es obligatorio.";
  if (Number(form.peso) <= 0) return "El peso debe ser mayor que 0.";
  if (!hasRequiredNumber(form.meta)) return "La meta es obligatoria.";
  if (!form.estado) return "El estado es obligatorio.";
  if (isDuplicateTemplate(templates, form, areas)) return "Ya existe una plantilla KPI con la misma área, cargo e indicador.";
  return "";
}

export default function PlantillasKpiArea({
  templates,
  areas = [],
  activeUser,
  onSaveTemplate,
  onToggleTemplateStatus,
  onDeleteTemplate,
  onResetTemplates,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const canEdit = canEditMasterData(activeUser);
  const areaNames = useMemo(() => {
    return uniqueAreaNames([
      ...KPI_AREAS,
      ...areas.map((area) => area.nombre),
      ...templates.map((template) => template.areaNombre || template.area),
    ]);
  }, [areas, templates]);

  const areaOptions = useMemo(() => {
    if (areas.length) return areas.map((area) => ({ value: area.id, label: area.nombre }));
    if (canViewAllData(activeUser)) return areaNames;
    return activeUser?.areaAsignada ? [activeUser.areaAsignada] : areaNames;
  }, [activeUser, areaNames, areas]);

  const filteredTemplates = useMemo(() => {
    if (!areaFilter) return templates;
    return templates.filter((template) => sameArea(template.areaNombre || template.area, areaFilter));
  }, [areaFilter, templates]);

  function openCreate() {
    const first = areas[0];
    setForm({
      ...initialForm,
      areaId: first?.id || "",
      areaNombre: first?.nombre || "",
      area: first?.nombre || (typeof areaOptions[0] === "string" ? areaOptions[0] : ""),
      estado: "Activo",
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(template) {
    const area = areas.find((item) => item.id === template.areaId || sameArea(item.nombre, template.areaNombre || template.area));
    setForm({
      ...initialForm,
      ...template,
      areaId: template.areaId || area?.id || "",
      areaNombre: template.areaNombre || template.area || area?.nombre || "",
      area: template.areaNombre || template.area || area?.nombre || "",
      cargo: template.cargo || template.puesto || "",
      menorEsMejor: Boolean(template.menorEsMejor),
      estado: template.estado || "Activo",
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function updateForm(name, value) {
    if (name === "areaId") {
      const area = areas.find((item) => item.id === value);
      setForm((current) => ({
        ...current,
        areaId: value,
        areaNombre: area?.nombre || "",
        area: area?.nombre || "",
      }));
      setError("");
      return;
    }

    if (name === "tipoIndicador") {
      setForm((current) => ({
        ...current,
        tipoIndicador: value,
        menorEsMejor: value === "Menor es mejor",
      }));
      setError("");
      return;
    }

    if (name === "menorEsMejor") {
      const isLowerBetter = value === true || value === "true";
      setForm((current) => ({
        ...current,
        menorEsMejor: isLowerBetter,
        tipoIndicador: isLowerBetter ? "Menor es mejor" : "Mayor es mejor",
      }));
      setError("");
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function saveTemplate(event) {
    event.preventDefault();
    const validationError = validateTemplate(form, templates, areas);
    if (validationError) {
      setError(validationError);
      return;
    }

    const now = new Date().toISOString();
    const areaName = makeAreaName(form, areas);
    const menorEsMejor = Boolean(form.menorEsMejor || form.tipoIndicador === "Menor es mejor");

    onSaveTemplate({
      ...form,
      areaId: form.areaId || "",
      areaNombre: areaName,
      area: areaName,
      cargo: form.cargo || form.puesto,
      puesto: form.cargo || form.puesto,
      indicador: form.indicador.trim(),
      tipoIndicador: menorEsMejor ? "Menor es mejor" : "Mayor es mejor",
      menorEsMejor,
      peso: Number(form.peso),
      meta: Number(form.meta),
      estado: form.estado || "Activo",
      createdAt: form.createdAt || now,
      updatedAt: now,
    });

    setModalOpen(false);
    setMessage(form.id ? "Plantilla KPI actualizada correctamente." : "Plantilla KPI creada correctamente.");
  }

  function resetTemplates() {
    const confirmed = window.confirm(
      "Esta acción borrará solamente las plantillas KPI actuales. No borrará usuarios, colaboradores, áreas ni evaluaciones. ¿Deseas continuar?"
    );
    if (!confirmed) return;
    onResetTemplates?.();
    setAreaFilter("");
    setMessage("Plantillas KPI limpiadas correctamente.");
    setError("");
  }

  function toggleTemplate(template) {
    onToggleTemplateStatus?.(template.id);
    setMessage(template.estado === "Inactivo" ? "Plantilla KPI activada correctamente." : "Plantilla KPI desactivada correctamente.");
  }

  function deleteTemplate(template) {
    const confirmed = window.confirm("¿Deseas eliminar esta plantilla KPI?");
    if (!confirmed) return;
    onDeleteTemplate?.(template.id);
    setMessage("Plantilla KPI eliminada correctamente.");
  }

  const emptyText = areaFilter
    ? "No hay plantillas KPI registradas para esta área."
    : "No hay plantillas KPI registradas.";

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Plantillas KPI por Área</h1>
          <p>Indicadores base, pesos y metas para la evaluación mensual operativa.</p>
        </div>
        <div className="module-actions">
          {canEdit ? (
            <>
              <button className="button button--ghost" type="button" onClick={resetTemplates}>
                <RotateCcw size={16} />
                Limpiar plantillas KPI
              </button>
              <button className="button button--primary" type="button" onClick={openCreate}>
                <Plus size={16} />
                Crear plantilla
              </button>
            </>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h2>Filtro</h2>
            <span>Filtra las plantillas por área sin afectar los datos guardados.</span>
          </div>
        </div>
        <div className="form-grid form-grid--compact">
          <FormField
            field={{
              name: "areaFilter",
              label: "Filtrar por área",
              type: "select",
              options: [{ value: "", label: "Todas las áreas" }, ...areaNames.map((area) => ({ value: area, label: area }))],
            }}
            value={areaFilter}
            onChange={(_, value) => setAreaFilter(value)}
          />
        </div>
        {message ? <p className="form-success">{message}</p> : null}
      </section>

      <section className="content-panel">
        <DataTable
          rows={filteredTemplates}
          emptyText={emptyText}
          columns={[
            { key: "areaNombre", label: "Área", render: (row) => row.areaNombre || row.area },
            { key: "cargo", label: "Cargo", render: (row) => row.cargo || row.puesto },
            { key: "indicador", label: "Indicador" },
            { key: "tipoIndicador", label: "Tipo" },
            { key: "peso", label: "Peso %", render: (row) => `${row.peso}%` },
            { key: "meta", label: "Meta" },
            { key: "menorEsMejor", label: "Menor es mejor", render: (row) => (row.menorEsMejor ? "Sí" : "No") },
            { key: "estado", label: "Estado", render: (row) => stateLabel(row.estado) },
            {
              key: "acciones",
              label: "Acciones",
              render: (row) =>
                canEdit ? (
                  <div className="table-actions">
                    <button className="text-button" type="button" onClick={() => openEdit(row)}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                    <button className="text-button" type="button" onClick={() => toggleTemplate(row)}>
                      {row.estado === "Inactivo" ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                      {row.estado === "Inactivo" ? "Activar" : "Desactivar"}
                    </button>
                    <button className="text-button text-button--danger" type="button" onClick={() => deleteTemplate(row)}>
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </section>

      {modalOpen ? (
        <Modal title={form.id ? "Editar plantilla KPI" : "Crear plantilla KPI"} onClose={() => setModalOpen(false)}>
          <form className="entity-form" onSubmit={saveTemplate}>
            <div className="form-grid">
              <FormField
                field={{
                  name: areas.length ? "areaId" : "area",
                  label: "Área",
                  type: "select",
                  required: true,
                  options: areaOptions,
                }}
                value={areas.length ? form.areaId : form.area}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "cargo", label: "Cargo / Puesto", required: true }}
                value={form.cargo || form.puesto}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "indicador", label: "Indicador", required: true }}
                value={form.indicador}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "tipoIndicador",
                  label: "Tipo de indicador",
                  type: "select",
                  required: true,
                  options: ["Mayor es mejor", "Menor es mejor"],
                }}
                value={form.tipoIndicador}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "peso", label: "Peso %", type: "number", min: 0, max: 100, required: true }}
                value={form.peso}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "meta", label: "Meta", type: "number", min: 0, required: true }}
                value={form.meta}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "menorEsMejor",
                  label: "Menor es mejor",
                  type: "select",
                  required: true,
                  options: [
                    { value: "false", label: "No" },
                    { value: "true", label: "Sí" },
                  ],
                }}
                value={String(Boolean(form.menorEsMejor))}
                onChange={updateForm}
              />
              <FormField
                field={{
                  name: "estado",
                  label: "Estado",
                  type: "select",
                  required: true,
                  options: [
                    { value: "Activo", label: "Activa" },
                    { value: "Inactivo", label: "Inactiva" },
                  ],
                }}
                value={form.estado}
                onChange={updateForm}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                Guardar
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
