export const DEFAULT_CONFIG = {
  companyName: "EvaluaPro KPI Supermercado",
  rnc: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "EvaluaPro KPI",
  logoDataUrl: "",
  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  theme: "light",
  density: "compact",
  monthlyPeriod: "Mensual",
  minimumKpi: 70,
  activeAreas: [
    "Recepción de Mercancía",
    "Almacén",
    "Abarrotes",
    "Caja y Servicio",
    "Fruver",
    "Delicatessen",
    "Carnicería",
    "Ferretería",
    "Hogar y Decoraciones",
    "Despacho"
  ]
};

const CONFIG_KEY = "system_config";

/**
 * Normaliza y mapea la configuración en inglés (formato solicitado)
 * a las claves en español (esperadas por el shell del sistema actual)
 * para garantizar plena compatibilidad sin romper nada.
 */
export function normalizeConfig(config = {}) {
  const c = { ...DEFAULT_CONFIG, ...config };

  // Mapear tema
  const themeEs = c.theme === "dark" || c.tema === "Oscuro" ? "Oscuro" : "Claro";
  const themeEn = themeEs === "Oscuro" ? "dark" : "light";

  // Mapear densidad
  const densityEs = c.density === "compact" || c.vista === "Compacta" ? "Compacta" : "Normal";
  const densityEn = densityEs === "Compacta" ? "compact" : "normal";

  // Mapear áreas
  const activeAreas = Array.isArray(c.activeAreas) ? c.activeAreas : Array.isArray(c.areasActivas) ? c.areasActivas : DEFAULT_CONFIG.activeAreas;

  return {
    // Estructura en Inglés (La que se guarda en localStorage)
    companyName: c.companyName || c.nombreEmpresa || c.nombreSupermercado || DEFAULT_CONFIG.companyName,
    rnc: c.rnc ?? "",
    address: c.address || c.direccion || "",
    phone: c.phone || c.telefono || "",
    email: c.email || c.correo || "",
    logoUrl: c.logoUrl || c.logo || DEFAULT_CONFIG.logoUrl,
    logoDataUrl: c.logoDataUrl || "",
    primaryColor: c.primaryColor || c.visual?.colorPrincipal || DEFAULT_CONFIG.primaryColor,
    secondaryColor: c.secondaryColor || c.visual?.colorSecundario || DEFAULT_CONFIG.secondaryColor,
    theme: themeEn,
    density: densityEn,
    monthlyPeriod: c.monthlyPeriod || c.periodoKpiMensual || c.periodoEvaluacion || DEFAULT_CONFIG.monthlyPeriod,
    minimumKpi: Number(c.minimumKpi ?? c.kpiMinimoAceptable ?? DEFAULT_CONFIG.minimumKpi),
    activeAreas,

    // Estructura en Español (Para compatibilidad total con el resto del sistema actual)
    nombreEmpresa: c.companyName || c.nombreEmpresa || c.nombreSupermercado || DEFAULT_CONFIG.companyName,
    nombreSupermercado: c.companyName || c.nombreEmpresa || c.nombreSupermercado || DEFAULT_CONFIG.companyName,
    direccion: c.address || c.direccion || "",
    telefono: c.phone || c.telefono || "",
    correo: c.email || c.correo || "",
    logo: c.logoUrl || c.logo || DEFAULT_CONFIG.logoUrl,
    periodoKpiMensual: c.monthlyPeriod || c.periodoKpiMensual || c.periodoEvaluacion || DEFAULT_CONFIG.monthlyPeriod,
    periodoEvaluacion: c.monthlyPeriod || c.periodoKpiMensual || c.periodoEvaluacion || DEFAULT_CONFIG.monthlyPeriod,
    kpiMinimoAceptable: Number(c.minimumKpi ?? c.kpiMinimoAceptable ?? DEFAULT_CONFIG.minimumKpi),
    areasActivas: activeAreas,
    pesosKpi: {
      puntualidad: 10,
      asistencia: 10,
      productividad: 30,
      calidad: 20,
      procesos: 15,
      servicio: 10,
      incidencias: 5,
      ...(c.pesosKpi || {}),
    },
    visual: {
      colorPrincipal: c.primaryColor || c.visual?.colorPrincipal || DEFAULT_CONFIG.primaryColor,
      colorSecundario: c.secondaryColor || c.visual?.colorSecundario || DEFAULT_CONFIG.secondaryColor,
      tema: themeEs,
      vista: densityEs,
    }
  };
}

export function getSystemConfig() {
  const saved = localStorage.getItem(CONFIG_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
}

export function saveSystemConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

export function resetSystemConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  return DEFAULT_CONFIG;
}
