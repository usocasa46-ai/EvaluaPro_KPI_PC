import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileSpreadsheet, Printer, RotateCcw, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY,
  analyzeMovementsByProduct,
  buildProductConclusion,
  exportMovementAnalysisToCsv,
  exportMovementAnalysisToExcel,
  getLastMovementAnalysis,
  parseProductMovementExcel,
  saveLastMovementAnalysis,
} from "../services/productMovementAnalysisService";
import {
  clearOldMovementAnalysisDetails,
  deleteMovementAnalysisDetail,
  getMovementAnalysisDetail,
  saveMovementAnalysisDetail,
} from "../services/productMovementStorageService";
import {
  canImportProductMovementAnalysis,
  canPrintProductMovementAnalysis,
  canViewProductMovementAnalysis,
} from "../services/permissionsService";

const EMPTY_FILTERS = {
  code: "",
  dateExact: "",
  dateFrom: "",
  dateTo: "",
  movementType: "",
  warehouse: "",
  document: "",
  user: "",
};

const SUMMARY_CARDS = [
  ["totalCodes", "Total códigos analizados"],
  ["saldoInicialTotal", "Saldo inicial total"],
  ["entradasEP", "Total entradas EP"],
  ["ventasRF", "Total vendido RF"],
  ["salidasSM", "Total salidas SM"],
  ["totalAjustePA", "Total ajustes PA"],
  ["totalNotaCreditoNE", "Total notas crédito NE"],
  ["existenciaCalculada", "Existencia calculada"],
  ["saldoFinalRealSistema", "Saldo final real del sistema"],
  ["diferencia", "Diferencia"],
];

const DETAIL_PAGE_SIZE = 100;

const EMPTY_ANALYSIS = {
  products: [],
  totals: {},
  charts: {
    movementTypeData: [],
    distributionData: [],
    existenceByDate: [],
    topProducts: [],
  },
  validRows: [],
  unknownRows: [],
  initialBalanceRows: [],
  filteredRows: [],
  validRowCount: 0,
  filteredRowCount: 0,
  filters: EMPTY_FILTERS,
};

const MOVEMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "EP", label: "EP - Entrada" },
  { value: "RF", label: "RF - Venta" },
  { value: "SM", label: "SM - Salida" },
  { value: "PA", label: "PA - Ajuste" },
  { value: "NE", label: "NE - Nota crédito" },
  { value: "DESCONOCIDO", label: "No reconocidos" },
];

const CHART_COLORS = ["#0f66ff", "#0ea5e9", "#f5b942", "#22c55e", "#ef4444"];

function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("es-DO", { maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0);
}

function safeText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function movementLabel(row) {
  if (row?.isInitialBalance || row?.movementType === "SALDO_INICIAL") return "Saldo inicial";
  if (row?.movementType) return row.movementType;
  return row?.movementRaw || "-";
}

function uniqueValues(rows = [], key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right))
  );
}

function downloadCsv(products) {
  const csv = exportMovementAnalysisToCsv(products);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analisis_movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildFilterLabels(filters) {
  const labels = [];
  if (filters.code) labels.push(`Artículo: ${filters.code}`);
  if (filters.dateExact) labels.push(`Fecha: ${filters.dateExact}`);
  if (filters.dateFrom) labels.push(`Desde: ${filters.dateFrom}`);
  if (filters.dateTo) labels.push(`Hasta: ${filters.dateTo}`);
  if (filters.movementType) labels.push(`Tipo: ${filters.movementType}`);
  if (filters.warehouse) labels.push(`Almacén: ${filters.warehouse}`);
  if (filters.document) labels.push(`Documento: ${filters.document}`);
  if (filters.user) labels.push(`Usuario: ${filters.user}`);
  return labels.length ? labels : ["Sin filtros aplicados"];
}

function ChartEmpty({ children }) {
  return <div className="product-movement-chart-empty">{children}</div>;
}

function hasActiveFilters(filters) {
  return Object.values(filters || {}).some(Boolean);
}

function normalizeAnalysisShape(analysis) {
  if (!analysis) return EMPTY_ANALYSIS;
  return {
    ...EMPTY_ANALYSIS,
    ...analysis,
    products: analysis.products || [],
    totals: analysis.totals || {},
    charts: {
      ...EMPTY_ANALYSIS.charts,
      ...(analysis.charts || {}),
    },
    validRows: analysis.validRows || [],
    unknownRows: analysis.unknownRows || [],
    initialBalanceRows: analysis.initialBalanceRows || [],
    filteredRows: analysis.filteredRows || [],
  };
}

export default function AnalisisMovimientoProductos({ activeUser }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [report, setReport] = useState(() => getLastMovementAnalysis());
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedCode, setSelectedCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailLimit, setDetailLimit] = useState(DETAIL_PAGE_SIZE);

  const canView = canViewProductMovementAnalysis(activeUser);
  const canImport = canImportProductMovementAnalysis(activeUser);
  const canPrint = canPrintProductMovementAnalysis(activeUser);
  const reportRows = report?.rows || [];
  const liveAnalysis = useMemo(() => (reportRows.length ? analyzeMovementsByProduct(reportRows, filters) : null), [filters, reportRows]);
  const savedAnalysis = useMemo(
    () => (!reportRows.length && !hasActiveFilters(filters) ? normalizeAnalysisShape(report?.analysis) : null),
    [filters, report?.analysis, reportRows.length]
  );
  const analysis = liveAnalysis || savedAnalysis || EMPTY_ANALYSIS;
  const fullAnalysis = useMemo(() => {
    if (reportRows.length) return analyzeMovementsByProduct(reportRows);
    return normalizeAnalysisShape(report?.analysis);
  }, [report?.analysis, reportRows]);
  const warehouseOptions = useMemo(
    () => uniqueValues(reportRows.length ? reportRows : analysis.products, "warehouse"),
    [analysis.products, reportRows]
  );
  const userOptions = useMemo(() => uniqueValues(reportRows, "user"), [reportRows]);
  const selectedProduct = useMemo(
    () => analysis.products.find((product) => product.code === selectedCode) || null,
    [analysis.products, selectedCode]
  );
  const visibleDetailRows = useMemo(
    () => (selectedProduct?.detailRows || []).slice(0, detailLimit),
    [detailLimit, selectedProduct]
  );
  const hiddenDetailRows = Math.max(0, (selectedProduct?.detailRows?.length || 0) - visibleDetailRows.length);
  const conclusionProduct = selectedProduct || analysis.products[0] || null;
  const conclusionLines = useMemo(() => buildProductConclusion(conclusionProduct, filters), [conclusionProduct, filters]);
  const filterLabels = useMemo(() => buildFilterLabels(filters), [filters]);

  useEffect(() => {
    setDetailLimit(DETAIL_PAGE_SIZE);
  }, [filters, selectedCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredDetails() {
      if (!report?.analysisId || report?.rows?.length || !report?.hasDetailedData) return;

      try {
        const storedDetail = await getMovementAnalysisDetail(report.analysisId);
        if (!cancelled && storedDetail?.rows?.length) {
          setReport((current) =>
            current?.analysisId === report.analysisId ? { ...current, rows: storedDetail.rows } : current
          );
        }
      } catch {
        if (!cancelled) setMessage("Resumen cargado. Vuelve a subir el Excel si necesitas ver el detalle completo.");
      }
    }

    loadStoredDetails();
    return () => {
      cancelled = true;
    };
  }, [report?.analysisId, report?.hasDetailedData, report?.rows?.length]);

  if (!canView) {
    return <section className="permission-card">No tienes permiso para ver esta información.</section>;
  }

  function updateFilter(name, value) {
    setSelectedCode("");
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setSelectedCode("");
    setFilters(EMPTY_FILTERS);
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

    setIsProcessing(true);
    try {
      const parsed = await parseProductMovementExcel(selectedFile);
      const analysisId = `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextReport = {
        ...parsed,
        id: analysisId,
        analysisId,
        processedAt: new Date().toISOString(),
        processedById: activeUser?.id || "",
        processedByName: activeUser?.nombre || activeUser?.usuario || "",
      };
      const nextAnalysis = analyzeMovementsByProduct(nextReport.rows);
      let detailSaved = false;

      try {
        await saveMovementAnalysisDetail(analysisId, nextReport.rows);
        await clearOldMovementAnalysisDetails(analysisId);
        detailSaved = true;
      } catch {
        detailSaved = false;
      }

      const storedReport = saveLastMovementAnalysis({ ...nextReport, hasDetailedData: detailSaved }, nextAnalysis);

      setReport({ ...storedReport, rows: nextReport.rows, warnings: nextReport.warnings });
      setFilters(EMPTY_FILTERS);
      setSelectedCode("");
      setDetailLimit(DETAIL_PAGE_SIZE);

      if (!nextAnalysis.validRows.length) {
        setMessage("No se encontraron movimientos válidos para analizar.");
      } else if (!detailSaved) {
        setMessage(
          `Archivo procesado correctamente. Productos analizados: ${nextAnalysis.totals.totalCodes}. El resumen se guardó ligero; el detalle completo quedará disponible durante esta sesión.`
        );
      } else {
        setMessage(`Archivo procesado correctamente. Productos analizados: ${nextAnalysis.totals.totalCodes}.`);
      }
    } catch (currentError) {
      setError(currentError.message || "No se pudo procesar el archivo.");
    } finally {
      setIsProcessing(false);
    }
  }

  function clearAnalysis() {
    const analysisId = report?.analysisId;
    setReport(null);
    setSelectedFile(null);
    setSelectedCode("");
    setFilters(EMPTY_FILTERS);
    setDetailLimit(DETAIL_PAGE_SIZE);
    setMessage("Análisis limpiado.");
    setError("");
    localStorage.removeItem(PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY);
    if (analysisId) deleteMovementAnalysisDetail(analysisId).catch(() => {});
  }

  function printReport() {
    window.setTimeout(() => window.print(), 80);
  }

  function exportReport() {
    if (!analysis.products.length) {
      setError("No hay datos para exportar.");
      return;
    }

    try {
      exportMovementAnalysisToExcel(report, analysis, selectedProduct);
      setMessage("Análisis exportado a Excel.");
    } catch {
      downloadCsv(analysis.products);
      setMessage("Análisis exportado a CSV.");
    }
  }

  return (
    <section className="product-movement-page">
      <header className="module-header no-print">
        <div>
          <p className="eyebrow">Inventario analítico</p>
          <h1>Análisis de Movimiento de Productos</h1>
          <p>Resumen de entradas, ventas, ajustes y existencia calculada por producto.</p>
        </div>
        <div className="header-actions">
          <label className={`button ${canImport ? "" : "is-disabled"}`}>
            <Upload size={16} />
            Subir Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={!canImport}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setMessage("");
                setError("");
              }}
              hidden
            />
          </label>
          <button className="button button--primary" type="button" onClick={processFile} disabled={!canImport || isProcessing}>
            <FileSpreadsheet size={16} />
            {isProcessing ? "Procesando..." : "Procesar archivo"}
          </button>
          <button className="button button--secondary" type="button" onClick={clearAnalysis} disabled={!canImport && !report}>
            <RotateCcw size={16} />
            Limpiar análisis
          </button>
          <button className="button button--secondary" type="button" onClick={printReport} disabled={!canPrint || !analysis.products.length}>
            <Printer size={16} />
            Imprimir
          </button>
          <button className="button button--secondary" type="button" onClick={exportReport} disabled={!analysis.products.length}>
            <Download size={16} />
            Exportar Excel
          </button>
        </div>
      </header>

      <section className="content-panel product-movement-upload no-print">
        <div>
          <strong>Archivo seleccionado</strong>
          <span>{selectedFile?.name || report?.fileName || "Ningún archivo seleccionado"}</span>
        </div>
        <div>
          <strong>Hoja analizada</strong>
          <span>{report?.sheetName || "-"}</span>
        </div>
        <div>
          <strong>Último procesamiento</strong>
          <span>{report?.processedAt ? new Date(report.processedAt).toLocaleString("es-DO") : "Sin análisis guardado"}</span>
        </div>
      </section>

      {error ? <p className="form-error no-print">{error}</p> : null}
      {message ? <p className="form-success no-print">{message}</p> : null}

      {report ? (
        <>
          <section className="product-movement-print-header print-only">
            <h1>Análisis de Movimiento de Productos</h1>
            <p>Fecha de impresión: {new Date().toLocaleString("es-DO")}</p>
            <p>Hoja analizada: {report.sheetName}</p>
            <p>Filtros: {filterLabels.join(" | ")}</p>
          </section>

          <section className="content-panel product-movement-filters no-print">
            <label>
              Código / Número de artículo
              <input value={filters.code} onChange={(event) => updateFilter("code", event.target.value)} />
            </label>
            <label>
              Fecha específica
              <input type="date" value={filters.dateExact} onChange={(event) => updateFilter("dateExact", event.target.value)} />
            </label>
            <label>
              Desde
              <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
            </label>
            <label>
              Tipo de movimiento
              <select value={filters.movementType} onChange={(event) => updateFilter("movementType", event.target.value)}>
                {MOVEMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Almacén
              <select value={filters.warehouse} onChange={(event) => updateFilter("warehouse", event.target.value)}>
                <option value="">Todos</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Documento
              <input value={filters.document} onChange={(event) => updateFilter("document", event.target.value)} />
            </label>
            <label>
              Usuario
              <input list="product-movement-users" value={filters.user} onChange={(event) => updateFilter("user", event.target.value)} />
              <datalist id="product-movement-users">
                {userOptions.map((user) => (
                  <option key={user} value={user} />
                ))}
              </datalist>
            </label>
            <button className="button button--secondary product-movement-filter-reset" type="button" onClick={resetFilters}>
              Limpiar filtros
            </button>
          </section>

          <section className="product-movement-summary-grid">
            {SUMMARY_CARDS.map(([key, label]) => (
              <article key={key}>
                <span>{label}</span>
                <strong>{formatNumber(analysis.totals[key])}</strong>
              </article>
            ))}
          </section>

          {analysis.initialBalanceRows.length ? (
            <section className="content-panel product-movement-balance">
              <div>
                <strong>Saldo inicial detectado</strong>
                <span>{formatNumber(analysis.initialBalanceRows.length)} línea(s) separada(s) del cálculo EP/RF/SM/PA/NE.</span>
              </div>
              <div>
                <strong>Existencia calculada</strong>
                <span>{formatNumber(analysis.totals.existenciaCalculada)}</span>
              </div>
              <div>
                <strong>Saldo final real del sistema</strong>
                <span>{formatNumber(analysis.totals.saldoFinalRealSistema)}</span>
              </div>
              <div>
                <strong>Diferencia</strong>
                <span>{formatNumber(analysis.totals.diferencia)}</span>
              </div>
            </section>
          ) : null}

          {!(fullAnalysis.validRows.length || fullAnalysis.validRowCount || fullAnalysis.products.length) ? (
            <p className="empty-text">No se encontraron movimientos válidos para analizar.</p>
          ) : null}

          <section className="product-movement-charts no-print">
            <article className="content-panel product-movement-chart-card">
              <div className="panel-heading">
                <div>
                  <h2>Movimiento por tipo</h2>
                  <p>Impacto total por EP, RF, SM, PA y NE.</p>
                </div>
              </div>
              {analysis.charts.movementTypeData.some((item) => item.impacto !== 0) ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={analysis.charts.movementTypeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Bar dataKey="impacto" radius={[6, 6, 0, 0]}>
                      {analysis.charts.movementTypeData.map((entry, index) => (
                        <Cell key={entry.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>Sin movimientos para graficar.</ChartEmpty>
              )}
            </article>

            <article className="content-panel product-movement-chart-card">
              <div className="panel-heading">
                <div>
                  <h2>Existencia acumulada</h2>
                  <p>Existencia calculada y saldo acumulado por fecha.</p>
                </div>
              </div>
              {analysis.charts.existenceByDate.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={analysis.charts.existenceByDate}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Line type="monotone" dataKey="existencia" stroke="#0f66ff" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="saldoSistema" stroke="#f5b942" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>Sin fechas válidas para graficar.</ChartEmpty>
              )}
            </article>

            <article className="content-panel product-movement-chart-card">
              <div className="panel-heading">
                <div>
                  <h2>Distribución</h2>
                  <p>Participación por tipo de movimiento.</p>
                </div>
              </div>
              {analysis.charts.distributionData.some((item) => item.value !== 0) ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={analysis.charts.distributionData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3}>
                      {analysis.charts.distributionData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>Sin distribución para mostrar.</ChartEmpty>
              )}
            </article>

            <article className="content-panel product-movement-chart-card">
              <div className="panel-heading">
                <div>
                  <h2>Top productos</h2>
                  <p>Mayor venta o salida en el análisis filtrado.</p>
                </div>
              </div>
              {analysis.charts.topProducts.length ? (
                <div className="product-movement-top-list">
                  {analysis.charts.topProducts.map((product) => (
                    <div key={product.code}>
                      <span>{product.code} · {product.description || "Sin descripción"}</span>
                      <strong>{formatNumber(product.impacto)}</strong>
                      <i style={{ width: `${Math.max(8, Math.min(100, product.impacto))}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <ChartEmpty>Sin productos para ordenar.</ChartEmpty>
              )}
            </article>
          </section>

          <section className="content-panel product-movement-conclusion">
            <div className="panel-heading">
              <div>
                <h2>Conclusión del análisis</h2>
                <p>{selectedProduct ? "Producto seleccionado" : "Producto con actividad relevante en el periodo filtrado"}</p>
              </div>
            </div>
            <ul>
              {conclusionLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="content-panel product-movement-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Resumen por producto</h2>
                <p>Cada número de artículo aparece una sola vez con sus indicadores calculados.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="product-movement-table product-movement-summary-table">
                <thead>
                  <tr>
                    <th>Número de artículo</th>
                    <th>Descripción</th>
                    <th>Almacén</th>
                    <th>Saldo inicial</th>
                    <th>Entradas EP</th>
                    <th>Ventas RF</th>
                    <th>Salidas SM</th>
                    <th>PA positivo</th>
                    <th>PA negativo</th>
                    <th>NE positivo</th>
                    <th>NE negativo</th>
                    <th>Existencia calculada</th>
                    <th>Saldo final real del sistema</th>
                    <th>Diferencia</th>
                    <th>Cant. movimientos</th>
                    <th className="no-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.products.map((product) => (
                    <tr key={product.code} className={selectedProduct?.code === product.code ? "is-selected" : ""}>
                      <td>{product.code}</td>
                      <td>{safeText(product.description)}</td>
                      <td>{safeText(product.warehouse)}</td>
                      <td>{formatNumber(product.saldoInicial)}</td>
                      <td>{formatNumber(product.entradasEP)}</td>
                      <td>{formatNumber(product.ventasRF)}</td>
                      <td>{formatNumber(product.salidasSM)}</td>
                      <td>{formatNumber(product.ajustePAPositivo)}</td>
                      <td>{formatNumber(product.ajustePANegativo)}</td>
                      <td>{formatNumber(product.notaCreditoNEPositiva)}</td>
                      <td>{formatNumber(product.notaCreditoNENegativa)}</td>
                      <td>{formatNumber(product.existenciaCalculada)}</td>
                      <td>{formatNumber(product.saldoFinalRealSistema)}</td>
                      <td>{formatNumber(product.diferencia)}</td>
                      <td>{formatNumber(product.movementCount)}</td>
                      <td className="no-print">
                        <button className="text-button" type="button" onClick={() => setSelectedCode(product.code)}>
                          <Eye size={14} />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!analysis.products.length ? (
                    <tr>
                      <td colSpan={16}>No hay datos para mostrar con los filtros actuales.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {selectedProduct ? (
            <section className="content-panel product-movement-detail">
              <div className="panel-heading">
                <div>
                  <h2>Detalle por producto</h2>
                  <p>{selectedProduct.code} · {selectedProduct.description || "Sin descripción"}</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="product-movement-table">
                  <thead>
                    <tr>
                      <th>Fecha del sistema</th>
                      <th>Fecha de contabilización</th>
                      <th>Documento</th>
                      <th>Tipo detectado</th>
                      <th>Cantidad</th>
                      <th>Delta aplicado</th>
                      <th>Costos</th>
                      <th>Valor trans.</th>
                      <th>Cantidad acumulada</th>
                      <th>Valor acumulado</th>
                      <th>Nombre de usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDetailRows.map((row) => (
                      <tr key={row.id}>
                        <td>{safeText(row.dateSystem)}</td>
                        <td>{safeText(row.dateAccounting)}</td>
                        <td>{safeText(row.document)}</td>
                        <td>{safeText(movementLabel(row))}</td>
                        <td>{formatNumber(row.quantity)}</td>
                        <td>{formatNumber(row.deltaAplicado)}</td>
                        <td>{formatNumber(row.cost)}</td>
                        <td>{formatNumber(row.transactionValue)}</td>
                        <td>{formatNumber(row.accumulatedQuantity)}</td>
                        <td>{formatNumber(row.accumulatedValue)}</td>
                        <td>{safeText(row.user)}</td>
                      </tr>
                    ))}
                    {!visibleDetailRows.length ? (
                      <tr>
                        <td colSpan={11}>No hay detalle cargado para este producto.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {hiddenDetailRows ? (
                <button
                  className="button button--secondary no-print"
                  type="button"
                  onClick={() => setDetailLimit((current) => current + DETAIL_PAGE_SIZE)}
                >
                  Ver más ({formatNumber(hiddenDetailRows)} restantes)
                </button>
              ) : null}
            </section>
          ) : null}

          {analysis.unknownRows.length ? (
            <section className="content-panel product-movement-unknown no-print">
              <div className="panel-heading">
                <div>
                  <h2>Documentos no reconocidos</h2>
                  <p>Estas líneas no se incluyeron en la existencia calculada.</p>
                </div>
              </div>
              <div className="product-movement-unknown-list">
                {analysis.unknownRows.slice(0, 8).map((row) => (
                  <span key={row.id}>{row.code} · {row.document || "Documento vacío"} · Fila {row.rowNumber}</span>
                ))}
              </div>
            </section>
          ) : null}

          {report.warnings?.length ? (
            <section className="content-panel product-movement-warnings no-print">
              <h2>Advertencias</h2>
              <ul>
                {report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className="content-panel product-movement-empty no-print">
          <FileSpreadsheet size={34} />
          <h2>Sube un archivo Excel para iniciar el análisis</h2>
          <p>Se aceptan archivos .xlsx y .xls con Número de artículo, Documento y Cantidad; el sistema buscará la hoja válida automáticamente.</p>
        </section>
      )}
    </section>
  );
}
