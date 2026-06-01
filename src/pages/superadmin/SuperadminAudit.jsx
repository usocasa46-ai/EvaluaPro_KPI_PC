import { useMemo } from "react";
import { Activity } from "lucide-react";
import { STORAGE_KEYS, readStorage } from "../../services/storageService";
import {
  EmptyState,
  SuperadminGuard,
  SuperadminHeader,
  formatDateTime,
  safeArray,
} from "./SuperadminShared";

function readAuditRows() {
  const preferred = readStorage("system_audit_log", []);
  const legacy = readStorage("audit_log", []);
  return safeArray(preferred).length ? safeArray(preferred) : safeArray(legacy);
}

export default function SuperadminAudit({ activeUser, companies = [], usuarios = [] }) {
  const rows = useMemo(() => readAuditRows(), []);
  const storageSnapshot = [
    { clave: STORAGE_KEYS.companies, descripcion: "Empresas / clientes" },
    { clave: STORAGE_KEYS.usuarios, descripcion: "Usuarios del sistema" },
    { clave: STORAGE_KEYS.globalSettings, descripcion: "Configuracion global" },
    { clave: STORAGE_KEYS.availableSystemModules, descripcion: "Catalogo global de modulos" },
    { clave: STORAGE_KEYS.customCompanyModules, descripcion: "Modulos personalizados por empresa" },
  ];

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Auditoría Global"
          subtitle="Revision de actividad global y claves administrativas de la plataforma."
        />

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Historial de auditoria</h2>
                <p>Cuando exista backend, esta vista se alimentara de logs persistentes.</p>
              </div>
              <Activity size={20} />
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Modulo</th>
                    <th>Accion</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{formatDateTime(row.fecha || row.createdAt)}</td>
                      <td>{row.usuario || row.creadoPorNombre || row.user || ""}</td>
                      <td>{row.modulo || row.module || ""}</td>
                      <td>{row.accion || row.action || ""}</td>
                      <td>{row.detalle || row.detail || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length ? <EmptyState>No hay eventos de auditoria global registrados.</EmptyState> : null}
            </div>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Mapa de datos globales</h2>
                <p>Claves administrativas que no pertenecen a una empresa operativa.</p>
              </div>
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Clave localStorage</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {storageSnapshot.map((item) => (
                    <tr key={item.clave}>
                      <td>{item.clave}</td>
                      <td>{item.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="superadmin-note">
              Empresas: {safeArray(companies).length}. Usuarios: {safeArray(usuarios).length}.
            </p>
          </article>
        </section>
      </section>
    </SuperadminGuard>
  );
}
