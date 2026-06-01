import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { MODULES } from "../../services/permissionsService";
import { SYSTEM_MODULE_CATALOG } from "../../services/companyModuleService";
import FormField from "../../components/FormField";
import {
  EmptyState,
  StatusBadge,
  SuperadminGuard,
  SuperadminHeader,
  SuperadminNotice,
  safeArray,
} from "./SuperadminShared";

function moduleLabel(moduleId, systemModules = []) {
  return (
    systemModules.find((module) => module.id === moduleId)?.nombre ||
    MODULES.find((module) => module.id === moduleId)?.label ||
    moduleId
  );
}

export default function SuperadminCompanyModules({
  activeUser,
  companies = [],
  systemModules = SYSTEM_MODULE_CATALOG,
  onSaveCompany,
}) {
  const safeCompanies = safeArray(companies);
  const availableModules = safeArray(systemModules).filter((module) => module.estado !== "Inactivo");
  const [companyId, setCompanyId] = useState(safeCompanies[0]?.id || "");
  const selectedCompany = useMemo(
    () => safeCompanies.find((company) => company.id === companyId) || safeCompanies[0] || null,
    [safeCompanies, companyId]
  );
  const [selection, setSelection] = useState(() => safeArray(selectedCompany?.modulosActivos));
  const [message, setMessage] = useState("");

  function selectCompany(name, value) {
    const company = safeCompanies.find((item) => item.id === value);
    setCompanyId(value);
    setSelection(safeArray(company?.modulosActivos));
    setMessage("");
  }

  function toggle(moduleId) {
    setSelection((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
    );
  }

  function save() {
    if (!selectedCompany) return;
    onSaveCompany?.({ ...selectedCompany, modulosActivos: selection });
    setMessage("Modulos de la empresa actualizados.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Módulos por Empresa"
          subtitle="Define que modulos ve cada cliente dentro de su propia empresa."
        />
        <SuperadminNotice>{message}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Seleccionar empresa</h2>
                <p>La activacion de modulos aplica solo a la empresa seleccionada.</p>
              </div>
            </div>
            <FormField
              field={{
                name: "companyId",
                label: "Empresa",
                type: "select",
                options: safeCompanies.map((company) => ({
                  value: company.id,
                  label: `${company.codigoEmpresa} - ${company.nombreEmpresa}`,
                })),
              }}
              value={selectedCompany?.id || ""}
              onChange={selectCompany}
            />
            {selectedCompany ? (
              <div className="superadmin-system-strip">
                <div>
                  <strong>{selectedCompany.nombreEmpresa}</strong>
                  <span>{selectedCompany.codigoEmpresa}</span>
                </div>
                <div>
                  <strong>{selection.length}</strong>
                  <span>Modulos activos</span>
                </div>
                <div>
                  <strong>{selectedCompany.estado}</strong>
                  <span>Estado empresa</span>
                </div>
              </div>
            ) : (
              <EmptyState>No hay empresas registradas.</EmptyState>
            )}
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Resumen empresas</h2>
                <p>Control rapido de cobertura por cliente.</p>
              </div>
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Modulos</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.nombreEmpresa}</td>
                      <td>{safeArray(company.modulosActivos).length}</td>
                      <td><StatusBadge value={company.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Modulos disponibles</h2>
              <p>Marca los modulos que podra usar la empresa seleccionada.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={save} disabled={!selectedCompany}>
              <Save size={16} /> Guardar seleccion
            </button>
          </div>
          <div className="superadmin-module-grid">
            {availableModules.map((module) => (
              <label className="superadmin-module-option" key={module.id}>
                <input
                  type="checkbox"
                  checked={selection.includes(module.id)}
                  onChange={() => toggle(module.id)}
                />
                <span>
                  <strong>{moduleLabel(module.id, availableModules)}</strong>
                  <small>{module.tipo}</small>
                </span>
              </label>
            ))}
          </div>
          {!availableModules.length ? <EmptyState>No hay modulos activos en el catalogo global.</EmptyState> : null}
        </article>
      </section>
    </SuperadminGuard>
  );
}
