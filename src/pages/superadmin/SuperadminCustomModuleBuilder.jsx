import { useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import FormField from "../../components/FormField";
import { normalizeCustomCompanyModule } from "../../services/companyModuleService";
import {
  EmptyState,
  StatusBadge,
  SuperadminGuard,
  SuperadminHeader,
  SuperadminNotice,
  safeArray,
} from "./SuperadminShared";

const initialForm = {
  empresaId: "",
  nombreModulo: "",
  descripcion: "",
  tipoModulo: "Control operativo",
  rolesPermitidos: ["Gerente"],
  estado: "Activo",
  camposTexto: "",
  indicadoresTexto: "",
};

export default function SuperadminCustomModuleBuilder({
  activeUser,
  companies = [],
  customCompanyModules = [],
  onSaveCustomCompanyModule,
}) {
  const safeCompanies = safeArray(companies);
  const [form, setForm] = useState({ ...initialForm, empresaId: safeCompanies[0]?.id || "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    return safeArray(customCompanyModules).map((module) => {
      const company = safeCompanies.find((item) => item.id === module.empresaId);
      return { ...module, companyName: company?.nombreEmpresa || module.codigoEmpresa || "Sin empresa" };
    });
  }, [customCompanyModules, safeCompanies]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    if (!form.empresaId || !form.nombreModulo.trim()) {
      setError("Empresa y nombre del modulo son obligatorios.");
      return;
    }
    const saved = onSaveCustomCompanyModule?.(normalizeCustomCompanyModule(form));
    if (!saved) return;
    setForm({ ...initialForm, empresaId: form.empresaId });
    setMessage("Modulo personalizado creado para la empresa.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Crear Módulo para Empresa"
          subtitle="Crea modulos personalizados visibles solo para una empresa y roles definidos."
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Nuevo modulo personalizado</h2>
                <p>Esta es una estructura base; el flujo final puede completarse luego.</p>
              </div>
              <Plus size={20} />
            </div>
            <form className="form-grid" onSubmit={save}>
              <FormField
                field={{
                  name: "empresaId",
                  label: "Empresa",
                  type: "select",
                  required: true,
                  options: safeCompanies.map((company) => ({
                    value: company.id,
                    label: `${company.codigoEmpresa} - ${company.nombreEmpresa}`,
                  })),
                }}
                value={form.empresaId}
                onChange={updateField}
              />
              {[
                { name: "nombreModulo", label: "Nombre modulo", required: true },
                { name: "tipoModulo", label: "Tipo modulo", type: "select", options: ["Control operativo", "Formulario", "Reporte", "Importador Excel", "Medible KPI"] },
                { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
                { name: "rolesPermitidos", label: "Roles permitidos", type: "multiselect", options: ["Gerente", "Subgerente", "Encargado"] },
                { name: "descripcion", label: "Descripcion", type: "textarea", rows: 2 },
                { name: "camposTexto", label: "Campos base", type: "textarea", rows: 4, help: "Un campo por linea." },
                { name: "indicadoresTexto", label: "Indicadores KPI", type: "textarea", rows: 4, help: "Un indicador por linea." },
              ].map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
              ))}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  <Save size={16} /> Guardar modulo
                </button>
              </div>
            </form>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Modulos creados</h2>
                <p>Inventario de modulos personalizados por empresa.</p>
              </div>
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Modulo</th>
                    <th>Tipo</th>
                    <th>Roles</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((module) => (
                    <tr key={module.id}>
                      <td>{module.companyName}</td>
                      <td>{module.nombreModulo}</td>
                      <td>{module.tipoModulo}</td>
                      <td>{safeArray(module.rolesPermitidos).join(", ") || "Todos"}</td>
                      <td><StatusBadge value={module.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length ? <EmptyState>No hay modulos personalizados creados.</EmptyState> : null}
            </div>
          </article>
        </section>
      </section>
    </SuperadminGuard>
  );
}
