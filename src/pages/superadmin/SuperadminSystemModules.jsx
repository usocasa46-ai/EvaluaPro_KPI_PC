import { useState } from "react";
import { Network, Plus } from "lucide-react";
import FormField from "../../components/FormField";
import { normalizeSystemModule } from "../../services/companyModuleService";
import {
  EmptyState,
  StatusBadge,
  SuperadminGuard,
  SuperadminHeader,
  SuperadminNotice,
  safeArray,
} from "./SuperadminShared";

const emptyModule = {
  id: "",
  nombre: "",
  tipo: "Modulo",
  estado: "Activo",
  descripcion: "",
};

export default function SuperadminSystemModules({ activeUser, systemModules = [], onSaveSystemModules }) {
  const [form, setForm] = useState(emptyModule);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const modules = safeArray(systemModules);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    const id = String(form.id || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || !form.nombre.trim()) {
      setError("ID y nombre del modulo son obligatorios.");
      return;
    }
    const saved = normalizeSystemModule({ ...form, id });
    const exists = modules.some((module) => module.id === saved.id);
    const next = exists ? modules.map((module) => (module.id === saved.id ? saved : module)) : [...modules, saved];
    onSaveSystemModules?.(next);
    setForm(emptyModule);
    setMessage("Catalogo global actualizado.");
  }

  function toggle(moduleId) {
    const next = modules.map((module) =>
      module.id === moduleId
        ? { ...module, estado: module.estado === "Inactivo" ? "Activo" : "Inactivo", updatedAt: new Date().toISOString() }
        : module
    );
    onSaveSystemModules?.(next);
    setMessage("Estado global del modulo actualizado.");
  }

  return (
    <SuperadminGuard activeUser={activeUser}>
      <section className="page-shell superadmin-panel">
        <SuperadminHeader
          title="Módulos del Sistema"
          subtitle="Catalogo global de modulos que el Superadmin puede habilitar por empresa."
        />
        <SuperadminNotice>{message}</SuperadminNotice>
        <SuperadminNotice type="error">{error}</SuperadminNotice>

        <section className="superadmin-layout">
          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Catalogo global</h2>
                <p>Desactivar un modulo evita que se asigne a nuevas empresas.</p>
              </div>
            </div>
            <div className="superadmin-table-wrap">
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Modulo</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.id}>
                      <td>{module.id}</td>
                      <td>
                        <strong>{module.nombre}</strong>
                        {module.descripcion ? <span className="superadmin-note">{module.descripcion}</span> : null}
                      </td>
                      <td>{module.tipo}</td>
                      <td><StatusBadge value={module.estado} /></td>
                      <td>
                        <button className="btn btn-light btn-sm" type="button" onClick={() => toggle(module.id)}>
                          {module.estado === "Inactivo" ? "Activar" : "Desactivar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!modules.length ? <EmptyState>No hay modulos del sistema registrados.</EmptyState> : null}
            </div>
          </article>

          <article className="superadmin-card">
            <div className="superadmin-card__header">
              <div>
                <h2>Crear modulo global</h2>
                <p>Base disponible para asignar a empresas.</p>
              </div>
              <Network size={20} />
            </div>
            <form className="form-grid" onSubmit={save}>
              {[
                { name: "id", label: "ID tecnico", required: true, help: "Ejemplo: controlInventario" },
                { name: "nombre", label: "Nombre visible", required: true },
                { name: "tipo", label: "Tipo" },
                { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
                { name: "descripcion", label: "Descripcion", type: "textarea", rows: 3 },
              ].map((field) => (
                <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} />
              ))}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  <Plus size={16} /> Guardar modulo
                </button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </SuperadminGuard>
  );
}
