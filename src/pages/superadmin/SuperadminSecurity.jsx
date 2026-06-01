import { useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import FormField from "../../components/FormField";
import { SuperadminGuard, SuperadminHeader, SuperadminNotice, safeArray } from "./SuperadminShared";

const emptyPassword = {
  userId: "",
  password: "",
  confirmPassword: "",
};

export default function SuperadminSecurity({ activeUser, usuarios = [], onChangeUserPassword }) {
  const [form, setForm] = useState(emptyPassword);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const systemUsers = safeArray(usuarios).filter((user) => user.rol === "Superadmin");

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    if (!form.userId || !form.password) {
      setError("Seleccione usuario e indique una nueva contrasena.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    const ok = onChangeUserPassword?.(form.userId, form.password);
    if (!ok) {
      setError("No se pudo cambiar la contrasena.");
      return;
    }
    setForm(emptyPassword);
    setMessage("Contrasena actualizada correctamente.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Seguridad Global"
          subtitle="Control de acceso del dueno de la plataforma y reglas globales de seguridad."
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card superadmin-card--security">
            <div className="superadmin-card__header">
              <div>
                <h2>Cambiar contrasena Superadmin</h2>
                <p>Esta accion solo afecta usuarios Superadmin del sistema.</p>
              </div>
              <Lock size={20} />
            </div>
            <form className="form-grid" onSubmit={save}>
              <FormField
                field={{
                  name: "userId",
                  label: "Usuario Superadmin",
                  type: "select",
                  required: true,
                  options: systemUsers.map((user) => ({ value: user.id, label: `${user.nombre} (${user.usuario})` })),
                }}
                value={form.userId}
                onChange={updateField}
              />
              {[
                { name: "password", label: "Nueva contrasena", type: "password", required: true },
                { name: "confirmPassword", label: "Confirmar contrasena", type: "password", required: true },
              ].map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
              ))}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  <KeyRound size={16} /> Actualizar contrasena
                </button>
              </div>
            </form>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Reglas activas</h2>
                <p>Proteccion de separacion entre plataforma y empresas.</p>
              </div>
            </div>
            <ul className="superadmin-check-list">
              <li>Superadmin no aparece como colaborador.</li>
              <li>Superadmin no es evaluado en ningun KPI.</li>
              <li>Superadmin administra empresas, modulos, seguridad y respaldos.</li>
              <li>Usuarios de empresa solo entran con su codigo de empresa.</li>
              <li>Configuracion global no modifica la configuracion operativa de empresas.</li>
            </ul>
          </article>
        </section>
      </section>
    </SuperadminGuard>
  );
}
