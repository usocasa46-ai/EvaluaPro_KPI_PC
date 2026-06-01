import { useState } from "react";
import { Building2, KeyRound } from "lucide-react";
import { DEFAULT_COMPANY_MODULES, normalizeCompanyCode } from "../../services/companyService";
import FormField from "../../components/FormField";
import { SuperadminGuard, SuperadminHeader, SuperadminNotice, safeArray } from "./SuperadminShared";

const initialForm = {
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
  crearGerente: "Si",
  gerenteNombre: "",
  gerenteUsuario: "",
  gerentePassword: "1234",
  gerenteConfirmPassword: "1234",
};

export default function SuperadminCreateCompany({
  activeUser,
  companies = [],
  onSaveCompany,
  onCreateInitialCompanyManager,
  onNavigate,
}) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    const codigoEmpresa = normalizeCompanyCode(form.codigoEmpresa);
    if (!codigoEmpresa || !form.nombreEmpresa.trim()) {
      setError("Codigo y nombre de empresa son obligatorios.");
      return;
    }
    const duplicate = safeArray(companies).some(
      (company) => normalizeCompanyCode(company.codigoEmpresa) === codigoEmpresa
    );
    if (duplicate) {
      setError("Ya existe una empresa con ese codigo.");
      return;
    }
    if (form.crearGerente === "Si") {
      if (!form.gerenteNombre.trim() || !form.gerenteUsuario.trim() || !form.gerentePassword) {
        setError("Complete los datos del gerente inicial.");
        return;
      }
      if (form.gerentePassword !== form.gerenteConfirmPassword) {
        setError("Las contrasenas del gerente no coinciden.");
        return;
      }
    }

    const company = onSaveCompany?.({
      codigoEmpresa,
      nombreEmpresa: form.nombreEmpresa,
      tipoNegocio: form.tipoNegocio,
      estado: form.estado,
      rnc: form.rnc,
      direccion: form.direccion,
      telefono: form.telefono,
      correo: form.correo,
      responsable: form.responsable,
      plan: form.plan,
      observacion: form.observacion,
      modulosActivos: DEFAULT_COMPANY_MODULES,
    });

    if (!company) return;
    if (form.crearGerente === "Si") {
      const manager = onCreateInitialCompanyManager?.({
        companyId: company.id,
        company,
        nombre: form.gerenteNombre,
        usuario: form.gerenteUsuario,
        password: form.gerentePassword,
        confirmPassword: form.gerenteConfirmPassword,
        estado: "Activo",
      });
      if (!manager) {
        setMessage("Empresa creada. El gerente inicial queda pendiente.");
        setForm({ ...initialForm, codigoEmpresa: "", nombreEmpresa: "" });
        return;
      }
    }

    setMessage("Empresa creada correctamente.");
    setForm(initialForm);
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Crear Empresa"
          subtitle="Registra una empresa cliente y su gerente inicial para que pueda entrar al sistema."
          actions={
            <button className="btn btn-light" type="button" onClick={() => onNavigate?.("empresasSucursales")}>
              Ver empresas
            </button>
          }
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Datos de empresa</h2>
              <p>Estos datos pertenecen al cliente, no a la configuracion operativa interna.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={save}>
            {[
              { name: "codigoEmpresa", label: "Codigo de empresa", required: true },
              { name: "nombreEmpresa", label: "Nombre de empresa", required: true },
              { name: "tipoNegocio", label: "Tipo de negocio" },
              { name: "estado", label: "Estado", type: "select", options: ["Activa", "Inactiva", "Suspendida"] },
              { name: "rnc", label: "RNC" },
              { name: "telefono", label: "Telefono" },
              { name: "correo", label: "Correo" },
              { name: "direccion", label: "Direccion" },
              { name: "responsable", label: "Responsable" },
              { name: "plan", label: "Plan" },
              { name: "observacion", label: "Observacion", type: "textarea", rows: 2 },
            ].map((field) => (
              <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
            ))}

            <div className="content-panel form-field--wide">
              <div className="panel-heading">
                <div>
                  <h2>Gerente inicial</h2>
                  <span>Este usuario administra la empresa por dentro. No es Superadmin.</span>
                </div>
              </div>
              <div className="form-grid">
                <FormField
                  field={{ name: "crearGerente", label: "Crear gerente ahora", type: "select", options: ["Si", "No"] }}
                  value={form.crearGerente}
                  onChange={updateField}
                />
                {form.crearGerente === "Si"
                  ? [
                      { name: "gerenteNombre", label: "Nombre gerente", required: true },
                      { name: "gerenteUsuario", label: "Usuario gerente", required: true },
                      { name: "gerentePassword", label: "Contrasena", type: "password", required: true },
                      { name: "gerenteConfirmPassword", label: "Confirmar contrasena", type: "password", required: true },
                    ].map((field) => (
                      <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
                    ))
                  : null}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                <Building2 size={16} /> Crear empresa
              </button>
              <button className="btn btn-light" type="button" onClick={() => onNavigate?.("superadminGerenteInicial")}>
                <KeyRound size={16} /> Gerente despues
              </button>
            </div>
          </form>
        </article>
      </section>
    </SuperadminGuard>
  );
}
