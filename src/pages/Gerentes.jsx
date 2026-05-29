import CrudModule from "../components/CrudModule";

export default function Gerentes({ gerentes, canCreate, onCreate }) {
  return (
    <CrudModule
      title="Gerentes"
      subtitle="Vista directiva del personal gerente registrado."
      rows={gerentes}
      canCreate={canCreate}
      createLabel="Nuevo gerente"
      columns={[
        { key: "id", label: "ID" },
        { key: "nombre", label: "Nombre completo" },
        { key: "telefono", label: "Teléfono" },
        { key: "correo", label: "Correo" },
        { key: "estado", label: "Estado" },
      ]}
      fields={[
        { name: "nombre", label: "Nombre completo", required: true },
        { name: "telefono", label: "Teléfono", required: true },
        { name: "correo", label: "Correo", type: "email", required: true },
        { name: "estado", label: "Estado", type: "select", required: true, options: ["Activo", "Inactivo"] },
      ]}
      initialForm={{ nombre: "", telefono: "", correo: "", estado: "Activo" }}
      onCreate={onCreate}
    />
  );
}
