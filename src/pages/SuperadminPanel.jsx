import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ChartColumn,
  CheckCircle2,
  ClipboardCheck,
  DatabaseBackup,
  FileText,
  KeyRound,
  Lock,
  Network,
  Palette,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { MODULES, getPermissionMessage, isSuperadmin } from "../services/permissionsService";
import { normalizeConfig } from "../services/configService";
import { ensureDefaultCompanies } from "../services/companyService";
import { STORAGE_KEYS, readStorage } from "../services/storageService";

const emptyCompanyForm = {
  nombre: "",
  rnc: "",
  direccion: "",
  telefono: "",
  correo: "",
  responsable: "",
  plan: "Local",
  estado: "Activa",
  observacion: "",
};

const emptyPasswordForm = {
  userId: "",
  userName: "",
  password: "",
  confirmPassword: "",
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString("es-DO");
}

function isCurrentMonth(record) {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const candidates = [record?.periodo, record?.fecha, record?.fechaEvaluacion, record?.createdAt].filter(Boolean);
  return candidates.some((candidate) => String(candidate).startsWith(currentPeriod));
}

function getFallbackSnapshot() {
  return {
    usuarios: safeArray(readStorage(STORAGE_KEYS.usuarios, [])),
    colaboradores: safeArray(readStorage(STORAGE_KEYS.colaboradores, [])),
    areas: safeArray(readStorage(STORAGE_KEYS.areas, [])),
    kpiTemplates: safeArray(readStorage(STORAGE_KEYS.kpiAreaTemplates, [])),
    monthlyEvaluations: safeArray(readStorage(STORAGE_KEYS.kpiMonthlyEvaluations, [])),
    quarterlyEvaluations: safeArray(readStorage(STORAGE_KEYS.evaluacionesTrimestrales, [])),
    companies: safeArray(readStorage(STORAGE_KEYS.companies, [])),
    config: normalizeConfig(readStorage(STORAGE_KEYS.configuracion, {})),
    auditLog: safeArray(readStorage("audit_log", [])),
  };
}

export default function SuperadminPanel({
  activeUser,
  onNavigate,
  companies,
  usuarios,
  colaboradores,
  areas,
  kpiTemplates,
  monthlyEvaluations,
  quarterlyEvaluations,
  configuracion,
  onSaveCompany,
  onChangeUserPassword,
  focusSection = "",
}) {
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fallback = useMemo(() => getFallbackSnapshot(), []);
  const config = normalizeConfig(configuracion || fallback.config);
  const systemUsers = safeArray(usuarios?.length ? usuarios : fallback.usuarios);
  const systemCompanies = ensureDefaultCompanies(
    safeArray(companies?.length ? companies : fallback.companies),
    config
  );
  const systemCollaborators = safeArray(colaboradores?.length ? colaboradores : fallback.colaboradores);
  const systemAreas = safeArray(areas?.length ? areas : fallback.areas);
  const systemTemplates = safeArray(kpiTemplates?.length ? kpiTemplates : fallback.kpiTemplates);
  const systemMonthly = safeArray(monthlyEvaluations?.length ? monthlyEvaluations : fallback.monthlyEvaluations);
  const systemQuarterly = safeArray(quarterlyEvaluations?.length ? quarterlyEvaluations : fallback.quarterlyEvaluations);
  const auditLog = fallback.auditLog;

  if (!isSuperadmin(activeUser)) {
    return (
      <section className="page-shell">
        <div className="permission-card">No tienes permiso para acceder al Panel Superadmin.</div>
      </section>
    );
  }

  const evaluationsThisMonth = [...systemMonthly.filter(isCurrentMonth), ...systemQuarterly.filter(isCurrentMonth)].length;
  const activeModules = MODULES.length;
  const activeUsers = systemUsers.filter((user) => user?.estado !== "Inactivo").length;
  const activeTemplates = systemTemplates.filter((template) => template?.estado !== "Inactivo").length;
  const activeCompanies = systemCompanies.filter((company) => company?.estado !== "Inactiva").length;
  const currentCompany = config.companyName || config.nombreEmpresa || "EvaluaPro KPI Supermercado";
  const primaryColor = config.primaryColor || config.visual?.colorPrincipal || "#2563eb";

  const statCards = [
    { label: "Empresas registradas", value: systemCompanies.length, detail: `Activas: ${activeCompanies}`, icon: Building2, accent: "#f5b942" },
    { label: "Usuarios en el sistema", value: systemUsers.length, detail: `Activos: ${activeUsers}`, icon: Users, accent: "#2563eb" },
    { label: "Colaboradores totales", value: systemCollaborators.length, detail: "Datos operativos", icon: Users, accent: "#38bdf8" },
    { label: "KPI creados", value: systemTemplates.length, detail: `Activos: ${activeTemplates}`, icon: ClipboardCheck, accent: "#ef476f" },
    { label: "Evaluaciones del mes", value: evaluationsThisMonth, detail: "KPI mensual + trimestral", icon: ChartColumn, accent: "#8b5cf6" },
    { label: "Modulos activos", value: activeModules, detail: "Control global", icon: ShieldCheck, accent: "#10b981" },
  ];

  const quickAccess = [
    { label: "Usuarios y Roles", view: "usuarios-roles", icon: KeyRound },
    { label: "Empresas", action: "newCompany", icon: Building2 },
    { label: "Configuracion", view: "configuracion", icon: Settings },
    { label: "Modulos", view: "configuracion", icon: Network },
    { label: "Reportes Globales", view: "reportes", icon: ChartColumn },
    { label: "Auditoria", action: "audit", icon: Activity },
    { label: "Respaldos", action: "backup", icon: DatabaseBackup },
    { label: "Seguridad", action: "password", icon: Lock },
  ];

  function updateCompanyField(name, value) {
    setCompanyForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function openCompanyModal(company) {
    setCompanyForm(company ? { ...emptyCompanyForm, ...company } : emptyCompanyForm);
    setError("");
    setMessage("");
    setCompanyModalOpen(true);
  }

  function saveCompany(event) {
    event.preventDefault();
    if (!companyForm.nombre.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }

    const saved = onSaveCompany?.(companyForm);
    if (saved === null) {
      setError("No se pudo guardar la empresa.");
      return;
    }

    setCompanyModalOpen(false);
    setMessage("Empresa guardada correctamente. Ya queda disponible para usar el programa.");
  }

  function openPasswordModal(user = activeUser) {
    setPasswordForm({
      userId: user?.id || "",
      userName: user?.nombre || user?.usuario || "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setMessage("");
    setPasswordModalOpen(true);
  }

  function updatePasswordField(name, value) {
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function savePassword(event) {
    event.preventDefault();
    if (!passwordForm.userId) {
      setError("Seleccione un usuario valido.");
      return;
    }
    if (passwordForm.password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const updated = onChangeUserPassword?.(passwordForm.userId, passwordForm.password);
    if (!updated) {
      setError("No se pudo cambiar la contraseña.");
      return;
    }

    setPasswordModalOpen(false);
    setMessage("Contraseña actualizada correctamente.");
  }

  function handleQuickAccess(item) {
    if (item.view) {
      onNavigate?.(item.view);
      return;
    }
    if (item.action === "newCompany") openCompanyModal();
    if (item.action === "password") openPasswordModal(activeUser);
    if (item.action === "audit") setMessage("Auditoria preparada para una version con backend.");
    if (item.action === "backup") setMessage("Respaldos preparados; no se ejecuto ninguna restauracion peligrosa.");
  }

  return (
    <section className="page-shell superadmin-panel">
      <section className="superadmin-screen-grid">
        <div className="superadmin-screen-main">
          <header className="superadmin-hero">
            <div className="superadmin-hero__badge">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="superadmin-kicker">Dueño del programa</p>
              <h1>Panel Superadmin</h1>
              <p>Gestion global de usuarios, roles, empresas, modulos, seguridad y configuracion del sistema.</p>
            </div>
          </header>

          {message ? <div className="superadmin-alert is-success">{message}</div> : null}
          {error ? <div className="superadmin-alert is-error">{error}</div> : null}

          <section className="superadmin-metrics" aria-label="Resumen Superadmin">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="superadmin-metric" key={card.label} style={{ "--metric-accent": card.accent }}>
                  <div>
                    <span>{card.label}</span>
                    <strong>{formatNumber(card.value)}</strong>
                    <small>{card.detail}</small>
                  </div>
                  <div className="superadmin-metric__icon">
                    <Icon size={24} />
                  </div>
                </article>
              );
            })}
          </section>

          <section className="superadmin-layout">
            <article className="superadmin-card superadmin-card--wide">
              <div className="superadmin-card__header">
                <div>
                  <h2>Resumen general del sistema</h2>
                  <p>Vista global de empresas, usuarios y actividad del programa.</p>
                </div>
                <span className="superadmin-pill">Control global</span>
              </div>
              <div className="superadmin-chart" aria-hidden="true">
                <span style={{ height: "34%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "44%" }} />
                <span style={{ height: "76%" }} />
                <span style={{ height: "52%" }} />
                <span style={{ height: "88%" }} />
                <span style={{ height: "64%" }} />
                <span style={{ height: "42%" }} />
              </div>
              <div className="superadmin-system-strip">
                <div>
                  <strong>{currentCompany}</strong>
                  <span>Empresa actual configurada</span>
                </div>
                <div>
                  <strong style={{ color: primaryColor }}>{primaryColor}</strong>
                  <span>Color principal</span>
                </div>
                <div>
                  <strong>{config.theme === "dark" || config.visual?.tema === "Oscuro" ? "Oscuro" : "Claro"}</strong>
                  <span>Tema activo</span>
                </div>
              </div>
            </article>

            <article className="superadmin-card">
              <div className="superadmin-card__header">
                <div>
                  <h2>Accesos rapidos</h2>
                  <p>Control de dueño del software.</p>
                </div>
              </div>
              <div className="superadmin-quick-grid">
                {quickAccess.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className="superadmin-quick" type="button" key={item.label} onClick={() => handleQuickAccess(item)}>
                      <Icon size={19} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
        </div>

        <aside className="superadmin-side-rail">
          <h2>PANTALLA SUPERADMIN</h2>
          <p>Diseñada para tener control total del sistema con informacion global y accesos rapidos.</p>
          <h3>CARACTERISTICAS</h3>
          <ul>
            <li><CheckCircle2 size={15} /> Vista global de todo el sistema</li>
            <li><CheckCircle2 size={15} /> Control total de usuarios, roles y permisos</li>
            <li><CheckCircle2 size={15} /> Gestion de empresas / sucursales</li>
            <li><CheckCircle2 size={15} /> Monitoreo de modulos y actividad</li>
            <li><CheckCircle2 size={15} /> Reportes globales y metricas generales</li>
            <li><CheckCircle2 size={15} /> Seguridad y auditoria del sistema</li>
          </ul>
          <h3>NOTA</h3>
          <div className="superadmin-side-note">
            El Superadmin NO aparece como colaborador y NO es evaluado en ningun KPI.
          </div>
        </aside>
      </section>

      <section className="superadmin-grid">
        <article className={`superadmin-card ${focusSection === "companies" ? "is-highlighted" : ""}`}>
          <div className="superadmin-card__header">
            <div>
              <h2>Empresas / Sucursales</h2>
              <p>Empresas registradas para usar el programa.</p>
            </div>
            <button className="button button--primary" type="button" onClick={() => openCompanyModal()}>
              <Plus size={15} />
              Nueva empresa
            </button>
          </div>
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RNC</th>
                  <th>Estado</th>
                  <th>Usuarios</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {systemCompanies.length ? (
                  systemCompanies.map((company) => (
                    <tr key={company.id || company.nombre}>
                      <td>{company.nombre || "Sin nombre"}</td>
                      <td>{company.rnc || "-"}</td>
                      <td>
                        <span className={`superadmin-status ${company.estado === "Inactiva" ? "is-off" : ""}`}>
                          {company.estado || "Activa"}
                        </span>
                      </td>
                      <td>{systemUsers.filter((user) => user.empresaId === company.id).length}</td>
                      <td>
                        <button className="text-button" type="button" onClick={() => openCompanyModal(company)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No hay empresas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Gestion de usuarios</h2>
              <p>Usuarios globales del programa.</p>
            </div>
            <button className="text-button" type="button" onClick={() => onNavigate?.("usuarios-roles")}>
              Abrir Usuarios y Roles
            </button>
          </div>
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {systemUsers.length ? (
                  systemUsers.slice(0, 8).map((user) => (
                    <tr key={user.id || user.usuario}>
                      <td>{user.nombre || "Sin nombre"}</td>
                      <td>{user.usuario || "Sin usuario"}</td>
                      <td>{user.rol || "Sin rol"}</td>
                      <td>
                        <span className={`superadmin-status ${user.estado === "Inactivo" ? "is-off" : ""}`}>
                          {user.estado || "Activo"}
                        </span>
                      </td>
                      <td>
                        <button className="text-button" type="button" onClick={() => openPasswordModal(user)}>
                          Cambiar contraseña
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No hay usuarios registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Configuracion del sistema</h2>
              <p>Identidad, tema y parametros globales.</p>
            </div>
            <Palette size={20} />
          </div>
          <div className="superadmin-config-list">
            <div>
              <span>Nombre del sistema</span>
              <strong>{currentCompany}</strong>
            </div>
            <div>
              <span>Logo configurado</span>
              <strong>{config.logoDataUrl || config.logoUrl ? "Disponible" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Areas base</span>
              <strong>{formatNumber(systemAreas.length)}</strong>
            </div>
            <div>
              <span>KPI minimo</span>
              <strong>{safeNumber(config.minimumKpi || config.kpiMinimoAceptable)}%</strong>
            </div>
          </div>
        </article>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Auditoria del sistema</h2>
              <p>Historial preparado para trazabilidad.</p>
            </div>
            <Activity size={20} />
          </div>
          {auditLog.length ? (
            <ul className="superadmin-activity-list">
              {auditLog.slice(0, 5).map((item, index) => (
                <li key={item.id || index}>
                  <strong>{item.usuario || "Sistema"}</strong>
                  <span>{item.accion || "Accion registrada"} - {item.modulo || "General"}</span>
                  <small>{item.fecha || item.createdAt || "Sin fecha"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="superadmin-empty">
              <FileText size={24} />
              <span>No hay registros de auditoria todavia.</span>
            </div>
          )}
        </article>

        <article className="superadmin-card superadmin-card--security">
          <div className="superadmin-card__header">
            <div>
              <h2>Respaldos y seguridad</h2>
              <p>El Superadmin controla la capa de seguridad.</p>
            </div>
            <DatabaseBackup size={20} />
          </div>
          <ul className="superadmin-check-list">
            <li>Superadmin aislado de colaboradores y evaluaciones.</li>
            <li>Empresas guardadas sin borrar datos existentes.</li>
            <li>Respaldos preparados para una version con backend.</li>
          </ul>
          <button className="button button--ghost" type="button" onClick={() => openPasswordModal(activeUser)}>
            <Lock size={15} />
            Cambiar mi contraseña
          </button>
          <div className="superadmin-warning">
            Cambiar contraseña del Superadmin despues del primer acceso.
          </div>
        </article>

        <article className="superadmin-card superadmin-card--future">
          <div className="superadmin-card__header">
            <div>
              <h2>Empresas/clientes futuros</h2>
              <p>Preparado para multiempresa en el futuro.</p>
            </div>
            <Building2 size={20} />
          </div>
          <div className="superadmin-company">
            <strong>{currentCompany}</strong>
            <span>Empresa actual</span>
          </div>
          <p className="superadmin-note">
            La base de empresas ya existe. La separacion completa de datos por empresa queda pendiente para backend/SQLite.
          </p>
        </article>
      </section>

      <footer className="superadmin-footer-note">
        <ShieldCheck size={18} />
        <span>
          {getPermissionMessage()} aplica a usuarios no autorizados; esta pantalla no guarda secretos reales en frontend.
        </span>
      </footer>

      {companyModalOpen ? (
        <Modal title={companyForm.id ? "Editar empresa / sucursal" : "Nueva empresa / sucursal"} onClose={() => setCompanyModalOpen(false)}>
          <form className="entity-form" onSubmit={saveCompany}>
            <div className="form-grid">
              <FormField field={{ name: "nombre", label: "Nombre de la empresa", required: true }} value={companyForm.nombre} onChange={updateCompanyField} />
              <FormField field={{ name: "rnc", label: "RNC" }} value={companyForm.rnc} onChange={updateCompanyField} />
              <FormField field={{ name: "telefono", label: "Telefono" }} value={companyForm.telefono} onChange={updateCompanyField} />
              <FormField field={{ name: "correo", label: "Correo" }} value={companyForm.correo} onChange={updateCompanyField} />
              <FormField field={{ name: "direccion", label: "Direccion", type: "textarea", rows: 2 }} value={companyForm.direccion} onChange={updateCompanyField} />
              <FormField field={{ name: "responsable", label: "Responsable" }} value={companyForm.responsable} onChange={updateCompanyField} />
              <FormField field={{ name: "plan", label: "Plan", type: "select", options: ["Local", "Estandar", "Premium"] }} value={companyForm.plan} onChange={updateCompanyField} />
              <FormField field={{ name: "estado", label: "Estado", type: "select", options: ["Activa", "Inactiva"] }} value={companyForm.estado} onChange={updateCompanyField} />
              <FormField field={{ name: "observacion", label: "Observacion", type: "textarea", rows: 2 }} value={companyForm.observacion} onChange={updateCompanyField} />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setCompanyModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                <Save size={15} />
                Guardar empresa
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {passwordModalOpen ? (
        <Modal title={`Cambiar contraseña - ${passwordForm.userName || "Usuario"}`} onClose={() => setPasswordModalOpen(false)}>
          <form className="entity-form" onSubmit={savePassword}>
            <div className="form-grid">
              <FormField
                field={{ name: "password", label: "Nueva contraseña", type: "password", required: true }}
                value={passwordForm.password}
                onChange={updatePasswordField}
              />
              <FormField
                field={{ name: "confirmPassword", label: "Confirmar contraseña", type: "password", required: true }}
                value={passwordForm.confirmPassword}
                onChange={updatePasswordField}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setPasswordModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                <Save size={15} />
                Guardar contraseña
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
