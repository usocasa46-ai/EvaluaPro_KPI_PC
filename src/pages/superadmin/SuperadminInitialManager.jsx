import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import FormField from "../../components/FormField";
import {
  EmptyState,
  StatusBadge,
  SuperadminGuard,
  SuperadminHeader,
  SuperadminNotice,
  getCompanyManagers,
  safeArray,
} from "./SuperadminShared";

const emptyForm = {
  companyId: "",
  nombre: "",
  usuario: "",
  password: "1234",
  confirmPassword: "1234",
  estado: "Activo",
};

export default function SuperadminInitialManager({
  activeUser,
  companies = [],
  usuarios = [],
  onCreateInitialCompanyManager,
}) {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    return safeArray(companies).map((company) => {
      const managers = getCompanyManagers(company, usuarios);
      return { ...company, manager: managers[0] || null };
    });
  }, [companies, usuarios]);

  const pendingCompanies = rows.filter((company) => !company.manager);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    if (!form.companyId || !form.nombre.trim() || !form.usuario.trim() || !form.password) {
      setError("Empresa, nombre, usuario y contrasena son obligatorios.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    const saved = onCreateInitialCompanyManager?.(form);
    if (!saved) return;
    setForm(emptyForm);
    setMessage("Gerente inicial creado correctamente.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Gerente Inicial por Empresa"
          subtitle="Crea el primer gerente que administrara cada empresa dentro de la plataforma."
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Crear gerente inicial</h2>
                <p>Solo aplica a usuarios de empresa. No crea usuarios Superadmin.</p>
              </div>
            </div>
            <form className="form-grid" onSubmit={save}>
              <FormField
                field={{
                  name: "companyId",
                  label: "Empresa",
                  type: "select",
                  required: true,
                  options: safeArray(companies).map((company) => ({
                    value: company.id,
                    label: `${company.codigoEmpresa} - ${company.nombreEmpresa}`,
                  })),
                }}
                value={form.companyId}
                onChange={updateField}
              />
              {[
                { name: "nombre", label: "Nombre gerente", required: true },
                { name: "usuario", label: "Usuario", required: true },
                { name: "password", label: "Contrasena", type: "password", required: true },
                { name: "confirmPassword", label: "Confirmar contrasena", type: "password", required: true },
                { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
              ].map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
              ))}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  <KeyRound size={16} /> Crear gerente inicial
                </button>
              </div>
            </form>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Empresas sin gerente</h2>
                <p>Estas empresas todavia no pueden operar con gerente propio.</p>
              </div>
            </div>
            <ul className="superadmin-activity-list">
              {pendingCompanies.map((company) => (
                <li key={company.id}>
                  <strong>{company.nombreEmpresa}</strong>
                  <span>{company.codigoEmpresa} - pendiente de gerente inicial</span>
                </li>
              ))}
            </ul>
            {!pendingCompanies.length ? <EmptyState>Todas las empresas tienen gerente inicial.</EmptyState> : null}
          </article>
        </section>

        <article className="superadmin-card">
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Gerente inicial</th>
                  <th>Usuario</th>
                  <th>Estado empresa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((company) => (
                  <tr key={company.id}>
                    <td>{company.nombreEmpresa}</td>
                    <td>{company.codigoEmpresa}</td>
                    <td>{company.manager?.nombre || "Pendiente"}</td>
                    <td>{company.manager?.usuario || ""}</td>
                    <td><StatusBadge value={company.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </SuperadminGuard>
  );
}
