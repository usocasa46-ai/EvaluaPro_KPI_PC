import { CheckCircle2, ShieldAlert } from "lucide-react";
import { isSuperadmin } from "../../services/permissionsService";
import { normalizeCompanyCode } from "../../services/companyService";

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("es-DO") : "0";
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveCompany(company, companies = []) {
  if (!company) return null;
  const code = normalizeCompanyCode(company.codigoEmpresa || company.codigo || "");
  return (
    companies.find((item) => item.id === company.id) ||
    companies.find((item) => normalizeCompanyCode(item.codigoEmpresa) === code) ||
    null
  );
}

export function getCompanyUsers(company, users = []) {
  if (!company) return [];
  return safeArray(users).filter((user) => {
    if (!user || isSuperadmin(user)) return false;
    return user.empresaId === company.id || normalizeCompanyCode(user.codigoEmpresa) === normalizeCompanyCode(company.codigoEmpresa);
  });
}

export function getCompanyManagers(company, users = []) {
  return getCompanyUsers(company, users).filter((user) => user.rol === "Gerente" && user.estado !== "Inactivo");
}

export function SuperadminGuard({ activeUser, children }) {
  if (!isSuperadmin(activeUser)) {
    return (
      <section className="page-shell">
        <div className="permission-card">No tienes permiso para ver esta informacion.</div>
      </section>
    );
  }

  return children;
}

export function SuperadminHeader({ title, subtitle, actions }) {
  return (
    <header className="module-header">
      <div>
        <p className="superadmin-kicker">SUPERADMIN</p>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="actions-row">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({ value }) {
  const text = value || "Activo";
  const off = ["Inactivo", "Suspendida", "Suspendido", "Bloqueado"].includes(text);
  return <span className={`superadmin-status ${off ? "is-off" : ""}`}>{text}</span>;
}

export function SuperadminNotice({ type = "success", children }) {
  if (!children) return null;
  const Icon = type === "error" ? ShieldAlert : CheckCircle2;
  return (
    <div className={`superadmin-alert ${type === "error" ? "is-error" : "is-success"}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ children = "No hay datos disponibles." }) {
  return <div className="superadmin-empty">{children}</div>;
}
