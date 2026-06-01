import {
  BriefcaseBusiness,
  Activity,
  Boxes,
  ChartColumn,
  ClipboardCheck,
  KeyRound,
  LayoutDashboard,
  MapPinned,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  CalendarDays,
  Clock,
  FileWarning,
  ShoppingCart,
  Store,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";

const iconMap = {
  superadminPanel: ShieldCheck,
  empresasSucursales: Store,
  superadminCrearEmpresa: Store,
  superadminGerenteInicial: UserCog,
  superadminSystemModules: Boxes,
  superadminCompanyModules: Network,
  superadminCustomCompanyModule: BriefcaseBusiness,
  superadminGlobalSettings: Settings,
  superadminSecurity: ShieldCheck,
  superadminAudit: Activity,
  superadminBackups: ClipboardCheck,
  dashboard: LayoutDashboard,
  areas: MapPinned,
  encargados: UserCog,
  colaboradores: Users,
  evaluaciones: ClipboardCheck,
  evaluacionEncargados: UserCog,
  evaluacionSubgerentes: ShieldCheck,
  evaluacionTrimestral: ClipboardCheck,
  plantillasKpiArea: Store,
  evaluacionKpiMensual: ChartColumn,
  kpiDiario: Activity,
  analisisMovimientoProductos: Boxes,
  trasladosPendientes: ClipboardCheck,
  vacaciones: CalendarDays,
  permisos: Clock,
  amonestaciones: FileWarning,
  incidencias: TriangleAlert,
  subgerentes: ShieldCheck,
  gerentes: BriefcaseBusiness,
  "usuarios-roles": KeyRound,
  reportes: ChartColumn,
  configuracion: Settings,
};

export default function Sidebar({ collapsed, modules, activeView, onNavigate, onToggle, supermarketName, logoDataUrl }) {
  if (collapsed) {
    return (
      <button className="sidebar-reveal" type="button" onClick={onToggle} aria-label="Mostrar menú">
        <PanelLeftOpen size={19} />
      </button>
    );
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__brand">
        <div className="sidebar__logo" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ShoppingCart size={22} />
          )}
        </div>
        <div>
          <strong>EvaluaPro</strong>
          <span>{supermarketName || "KPI Supermercado"}</span>
        </div>
        <button className="sidebar__toggle" type="button" onClick={onToggle} aria-label="Ocultar menú">
          <PanelLeftClose size={18} />
        </button>
      </header>

      <nav className="sidebar__nav" aria-label="Módulos">
        {modules.map((module) => {
          const Icon = iconMap[module.id] || Store;
          const isActive = activeView === module.id;

          return (
            <button
              key={module.id}
              className={isActive ? "is-active" : ""}
              type="button"
              onClick={() => onNavigate(module.id)}
            >
              <Icon size={18} />
              <span>{module.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
