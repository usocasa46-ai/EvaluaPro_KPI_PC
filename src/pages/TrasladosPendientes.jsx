import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Printer, RotateCcw, Upload } from "lucide-react";
import {
  TRANSFER_LAST_REPORT_KEY,
  WAREHOUSES,
  exportTransfersToExcel,
  filterTransfersFromOrigin,
  formatPrintDate,
  getDestinationCounts,
  groupTransfersByDestinationAndDocument,
  mapWarehouseName,
  normalizeWarehouseCode,
  parseTransferExcel,
} from "../services/transferReportService";
import { canAccessTransferPendingModule } from "../services/permissionsService";

function loadLastReport() {
  try {
    return JSON.parse(localStorage.getItem(TRANSFER_LAST_REPORT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveLastReport(report) {
  localStorage.setItem(TRANSFER_LAST_REPORT_KEY, JSON.stringify(report));
}

function removeLastReport() {
  localStorage.removeItem(TRANSFER_LAST_REPORT_KEY);
}

function safeCell(value) {
  if (value === undefined || value === null || value === "") return "-";
  return value;
}

function uniqueValues(rows = [], key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function applyFilters(rows = [], filters = {}) {
  return rows.filter((row) => {
    const byDestination =
      !filters.destination || normalizeWarehouseCode(row.destinationWarehouseCode) === normalizeWarehouseCode(filters.destination);
    const byArea = !filters.area || row.area === filters.area;
    const byDate = !filters.date || String(row.date || "").toLowerCase().includes(String(filters.date).toLowerCase());
    const byDocument =
      !filters.document || String(row.documentNumber || "").toLowerCase().includes(String(filters.document).toLowerCase());
    return byDestination && byArea && byDate && byDocument;
  });
}

function TransferTable({ documents }) {
  return (
    <table className="transfer-table">
      <colgroup>
        <col style={{ width: "11%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "37%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "8%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>Número de documento</th>
          <th>Código</th>
          <th>Descripción</th>
          <th>Cantidad</th>
          <th>Almacén origen</th>
          <th>Almacén destino</th>
          <th>Fecha</th>
          <th>Área</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => {
          const items = document.items?.length ? document.items : [{ code: "", description: "", quantity: "" }];
          const rowSpan = Math.max(items.length, 1);

          return items.map((item, index) => (
            <tr key={`${document.documentNumber}-${document.date}-${document.area}-${item.code}-${index}`}>
              {index === 0 ? (
                <td className="transfer-document-cell" rowSpan={rowSpan}>
                  {safeCell(document.documentNumber)}
                </td>
              ) : null}
              <td>{safeCell(item.code)}</td>
              <td>{safeCell(item.description)}</td>
              <td>{safeCell(item.quantity)}</td>
              {index === 0 ? (
                <>
                  <td className="transfer-document-cell" rowSpan={rowSpan}>
                    {safeCell(`${document.originWarehouseCode} - ${document.originWarehouseName}`)}
                  </td>
                  <td className="transfer-document-cell" rowSpan={rowSpan}>
                    {safeCell(`${document.destinationWarehouseCode || "?"} - ${document.destinationWarehouseName}`)}
                  </td>
                  <td className="transfer-document-cell" rowSpan={rowSpan}>
                    {safeCell(document.date)}
                  </td>
                  <td className="transfer-document-cell" rowSpan={rowSpan}>
                    {safeCell(document.area)}
                  </td>
                </>
              ) : null}
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

function TransferReportSections({ groups, areaFilter }) {
  if (!groups.length) {
    return <p className="empty-text">No hay datos para mostrar con los filtros actuales.</p>;
  }

  return groups.map((group) => (
    <section className="transfer-report-section" key={group.destinationCode}>
      <header className="transfer-report-header">
        <h2>EvaluaPro KPI Supermercado</h2>
        <h3>Listado de Traslados Pendientes</h3>
        <div>
          <span>Almacén origen: 30 - Supermix</span>
          <span>
            Almacén destino: {group.destinationCode} - {group.destinationName}
          </span>
          <span>Fecha de impresión: {formatPrintDate(new Date())}</span>
          <span>Área: {areaFilter || "Todas"}</span>
          <span>Cantidad de líneas: {group.lineCount}</span>
        </div>
      </header>
      <TransferTable documents={group.documents} />
    </section>
  ));
}

export default function TrasladosPendientes({ activeUser, onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [report, setReport] = useState(() => loadLastReport());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [printDestination, setPrintDestination] = useState(null);
  const [filters, setFilters] = useState({
    destination: "",
    area: "",
    date: "",
    document: "",
  });

  const canAccess = canAccessTransferPendingModule(activeUser);
  const reportRows = useMemo(() => report?.rows || [], [report]);
  const filteredRows = useMemo(() => applyFilters(reportRows, filters), [filters, reportRows]);
  const previewGroups = useMemo(() => groupTransfersByDestinationAndDocument(filteredRows), [filteredRows]);
  const printRows = useMemo(() => {
    const destination = printDestination === null ? filters.destination : printDestination;
    return applyFilters(reportRows, { ...filters, destination });
  }, [filters, printDestination, reportRows]);
  const printGroups = useMemo(() => groupTransfersByDestinationAndDocument(printRows), [printRows]);
  const destinationCounts = useMemo(() => getDestinationCounts(reportRows), [reportRows]);
  const areaOptions = useMemo(() => uniqueValues(reportRows, "area"), [reportRows]);
  const destinationOptions = useMemo(() => {
    const codes = new Set(["20", "1", "10"]);
    reportRows.forEach((row) => {
      const code = normalizeWarehouseCode(row.destinationWarehouseCode);
      if (code) codes.add(code);
    });
    return [...codes].map((code) => ({ code, name: mapWarehouseName(code) }));
  }, [reportRows]);

  if (!canAccess) {
    return <section className="permission-card">No tienes permiso para ver esta información.</section>;
  }

  function updateFilter(name, value) {
    setPrintDestination(null);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function processFile() {
    setError("");
    setMessage("");

    if (!selectedFile) {
      setError("Selecciona un archivo Excel antes de procesar.");
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setError("El archivo debe ser Excel (.xlsx o .xls).");
      return;
    }

    try {
      const importedRows = await parseTransferExcel(selectedFile);
      const rowsFromSupermix = filterTransfersFromOrigin(importedRows, 30);
      const nextReport = {
        fileName: selectedFile.name,
        processedAt: new Date().toISOString(),
        totalImported: importedRows.length,
        rows: rowsFromSupermix,
      };

      setReport(nextReport);
      saveLastReport(nextReport);
      setFilters({ destination: "", area: "", date: "", document: "" });

      if (!rowsFromSupermix.length) {
        setMessage("No se encontraron traslados con Almacén Origen 30 - Supermix.");
      } else {
        setMessage("Archivo procesado correctamente.");
      }
    } catch (currentError) {
      setError(currentError.message || "No se pudo procesar el archivo.");
    }
  }

  function clearImport() {
    setSelectedFile(null);
    setReport(null);
    setMessage("");
    setError("");
    setFilters({ destination: "", area: "", date: "", document: "" });
    removeLastReport();
  }

  function printAll() {
    if (!reportRows.length) {
      setError("No hay datos procesados para imprimir.");
      return;
    }
    setPrintDestination("");
    window.setTimeout(() => window.print(), 120);
  }

  function printSelectedWarehouse() {
    if (!filters.destination) {
      setError("Selecciona un almacén destino para imprimirlo.");
      return;
    }
    setPrintDestination(filters.destination);
    window.setTimeout(() => window.print(), 120);
  }

  function exportProcessed() {
    if (!previewGroups.length) {
      setError("No hay datos procesados para exportar.");
      return;
    }
    exportTransfersToExcel(previewGroups);
  }

  const unknownCount = reportRows.filter((row) => !WAREHOUSES[normalizeWarehouseCode(row.destinationWarehouseCode)]).length;

  return (
    <section className="page-shell transfer-page">
      <header className="module-header no-print">
        <div>
          <h1>Traslados Pendientes</h1>
          <p>Importa el Excel de traslados y genera listados por almacén destino.</p>
        </div>
        <div className="module-actions">
          {onBack ? (
            <button className="button button--ghost" type="button" onClick={onBack}>
              <ArrowLeft size={16} />
              Volver
            </button>
          ) : null}
          <button className="button button--secondary" type="button" onClick={clearImport}>
            <RotateCcw size={16} />
            Limpiar importación
          </button>
          <button className="button button--secondary" type="button" onClick={printAll}>
            <Printer size={16} />
            Imprimir todo
          </button>
          <button className="button button--secondary" type="button" onClick={printSelectedWarehouse}>
            <Printer size={16} />
            Imprimir almacén seleccionado
          </button>
          <button className="button button--primary" type="button" onClick={exportProcessed}>
            <Download size={16} />
            Exportar Excel procesado
          </button>
        </div>
      </header>

      <section className="content-panel transfer-upload-panel no-print">
        <div className="transfer-upload">
          <label className="button button--ghost">
            <Upload size={16} />
            Subir archivo Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setError("");
                setMessage("");
              }}
            />
          </label>
          <span>{selectedFile?.name || report?.fileName || "Ningún archivo seleccionado"}</span>
          <button className="button button--primary" type="button" onClick={processFile}>
            <FileSpreadsheet size={16} />
            Procesar archivo
          </button>
        </div>
        {message ? <p className="form-success transfer-message">{message}</p> : null}
        {error ? <p className="form-error transfer-message">{error}</p> : null}
      </section>

      {report ? (
        <>
          <section className="transfer-summary-grid no-print">
            <article>
              <span>Total de filas importadas</span>
              <strong>{report.totalImported || 0}</strong>
            </article>
            <article>
              <span>Traslados desde Supermix</span>
              <strong>{reportRows.length}</strong>
            </article>
            <article>
              <span>Ferremix Herrera</span>
              <strong>{destinationCounts["20"] || 0}</strong>
            </article>
            <article>
              <span>Ferremix Villa Mella</span>
              <strong>{destinationCounts["1"] || 0}</strong>
            </article>
            <article>
              <span>Impacto Ferretero</span>
              <strong>{destinationCounts["10"] || 0}</strong>
            </article>
            <article>
              <span>Almacén desconocido</span>
              <strong>{unknownCount}</strong>
            </article>
          </section>

          <section className="content-panel transfer-filters no-print">
            <div className="panel-heading">
              <div>
                <h2>Filtros</h2>
                <span>Los filtros también aplican a la impresión y exportación.</span>
              </div>
            </div>
            <div className="form-grid form-grid--compact">
              <label className="form-field">
                <span>Almacén destino</span>
                <select value={filters.destination} onChange={(event) => updateFilter("destination", event.target.value)}>
                  <option value="">Todos los almacenes</option>
                  {destinationOptions.map((destination) => (
                    <option key={destination.code} value={destination.code}>
                      {destination.code} - {destination.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Área</span>
                <select value={filters.area} onChange={(event) => updateFilter("area", event.target.value)}>
                  <option value="">Todas las áreas</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Fecha</span>
                <input value={filters.date} placeholder="dd/mm/yyyy" onChange={(event) => updateFilter("date", event.target.value)} />
              </label>
              <label className="form-field">
                <span>Número de documento</span>
                <input value={filters.document} onChange={(event) => updateFilter("document", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="transfer-preview no-print">
            <TransferReportSections groups={previewGroups} areaFilter={filters.area} />
          </section>

          <section className="transfer-printable transfer-print-report print-only">
            <TransferReportSections groups={printGroups} areaFilter={filters.area} />
          </section>
        </>
      ) : (
        <section className="content-panel no-print">
          <p className="empty-text">Sube un archivo Excel para generar el reporte de traslados pendientes.</p>
        </section>
      )}
    </section>
  );
}
