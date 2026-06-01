import { useMemo, useState } from "react";
import { Building2, Edit3, KeyRound, Plus } from "lucide-react";
import { DEFAULT_COMPANY_MODULES, normalizeCompanyCode } from "../../services/companyService";
import FormField from "../../components/FormField";
import Modal from "../../components/Modal";
import {
  EmptyState,
  StatusBadge,
  SuperadminGuard,
  SuperadminHeader,
  SuperadminNotice,
  getCompanyManagers,
  getCompanyUsers,
  safeArray,
} from "./SuperadminShared";

const emptyCompany = {
  codigoEmpresa: "",
  nombreEmpresa: "",
  tipoNegocio: "Supermercado",
  estado: "Activa",
  rnc: "",
  direccion: "",
  telefono: "",
  correo: "",
  responsable: "",
  plan: "Local",
  observacion: "",
  modulosActivos: DEFAULT_COMPANY_MODULES,
};

const emptyManager = {
  companyId: "",
  nombre: "",
  usuario: "",
  password: "1234",
  confirmPassword: "1234",
  estado: "Activo",
};

export default function SuperadminCompanies({
  activeUser,
  companies = [],
  usuarios = [],
  onSaveCompany,
  onCreateInitialCompanyManager,
  onNavigate,
}) {
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [managerForm, setManagerForm] = useState(emptyManager);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const safeCompanies = safeArray(companies);
  const safeUsers = safeArray(usuarios);

  const companyRows = useMemo(
    () =>
      safeCompanies.map((company) => ({
        ...company,
        users: getCompanyUsers(company, safeUsers),
        managers: getCompanyManagers(company, safeUsers),
      })),
    [safeCompanies, safeUsers]
  );

  function updateCompanyField(name, value) {
    setCompanyForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function updateManagerField(name, value) {
    setManagerForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  }

  function openCompany(company) {
    setCompanyForm(company ? { ...emptyCompany, ...company } : emptyCompany);
    setCompanyModalOpen(true);
    setError("");
    setMessage("");
  }

  function openManager(company) {
    setManagerForm({ ...emptyManager, companyId: company?.id || "" });
    setManagerModalOpen(true);
    setError("");
    setMessage("");
  }

  function saveCompany(event) {
    event.preventDefault();
    const codigoEmpresa = normalizeCompanyCode(companyForm.codigoEmpresa);
    if (!codigoEmpresa || !companyForm.nombreEmpresa?.trim()) {
      setError("Codigo y nombre de empresa son obligatorios.");
      return;
    }
    const duplicate = safeCompanies.some((company) => {
      return company.id !== companyForm.id && normalizeCompanyCode(company.codigoEmpresa) === codigoEmpresa;
    });
    if (duplicate) {
      setError("Ya existe una empresa con ese codigo.");
      return;
    }

    const saved = onSaveCompany?.({ ...companyForm, codigoEmpresa });
    if (!saved) return;
    setCompanyModalOpen(false);
    setMessage("Empresa guardada correctamente.");
  }

  function saveManager(event) {
    event.preventDefault();
    if (!managerForm.companyId || !managerForm.nombre.trim() || !managerForm.usuario.trim() || !managerForm.password) {
      setError("Empresa, nombre, usuario y contrasena son obligatorios.");
      return;
    }
    if (managerForm.password !== managerForm.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    const saved = onCreateInitialCompanyManager?.(managerForm);
    if (!saved) return;
    setManagerModalOpen(false);
    setMessage("Gerente inicial creado correctamente.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Empresas / Clientes"
          subtitle="Administra las empresas que usan EvaluaPro KPI."
          actions={
            <>
              <button className="btn btn-light" type="button" onClick={() => onNavigate?.("superadminCrearEmpresa")}>
                <Plus size={16} /> Crear empresa
              </button>
            </>
          }
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Empresas registradas</h2>
              <p>El Superadmin controla acceso, estado y gerente inicial.</p>
            </div>
          </div>
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Tipo</th>
                  <th>Gerente inicial</th>
                  <th>Usuarios</th>
                  <th>Modulos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companyRows.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="superadmin-company-cell">
                        <strong>{company.nombreEmpresa || company.nombre}</strong>
                        <span>{company.rnc || "Sin RNC"}</span>
                      </div>
                    </td>
                    <td>{company.codigoEmpresa}</td>
                    <td>{company.tipoNegocio}</td>
                    <td>{company.managers[0]?.nombre || "Pendiente"}</td>
                    <td>{company.users.length}</td>
                    <td>{safeArray(company.modulosActivos).length}</td>
                    <td><StatusBadge value={company.estado} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-light btn-sm" type="button" onClick={() => openCompany(company)}>
                          <Edit3 size={14} /> Editar
                        </button>
                        <button className="btn btn-light btn-sm" type="button" onClick={() => openManager(company)}>
                          <KeyRound size={14} /> Gerente
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!companyRows.length ? <EmptyState>No hay empresas registradas.</EmptyState> : null}
          </div>
        </article>
      </section>

      <Modal open={companyModalOpen} title={companyForm.id ? "Editar empresa" : "Crear empresa"} onClose={() => setCompanyModalOpen(false)}>
        <form className="form-grid" onSubmit={saveCompany}>
          {[
            { name: "codigoEmpresa", label: "Codigo empresa", required: true },
            { name: "nombreEmpresa", label: "Nombre empresa", required: true },
            { name: "tipoNegocio", label: "Tipo negocio" },
            { name: "estado", label: "Estado", type: "select", options: ["Activa", "Inactiva", "Suspendida"] },
            { name: "rnc", label: "RNC" },
            { name: "telefono", label: "Telefono" },
            { name: "correo", label: "Correo" },
            { name: "direccion", label: "Direccion" },
            { name: "responsable", label: "Responsable" },
            { name: "plan", label: "Plan" },
            { name: "observacion", label: "Observacion", type: "textarea", rows: 2 },
          ].map((field) => (
            <FormField key={field.name} field={field} value={companyForm[field.name]} onChange={updateCompanyField} />
          ))}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              <Building2 size={16} /> Guardar empresa
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={managerModalOpen} title="Crear gerente inicial" onClose={() => setManagerModalOpen(false)}>
        <form className="form-grid" onSubmit={saveManager}>
          <FormField
            field={{
              name: "companyId",
              label: "Empresa",
              type: "select",
              required: true,
              options: safeCompanies.map((company) => ({ value: company.id, label: `${company.codigoEmpresa} - ${company.nombreEmpresa}` })),
            }}
            value={managerForm.companyId}
            onChange={updateManagerField}
          />
          {[
            { name: "nombre", label: "Nombre gerente", required: true },
            { name: "usuario", label: "Usuario", required: true },
            { name: "password", label: "Contrasena", type: "password", required: true },
            { name: "confirmPassword", label: "Confirmar contrasena", type: "password", required: true },
            { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
          ].map((field) => (
            <FormField key={field.name} field={field} value={managerForm[field.name]} onChange={updateManagerField} />
          ))}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              <KeyRound size={16} /> Crear gerente
            </button>
          </div>
        </form>
      </Modal>
    </SuperadminGuard>
  );
}
