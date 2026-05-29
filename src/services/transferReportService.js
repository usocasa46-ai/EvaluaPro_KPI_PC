import * as XLSX from "xlsx";

export const TRANSFER_LAST_REPORT_KEY = "transfer_pending_last_report";
export const TRANSFER_HISTORY_KEY = "transfer_pending_history";

export const WAREHOUSES = {
  "30": "Supermix",
  "20": "Ferremix Herrera",
  "1": "Ferremix Villa Mella",
  "10": "Impacto Ferretero",
};

const REQUIRED_COLUMNS = [
  { key: "documentNumber", label: "Número de documento" },
  { key: "code", label: "Código" },
  { key: "description", label: "Descripción" },
  { key: "quantity", label: "Cantidad" },
  { key: "originWarehouse", label: "Almacén Origen" },
  { key: "destinationWarehouse", label: "Almacén Destino" },
  { key: "date", label: "Fecha" },
  { key: "area", label: "Área" },
];

const HEADER_ALIASES = {
  documentNumber: [
    "numerodocumento",
    "numerodedocumento",
    "nmerodocumento",
    "nmerodedocumento",
    "nodocumento",
    "nrodocumento",
    "documento",
    "numdocumento",
  ],
  code: ["codigo", "cdigo", "cod", "codigoproducto", "cdigoproducto", "item", "referencia"],
  description: ["descripcion", "descripcin", "descrip", "producto", "articulo", "nombreproducto"],
  quantity: ["cantidad", "cant", "qty", "unidades"],
  originWarehouse: ["almacenorigen", "almacnorigen", "almacendeorigen", "almacndeorigen", "origen", "almorig", "almacenorig"],
  destinationWarehouse: ["almacendestino", "almacndestino", "almacendedestino", "almacndedestino", "destino", "almdest", "almacendest"],
  date: ["fecha", "fechadocumento", "fechatraslado"],
  area: ["area", "rea", "departamento", "seccion"],
};

export function normalizeHeader(header = "") {
  return String(header)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getCanonicalKey(header) {
  const normalized = normalizeHeader(header);
  const exactKey = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0];
  if (exactKey) return exactKey;

  if (normalized.includes("documento") && /(numero|nmero|num|nro|no)/.test(normalized)) return "documentNumber";
  if (normalized.includes("codigo") || normalized.includes("cdigo") || normalized === "cod") return "code";
  if (normalized.includes("descripcion") || normalized.includes("descripcin") || normalized.includes("producto")) return "description";
  if (normalized.includes("cantidad") || normalized === "cant") return "quantity";
  if ((normalized.includes("almacen") || normalized.includes("almacn")) && normalized.includes("origen")) return "originWarehouse";
  if ((normalized.includes("almacen") || normalized.includes("almacn")) && normalized.includes("destino")) return "destinationWarehouse";
  if (normalized.includes("fecha")) return "date";
  if (normalized.includes("area") || normalized.includes("rea") || normalized.includes("departamento")) return "area";

  return "";
}

export function normalizeWarehouseCode(code) {
  if (code === undefined || code === null || code === "") return "";
  const raw = String(code).trim();
  const numericMatch = raw.match(/\d+/);
  if (!numericMatch) return raw;
  return String(Number(numericMatch[0]));
}

export function mapWarehouseName(code) {
  const normalizedCode = normalizeWarehouseCode(code);
  return WAREHOUSES[normalizedCode] || "Almacén desconocido";
}

export function formatPrintDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatExcelDate(value) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) return formatPrintDate(value);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }

  return String(value).trim();
}

function normalizeQuantity(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : value || 0;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isBlankRow(row = []) {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

function buildColumnMap(headerRow = []) {
  return headerRow.reduce((map, header, index) => {
    const key = getCanonicalKey(header);
    if (key && map[key] === undefined) map[key] = index;
    return map;
  }, {});
}

function findHeaderRowIndex(rows = []) {
  return rows.findIndex((row) => {
    const map = buildColumnMap(row);
    return REQUIRED_COLUMNS.filter((column) => map[column.key] !== undefined).length >= 4;
  });
}

export function validateTransferColumns(headerRowOrMap = []) {
  const columnMap = Array.isArray(headerRowOrMap) ? buildColumnMap(headerRowOrMap) : headerRowOrMap;
  return REQUIRED_COLUMNS.filter((column) => columnMap[column.key] === undefined).map((column) => column.label);
}

function readCell(row, columnMap, key) {
  return row[columnMap[key]];
}

export async function parseTransferExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const headerIndex = findHeaderRowIndex(matrix);
  const headerRow = matrix[headerIndex >= 0 ? headerIndex : 0] || [];
  const columnMap = buildColumnMap(headerRow);
  const missingColumns = validateTransferColumns(columnMap);

  if (missingColumns.length) {
    throw new Error(`El archivo no contiene la columna requerida: ${missingColumns[0]}.`);
  }

  const rows = matrix.slice((headerIndex >= 0 ? headerIndex : 0) + 1).filter((row) => !isBlankRow(row));
  const mappedRows = rows.map((row, index) => {
    const originWarehouseCode = normalizeWarehouseCode(readCell(row, columnMap, "originWarehouse"));
    const destinationWarehouseCode = normalizeWarehouseCode(readCell(row, columnMap, "destinationWarehouse"));

    return {
      id: `TR-${index + 1}`,
      documentNumber: String(readCell(row, columnMap, "documentNumber") || "").trim(),
      code: String(readCell(row, columnMap, "code") || "").trim(),
      description: String(readCell(row, columnMap, "description") || "").trim(),
      quantity: normalizeQuantity(readCell(row, columnMap, "quantity")),
      originWarehouseCode,
      originWarehouseName: mapWarehouseName(originWarehouseCode),
      destinationWarehouseCode,
      destinationWarehouseName: mapWarehouseName(destinationWarehouseCode),
      date: formatExcelDate(readCell(row, columnMap, "date")),
      area: String(readCell(row, columnMap, "area") || "").trim(),
    };
  });

  return fillDownTransferRows(mappedRows);
}

export function fillDownTransferRows(rows = []) {
  let lastDocumentNumber = "";
  let lastOriginWarehouseCode = "";
  let lastDestinationWarehouseCode = "";
  let lastDate = "";
  let lastArea = "";

  return rows.map((row) => {
    const documentNumber = hasValue(row.documentNumber) ? String(row.documentNumber).trim() : lastDocumentNumber;
    const originWarehouseCode = hasValue(row.originWarehouseCode)
      ? normalizeWarehouseCode(row.originWarehouseCode)
      : lastOriginWarehouseCode;
    const destinationWarehouseCode = hasValue(row.destinationWarehouseCode)
      ? normalizeWarehouseCode(row.destinationWarehouseCode)
      : lastDestinationWarehouseCode;
    const date = hasValue(row.date) ? String(row.date).trim() : lastDate;
    const area = hasValue(row.area) ? String(row.area).trim() : lastArea;

    if (hasValue(documentNumber)) lastDocumentNumber = documentNumber;
    if (hasValue(originWarehouseCode)) lastOriginWarehouseCode = originWarehouseCode;
    if (hasValue(destinationWarehouseCode)) lastDestinationWarehouseCode = destinationWarehouseCode;
    if (hasValue(date)) lastDate = date;
    if (hasValue(area)) lastArea = area;

    return {
      ...row,
      documentNumber,
      originWarehouseCode,
      originWarehouseName: mapWarehouseName(originWarehouseCode),
      destinationWarehouseCode,
      destinationWarehouseName: mapWarehouseName(destinationWarehouseCode),
      date,
      area,
    };
  });
}

export function filterTransfersFromOrigin(rows = [], originCode = 30) {
  const expectedOrigin = normalizeWarehouseCode(originCode);
  return fillDownTransferRows(rows).filter((row) => normalizeWarehouseCode(row.originWarehouseCode) === expectedOrigin);
}

export function groupTransfersByDestination(rows = []) {
  const grouped = rows.reduce((map, row) => {
    const destinationCode = normalizeWarehouseCode(row.destinationWarehouseCode) || "desconocido";
    if (!map.has(destinationCode)) {
      map.set(destinationCode, {
        destinationCode,
        destinationName: mapWarehouseName(destinationCode),
        rows: [],
      });
    }
    map.get(destinationCode).rows.push(row);
    return map;
  }, new Map());

  const preferredOrder = ["20", "1", "10"];
  return [...grouped.values()].sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.destinationCode);
    const rightIndex = preferredOrder.indexOf(right.destinationCode);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    }
    return String(left.destinationCode).localeCompare(String(right.destinationCode));
  });
}

export function groupTransfersByDestinationAndDocument(rows = []) {
  const groupedByDestination = rows.reduce((destinationMap, row) => {
    const destinationCode = normalizeWarehouseCode(row.destinationWarehouseCode) || "desconocido";
    if (!destinationMap.has(destinationCode)) {
      destinationMap.set(destinationCode, {
        destinationCode,
        destinationName: mapWarehouseName(destinationCode),
        documentsMap: new Map(),
      });
    }

    const destinationGroup = destinationMap.get(destinationCode);
    const documentNumber = String(row.documentNumber || "").trim() || "Sin documento";
    const date = String(row.date || "").trim() || "Sin fecha";
    const area = String(row.area || "").trim() || "Sin área";
    const originWarehouseCode = normalizeWarehouseCode(row.originWarehouseCode) || "";
    const documentKey = [documentNumber, originWarehouseCode, destinationCode, date, area].join("::");

    if (!destinationGroup.documentsMap.has(documentKey)) {
      destinationGroup.documentsMap.set(documentKey, {
        documentNumber,
        originWarehouseCode,
        originWarehouseName: mapWarehouseName(originWarehouseCode),
        destinationWarehouseCode: destinationCode,
        destinationWarehouseName: mapWarehouseName(destinationCode),
        date,
        area,
        items: [],
      });
    }

    destinationGroup.documentsMap.get(documentKey).items.push({
      code: String(row.code || "").trim(),
      description: String(row.description || "").trim(),
      quantity: normalizeQuantity(row.quantity),
    });

    return destinationMap;
  }, new Map());

  const preferredOrder = ["20", "1", "10"];
  return [...groupedByDestination.values()]
    .map((group) => {
      const documents = [...group.documentsMap.values()];
      return {
        destinationCode: group.destinationCode,
        destinationName: group.destinationName,
        documents,
        lineCount: documents.reduce((sum, document) => sum + Math.max(document.items.length, 1), 0),
      };
    })
    .sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.destinationCode);
      const rightIndex = preferredOrder.indexOf(right.destinationCode);
      if (leftIndex !== -1 || rightIndex !== -1) {
        return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
      }
      return String(left.destinationCode).localeCompare(String(right.destinationCode));
    });
}

export const groupTransfersForReport = groupTransfersByDestinationAndDocument;

export function groupTransfersByArea(rows = []) {
  return rows.reduce((map, row) => {
    const area = row.area || "Sin área";
    if (!map[area]) map[area] = [];
    map[area].push(row);
    return map;
  }, {});
}

export function getDestinationCounts(rows = []) {
  return rows.reduce((counts, row) => {
    const code = normalizeWarehouseCode(row.destinationWarehouseCode) || "desconocido";
    counts[code] = (counts[code] || 0) + 1;
    return counts;
  }, {});
}

export function exportTransfersToExcel(groups = [], filename = "traslados-pendientes-procesados.xlsx") {
  const workbook = XLSX.utils.book_new();
  const headers = [
    "Número de documento",
    "Código",
    "Descripción",
    "Cantidad",
    "Almacén origen",
    "Almacén destino",
    "Fecha",
    "Área",
  ];
  const worksheetRows = [headers];
  const merges = [];

  groups.forEach((group) => {
    const documents = group.documents || [];
    documents.forEach((document) => {
      const items = document.items?.length ? document.items : [{ code: "", description: "", quantity: "" }];
      const startRow = worksheetRows.length;

      items.forEach((item, itemIndex) => {
        worksheetRows.push([
          itemIndex === 0 ? document.documentNumber : "",
          item.code,
          item.description,
          item.quantity,
          itemIndex === 0 ? `${document.originWarehouseCode} - ${document.originWarehouseName}` : "",
          itemIndex === 0 ? `${document.destinationWarehouseCode} - ${document.destinationWarehouseName}` : "",
          itemIndex === 0 ? document.date : "",
          itemIndex === 0 ? document.area : "",
        ]);
      });

      const endRow = worksheetRows.length - 1;
      if (endRow > startRow) {
        [0, 4, 5, 6, 7].forEach((columnIndex) => {
          merges.push({
            s: { r: startRow, c: columnIndex },
            e: { r: endRow, c: columnIndex },
          });
        });
      }
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 48 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Traslados Pendientes");
  XLSX.writeFile(workbook, filename);
}
