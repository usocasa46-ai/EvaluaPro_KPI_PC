function getOptionValue(option) {
  return typeof option === "object" ? option.value : option;
}

function getOptionLabel(option) {
  return typeof option === "object" ? option.label : option;
}

export default function FormField({ field, value, onChange }) {
  const id = `field-${field.name}`;
  const options = typeof field.options === "function" ? field.options() : field.options || [];
  const commonProps = {
    id,
    name: field.name,
    value: value ?? "",
    required: Boolean(field.required),
    placeholder: field.placeholder || "",
    disabled: Boolean(field.disabled),
    readOnly: Boolean(field.readOnly),
    onChange: (event) => onChange(field.name, event.target.value),
  };

  return (
    <label className={`form-field ${field.type === "textarea" ? "form-field--wide" : ""}`}>
      <span>{field.label}</span>

      {field.type === "select" ? (
        <select {...commonProps}>
          <option value="">Seleccionar...</option>
          {options.map((option) => (
            <option key={getOptionValue(option)} value={getOptionValue(option)}>
              {getOptionLabel(option)}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "multiselect" ? (
        <select
          id={id}
          name={field.name}
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
            onChange(field.name, selected);
          }}
        >
          {options.map((option) => (
            <option key={getOptionValue(option)} value={getOptionValue(option)}>
              {getOptionLabel(option)}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "textarea" ? <textarea {...commonProps} rows={field.rows || 3} /> : null}

      {!["select", "multiselect", "textarea"].includes(field.type) ? (
        <input
          {...commonProps}
          type={field.type || "text"}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      ) : null}
      {field.help ? <small className="form-field__help">{field.help}</small> : null}
    </label>
  );
}
