import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
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
import {
  DEFAULT_COMPANY_MODULES,
  ensureDefaultCompanies,
  normalizeCompanyCode,
} from "../services/companyService";
import { STORAGE_KEYS, readStorage } from "../services/storageService";

const emptyCompanyForm = {
  codigoEmpresa: "",
  nombreEmpresa: "",
  tipoNegocio: "Supermercado",
  estado: "Activa",
  modulosActivos: DEFAULT_COMPANY_MODULES,
  rnc: "",
  direccion: "",
  telefono: "",
  correo: "",
  responsable: "",
  plan: "Local",
  observacion: "",
};

const emptyPasswordForm = {
  userId: "",
  userName: "",
  password: "",
  confirmPassword: "",
};

const emptyManagerForm = {
  companyId: "",
  nombre: "",
  usuario: "",
  password: "1234",
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

function getFallbackSnapshot() {
  return {
    usuarios: safeArray(readStorage(STORAGE_KEYS.usuarios, [])),
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
  configuracion,
  onSaveCompany,
  onCreateInitialCompanyManager,
  onChangeUserPassword,
  focusSection = "",
}) {
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerForm, setManagerForm] = useState(emptyManagerForm);
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
  const auditLog = fallback.auditLog;

  if (!isSuperadmin(activeUser)) {
    return (
      <section className="page-shell">
        <div className="permission-card">No tienes permiso para acceder al Panel Superadmin.</div>
      </section>
    );
  }

  const moduleOptions = DEFAULT_COMPANY_MODULES.map((moduleId) => {
    const module = MODULES.find((item) => item.id === moduleId);
    return { value: moduleId, label: module?.label || moduleId };
  });
  const operationalUsers = systemUsers.filter((user) => !isSuperadmin(user));
  const activeUsers = operationalUsers.filter((user) => user?.estado !== "Inactivo").length;
  const activeCompanies = systemCompanies.filter((company) => company?.estado === "Activa").length;
  const suspendedCompanies = systemCompanies.filter((company) =>
    ["Inactiva", "Suspendida"].includes(company?.estado)
  ).length;
  const currentSystemName = config.nombreSistema || "EvaluaPro KPI Supermercado";
  const primaryColor = config.primaryColor || config.visual?.colorPrincipal || "#2563eb";
  const version = "1.0.0";

  const statCards = [
    { label: "Empresas registradas", value: systemCompanies.length, detail: "Clientes del programa", icon: Building2, accent: "#f5b942" },
    { label: "Empresas activas", value: activeCompanies, detail: "Con acceso habilitado", icon: CheckCircle2, accent: "#10b981" },
    { label: "Usuarios totales", value: operationalUsers.length, detail: `Activos: ${activeUsers}`, icon: Users, accent: "#2563eb" },
    { label: "Modulos disponibles", value: DEFAULT_COMPANY_MODULES.length, detail: "Activables por empresa", icon: Network, accent: "#8b5cf6" },
    { label: "Empresas suspendidas", value: suspendedCompanies, detail: "Sin acceso operativo", icon: Lock, accent: "#ef476f" },
    { label: "Version sistema", value: version, detail: "Edicion local actual", icon: ShieldCheck, accent: "#38bdf8" },
  ];

  const quickAccess = [
    { label: "Usuarios Globales", view: "usuarios-roles", icon: KeyRound },
    { label: "Nueva Empresa", action: "newCompany", icon: Building2 },
    { label: "Gerente Inicial", action: "newManager", icon: Users },
    { label: "Configuracion Global", view: "configuracion", icon: Settings },
    { label: "Modulos por Empresa", action: "modules", icon: Network },
    { label: "Auditoria", action: "audit", icon: Activity },
    { label: "Respaldos", action: "backup", icon: DatabaseBackup },
    { label: "Cambiar Clave", action: "password", icon: Lock },
  ];

  function updateCompanyField(name, value) {
    setCompanyForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function openCompanyModal(company) {
    setCompanyForm(
      company
        ? {
            ...emptyCompanyForm,
            ...company,
            codigoEmpresa: company.codigoEmpresa || "",
            nombreEmpresa: company.nombreEmpresa || company.nombre || "",
            modulosActivos: safeArray(company.modulosActivos).length ? company.modulosActivos : DEFAULT_COMPANY_MODULES,
          }
        : emptyCompanyForm
    );
    setError("");
    setMessage("");
    setCompanyModalOpen(true);
  }

  function saveCompany(event) {
    event.preventDefault();
    const codigoEmpresa = normalizeCompanyCode(companyForm.codigoEmpresa);
    const nombreEmpresa = String(companyForm.nombreEmpresa || "").trim();

    if (!codigoEmpresa) {
      setError("El codigo de empresa es obligatorio.");
      return;
    }
    if (!nombreEmpresa) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }

    const saved = onSaveCompany?.({
      ...companyForm,
      codigoEmpresa,
      nombreEmpresa,
      nombre: nombreEmpresa,
    });
    if (saved === null) {
      setError("No se pudo guardar la empresa.");
      return;
    }

    setCompanyModalOpen(false);
    setMessage("Empresa guardada. Sus usuarios deben entrar con el codigo de empresa asignado.");
  }

  function openManagerModal(company) {
    setManagerForm({
      ...emptyManagerForm,
      companyId: company?.id || systemCompanies[0]?.id || "",
    });
    setError("");
    setMessage("");
    setManagerModalOpen(true);
  }

  function updateManagerField(name, value) {
    setManagerForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function saveManager(event) {
    event.preventDefault();
    if (!managerForm.companyId || !managerForm.nombre.trim() || !managerForm.usuario.trim()) {
      setError("Empresa, nombre y usuario son obligatorios para crear el gerente inicial.");
      return;
    }

    const saved = onCreateInitialCompanyManager?.(managerForm);
    if (saved === null) {
      setError("No se pudo crear el gerente inicial.");
      return;
    }

    setManagerModalOpen(false);
    setMessage("Gerente inicial creado. Ya puede iniciar sesion con el codigo de su empresa.");
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
      setError("La contrasena debe tener al menos 4 caracteres.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    const updated = onChangeUserPassword?.(passwordForm.userId, passwordForm.password);
    if (!updated) {
      setError("No se pudo cambiar la contrasena.");
      return;
    }

    setPasswordModalOpen(false);
    setMessage("Contrasena actualizada correctamente.");
  }

  function handleQuickAccess(item) {
    if (item.view) {
      onNavigate?.(item.view);
      return;
    }
    if (item.action === "newCompany") openCompanyModal();
    if (item.action === "newManager") openManagerModal();
    if (item.action === "modules") {
      setMessage("Use Editar en Empresas / Clientes para activar o desactivar modulos por empresa.");
    }
    if (item.action === "password") openPasswordModal(activeUser);
    if (item.action === "audit") setMessage("Auditoria preparada para registrar acciones globales con backend.");
    if (item.action === "backup") setMessage("Respaldos preparados; no se ejecuto ninguna restauracion peligrosa.");
  }

  function getCompanyUserCount(company) {
    return operationalUsers.filter((user) => {
      return user.empresaId === company.id || normalizeCompanyCode(user.codigoEmpresa) === company.codigoEmpresa;
    }).length;
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
              <p className="superadmin-kicker">Dueno del programa</p>
              <h1>Panel Superadmin</h1>
              <p>Control global de empresas, modulos, usuarios iniciales, seguridad y configuracion del sistema.</p>
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
                    <strong>{typeof card.value === "number" ? formatNumber(card.value) : card.value}</strong>
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
                  <h2>Centro multiempresa</h2>
                  <p>El Superadmin administra clientes; no participa en KPI ni evaluaciones internas.</p>
                </div>
                <span className="superadmin-pill">Control global</span>
              </div>
              <div className="superadmin-chart" aria-hidden="true">
                <span style={{ height: "40%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "52%" }} />
                <span style={{ height: "82%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "74%" }} />
                <span style={{ height: "48%" }} />
                <span style={{ height: "64%" }} />
              </div>
              <div className="superadmin-system-strip">
                <div>
                  <strong>{currentSystemName}</strong>
                  <span>Sistema global</span>
                </div>
                <div>
                  <strong style={{ color: primaryColor }}>{primaryColor}</strong>
                  <span>Color principal</span>
                </div>
                <div>
                  <strong>{config.visual?.tema || "Claro"}</strong>
                  <span>Tema activo</span>
                </div>
              </div>
            </article>

            <article className="superadmin-card">
              <div className="superadmin-card__header">
                <div>
                  <h2>Accesos rapidos</h2>
                  <p>Acciones de dueno del software.</p>
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
          <p>Diseñada para controlar empresas clientes, modulos activos y accesos iniciales.</p>
          <h3>CARACTERISTICAS</h3>
          <ul>
            <li><CheckCircle2 size={15} /> Gestion de empresas que usan el programa</li>
            <li><CheckCircle2 size={15} /> Activacion de modulos por empresa</li>
            <li><CheckCircle2 size={15} /> Creacion del gerente inicial por empresa</li>
            <li><CheckCircle2 size={15} /> Cambio de contrasenas administrativas</li>
            <li><CheckCircle2 size={15} /> Seguridad y auditoria global</li>
          </ul>
          <h3>NOTA</h3>
          <div className="superadmin-side-note">
            El Superadmin NO aparece como colaborador y NO es evaluado en ningun KPI.
          </div>
        </aside>
      </section>

      <section className="superadmin-grid">
        <article className={`superadmin-card superadmin-card--wide ${focusSection === "companies" ? "is-highlighted" : ""}`}>
          <div className="superadmin-card__header">
            <div>
              <h2>Empresas / Clientes</h2>
              <p>Cada empresa entra al programa con su propio codigo.</p>
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
                  <th>Codigo</th>
                  <th>Empresa</th>
                  <th>Tipo negocio</th>
                  <th>Estado</th>
                  <th>Modulos</th>
                  <th>Usuarios</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {systemCompanies.length ? (
                  systemCompanies.map((company) => (
                    <tr key={company.id || company.codigoEmpresa}>
                      <td>{company.codigoEmpresa || "-"}</td>
                      <td>{company.nombreEmpresa || company.nombre || "Sin nombre"}</td>
                      <td>{company.tipoNegocio || "Supermercado"}</td>
                      <td>
                        <span className={`superadmin-status ${company.estado !== "Activa" ? "is-off" : ""}`}>
                          {company.estado || "Activa"}
                        </span>
                      </td>
                      <td>{safeArray(company.modulosActivos).length}</td>
                      <td>{getCompanyUserCount(company)}</td>
                      <td>
                        <button className="text-button" type="button" onClick={() => openCompanyModal(company)}>
                          Editar
                        </button>
                        <button className="text-button" type="button" onClick={() => openManagerModal(company)}>
                          Gerente
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No hay empresas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Usuarios globales</h2>
              <p>Usuarios vinculados a empresas clientes.</p>
            </div>
            <button className="text-button" type="button" onClick={() => onNavigate?.("usuarios-roles")}>
              Abrir Usuarios
            </button>
          </div>
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Empresa</th>
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
                      <td>{isSuperadmin(user) ? "Sistema" : user.codigoEmpresa || "-"}</td>
                      <td>
                        <button className="text-button" type="button" onClick={() => openPasswordModal(user)}>
                          Cambiar clave
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
              <h2>Configuracion global</h2>
              <p>Identidad general del programa.</p>
            </div>
            <Palette size={20} />
          </div>
          <div className="superadmin-config-list">
            <div>
              <span>Nombre del sistema</span>
              <strong>{currentSystemName}</strong>
            </div>
            <div>
              <span>Logo configurado</span>
              <strong>{config.logoDataUrl || config.logoUrl ? "Disponible" : "Pendiente"}</strong>
            </div>
            <div>
              <span>Empresas activas</span>
              <strong>{formatNumber(activeCompanies)}</strong>
            </div>
            <div>
              <span>Modulos base</span>
              <strong>{formatNumber(DEFAULT_COMPANY_MODULES.length)}</strong>
            </div>
          </div>
        </article>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Auditoria del sistema</h2>
              <p>Historial preparado para trazabilidad global.</p>
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
              <p>Capa global del dueno del programa.</p>
            </div>
            <DatabaseBackup size={20} />
          </div>
          <ul className="superadmin-check-list">
            <li>Superadmin aislado de colaboradores y evaluaciones.</li>
            <li>Empresas guardadas en system_companies sin borrar datos.</li>
            <li>Usuarios de empresa entran con codigo + usuario + contrasena.</li>
          </ul>
          <button className="button button--ghost" type="button" onClick={() => openPasswordModal(activeUser)}>
            <Lock size={15} />
            Cambiar mi contrasena
          </button>
          <div className="superadmin-warning">
            Cambie la clave admin123 despues del primer acceso real.
          </div>
        </article>

        <article className="superadmin-card superadmin-card--future">
          <div className="superadmin-card__header">
            <div>
              <h2>Separacion multiempresa</h2>
              <p>La informacion operativa se filtra por empresa activa.</p>
            </div>
            <Building2 size={20} />
          </div>
          <div className="superadmin-company">
            <strong>{systemCompanies[0]?.codigoEmpresa || "SUPERMIX"}</strong>
            <span>Empresa base migrada</span>
          </div>
          <p className="superadmin-note">
            Los datos viejos se conservan y reciben empresaId/codigoEmpresa para no mezclarse con nuevas empresas.
          </p>
        </article>
      </section>

      <footer className="superadmin-footer-note">
        <ShieldCheck size={18} />
        <span>{getPermissionMessage()} aplica a usuarios no autorizados; el Superadmin no entra al flujo operativo.</span>
      </footer>

      {companyModalOpen ? (
        <Modal title={companyForm.id ? "Editar empresa" : "Nueva empresa"} onClose={() => setCompanyModalOpen(false)}>
          <form className="entity-form" onSubmit={saveCompany}>
            <div className="form-grid">
              <FormField field={{ name: "codigoEmpresa", label: "Codigo de empresa", required: true }} value={companyForm.codigoEmpresa} onChange={updateCompanyField} />
              <FormField field={{ name: "nombreEmpresa", label: "Nombre de empresa", required: true }} value={companyForm.nombreEmpresa} onChange={updateCompanyField} />
              <FormField field={{ name: "tipoNegocio", label: "Tipo de negocio", required: true }} value={companyForm.tipoNegocio} onChange={updateCompanyField} />
              <FormField field={{ name: "estado", label: "Estado", type: "select", options: ["Activa", "Suspendida", "Inactiva"], required: true }} value={companyForm.estado} onChange={updateCompanyField} />
              <FormField field={{ name: "rnc", label: "RNC" }} value={companyForm.rnc} onChange={updateCompanyField} />
              <FormField field={{ name: "telefono", label: "Telefono" }} value={companyForm.telefono} onChange={updateCompanyField} />
              <FormField field={{ name: "correo", label: "Correo" }} value={companyForm.correo} onChange={updateCompanyField} />
              <FormField field={{ name: "responsable", label: "Responsable" }} value={companyForm.responsable} onChange={updateCompanyField} />
              <FormField field={{ name: "modulosActivos", label: "Modulos activos", type: "multiselect", options: moduleOptions, help: "Use Ctrl/Cmd para seleccionar varios modulos." }} value={companyForm.modulosActivos} onChange={updateCompanyField} />
              <FormField field={{ name: "direccion", label: "Direccion", type: "textarea", rows: 2 }} value={companyForm.direccion} onChange={updateCompanyField} />
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

      {managerModalOpen ? (
        <Modal title="Crear gerente inicial" onClose={() => setManagerModalOpen(false)}>
          <form className="entity-form" onSubmit={saveManager}>
            <div className="form-grid">
              <FormField
                field={{
                  name: "companyId",
                  label: "Empresa",
                  type: "select",
                  required: true,
                  options: systemCompanies.map((company) => ({
                    value: company.id,
                    label: `${company.codigoEmpresa} - ${company.nombreEmpresa || company.nombre}`,
                  })),
                }}
                value={managerForm.companyId}
                onChange={updateManagerField}
              />
              <FormField field={{ name: "nombre", label: "Nombre del gerente", required: true }} value={managerForm.nombre} onChange={updateManagerField} />
              <FormField field={{ name: "usuario", label: "Usuario", required: true }} value={managerForm.usuario} onChange={updateManagerField} />
              <FormField field={{ name: "password", label: "Contrasena temporal", type: "password", required: true }} value={managerForm.password} onChange={updateManagerField} />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setManagerModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                <Save size={15} />
                Crear gerente
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {passwordModalOpen ? (
        <Modal title={`Cambiar contrasena - ${passwordForm.userName || "Usuario"}`} onClose={() => setPasswordModalOpen(false)}>
          <form className="entity-form" onSubmit={savePassword}>
            <div className="form-grid">
              <FormField
                field={{ name: "password", label: "Nueva contrasena", type: "password", required: true }}
                value={passwordForm.password}
                onChange={updatePasswordField}
              />
              <FormField
                field={{ name: "confirmPassword", label: "Confirmar contrasena", type: "password", required: true }}
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
                Guardar contrasena
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
