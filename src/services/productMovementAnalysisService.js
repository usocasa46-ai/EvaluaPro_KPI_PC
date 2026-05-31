import * as XLSX from "xlsx";

export const PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY = "product_movement_last_analysis";

const REQUIRED_COLUMNS = [
  { key: "code", label: "Número de artículo" },
  { key: "description", label: "Descripción" },
  { key: "warehouse", label: "Almacén" },
  { key: "document", label: "Documento" },
  { key: "quantity", label: "Cantidad" },
];

const SHEET_DETECTION_COLUMNS = ["code", "document", "quantity"];
const KNOWN_DOCUMENT_PREFIXES = new Set(["EP", "RF", "SM", "PA", "NE"]);
const MOVEMENT_LABELS = {
  EP: "Entrada de mercancía",
  RF: "Venta",
  SM: "Salida de mercancía",
  PA: "Ajuste de inventario",
  NE: "Nota de crédito",
};

const COLUMN_ALIASES = {
  code: ["Número de artículo", "Numero de articulo", "Numero de artículo", "Número de articulo"],
  description: ["Descripción", "Descripcion"],
  warehouse: ["Almacén", "Almacen"],
  dateSystem: ["Fecha del sistema"],
  dateAccounting: ["Fecha de contabilización", "Fecha de contabilizacion"],
  document: ["Documento"],
  quantity: ["Cantidad"],
  cost: ["Costos"],
  transactionValue: ["Valor trans.", "Valor trans"],
  accumulatedQuantity: ["Cantidad acumulada"],
  accumulatedValue: ["Valor acumulado"],
  user: ["Nombre de usuario"],
};

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeHeader(header) {
  return compactText(header);
}

export function normalizeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === "") return 0;

  let text = String(value).trim();
  if (!text) return 0;

  let sign = 1;
  if (/^\(.*\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1);
  }

  text = text.replace(/[^\d,.-]/g, "");

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    text = text.replace(new RegExp(`\\${thousandSeparator}`, "g"), "");
    text = text.replace(decimalSeparator, ".");
  } else if (lastComma > -1) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed * sign : 0;
}

function round(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function hasCellValue(value) {
  return String(value ?? "").trim() !== "";
}

function isValidNumber(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (value === null || value === undefined || value === "") return false;

  let text = String(value).trim();
  if (!text) return false;
  if (/^\(.*\)$/.test(text)) text = text.slice(1, -1);
  text = text.replace(/[^\d,.-]/g, "");

  return /\d/.test(text) && Number.isFinite(normalizeNumber(value));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseExcelDate(value) {
  if (!value && value !== 0) return { text: "", key: "" };

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return { text: `${pad(day)}/${pad(month)}/${year}`, key: `${year}-${pad(month)}-${pad(day)}` };
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return {
        text: `${pad(parsed.d)}/${pad(parsed.m)}/${parsed.y}`,
        key: `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`,
      };
    }
  }

  const text = String(value).trim();
  if (!text) return { text: "", key: "" };

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    return { text: `${pad(day)}/${pad(month)}/${year}`, key: `${year}-${pad(month)}-${pad(day)}` };
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return { text: `${pad(day)}/${pad(month)}/${year}`, key: `${year}-${pad(month)}-${pad(day)}` };
  }

  return { text, key: "" };
}

export function excelDateToText(value) {
  return parseExcelDate(value).text;
}

export function excelDateToKey(value) {
  return parseExcelDate(value).key;
}

function createColumnMap(headers) {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  return Object.entries(COLUMN_ALIASES).reduce((map, [field, aliases]) => {
    const aliasSet = new Set(aliases.map((alias) => normalizeHeader(alias)));
    const index = normalizedHeaders.findIndex((header) => aliasSet.has(header));
    if (index >= 0) map[field] = index;
    return map;
  }, {});
}

export function validateMovementColumns(columnMap) {
  return REQUIRED_COLUMNS.filter((column) => columnMap[column.key] === undefined).map((column) => column.label);
}

function detectedColumnCount(columnMap, keys = REQUIRED_COLUMNS.map((column) => column.key)) {
  return keys.filter((key) => columnMap[key] !== undefined).length;
}

export function findMovementSheet(workbook) {
  let bestDetectionCandidate = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    for (let rowIndex = 0; rowIndex < sheetRows.length; rowIndex += 1) {
      const row = sheetRows[rowIndex];
      if (!Array.isArray(row) || !row.some(hasCellValue)) continue;

      const columnMap = createColumnMap(row);
      const hasDetectionColumns = SHEET_DETECTION_COLUMNS.every((key) => columnMap[key] !== undefined);
      if (!hasDetectionColumns) continue;

      const candidate = {
        sheetName,
        sheetRows,
        headerIndex: rowIndex,
        headers: row,
        columnMap,
        score: detectedColumnCount(columnMap),
        hasDetectionColumns,
      };

      if (validateMovementColumns(columnMap).length === 0) return candidate;
      if (!bestDetectionCandidate || candidate.score > bestDetectionCandidate.score) {
        bestDetectionCandidate = candidate;
      }
    }
  }

  return bestDetectionCandidate;
}

export function normalizeMovementType(value) {
  const compact = compactText(value);
  if (compact.startsWith("ep")) return "EP";
  if (compact.startsWith("rf")) return "RF";
  if (compact.startsWith("sm")) return "SM";
  if (compact.startsWith("pa")) return "PA";
  if (compact.startsWith("ne")) return "NE";
  return "";
}

export function extractMovementTypeFromDocument(documentValue) {
  const text = String(documentValue ?? "").trim();
  if (!text) return "";

  const normalized = normalizeText(text);
  if (normalized === "saldo inicial" || normalized.startsWith("saldo inicial ")) return "SALDO_INICIAL";

  const firstToken = text.split(/\s+/)[0] || "";
  const prefix = firstToken.toUpperCase().match(/^[A-Z]+/)?.[0] || "";
  return KNOWN_DOCUMENT_PREFIXES.has(prefix) ? prefix : "";
}

export function extractDocumentNumber(documentValue) {
  const text = String(documentValue ?? "").trim();
  const movementType = extractMovementTypeFromDocument(text);

  if (!text || !movementType || movementType === "SALDO_INICIAL") return "";
  return text.replace(new RegExp(`^${movementType}\\s*[-#:]*\\s*`, "i"), "").trim();
}

function cellValue(row, columnMap, field) {
  const index = columnMap[field];
  return index === undefined ? "" : row[index];
}

function isRepeatedHeaderRow(row, columnMap) {
  const articleCell = normalizeHeader(cellValue(row, columnMap, "code"));
  const descriptionCell = normalizeHeader(cellValue(row, columnMap, "description"));
  const warehouseCell = normalizeHeader(cellValue(row, columnMap, "warehouse"));
  const documentCell = normalizeHeader(cellValue(row, columnMap, "document"));
  const quantityCell = normalizeHeader(cellValue(row, columnMap, "quantity"));

  return (
    articleCell === normalizeHeader("Número de artículo") ||
    descriptionCell === normalizeHeader("Descripción") ||
    warehouseCell === normalizeHeader("Almacén") ||
    documentCell === normalizeHeader("Documento") ||
    quantityCell === normalizeHeader("Cantidad")
  );
}

function rowHasAnyValue(row) {
  return Array.isArray(row) && row.some(hasCellValue);
}

export function fillDownProductMovementRows(rows = []) {
  let lastCode = "";
  let lastDescription = "";
  let lastWarehouse = "";

  return rows.map((row) => {
    const nextRow = { ...row };

    if (nextRow.code) lastCode = nextRow.code;
    else nextRow.code = lastCode;

    nextRow.productCode = nextRow.code;

    if (nextRow.description) lastDescription = nextRow.description;
    else nextRow.description = lastDescription;

    if (nextRow.warehouse) lastWarehouse = nextRow.warehouse;
    else nextRow.warehouse = lastWarehouse;

    return nextRow;
  });
}

export async function parseProductMovementExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const movementSheet = findMovementSheet(workbook);

  if (!movementSheet) {
    throw new Error("No se encontró una hoja válida con encabezados de movimientos.");
  }

  const { sheetName, sheetRows, headerIndex, headers, columnMap } = movementSheet;
  const missingColumns = validateMovementColumns(columnMap);

  if (missingColumns.length) {
    throw new Error(`El archivo no contiene la columna requerida: ${missingColumns[0]}.`);
  }

  const warnings = [];
  const rawRows = sheetRows
    .slice(headerIndex + 1)
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => rowHasAnyValue(row) && !isRepeatedHeaderRow(row, columnMap))
    .map(({ row, index }) => {
      const rowNumber = headerIndex + index + 2;
      const rawQuantity = cellValue(row, columnMap, "quantity");
      const rawAccumulatedQuantity = cellValue(row, columnMap, "accumulatedQuantity");
      const rawAccumulatedValue = cellValue(row, columnMap, "accumulatedValue");
      const quantity = normalizeNumber(rawQuantity);
      const document = String(cellValue(row, columnMap, "document") ?? "").trim();
      const movementType = extractMovementTypeFromDocument(document);
      const isInitialBalance = movementType === "SALDO_INICIAL";
      const dateSystem = parseExcelDate(cellValue(row, columnMap, "dateSystem"));
      const dateAccounting = parseExcelDate(cellValue(row, columnMap, "dateAccounting"));
      const analysisDateKey = dateAccounting.key || dateSystem.key;
      const analysisDate = dateAccounting.text || dateSystem.text;

      if (hasCellValue(rawQuantity) && !isValidNumber(rawQuantity)) {
        warnings.push(`Fila ${rowNumber}: cantidad no numérica tratada como 0.`);
      }

      return {
        id: `PM-${sheetName}-${rowNumber}`,
        rowNumber,
        code: String(cellValue(row, columnMap, "code") ?? "").trim(),
        productCode: String(cellValue(row, columnMap, "code") ?? "").trim(),
        description: String(cellValue(row, columnMap, "description") ?? "").trim(),
        warehouse: String(cellValue(row, columnMap, "warehouse") ?? "").trim(),
        movementRaw: document,
        movementType,
        movementLabel: movementType ? MOVEMENT_LABELS[movementType] || "Saldo inicial" : "",
        documentNumber: extractDocumentNumber(document),
        isInitialBalance,
        quantity,
        rawQuantity,
        date: analysisDate,
        dateKey: analysisDateKey,
        dateSystem: dateSystem.text,
        dateSystemKey: dateSystem.key,
        dateAccounting: dateAccounting.text,
        dateAccountingKey: dateAccounting.key,
        document,
        cost: normalizeNumber(cellValue(row, columnMap, "cost")),
        transactionValue: normalizeNumber(cellValue(row, columnMap, "transactionValue")),
        accumulatedQuantity: normalizeNumber(rawAccumulatedQuantity),
        accumulatedValue: normalizeNumber(rawAccumulatedValue),
        rawAccumulatedQuantity,
        rawAccumulatedValue,
        hasAccumulatedQuantity: hasCellValue(rawAccumulatedQuantity) && isValidNumber(rawAccumulatedQuantity),
        user: String(cellValue(row, columnMap, "user") ?? "").trim(),
      };
    });

  const rows = fillDownProductMovementRows(rawRows).filter((row) => row.document || hasCellValue(row.rawQuantity));

  return {
    fileName: file.name,
    sheetName,
    headers,
    columnMap,
    rows,
    warnings,
    parsedAt: new Date().toISOString(),
  };
}

function rowDateKey(row) {
  return row?.dateAccountingKey || row?.dateSystemKey || row?.dateKey || "";
}

function rowDateText(row) {
  return row?.dateAccounting || row?.dateSystem || row?.date || "";
}

function isKnownMovement(row) {
  return Boolean(row?.movementType && row.movementType !== "SALDO_INICIAL");
}

export function calculateMovementDelta(row) {
  const quantity = normalizeNumber(row?.quantity);
  if (row?.movementType === "EP") return quantity;
  if (row?.movementType === "RF") return quantity < 0 ? quantity : -Math.abs(quantity);
  if (row?.movementType === "SM") return quantity < 0 ? quantity : -Math.abs(quantity);
  if (row?.movementType === "PA") return quantity;
  if (row?.movementType === "NE") return quantity;
  return 0;
}

function movementImpact(row) {
  return Math.abs(calculateMovementDelta(row));
}

export function applyMovementFilters(rows = [], filters = {}) {
  return rows.filter((row) => {
    const currentDateKey = rowDateKey(row);
    const rowMovement = row.movementType || "DESCONOCIDO";

    if (filters.code && !String(row.code || "").toLowerCase().includes(String(filters.code).toLowerCase())) return false;
    if (filters.dateExact && currentDateKey !== filters.dateExact) return false;
    if (filters.dateFrom && (!currentDateKey || currentDateKey < filters.dateFrom)) return false;
    if (filters.dateTo && (!currentDateKey || currentDateKey > filters.dateTo)) return false;
    if (filters.movementType && rowMovement !== filters.movementType) return false;
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
    if (filters.document && !String(row.document || "").toLowerCase().includes(String(filters.document).toLowerCase())) return false;
    if (filters.user && !String(row.user || "").toLowerCase().includes(String(filters.user).toLowerCase())) return false;

    return true;
  });
}

function applyBalanceScopeFilters(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.code && !String(row.code || "").toLowerCase().includes(String(filters.code).toLowerCase())) return false;
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
    return true;
  });
}

function isInsideDateWindow(row, filters = {}) {
  const currentDateKey = rowDateKey(row);
  if (filters.dateExact) return currentDateKey === filters.dateExact;
  if (filters.dateFrom && (!currentDateKey || currentDateKey < filters.dateFrom)) return false;
  if (filters.dateTo && (!currentDateKey || currentDateKey > filters.dateTo)) return false;
  return true;
}

function sortRowsByDateThenRow(rows = []) {
  return [...rows].sort((left, right) => {
    const leftDate = rowDateKey(left);
    const rightDate = rowDateKey(right);
    if (leftDate && rightDate && leftDate !== rightDate) return leftDate.localeCompare(rightDate);
    return (left.rowNumber || 0) - (right.rowNumber || 0);
  });
}

function groupRowsBy(rows = [], getKey) {
  return rows.reduce((map, row) => {
    const key = getKey(row) || "__SIN_VALOR__";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
}

function initialBalanceValue(row) {
  if (!row) return 0;
  if (row.hasAccumulatedQuantity || (hasCellValue(row.rawAccumulatedQuantity) && isValidNumber(row.rawAccumulatedQuantity))) {
    return normalizeNumber(row.accumulatedQuantity);
  }
  return normalizeNumber(row.quantity);
}

function calculateInitialBalanceForWarehouse(rows = [], filters = {}) {
  const orderedRows = sortRowsByDateThenRow(rows);
  const startDate = filters.dateExact || filters.dateFrom || "";

  if (startDate) {
    const previousAccumulatedRows = orderedRows.filter(
      (row) => rowDateKey(row) && rowDateKey(row) < startDate && row.hasAccumulatedQuantity
    );
    const previousAccumulated = previousAccumulatedRows.at(-1);
    if (previousAccumulated) {
      return {
        value: normalizeNumber(previousAccumulated.accumulatedQuantity),
        hasBalance: true,
        source: "Cantidad acumulada anterior al periodo",
      };
    }
  }

  let initialRows = orderedRows.filter((row) => row.isInitialBalance || row.movementType === "SALDO_INICIAL");
  if (startDate) {
    const beforePeriodInitialRows = initialRows.filter((row) => !rowDateKey(row) || rowDateKey(row) <= startDate);
    if (beforePeriodInitialRows.length) initialRows = beforePeriodInitialRows;
  }

  const initialRow = initialRows.at(-1);
  if (!initialRow) return { value: 0, hasBalance: false, source: "" };

  return {
    value: initialBalanceValue(initialRow),
    hasBalance: true,
    source: "Saldo inicial detectado",
  };
}

export function calculateInitialBalance(rows = [], filters = {}) {
  let value = 0;
  let hasBalance = false;
  const sources = new Set();
  const rowsByWarehouse = groupRowsBy(rows, (row) => row.warehouse || "");

  rowsByWarehouse.forEach((warehouseRows) => {
    const balance = calculateInitialBalanceForWarehouse(warehouseRows, filters);
    value += balance.value;
    hasBalance = hasBalance || balance.hasBalance;
    if (balance.source) sources.add(balance.source);
  });

  return { value: round(value), hasBalance, source: [...sources].join(", ") };
}

function calculateRealFinalBalanceForWarehouse(rows = [], filters = {}) {
  const scopedRows = sortRowsByDateThenRow(rows).filter((row) => isInsideDateWindow(row, filters) && row.hasAccumulatedQuantity);
  const finalRow = scopedRows.at(-1);
  if (!finalRow) return { value: 0, hasBalance: false, row: null };
  return { value: normalizeNumber(finalRow.accumulatedQuantity), hasBalance: true, row: finalRow };
}

export function calculateRealFinalBalance(rows = [], filters = {}) {
  let value = 0;
  let hasBalance = false;
  const rowsByWarehouse = groupRowsBy(rows, (row) => row.warehouse || "");

  rowsByWarehouse.forEach((warehouseRows) => {
    const balance = calculateRealFinalBalanceForWarehouse(warehouseRows, filters);
    value += balance.value;
    hasBalance = hasBalance || balance.hasBalance;
  });

  return { value: round(value), hasBalance };
}

function calculateFinalAccumulatedValue(rows = [], filters = {}) {
  let value = 0;
  const rowsByWarehouse = groupRowsBy(rows, (row) => row.warehouse || "");

  rowsByWarehouse.forEach((warehouseRows) => {
    const finalRow = sortRowsByDateThenRow(warehouseRows)
      .filter((row) => isInsideDateWindow(row, filters) && hasCellValue(row.rawAccumulatedValue))
      .at(-1);
    if (finalRow) value += normalizeNumber(finalRow.accumulatedValue);
  });

  return round(value);
}

function roundSummary(summary) {
  return {
    ...summary,
    entradasEP: round(summary.entradasEP),
    ventasRF: round(summary.ventasRF),
    salidasSM: round(summary.salidasSM),
    ajustePAPositivo: round(summary.ajustePAPositivo),
    ajustePANegativo: round(summary.ajustePANegativo),
    totalAjustePA: round(summary.totalAjustePA),
    notaCreditoNEPositiva: round(summary.notaCreditoNEPositiva),
    notaCreditoNENegativa: round(summary.notaCreditoNENegativa),
    totalNotaCreditoNE: round(summary.totalNotaCreditoNE),
    saldoInicial: round(summary.saldoInicial),
    existenciaCalculada: round(summary.existenciaCalculada),
    saldoFinalRealSistema: round(summary.saldoFinalRealSistema),
    diferencia: round(summary.diferencia),
    valorAcumuladoFinal: round(summary.valorAcumuladoFinal),
    valorFinalCalculado: round(summary.valorFinalCalculado),
  };
}

export function calculateProductMovementSummary(productRows = [], allProductRows = productRows, filters = {}, detailRows = productRows) {
  const orderedRows = sortRowsByDateThenRow(allProductRows);
  const movementRows = productRows.filter(isKnownMovement);
  const warehouseValues = [...new Set(orderedRows.map((row) => row.warehouse).filter(Boolean))];
  const description = orderedRows.find((row) => row.description)?.description || "";
  const initialBalance = calculateInitialBalance(orderedRows, filters);
  const realFinalBalance = calculateRealFinalBalance(orderedRows, filters);

  const summary = movementRows.reduce(
    (current, row) => {
      const quantity = normalizeNumber(row.quantity);
      current.deltaMovimientos += calculateMovementDelta(row);

      if (row.movementType === "EP") {
        current.entradasEP += quantity;
      } else if (row.movementType === "RF") {
        current.ventasRF += Math.abs(quantity);
      } else if (row.movementType === "SM") {
        current.salidasSM += Math.abs(quantity);
      } else if (row.movementType === "PA") {
        if (quantity >= 0) current.ajustePAPositivo += quantity;
        else current.ajustePANegativo += quantity;
      } else if (row.movementType === "NE") {
        if (quantity >= 0) current.notaCreditoNEPositiva += quantity;
        else current.notaCreditoNENegativa += quantity;
      }

      return current;
    },
    {
      code: movementRows[0]?.code || orderedRows[0]?.code || "",
      productCode: movementRows[0]?.code || orderedRows[0]?.code || "",
      description,
      warehouse: warehouseValues.join(", "),
      entradasEP: 0,
      ventasRF: 0,
      salidasSM: 0,
      ajustePAPositivo: 0,
      ajustePANegativo: 0,
      notaCreditoNEPositiva: 0,
      notaCreditoNENegativa: 0,
      totalAjustePA: 0,
      totalNotaCreditoNE: 0,
      saldoInicial: initialBalance.value,
      hasInitialBalance: initialBalance.hasBalance,
      initialBalanceSource: initialBalance.source,
      deltaMovimientos: 0,
      existenciaCalculada: 0,
      saldoFinalRealSistema: realFinalBalance.value,
      hasRealFinalBalance: realFinalBalance.hasBalance,
      diferencia: 0,
      valorAcumuladoFinal: calculateFinalAccumulatedValue(orderedRows, filters),
      valorFinalCalculado: calculateFinalAccumulatedValue(orderedRows, filters),
      movementCount: movementRows.length,
      movements: movementRows,
      detailRows: detailRows.map((row) => ({ ...row, deltaAplicado: round(calculateMovementDelta(row)) })),
    }
  );

  summary.totalAjustePA = summary.ajustePAPositivo + summary.ajustePANegativo;
  summary.totalNotaCreditoNE = summary.notaCreditoNEPositiva + summary.notaCreditoNENegativa;
  summary.existenciaCalculada = summary.saldoInicial + summary.deltaMovimientos;
  summary.diferencia = summary.hasRealFinalBalance ? summary.saldoFinalRealSistema - summary.existenciaCalculada : 0;

  return roundSummary(summary);
}

export function buildProductSummary(validRows = [], balanceRows = validRows, detailRows = validRows, filters = {}) {
  const balanceRowsByCode = groupRowsBy(balanceRows, (row) => row.code);
  const detailRowsByCode = groupRowsBy(detailRows, (row) => row.code);
  const grouped = groupRowsBy(validRows, (row) => row.code);

  return [...grouped.entries()]
    .filter(([code]) => code && code !== "__SIN_VALOR__")
    .map(([code, productRows]) =>
      calculateProductMovementSummary(productRows, balanceRowsByCode.get(code) || productRows, filters, detailRowsByCode.get(code) || productRows)
    )
    .sort((left, right) => String(left.code).localeCompare(String(right.code)));
}

export function buildGeneralSummary(rows = [], products = []) {
  const totals = products.reduce(
    (current, product) => ({
      totalCodes: current.totalCodes + 1,
      saldoInicialTotal: current.saldoInicialTotal + product.saldoInicial,
      entradasEP: current.entradasEP + product.entradasEP,
      ventasRF: current.ventasRF + product.ventasRF,
      salidasSM: current.salidasSM + product.salidasSM,
      ajustePAPositivo: current.ajustePAPositivo + product.ajustePAPositivo,
      ajustePANegativo: current.ajustePANegativo + product.ajustePANegativo,
      totalAjustePA: current.totalAjustePA + product.totalAjustePA,
      notaCreditoNEPositiva: current.notaCreditoNEPositiva + product.notaCreditoNEPositiva,
      notaCreditoNENegativa: current.notaCreditoNENegativa + product.notaCreditoNENegativa,
      totalNotaCreditoNE: current.totalNotaCreditoNE + product.totalNotaCreditoNE,
      existenciaCalculada: current.existenciaCalculada + product.existenciaCalculada,
      saldoFinalRealSistema: current.saldoFinalRealSistema + product.saldoFinalRealSistema,
      diferencia: current.diferencia + product.diferencia,
      valorFinalCalculado: current.valorFinalCalculado + product.valorAcumuladoFinal,
      movementCount: current.movementCount + product.movementCount,
      productsWithRealFinalBalance: current.productsWithRealFinalBalance + (product.hasRealFinalBalance ? 1 : 0),
    }),
    {
      totalCodes: 0,
      saldoInicialTotal: 0,
      entradasEP: 0,
      ventasRF: 0,
      salidasSM: 0,
      ajustePAPositivo: 0,
      ajustePANegativo: 0,
      totalAjustePA: 0,
      notaCreditoNEPositiva: 0,
      notaCreditoNENegativa: 0,
      totalNotaCreditoNE: 0,
      existenciaCalculada: 0,
      saldoFinalRealSistema: 0,
      diferencia: 0,
      valorFinalCalculado: 0,
      movementCount: 0,
      saldoInicialCount: rows.filter((row) => row.isInitialBalance).length,
      productsWithRealFinalBalance: 0,
    }
  );

  return roundSummary(totals);
}

export function buildMovementChartsData(rows = [], products = []) {
  const validRows = rows.filter(isKnownMovement);
  const movementTypeData = ["EP", "RF", "SM", "PA", "NE"].map((type) => {
    const typeRows = validRows.filter((row) => row.movementType === type);
    return {
      type,
      name: type,
      label: MOVEMENT_LABELS[type],
      cantidad: round(
        typeRows.reduce((total, row) => {
          if (type === "RF" || type === "SM") return total + Math.abs(normalizeNumber(row.quantity));
          return total + normalizeNumber(row.quantity);
        }, 0)
      ),
      impacto: round(typeRows.reduce((total, row) => total + movementImpact(row), 0)),
      conteo: typeRows.length,
    };
  });

  const distributionData = movementTypeData.map((item) => ({
    name: item.type,
    value: item.impacto,
    label: item.label,
  }));

  const orderedRows = sortRowsByDateThenRow(validRows);
  let runningExistence = products.reduce((total, product) => total + normalizeNumber(product.saldoInicial), 0);
  const existenceByDateMap = new Map();

  orderedRows.forEach((row) => {
    runningExistence += calculateMovementDelta(row);
    const dateKey = rowDateKey(row) || `fila-${row.rowNumber}`;
    const current = existenceByDateMap.get(dateKey) || {
      date: rowDateText(row) || `Fila ${row.rowNumber}`,
      existencia: runningExistence,
      saldoSistema: null,
    };

    current.existencia = round(runningExistence);
    if (row.hasAccumulatedQuantity) current.saldoSistema = round(row.accumulatedQuantity);
    existenceByDateMap.set(dateKey, current);
  });

  const topProducts = [...products]
    .map((product) => ({
      code: product.code,
      description: product.description,
      ventasRF: product.ventasRF,
      salidasSM: product.salidasSM,
      impacto: round(
        Math.abs(product.entradasEP) +
          product.ventasRF +
          product.salidasSM +
          Math.abs(product.totalAjustePA) +
          Math.abs(product.totalNotaCreditoNE)
      ),
    }))
    .sort((left, right) => right.impacto - left.impacto)
    .slice(0, 5);

  return {
    movementTypeData,
    distributionData,
    existenceByDate: [...existenceByDateMap.values()],
    topProducts,
  };
}

function movementImpactLabel(product) {
  const impacts = [
    ["EP", Math.abs(product.entradasEP)],
    ["RF", product.ventasRF],
    ["SM", product.salidasSM],
    ["PA", Math.abs(product.totalAjustePA)],
    ["NE", Math.abs(product.totalNotaCreditoNE)],
  ];
  impacts.sort((left, right) => right[1] - left[1]);
  return impacts[0]?.[1] > 0 ? impacts[0][0] : "";
}

export function buildProductConclusion(productSummary, filters = {}) {
  if (!productSummary) return ["No hay movimientos suficientes para generar una conclusión con los filtros aplicados."];

  const productName = productSummary.description || productSummary.code;
  const period =
    filters.dateExact || filters.dateFrom || filters.dateTo ? "en el periodo filtrado" : "en el archivo analizado";
  const impact = movementImpactLabel(productSummary);
  const lines = [
    `El producto ${productName} tuvo ${round(productSummary.entradasEP)} unidades de entrada y ${round(productSummary.ventasRF)} unidades vendidas ${period}.`,
    `Saldo inicial considerado: ${round(productSummary.saldoInicial)}. Existencia calculada: ${round(productSummary.existenciaCalculada)}.`,
  ];

  if (productSummary.hasRealFinalBalance) {
    lines.push(
      `Saldo final real del sistema: ${round(productSummary.saldoFinalRealSistema)}. Diferencia: ${round(productSummary.diferencia)}.`
    );
  } else {
    lines.push("No se encontró una cantidad acumulada válida para comparar el saldo final real del sistema.");
  }

  if (impact) lines.push(`El movimiento con mayor impacto fue ${impact}.`);
  if (!productSummary.ajustePAPositivo && !productSummary.ajustePANegativo) {
    lines.push("No se encontraron ajustes PA en este periodo.");
  }

  return lines;
}

export function analyzeMovementsByProduct(rows = [], filters = {}) {
  const filteredRows = applyMovementFilters(rows, filters);
  const balanceRows = applyBalanceScopeFilters(rows, filters);
  const validRows = filteredRows.filter((row) => row.code && isKnownMovement(row));
  const unknownRows = filteredRows.filter((row) => row.code && !row.movementType && row.document);
  const initialBalanceRows = filteredRows.filter((row) => row.code && (row.isInitialBalance || row.movementType === "SALDO_INICIAL"));
  const products = buildProductSummary(validRows, balanceRows, filteredRows, filters);
  const totals = buildGeneralSummary(filteredRows, products);

  return {
    products,
    totals,
    charts: buildMovementChartsData(filteredRows, products),
    validRows,
    unknownRows,
    initialBalanceRows,
    filteredRows,
    filters,
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportMovementAnalysisToCsv(products = []) {
  const headers = [
    "Número de artículo",
    "Descripción",
    "Almacén",
    "Saldo inicial",
    "Entradas EP",
    "Ventas RF",
    "Salidas SM",
    "PA positivo",
    "PA negativo",
    "NE positivo",
    "NE negativo",
    "Existencia calculada",
    "Saldo final real del sistema",
    "Diferencia",
    "Cantidad movimientos",
  ];
  const lines = products.map((product) =>
    [
      product.code,
      product.description,
      product.warehouse,
      product.saldoInicial,
      product.entradasEP,
      product.ventasRF,
      product.salidasSM,
      product.ajustePAPositivo,
      product.ajustePANegativo,
      product.notaCreditoNEPositiva,
      product.notaCreditoNENegativa,
      product.existenciaCalculada,
      product.saldoFinalRealSistema,
      product.diferencia,
      product.movementCount,
    ]
      .map(csvEscape)
      .join(";")
  );

  return [headers.map(csvEscape).join(";"), ...lines].join("\n");
}

export function exportMovementAnalysisToExcel(report, analysis, selectedProduct = null) {
  const generalRows = [
    { Indicador: "Total códigos analizados", Valor: analysis.totals.totalCodes },
    { Indicador: "Saldo inicial total", Valor: analysis.totals.saldoInicialTotal },
    { Indicador: "Total entradas EP", Valor: analysis.totals.entradasEP },
    { Indicador: "Total vendido RF", Valor: analysis.totals.ventasRF },
    { Indicador: "Total salidas SM", Valor: analysis.totals.salidasSM },
    { Indicador: "Total ajustes PA", Valor: analysis.totals.totalAjustePA },
    { Indicador: "Total notas crédito NE", Valor: analysis.totals.totalNotaCreditoNE },
    { Indicador: "Existencia calculada", Valor: analysis.totals.existenciaCalculada },
    { Indicador: "Saldo final real del sistema", Valor: analysis.totals.saldoFinalRealSistema },
    { Indicador: "Diferencia", Valor: analysis.totals.diferencia },
  ];

  const summaryRows = analysis.products.map((product) => ({
    "Número de artículo": product.code,
    Descripción: product.description,
    Almacén: product.warehouse,
    "Saldo inicial": product.saldoInicial,
    "Entradas EP": product.entradasEP,
    "Ventas RF": product.ventasRF,
    "Salidas SM": product.salidasSM,
    "PA positivo": product.ajustePAPositivo,
    "PA negativo": product.ajustePANegativo,
    "NE positivo": product.notaCreditoNEPositiva,
    "NE negativo": product.notaCreditoNENegativa,
    "Existencia calculada": product.existenciaCalculada,
    "Saldo final real del sistema": product.saldoFinalRealSistema,
    Diferencia: product.diferencia,
    "Cantidad movimientos": product.movementCount,
  }));

  const detailRows = (selectedProduct?.detailRows || []).map((row) => ({
    "Número de artículo": row.code,
    Descripción: row.description,
    Almacén: row.warehouse,
    "Fecha del sistema": row.dateSystem,
    "Fecha de contabilización": row.dateAccounting,
    Documento: row.document,
    "Número documento": row.documentNumber,
    "Tipo detectado": row.movementType || row.movementRaw,
    Cantidad: row.quantity,
    "Delta aplicado": row.deltaAplicado ?? calculateMovementDelta(row),
    Costos: row.cost,
    "Valor trans.": row.transactionValue,
    "Cantidad acumulada": row.accumulatedQuantity,
    "Valor acumulado": row.accumulatedValue,
    "Nombre de usuario": row.user,
    "Fila Excel": row.rowNumber,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(generalRows), "Resumen general");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen productos");
  if (detailRows.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "Detalle seleccionado");
  }
  if (analysis.initialBalanceRows.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analysis.initialBalanceRows), "Saldo inicial");
  }
  if (analysis.unknownRows.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analysis.unknownRows), "No reconocidos");
  }

  XLSX.writeFile(workbook, `analisis_movimientos_${report?.fileName || "productos"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function summarizeRow(row) {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    code: row.code,
    description: row.description,
    warehouse: row.warehouse,
    document: row.document,
    movementType: row.movementType,
    quantity: row.quantity,
    date: row.date,
  };
}

function stripProductDetails(product) {
  const { movements, detailRows, ...lightProduct } = product;
  return lightProduct;
}

function createLightAnalysis(analysis) {
  if (!analysis) return null;
  return {
    products: (analysis.products || []).map(stripProductDetails),
    totals: analysis.totals || {},
    charts: analysis.charts || {},
    unknownRows: (analysis.unknownRows || []).slice(0, 50).map(summarizeRow),
    initialBalanceRows: (analysis.initialBalanceRows || []).slice(0, 50).map(summarizeRow),
    validRowCount: analysis.validRows?.length || 0,
    filteredRowCount: analysis.filteredRows?.length || 0,
    filters: analysis.filters || {},
  };
}

export function createLightMovementAnalysisReport(report, analysis = null, filters = {}) {
  const analysisId = report?.analysisId || report?.id || `movement-${Date.now()}`;
  const nextAnalysis = analysis || report?.analysis || (report?.rows ? analyzeMovementsByProduct(report.rows, filters) : null);

  return {
    id: analysisId,
    analysisId,
    storageMode: "indexedDB",
    hasDetailedData: Boolean(report?.hasDetailedData || report?.rows?.length),
    fileName: report?.fileName || "",
    sheetName: report?.sheetName || "",
    parsedAt: report?.parsedAt || "",
    processedAt: report?.processedAt || "",
    processedById: report?.processedById || "",
    processedByName: report?.processedByName || "",
    rowCount: report?.rows?.length || report?.rowCount || 0,
    warnings: (report?.warnings || []).slice(0, 50),
    analysis: createLightAnalysis(nextAnalysis),
  };
}

export function saveLastMovementAnalysis(report, analysis = null, filters = {}) {
  const lightReport = createLightMovementAnalysisReport(report, analysis, filters);

  if (typeof localStorage === "undefined") return lightReport;

  try {
    localStorage.setItem(PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY, JSON.stringify(lightReport));
  } catch {
    const minimalReport = {
      ...lightReport,
      warnings: [],
      analysis: {
        products: [],
        totals: lightReport.analysis?.totals || {},
        charts: {},
        unknownRows: [],
        initialBalanceRows: [],
        validRowCount: lightReport.analysis?.validRowCount || 0,
        filteredRowCount: lightReport.analysis?.filteredRowCount || 0,
        filters: lightReport.analysis?.filters || {},
      },
    };
    try {
      localStorage.setItem(PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY, JSON.stringify(minimalReport));
    } catch {
      return minimalReport;
    }
    return minimalReport;
  }

  return lightReport;
}

export function getLastMovementAnalysis() {
  try {
    if (typeof localStorage === "undefined") return null;
    const saved = JSON.parse(localStorage.getItem(PRODUCT_MOVEMENT_LAST_ANALYSIS_KEY) || "null");
    if (saved?.rows?.length) {
      const migratedAnalysis = analyzeMovementsByProduct(saved.rows);
      return saveLastMovementAnalysis(saved, migratedAnalysis);
    }
    return saved;
  } catch {
    return null;
  }
}
