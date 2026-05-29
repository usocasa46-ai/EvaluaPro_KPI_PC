const TYPE_OPTIONS = [
  { value: "Licencia matrimonio, 5 días", label: "LICENCIA MATRIMONIO (5 DÍAS)" },
  { value: "Nacimiento, 48 horas", label: "NACIMIENTO (48 HORAS)" },
  { value: "Nacimiento, 14 semanas", label: "NACIMIENTO (14 SEMANAS)" },
  { value: "Licencia por enfermedad", label: "LICENCIA POR ENFERMEDAD" },
  { value: "Fallecimiento", label: "FALLECIMIENTO" },
  { value: "Permiso C/D", label: "PERMISO C/D" },
  { value: "Permiso S/D", label: "PERMISO S/D" },
  { value: "Disfrute cumpleaños", label: "DISFRUTE CUMPLEAÑOS" },
];

function selectedTypes(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function PermitLogo({ configuracion }) {
  if (configuracion?.logoDataUrl) {
    return <img src={configuracion.logoDataUrl} alt="Logo empresa" />;
  }

  return (
    <div className="permit-official-logo-mark">
      <span className="permit-official-logo-triangle">▲</span>
      <strong>ALTERRA</strong>
      <small>GRUPO</small>
    </div>
  );
}

function DocumentInput({ value, onChange, readOnly, className = "", type = "text" }) {
  return (
    <input
      className={`permit-document-input ${className}`}
      type={type}
      value={value ?? ""}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SectionLine({ label, value, onChange, readOnly, type = "text", className = "" }) {
  return (
    <label className={`permit-section-line ${className}`}>
      <span>{label}</span>
      <DocumentInput type={type} value={value} readOnly={readOnly} onChange={onChange} />
    </label>
  );
}

function SignatureLine({ label, value, onChange, readOnly }) {
  return (
    <label className="permit-official-signature">
      <DocumentInput value={value} readOnly={readOnly} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function PermitSection({ title, data, onChange, readOnly, license = false }) {
  return (
    <section className="permit-official-section">
      <h3>{title}</h3>
      <SectionLine label="MOTIVO" value={data.motivo} readOnly={readOnly} onChange={(value) => onChange("motivo", value)} />
      <div className="permit-section-row">
        <SectionLine
          label="DURACIÓN"
          value={data.duracion}
          readOnly={readOnly}
          onChange={(value) => onChange("duracion", value)}
        />
      </div>
      <div className="permit-section-row permit-section-row--dates">
        <SectionLine label="FECHA" type="date" value={data.fecha} readOnly={readOnly} onChange={(value) => onChange("fecha", value)} />
        <SectionLine label="DESDE" type="date" value={data.desde} readOnly={readOnly} onChange={(value) => onChange("desde", value)} />
        <SectionLine label="HASTA" type="date" value={data.hasta} readOnly={readOnly} onChange={(value) => onChange("hasta", value)} />
        <SectionLine
          label="TOTAL DÍAS"
          value={data.totalDias}
          readOnly={readOnly}
          onChange={(value) => onChange("totalDias", value)}
        />
      </div>
      {license ? (
        <div className="permit-section-row permit-section-row--medical">
          <SectionLine label="NO." value={data.numero} readOnly={readOnly} onChange={(value) => onChange("numero", value)} />
          <SectionLine label="MÉDICO" value={data.medico} readOnly={readOnly} onChange={(value) => onChange("medico", value)} />
          <SectionLine
            label="EXEQUATUR"
            value={data.exequatur}
            readOnly={readOnly}
            onChange={(value) => onChange("exequatur", value)}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function PermitOfficialForm({
  form,
  readOnly,
  configuracion,
  onFieldChange,
  onSectionChange,
  onTypeToggle,
}) {
  const checkedTypes = selectedTypes(form.tipoNovedad);

  return (
    <div className="permit-official-document">
      <article className="permit-official-page">
        <table className="permit-header">
          <tbody>
            <tr>
              <td className="permit-header__logo" rowSpan={5}>
                <PermitLogo configuracion={configuracion} />
              </td>
              <td className="permit-header__title" rowSpan={5}>
                Formulario de Novedades
              </td>
              <th>CÓDIGO:</th>
              <td>GH07-FO-07</td>
            </tr>
            <tr>
              <th>Fecha Emisión:</th>
              <td>15/10/25</td>
            </tr>
            <tr>
              <th>Revisión:</th>
              <td>00</td>
            </tr>
            <tr>
              <th>Fecha Revisión:</th>
              <td>dd/mm/aaaa</td>
            </tr>
            <tr>
              <th>Página:</th>
              <td>2 de 2</td>
            </tr>
          </tbody>
        </table>

        <section className="permit-top-box">
          <div className="permit-top-line">
            <label>
              <span>NOMBRE</span>
              <DocumentInput value={form.colaboradorNombre} readOnly={readOnly} onChange={(value) => onFieldChange("colaboradorNombre", value)} />
            </label>
            <label>
              <span>POSICIÓN</span>
              <DocumentInput value={form.posicion} readOnly={readOnly} onChange={(value) => onFieldChange("posicion", value)} />
            </label>
          </div>
          <div className="permit-top-line">
            <label>
              <span>DEPARTAMENTO</span>
              <DocumentInput value={form.departamento} readOnly={readOnly} onChange={(value) => onFieldChange("departamento", value)} />
            </label>
            <label>
              <span>DIVISIÓN DE NEGOCIO</span>
              <DocumentInput value={form.divisionNegocio} readOnly={readOnly} onChange={(value) => onFieldChange("divisionNegocio", value)} />
            </label>
          </div>
        </section>

        <section className="permit-main-box">
          <div className="permit-type-list">
            {TYPE_OPTIONS.map((type) => (
              <label className="permit-type-option" key={type.value}>
                <span className="permit-type-checkbox">
                  <input
                    type="checkbox"
                    checked={checkedTypes.includes(type.value)}
                    disabled={readOnly}
                    onChange={() => onTypeToggle(type.value)}
                  />
                  <b />
                </span>
                <span className="permit-type-label">{type.label}</span>
              </label>
            ))}
          </div>

          <div className="permit-section-stack">
            <PermitSection
              title="LICENCIA"
              data={form.licencia}
              readOnly={readOnly}
              license
              onChange={(name, value) => onSectionChange("licencia", name, value)}
            />
            <PermitSection
              title="PERMISO C/D:"
              data={form.permisoCD}
              readOnly={readOnly}
              onChange={(name, value) => onSectionChange("permisoCD", name, value)}
            />
            <PermitSection
              title="PERMISO S/D:"
              data={form.permisoSD}
              readOnly={readOnly}
              onChange={(name, value) => onSectionChange("permisoSD", name, value)}
            />
          </div>
        </section>

        <section className="permit-observations">
          <label>OBSERVACIONES</label>
          <textarea
            value={form.observaciones ?? ""}
            readOnly={readOnly}
            onChange={(event) => onFieldChange("observaciones", event.target.value)}
          />
        </section>

        <section className="permit-official-signatures">
          <SignatureLine
            label="FIRMA COLABORADOR"
            value={form.firmaColaborador}
            readOnly={readOnly}
            onChange={(value) => onFieldChange("firmaColaborador", value)}
          />
          <SignatureLine
            label="SUPERVISOR INMEDIATO"
            value={form.supervisorInmediato}
            readOnly={readOnly}
            onChange={(value) => onFieldChange("supervisorInmediato", value)}
          />
          <SignatureLine
            label="GERENTE DE ÁREA"
            value={form.gerenteArea}
            readOnly={readOnly}
            onChange={(value) => onFieldChange("gerenteArea", value)}
          />
          <SignatureLine
            label="GERENTE GESTIÓN HUMANA"
            value={form.gerenteGestionHumana}
            readOnly={readOnly}
            onChange={(value) => onFieldChange("gerenteGestionHumana", value)}
          />
        </section>
      </article>
    </div>
  );
}
