export const KPI_AREAS = [
  "Recepcion de Mercancia",
  "Almacen",
  "Abarrotes",
  "Caja y Servicio",
  "Fruver",
  "Delicatessen",
  "Carniceria",
  "Ferreteria",
  "Hogar y Decoraciones",
  "Despacho",
  "Conserjeria",
  "Panaderia / Reposteria",
];

const receptionDefinitions = [
  {
    area: "Recepcion de Mercancia",
    cargo: "Lider de Recibo",
    indicadores: [
      "Ventas Generales",
      "Inventario General",
      "Errores en Entradas",
      "Puntualidad",
      "Auditoria de Procesos",
      "Eficiencia en Traslados",
    ],
  },
  {
    area: "Recepcion de Mercancia",
    cargo: "Auxiliar de Recibo",
    indicadores: [
      "Ventas Generales",
      "Inventario General",
      "Puntualidad",
      "Auditoria de Procesos",
      "Accidentes o mala manipulacion",
      "Mala manipulacion al llevar mercancia a los almacenes",
    ],
  },
  {
    area: "Recepcion de Mercancia",
    cargo: "Encargado de Recibo",
    indicadores: [
      "Ventas Generales",
      "Inventario General",
      "Errores en Entradas",
      "Puntualidad",
      "Auditoria de Procesos",
      "Eficiencia en Traslados",
    ],
  },
];

function isLowerBetter(indicador) {
  return /errores en entradas|accidentes|mala manipulacion/i.test(indicador);
}

function distributeWeights(total) {
  const base = Math.floor(100 / total);
  const weights = Array.from({ length: total }, () => base);
  let remainder = 100 - base * total;
  let index = 0;

  while (remainder > 0) {
    weights[index] += 1;
    index += 1;
    remainder -= 1;
  }

  return weights;
}

export const initialKpiAreaTemplates = receptionDefinitions.flatMap((definition, definitionIndex) => {
  const weights = distributeWeights(definition.indicadores.length);
  const now = "2026-01-01T00:00:00.000Z";

  return definition.indicadores.map((indicador, indicadorIndex) => {
    const menorEsMejor = isLowerBetter(indicador);
    return {
      id: `KPT-REC-${String(definitionIndex + 1).padStart(2, "0")}-${String(indicadorIndex + 1).padStart(2, "0")}`,
      areaId: "",
      areaNombre: definition.area,
      area: definition.area,
      cargo: definition.cargo,
      puesto: definition.cargo,
      indicador,
      tipoIndicador: menorEsMejor ? "Menor es mejor" : "Mayor es mejor",
      menorEsMejor,
      peso: weights[indicadorIndex],
      meta: 100,
      estado: "Activo",
      createdAt: now,
      updatedAt: now,
    };
  });
});
