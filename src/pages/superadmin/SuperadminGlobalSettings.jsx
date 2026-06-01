import { useEffect, useState } from "react";
import { Save, Settings } from "lucide-react";
import FormField from "../../components/FormField";
import { DEFAULT_GLOBAL_SETTINGS, normalizeGlobalSettings } from "../../services/globalSettingsService";
import { SuperadminGuard, SuperadminHeader, SuperadminNotice } from "./SuperadminShared";

export default function SuperadminGlobalSettings({ activeUser, globalSettings, onSaveGlobalSettings }) {
  const [form, setForm] = useState(() => normalizeGlobalSettings(globalSettings || DEFAULT_GLOBAL_SETTINGS));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(normalizeGlobalSettings(globalSettings || DEFAULT_GLOBAL_SETTINGS));
  }, [globalSettings]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  function save(event) {
    event.preventDefault();
    const saved = onSaveGlobalSettings?.(form);
    if (saved) setMessage("Configuracion global guardada correctamente.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Configuración Global"
          subtitle="Parametros generales de la plataforma, separados de la configuracion de cada empresa."
        />
        <SuperadminNotice>{message}</SuperadminNotice>

        <article className="superadmin-card">
          <div className="superadmin-card__header">
            <div>
              <h2>Datos globales del sistema</h2>
              <p>Estos valores se usan en login, panel Superadmin y gobierno global.</p>
            </div>
            <Settings size={20} />
          </div>
          <form className="form-grid" onSubmit={save}>
            {[
              { name: "platformName", label: "Nombre plataforma", required: true },
              { name: "version", label: "Version" },
              { name: "defaultTheme", label: "Tema global", type: "select", options: ["Claro", "Oscuro"] },
              { name: "maintenanceStatus", label: "Estado mantenimiento", type: "select", options: ["Operativa", "Mantenimiento", "Bloqueada"] },
              { name: "globalMessage", label: "Mensaje global", type: "textarea", rows: 2 },
              { name: "securityPolicy", label: "Politica de seguridad", type: "textarea", rows: 3 },
              { name: "backupPolicy", label: "Politica de respaldos", type: "textarea", rows: 3 },
            ].map((field) => (
              <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
            ))}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                <Save size={16} /> Guardar configuracion global
              </button>
            </div>
          </form>
        </article>
      </section>
    </SuperadminGuard>
  );
}
