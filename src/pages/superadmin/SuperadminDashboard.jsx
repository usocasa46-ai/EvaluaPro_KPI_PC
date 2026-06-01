import {
  Building2,
  DatabaseBackup,
  KeyRound,
  Lock,
  Network,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SYSTEM_MODULE_CATALOG } from "../../services/companyModuleService";
import {
  EmptyState,
  SuperadminGuard,
  SuperadminHeader,
  formatNumber,
  getCompanyUsers,
  safeArray,
} from "./SuperadminShared";

export default function SuperadminDashboard({
  activeUser,
  onNavigate,
  companies = [],
  usuarios = [],
  customCompanyModules = [],
  globalSettings,
  systemModules = SYSTEM_MODULE_CATALOG,
}) {
  const safeCompanies = safeArray(companies);
  const safeUsers = safeArray(usuarios);
  const companyUsers = safeUsers.filter((user) => user?.rol !== "Superadmin");
  const activeCompanies = safeCompanies.filter((company) => company.estado === "Activa").length;
  const inactiveCompanies = safeCompanies.length - activeCompanies;
  const activeSystemModules = safeArray(systemModules).filter((module) => module.estado !== "Inactivo").length;
  const activeCustomModules = safeArray(customCompanyModules).filter((module) => module.estado !== "Inactivo").length;

  const metrics = [
    {
      label: "Empresas registradas",
      value: safeCompanies.length,
      detail: `Activas: ${activeCompanies}`,
      icon: Building2,
      accent: "#f5b942",
    },
    {
      label: "Usuarios de empresas",
      value: companyUsers.length,
      detail: "Gerentes, subgerentes y encargados",
      icon: Users,
      accent: "#2563eb",
    },
    {
      label: "Modulos globales",
      value: activeSystemModules,
      detail: "Disponibles para activar por empresa",
      icon: Network,
      accent: "#8b5cf6",
    },
    {
      label: "Modulos personalizados",
      value: activeCustomModules,
      detail: "Creados para empresas",
      icon: Settings,
      accent: "#22c55e",
    },
    {
      label: "Empresas suspendidas",
      value: inactiveCompanies,
      detail: "Sin acceso operativo",
      icon: Lock,
      accent: "#ef476f",
    },
    {
      label: "Version plataforma",
      value: globalSettings?.version || "1.0.0",
      detail: globalSettings?.maintenanceStatus || "Operativa",
      icon: ShieldCheck,
      accent: "#38bdf8",
    },
  ];

  const quickAccess = [
    { label: "Nueva empresa", view: "superadminCrearEmpresa", icon: Building2 },
    { label: "Gerente inicial", view: "superadminGerenteInicial", icon: KeyRound },
    { label: "Modulos por empresa", view: "superadminCompanyModules", icon: Network },
    { label: "Modulo personalizado", view: "superadminCustomCompanyModule", icon: Settings },
    { label: "Configuracion global", view: "superadminGlobalSettings", icon: Settings },
    { label: "Seguridad", view: "superadminSecurity", icon: Lock },
    { label: "Auditoria", view: "superadminAudit", icon: ShieldCheck },
    { label: "Respaldos", view: "superadminBackups", icon: DatabaseBackup },
  ];

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Panel Superadmin"
          subtitle="Control global de empresas, modulos y seguridad de la plataforma."
        />

        <section className="superadmin-metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article className="superadmin-metric" key={metric.label}>
                <div>
                  <span>{metric.label}</span>
                  <strong>{typeof metric.value === "number" ? formatNumber(metric.value) : metric.value}</strong>
                  <small>{metric.detail}</small>
                </div>
                <div className="superadmin-metric__icon" style={{ background: `${metric.accent}20`, color: metric.accent }}>
                  <Icon size={24} />
                </div>
              </article>
            );
          })}
        </section>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Empresas / Clientes</h2>
                <p>Vista rapida del estado de acceso por empresa.</p>
              </div>
              <button className="btn btn-light" type="button" onClick={() => onNavigate?.("empresasSucursales")}>
                Ver empresas
              </button>
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Codigo</th>
                    <th>Usuarios</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCompanies.slice(0, 6).map((company) => (
                    <tr key={company.id}>
                      <td>{company.nombreEmpresa || company.nombre}</td>
                      <td>{company.codigoEmpresa}</td>
                      <td>{getCompanyUsers(company, safeUsers).length}</td>
                      <td>{company.estado || "Activa"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!safeCompanies.length ? <EmptyState>No hay empresas registradas.</EmptyState> : null}
            </div>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Accesos rapidos</h2>
                <p>Acciones administrativas globales.</p>
              </div>
            </div>
            <div className="superadmin-quick-grid">
              {quickAccess.map((item) => {
                const Icon = item.icon;
                return (
                  <button className="superadmin-quick" type="button" key={item.label} onClick={() => onNavigate?.(item.view)}>
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        <article className="superadmin-side-note">
          <strong>Alcance Superadmin</strong>
          <p>
            El Superadmin es el dueno de la plataforma: crea empresas, define modulos, configura seguridad global y
            respalda el sistema. No aparece como colaborador y no participa en KPI operativos.
          </p>
        </article>
      </section>
    </SuperadminGuard>
  );
}
