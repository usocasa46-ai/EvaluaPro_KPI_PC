import { useState } from "react";

const ALTERRA_LOGO_SRC = `${import.meta.env.BASE_URL || "/"}templates/evaluacion-trimestral/logo-alterra.png`;

export default function FormOfficialLogo({ className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageFailed) {
    return (
      <div className={`official-form-logo ${className}`}>
        <img src={ALTERRA_LOGO_SRC} alt="Alterra Grupo" onError={() => setImageFailed(true)} />
      </div>
    );
  }

  return (
    <div className={`official-form-logo official-form-logo--fallback ${className}`} aria-label="Alterra Grupo">
      <div className="official-form-logo-mark">
        <span />
      </div>
      <strong className="official-form-logo-text">ALTERRA</strong>
      <small className="official-form-logo-subtitle">Alterra Grupo</small>
    </div>
  );
}
