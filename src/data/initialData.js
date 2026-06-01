export const initialAreas = [
  { id: "ARE-001", nombre: "Servicio y Caja", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-002", nombre: "Carnicería", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-003", nombre: "Abarrotes", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-004", nombre: "Fruver", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-005", nombre: "Delicatessen", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-006", nombre: "Ferretería", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-007", nombre: "Hogar", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-008", nombre: "Almacén", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-009", nombre: "Recepción de Mercancía", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
  { id: "ARE-010", nombre: "Despacho", encargado: "Sin asignar", estado: "Activo", observacion: "Área operativa base." },
];

export const initialEncargados = [];

export const initialColaboradores = [];

export const initialEvaluaciones = [];

export const initialIncidencias = [];

export const initialSubgerentes = [];

export const initialEvaluacionesSubgerente = [];

export const initialEvaluacionesEncargado = [];

export const initialGerentes = [];

export const initialUsuarios = [
  {
    id: "USR-001",
    nombre: "Gerente Supermix",
    usuario: "gerente",
    password: "Gerente1",
    rol: "Gerente",
    empresaId: "COMP-SUPERMIX",
    codigoEmpresa: "SUPERMIX",
    areaAsignada: "",
    areasSupervisadas: [],
    areasAsignadas: [],
    estado: "Activo",
  },
  {
    id: "USR-002",
    nombre: "Subgerente",
    usuario: "subgerente",
    password: "1234",
    rol: "Subgerente",
    areaAsignada: "",
    areasSupervisadas: ["Recepción de Mercancía", "Almacén", "Abarrotes"],
    areasAsignadas: ["Recepción de Mercancía", "Almacén", "Abarrotes"],
    estado: "Activo",
  },
  {
    id: "USR-003",
    nombre: "Encargado Recepción",
    usuario: "encargado_recibo",
    password: "1234",
    rol: "Encargado",
    areaAsignada: "Recepción de Mercancía",
    areasSupervisadas: [],
    areasAsignadas: [],
    estado: "Activo",
  },
  {
    id: "USR-004",
    nombre: "Encargado Carnicería",
    usuario: "encargado_carniceria",
    password: "1234",
    rol: "Encargado",
    areaAsignada: "Carnicería",
    areasSupervisadas: [],
    areasAsignadas: [],
    estado: "Activo",
  },
];

export const initialConfiguracion = {
  nombreEmpresa: "Supermercado Central",
  nombreSupermercado: "Supermercado Central",
  rnc: "",
  direccion: "",
  telefono: "",
  correo: "",
  logo: "EvaluaPro KPI",
  periodoEvaluacion: "Mensual",
  periodoKpiMensual: "Mensual",
  kpiMinimoAceptable: 80,
  areasActivas: initialAreas.map((area) => area.nombre),
  parametrosEvaluacion: "Puntualidad, asistencia, productividad, calidad, procesos, servicio e incidencias.",
  pesosKpi: {
    puntualidad: 10,
    asistencia: 10,
    productividad: 30,
    calidad: 20,
    procesos: 15,
    servicio: 10,
    incidencias: 5,
  },
  rolesConfig: "Gerente administra, Subgerente supervisa, Encargado ve solo su área.",
  visual: {
    colorPrincipal: "#2563eb",
    colorSecundario: "#0f766e",
    tema: "Claro",
    vista: "Normal",
  },
};

export const initialTendencia = [];

export const initialData = {
  areas: initialAreas,
  encargados: initialEncargados,
  colaboradores: initialColaboradores,
  evaluaciones: initialEvaluaciones,
  incidencias: initialIncidencias,
  subgerentes: initialSubgerentes,
  evaluacionesSubgerente: initialEvaluacionesSubgerente,
  evaluacionesEncargado: initialEvaluacionesEncargado,
  gerentes: initialGerentes,
  usuarios: initialUsuarios,
  configuracion: initialConfiguracion,
  tendencia: initialTendencia,
};
