import { useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Upload } from "lucide-react";
import CrudModule from "../components/CrudModule";
import Modal from "../components/Modal";
import {
  generateCollaboratorTemplate,
  importValidCollaborators,
  parseCollaboratorsExcel,
  validateCollaboratorRows,
} from "../services/collaboratorImportService";
import { getKpiTemplatesByAreaAndCargo, getManagerByArea } from "../services/relationsService";
import { ROLES, sameArea } from "../services/permissionsService";

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
  activeUser,
  canCreate,
  canEdit,
  onSave,
}) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const canBulkImport = activeUser?.rol === ROLES.GERENTE;
  const validPreviewRows = bulkPreview.filter((row) => row.valid);
  const invalidPreviewRows = bulkPreview.filter((row) => !row.valid);

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

  function importContext() {
    return {
      areas,
      encargados,
      kpiTemplates,
      colaboradores,
    };
  }

  function resetBulkState() {
    setBulkFile(null);
    setBulkRows([]);
    setBulkPreview([]);
    setBulkError("");
    setBulkMessage("");
  }

  function openBulkImport() {
    resetBulkState();
    setBulkOpen(true);
  }

  async function validateBulkFile() {
    setBulkError("");
    setBulkMessage("");

    if (!canBulkImport) {
      setBulkError("No tienes permiso para realizar carga masiva de colaboradores.");
      return;
    }

    if (!bulkFile) {
      setBulkError("Selecciona un archivo Excel antes de validar.");
      return;
    }

    try {
      const parsedRows = await parseCollaboratorsExcel(bulkFile);
      const previewRows = validateCollaboratorRows(parsedRows, importContext());
      setBulkRows(parsedRows);
      setBulkPreview(previewRows);
      setBulkMessage(
        `Archivo validado. Filas válidas: ${previewRows.filter((row) => row.valid).length}. Filas con errores: ${
          previewRows.filter((row) => !row.valid).length
        }.`
      );
    } catch (error) {
      setBulkRows([]);
      setBulkPreview([]);
      setBulkError(error.message || "No se pudo validar el archivo.");
    }
  }

  function importBulkRows() {
    setBulkError("");
    setBulkMessage("");

    if (!canBulkImport) {
      setBulkError("No tienes permiso para realizar carga masiva de colaboradores.");
      return;
    }

    if (!validPreviewRows.length) {
      setBulkError("No hay filas válidas para importar.");
      return;
    }

    const imported = importValidCollaborators(validPreviewRows, { onImport: onSave, context: importContext() });
    setBulkPreview([]);
    setBulkRows([]);
    setBulkFile(null);
    setBulkMessage(`Importación completada. Colaboradores importados: ${imported.length}. Filas omitidas por errores: ${invalidPreviewRows.length}.`);
  }

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
    <>
      <CrudModule
        title="Colaboradores"
        subtitle="Ficha básica del personal operativo y relación con su área, encargado y plantilla KPI."
        rows={rows}
        canCreate={canCreate}
        canEdit={canEdit}
        createLabel="Nuevo colaborador"
        toolbar={
          canBulkImport ? (
            <button className="button button--secondary" type="button" onClick={openBulkImport}>
              <Upload size={16} />
              Carga masiva
            </button>
          ) : (
            <span className="bulk-import-permission">No tienes permiso para realizar carga masiva de colaboradores.</span>
          )
        }
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

      {bulkOpen ? (
        <Modal title="Carga masiva de colaboradores" onClose={() => setBulkOpen(false)}>
          <section className="bulk-import-panel">
            {!canBulkImport ? (
              <>
                <p className="form-error">No tienes permiso para realizar carga masiva de colaboradores.</p>
                <footer className="modal__footer">
                  <button className="button button--ghost" type="button" onClick={() => setBulkOpen(false)}>
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className="bulk-import-actions">
                  <button className="button button--secondary" type="button" onClick={generateCollaboratorTemplate}>
                    <Download size={16} />
                    Descargar plantilla Excel
                  </button>
                  <label className="button button--secondary">
                    <Upload size={16} />
                    Subir archivo Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      hidden
                      onChange={(event) => {
                        setBulkFile(event.target.files?.[0] || null);
                        setBulkPreview([]);
                        setBulkRows([]);
                        setBulkError("");
                        setBulkMessage("");
                      }}
                    />
                  </label>
                  <button className="button button--primary" type="button" onClick={validateBulkFile}>
                    Validar archivo
                  </button>
                  <button className="button button--primary" type="button" onClick={importBulkRows} disabled={!validPreviewRows.length}>
                    <CheckCircle2 size={16} />
                    Importar filas válidas
                  </button>
                </div>

                <div className="bulk-import-file">
                  <strong>Archivo:</strong>
                  <span>{bulkFile?.name || "Ningún archivo seleccionado"}</span>
                </div>

                {bulkError ? <p className="form-error">{bulkError}</p> : null}
                {bulkMessage ? <p className="form-success">{bulkMessage}</p> : null}

                {bulkPreview.length ? (
                  <div className="bulk-import-summary">
                    <span>Filas leídas: {bulkRows.length}</span>
                    <span>Válidas: {validPreviewRows.length}</span>
                    <span>Con errores: {invalidPreviewRows.length}</span>
                  </div>
                ) : null}

                {bulkPreview.length ? (
                  <div className="table-wrap bulk-import-preview">
                    <table className="product-movement-table">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Código empleado</th>
                          <th>Nombre completo</th>
                          <th>Área</th>
                          <th>Cargo</th>
                          <th>Turno</th>
                          <th>Fecha ingreso</th>
                          <th>Estado</th>
                          <th>Encargado detectado</th>
                          <th>Plantilla KPI detectada</th>
                          <th>Resultado validación</th>
                          <th>Errores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((row) => (
                          <tr key={`${row.rowNumber}-${row.codigoEmpleado}`} className={row.valid ? "bulk-row-valid" : "bulk-row-error"}>
                            <td>{row.rowNumber}</td>
                            <td>{row.codigoEmpleado}</td>
                            <td>{row.nombre}</td>
                            <td>{row.areaNombre || row.area}</td>
                            <td>{row.cargo}</td>
                            <td>{row.turno}</td>
                            <td>{row.fechaIngreso}</td>
                            <td>{row.estado}</td>
                            <td>{row.encargadoNombre || "No detectado"}</td>
                            <td>{row.plantillaKpiDetectada || "No detectada"}</td>
                            <td>{row.valid ? "Válida" : "Con errores"}</td>
                            <td>{row.errors.join(" ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <footer className="modal__footer">
                  <button className="button button--ghost" type="button" onClick={() => setBulkOpen(false)}>
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                </footer>
              </>
            )}
          </section>
        </Modal>
      ) : null}
    </>
  );
}
