import { useState } from "react";
import { Edit3, Plus, Power, RotateCcw } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import { canAccessUserManagement, getPermissionMessage } from "../services/permissionsService";

const initialForm = {
  nombre: "",
  usuario: "",
  password: "1234",
  rol: "Encargado",
  areaAsignada: "",
  areasSupervisadas: [],
  encargadoId: "",
  subgerenteId: "",
  colaboradorId: "",
  estado: "Activo",
};

function normalizeUserForm(form) {
  return {
    ...form,
    areaAsignada: form.rol === "Encargado" ? form.areaAsignada : "",
    areasSupervisadas: form.rol === "Subgerente" ? form.areasSupervisadas || [] : [],
    areasAsignadas: form.rol === "Subgerente" ? form.areasSupervisadas || [] : [],
    encargadoId: form.rol === "Encargado" ? form.encargadoId || "" : "",
    subgerenteId: form.rol === "Subgerente" ? form.subgerenteId || "" : "",
    colaboradorId: form.rol === "Encargado" ? form.colaboradorId || "" : "",
  };
}

export default function UsuariosRoles({
  usuarios,
  areas,
  encargados = [],
  subgerentes = [],
  colaboradores = [],
  activeUser,
  canCreate,
  onSave,
  onToggleStatus,
  onResetOperationalData,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const canView = canAccessUserManagement(activeUser);

  if (!canView) {
    return (
      <section className="page-shell">
        <div className="permission-card">{getPermissionMessage()}</div>
      </section>
    );
  }

  function openCreate() {
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(user) {
    setForm({
      ...initialForm,
      ...user,
      password: user.password || "1234",
      areasSupervisadas: user.areasSupervisadas || user.areasAsignadas || [],
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    if (!form.nombre || !form.usuario || !form.password || !form.rol) {
      setError("Nombre, usuario, contraseña y rol son obligatorios.");
      return;
    }
    if (form.rol === "Encargado" && !form.areaAsignada) {
      setError("El encargado debe tener un área asignada.");
      return;
    }
    if (form.rol === "Subgerente" && !form.areasSupervisadas?.length) {
      setError("El subgerente debe tener áreas supervisadas.");
      return;
    }

    onSave(normalizeUserForm(form));
    setModalOpen(false);
  }

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Usuarios y Roles</h1>
          <p>Administración de login, roles y alcance operativo por área.</p>
        </div>
        <div className="module-actions">
          {canCreate ? (
            <>
              <button className="button button--ghost" type="button" onClick={onResetOperationalData}>
                <RotateCcw size={16} />
                Reiniciar datos operativos
              </button>
              <button className="button button--primary" type="button" onClick={openCreate}>
                <Plus size={16} />
                Nuevo usuario
              </button>
            </>
          ) : null}
        </div>
      </header>

      <section className="content-panel">
        <DataTable
          rows={usuarios}
          columns={[
            { key: "nombre", label: "Nombre" },
            { key: "usuario", label: "Usuario" },
            { key: "rol", label: "Rol" },
            { key: "areaAsignada", label: "Área asignada" },
            { key: "areasSupervisadas", label: "Áreas supervisadas", render: (row) => row.areasSupervisadas || row.areasAsignadas || [] },
            { key: "estado", label: "Estado" },
            {
      key: "acciones",
              label: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" type="button" onClick={() => openEdit(row)}>
                    <Edit3 size={13} />
                    Editar
                  </button>
                  <button className="text-button" type="button" onClick={() => onToggleStatus(row.id)}>
                    <Power size={13} />
                    {row.estado === "Inactivo" ? "Activar" : "Inactivar"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {modalOpen ? (
        <Modal title={form.id ? "Editar usuario" : "Nuevo usuario"} onClose={() => setModalOpen(false)}>
          <form className="entity-form" onSubmit={submit}>
            <div className="form-grid">
              <FormField field={{ name: "nombre", label: "Nombre", required: true }} value={form.nombre} onChange={updateForm} />
              <FormField field={{ name: "usuario", label: "Usuario", required: true }} value={form.usuario} onChange={updateForm} />
              <FormField
                field={{ name: "password", label: "Contraseña", type: "password", required: true }}
                value={form.password}
                onChange={updateForm}
              />
              <FormField
                field={{ name: "rol", label: "Rol", type: "select", required: true, options: ["Gerente", "Subgerente", "Encargado"] }}
                value={form.rol}
                onChange={updateForm}
              />
              {form.rol === "Encargado" ? (
                <FormField
                  field={{ name: "areaAsignada", label: "Área asignada", type: "select", required: true, options: areas.map((area) => area.nombre) }}
                  value={form.areaAsignada}
                  onChange={updateForm}
                />
              ) : null}
              {form.rol === "Encargado" ? (
                <FormField
                  field={{
                    name: "encargadoId",
                    label: "Encargado asociado",
                    type: "select",
                    options: [
                      { value: "", label: "Sin vincular" },
                      ...encargados
                        .filter((encargado) => !form.areaAsignada || encargado.area === form.areaAsignada || encargado.areaNombre === form.areaAsignada)
                        .map((encargado) => ({ value: encargado.id, label: encargado.nombre })),
                    ],
                  }}
                  value={form.encargadoId}
                  onChange={updateForm}
                />
              ) : null}
              {form.rol === "Encargado" ? (
                <FormField
                  field={{
                    name: "colaboradorId",
                    label: "Colaborador asociado",
                    type: "select",
                    options: [
                      { value: "", label: "Sin vincular" },
                      ...colaboradores
                        .filter((colaborador) => !form.areaAsignada || colaborador.area === form.areaAsignada || colaborador.areaNombre === form.areaAsignada)
                        .map((colaborador) => ({ value: colaborador.id, label: colaborador.nombre })),
                    ],
                  }}
                  value={form.colaboradorId}
                  onChange={updateForm}
                />
              ) : null}
              {form.rol === "Subgerente" ? (
                <FormField
                  field={{
                    name: "areasSupervisadas",
                    label: "Áreas supervisadas",
                    type: "multiselect",
                    required: true,
                    options: areas.map((area) => area.nombre),
                  }}
                  value={form.areasSupervisadas}
                  onChange={updateForm}
                />
              ) : null}
              {form.rol === "Subgerente" ? (
                <FormField
                  field={{
                    name: "subgerenteId",
                    label: "Subgerente asociado",
                    type: "select",
                    options: [
                      { value: "", label: "Sin vincular" },
                      ...subgerentes.map((subgerente) => ({ value: subgerente.id, label: subgerente.nombre })),
                    ],
                  }}
                  value={form.subgerenteId}
                  onChange={updateForm}
                />
              ) : null}
              <FormField
                field={{ name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] }}
                value={form.estado}
                onChange={updateForm}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <footer className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" type="submit">
                Guardar
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
