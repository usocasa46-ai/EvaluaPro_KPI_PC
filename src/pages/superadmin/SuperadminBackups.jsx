import { DatabaseBackup, Download } from "lucide-react";
import { STORAGE_KEYS, readStorage } from "../../services/storageService";
import { SuperadminGuard, SuperadminHeader, SuperadminNotice, formatDateTime } from "./SuperadminShared";
import { useState } from "react";

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SuperadminBackups({ activeUser }) {
  const [message, setMessage] = useState("");

  function exportBackup() {
    const createdAt = new Date().toISOString();
    const backup = {
      tipo: "superadmin-global-backup",
      createdAt,
      keys: {
        [STORAGE_KEYS.companies]: readStorage(STORAGE_KEYS.companies, []),
        [STORAGE_KEYS.usuarios]: readStorage(STORAGE_KEYS.usuarios, []),
        [STORAGE_KEYS.globalSettings]: readStorage(STORAGE_KEYS.globalSettings, {}),
        [STORAGE_KEYS.availableSystemModules]: readStorage(STORAGE_KEYS.availableSystemModules, []),
        [STORAGE_KEYS.customCompanyModules]: readStorage(STORAGE_KEYS.customCompanyModules, []),
        [STORAGE_KEYS.companySettings]: readStorage(STORAGE_KEYS.companySettings, {}),
      },
    };
    downloadJson(`evalupro-superadmin-backup-${createdAt.slice(0, 10)}.json`, backup);
    setMessage("Respaldo global exportado.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Respaldos Globales"
          subtitle="Exporta configuracion global, empresas, usuarios y modulos personalizados."
        />
        <SuperadminNotice>{message}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Exportar respaldo</h2>
                <p>Genera un archivo JSON con datos globales de administracion.</p>
              </div>
              <DatabaseBackup size={22} />
            </div>
            <p className="superadmin-note">
              Incluye empresas, usuarios, configuracion global, modulos globales, modulos por empresa y
              configuraciones por empresa. No elimina ni modifica datos.
            </p>
            <div className="form-actions">
              <button className="btn btn-primary" type="button" onClick={exportBackup}>
                <Download size={16} /> Descargar respaldo global
              </button>
            </div>
          </article>

          <article className="superadmin-card superadmin-card--future">
            <div className="superadmin-card__header">
              <div>
                <h2>Estado de respaldo</h2>
                <p>Base local preparada para evolucionar a backend.</p>
              </div>
            </div>
            <div className="superadmin-config-list">
              <div>
                <strong>Ultima accion</strong>
                <span>{message ? formatDateTime(new Date().toISOString()) : "Sin exportacion en esta sesion"}</span>
              </div>
              <div>
                <strong>Restauracion automatica</strong>
                <span>Pendiente de backend seguro. No se ejecuta desde esta pantalla.</span>
              </div>
              <div>
                <strong>Proteccion</strong>
                <span>No usa localStorage.clear() ni borra registros existentes.</span>
              </div>
            </div>
          </article>
        </section>
      </section>
    </SuperadminGuard>
  );
}
