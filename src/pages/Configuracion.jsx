import { useState } from "react";
import { ArrowLeft, Building, Eye, Lock, Palette, RotateCcw, Save, ShieldAlert, Award } from "lucide-react";
import FormField from "../components/FormField";
import { normalizeConfig, DEFAULT_CONFIG, saveSystemConfig, getSystemConfig } from "../services/configService";

const periodOptions = [
  { value: "Semanal", label: "Semanal" },
  { value: "Quincenal", label: "Quincenal" },
  { value: "Mensual", label: "Mensual" }
];
const themeOptions = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" }
];
const densityOptions = [
  { value: "normal", label: "Normal" },
  { value: "compact", label: "Compacta" }
];

export default function Configuracion({ configuracion, areas, canView, onSave, onBack }) {
  // Inicialización directa y limpia de las propiedades en inglés solicitadas a nivel raíz
  const [draft, setDraft] = useState(() => {
    const config = normalizeConfig(configuracion || getSystemConfig());
    return {
      companyName: config.companyName || DEFAULT_CONFIG.companyName,
      rnc: config.rnc || DEFAULT_CONFIG.rnc,
      address: config.address || DEFAULT_CONFIG.address,
      phone: config.phone || DEFAULT_CONFIG.phone,
      email: config.email || DEFAULT_CONFIG.email,
      logoUrl: config.logoUrl || DEFAULT_CONFIG.logoUrl,
      logoDataUrl: config.logoDataUrl || DEFAULT_CONFIG.logoDataUrl,
      primaryColor: config.primaryColor || DEFAULT_CONFIG.primaryColor,
      secondaryColor: config.secondaryColor || DEFAULT_CONFIG.secondaryColor,
      theme: config.theme || DEFAULT_CONFIG.theme,
      density: config.density || DEFAULT_CONFIG.density,
      monthlyPeriod: config.monthlyPeriod || DEFAULT_CONFIG.monthlyPeriod,
      minimumKpi: Number(config.minimumKpi ?? DEFAULT_CONFIG.minimumKpi),
      activeAreas: config.activeAreas || DEFAULT_CONFIG.activeAreas,
      pesosKpi: config.pesosKpi || {
        puntualidad: 10,
        asistencia: 10,
        productividad: 30,
        calidad: 20,
        procesos: 15,
        servicio: 10,
        incidencias: 5,
      }
    };
  });
  
  const [message, setMessage] = useState("");

  // TAREA 4: Permisos - Si entra un Subgerente o Encargado, mostrar el mensaje restrictivo
  if (!canView) {
    return (
      <section className="page-shell">
        <div className="permission-card" style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center", padding: "40px 20px" }}>
          <div className="permission-card__icon" style={{ display: "inline-flex", padding: "16px", borderRadius: "50%", background: "var(--light-bg)", color: "#ef4444", marginBottom: "20px" }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "12px", color: "var(--text-color)" }}>Acceso restringido</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: "1.6" }}>
            No tienes permiso para ver esta información.
          </p>
          <div style={{ marginTop: "24px" }}>
            <button className="button button--ghost" onClick={onBack} type="button">
              <ArrowLeft size={16} />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }

  function updateField(name, value) {
    setDraft((current) => ({
      ...current,
      [name]: name === "minimumKpi" ? Number(value) : value
    }));
    setMessage("");
  }

  function updateWeight(name, value) {
    setDraft((current) => ({
      ...current,
      pesosKpi: {
        ...current.pesosKpi,
        [name]: Math.max(0, Math.min(100, Number(value) || 0)),
      },
    }));
    setMessage("");
  }

  // TAREA 2: Subir logo como imagen
  function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // TAREA 6: Validación de tipo imagen
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setMessage("El archivo seleccionado no es una imagen. Debe ser PNG, JPG, JPEG o WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setDraft((current) => ({
        ...current,
        logoDataUrl: e.target.result
      }));
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setDraft((current) => ({
      ...current,
      logoDataUrl: ""
    }));
    setMessage("");
  }

  // TAREA 1: Arreglar Guardar cambios
  function handleSave(event) {
    event.preventDefault();

    // TAREA 6: Validaciones del formulario
    if (!draft.companyName.trim()) {
      setMessage("El nombre de la empresa no debe estar vacío.");
      return;
    }

    const minKpiNum = Number(draft.minimumKpi);
    if (isNaN(minKpiNum) || minKpiNum < 0 || minKpiNum > 100) {
      setMessage("El KPI mínimo aceptable debe ser un número válido entre 0 y 100.");
      return;
    }

    const totalWeights = Object.values(draft.pesosKpi || {}).reduce((a, b) => a + b, 0);
    if (totalWeights !== 100) {
      setMessage(`La suma de los pesos de KPI debe ser exactamente 100%. Actualmente es ${totalWeights}%.`);
      return;
    }

    const configToSave = {
      ...draft,
      companyName: draft.companyName.trim(),
      minimumKpi: minKpiNum,
    };

    // 1. Guardar en localStorage bajo "system_config" con las claves exactas en inglés
    if (!onSave) saveSystemConfig(configToSave);

    // 2. Notificar al shell global de App.jsx mediante onSave enviando la versión compatible normalizada
    const normalized = normalizeConfig(configToSave);
    if (onSave) onSave(normalized);

    setMessage("Configuración guardada correctamente.");
  }

  function handleRestoreDefaults() {
    const confirmRestore = window.confirm(
      "¿Estás seguro de que deseas restaurar todos los valores de configuración a su estado original de fábrica?"
    );
    if (!confirmRestore) return;

    setDraft(normalizeConfig(DEFAULT_CONFIG));
    setMessage("Valores por defecto restablecidos. No olvides presionar Guardar cambios para confirmarlos.");
  }

  const totalWeightCurrent = Object.values(draft.pesosKpi || {}).reduce((a, b) => a + b, 0);

  return (
    <section className="page-shell">
      <header className="module-header">
        <div>
          <h1>Configuración del Sistema</h1>
          <p>Personaliza los datos corporativos, pesos de indicadores y preferencias estéticas del supermercado.</p>
        </div>
        <div className="module-actions">
          <button className="button button--ghost" type="button" onClick={onBack}>
            <ArrowLeft size={16} />
            Volver
          </button>
        </div>
      </header>

      <form className="settings-layout" onSubmit={handleSave} style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr", maxWidth: "1200px" }}>
        
        {/* Fila superior: Vista previa + Datos de Empresa */}
        <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "window.innerWidth > 900 ? '1fr 2fr' : '1fr'", alignItems: "start" }}>
          
          {/* Card: Vista Previa Interactiva */}
          <section className="content-panel" style={{ height: "100%" }}>
            <div className="panel-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} style={{ color: draft.primaryColor }} />
                <h2>Vista previa corporativa</h2>
              </div>
              <span>Representación del shell actual</span>
            </div>
            
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "16px", 
              padding: "20px", 
              border: `2px dashed ${draft.primaryColor}`, 
              borderRadius: "8px",
              background: draft.theme === "dark" ? "#1e293b" : "#f8fafc",
              color: draft.theme === "dark" ? "#f1f5f9" : "#0f172a",
              transition: "all 0.3s ease"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${draft.theme === "dark" ? "#334155" : "#e2e8f0"}`, paddingBottom: "12px" }}>
                {draft.logoDataUrl ? (
                  <img
                    src={draft.logoDataUrl}
                    alt="Logo"
                    style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--line)" }}
                  />
                ) : (
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: draft.primaryColor,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}>
                    {String(draft.companyName || "E").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>{draft.companyName || "EvaluaPro KPI"}</strong>
                  <span style={{ fontSize: "11px", color: draft.theme === "dark" ? "#94a3b8" : "#64748b" }}>{draft.email || "contacto@supermercado.com"}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px" }}>Umbral KPI Mínimo</span>
                <span style={{ 
                  padding: "4px 8px", 
                  borderRadius: "12px", 
                  background: `${draft.secondaryColor}15`, 
                  color: draft.secondaryColor, 
                  fontWeight: "bold",
                  fontSize: "12px"
                }}>{draft.minimumKpi}%</span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" style={{ 
                  flex: 1, 
                  padding: "8px", 
                  borderRadius: "6px", 
                  border: "none", 
                  background: draft.primaryColor, 
                  color: "#ffffff", 
                  fontWeight: "500",
                  fontSize: "12px",
                  cursor: "default"
                }}>Botón Primario</button>
                <button type="button" style={{ 
                  flex: 1, 
                  padding: "8px", 
                  borderRadius: "6px", 
                  border: `1px solid ${draft.theme === "dark" ? "#475569" : "#cbd5e1"}`, 
                  background: "transparent", 
                  color: draft.theme === "dark" ? "#f1f5f9" : "#334155", 
                  fontWeight: "500",
                  fontSize: "12px",
                  cursor: "default"
                }}>Tema: {draft.theme === "dark" ? "Oscuro" : "Claro"} ({draft.density === "compact" ? "Compacta" : "Normal"})</button>
              </div>
            </div>
          </section>

          {/* Card: Datos Corporativos */}
          <section className="content-panel">
            <div className="panel-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={18} style={{ color: draft.primaryColor }} />
                <h2>Datos corporativos</h2>
              </div>
              <span>Información legal e identidad corporativa de la sucursal.</span>
            </div>
            <div className="form-grid">
              <FormField field={{ name: "companyName", label: "Nombre de la empresa *", required: true }} value={draft.companyName} onChange={updateField} />
              <FormField field={{ name: "rnc", label: "RNC (Identificación Fiscal)" }} value={draft.rnc} onChange={updateField} />
              <FormField field={{ name: "address", label: "Dirección física" }} value={draft.address} onChange={updateField} />
              <FormField field={{ name: "phone", label: "Teléfono de contacto" }} value={draft.phone} onChange={updateField} />
              <FormField field={{ name: "email", label: "Correo electrónico institucional" }} value={draft.email} onChange={updateField} />
              <FormField field={{ name: "logoUrl", label: "Texto de logo o URL de respaldo" }} value={draft.logoUrl} onChange={updateField} />
              
              {/* TAREA 2: Subir logo como imagen */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="form-field form-field--wide">
                <span>Logo de empresa (Imagen desde PC)</span>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: "4px" }}>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: "none" }}
                    id="logo-file-input"
                  />
                  <label
                    htmlFor="logo-file-input"
                    className="button button--ghost"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", margin: 0 }}
                  >
                    Seleccionar imagen...
                  </label>
                  
                  {draft.logoDataUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={draft.logoDataUrl}
                        alt="Logo preview"
                        style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--line)" }}
                      />
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={handleRemoveLogo}
                        style={{ padding: "6px 10px" }}
                      >
                        Quitar logo
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>Ninguna imagen seleccionada</span>
                  )}
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* Fila central: Apariencia + Evaluación KPI */}
        <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "window.innerWidth > 900 ? '1fr 1fr' : '1fr'" }}>
          
          {/* Card: Aspecto Visual */}
          <section className="content-panel">
            <div className="panel-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Palette size={18} style={{ color: draft.primaryColor }} />
                <h2>Personalización visual</h2>
              </div>
              <span>Define la paleta cromática, tema oscuro y espaciado de pantalla.</span>
            </div>
            <div className="form-grid form-grid--compact">
              <FormField field={{ name: "primaryColor", label: "Color principal", type: "color", required: true }} value={draft.primaryColor} onChange={updateField} />
              <FormField field={{ name: "secondaryColor", label: "Color secundario", type: "color", required: true }} value={draft.secondaryColor} onChange={updateField} />
              <FormField field={{ name: "theme", label: "Tema del sistema *", type: "select", required: true, options: themeOptions }} value={draft.theme} onChange={updateField} />
              <FormField field={{ name: "density", label: "Densidad de vista *", type: "select", required: true, options: densityOptions }} value={draft.density} onChange={updateField} />
            </div>
          </section>

          {/* Card: Configuración de Evaluación */}
          <section className="content-panel">
            <div className="panel-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={18} style={{ color: draft.primaryColor }} />
                <h2>Parámetros de Evaluación KPI</h2>
              </div>
              <span>Frecuencia predeterminada, umbrales de aceptación y áreas activas.</span>
            </div>
            <div className="form-grid form-grid--compact">
              <FormField field={{ name: "monthlyPeriod", label: "Frecuencia de evaluación *", type: "select", required: true, options: periodOptions }} value={draft.monthlyPeriod} onChange={updateField} />
              <FormField field={{ name: "minimumKpi", label: "KPI mínimo aceptable % *", type: "number", min: 0, max: 100, required: true }} value={draft.minimumKpi} onChange={updateField} />
              <FormField field={{ name: "activeAreas", label: "Áreas activas del sistema *", type: "multiselect", required: true, options: areas.map((area) => area.nombre) }} value={draft.activeAreas} onChange={updateField} />
            </div>
          </section>
        </div>

        {/* Fila inferior: Pesos de KPI */}
        <section className="content-panel">
          <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Distribución de pesos generales de KPI (Fórmula oficial)</h2>
              <span>Establece el impacto porcentual de cada métrica operativa sobre la nota del colaborador.</span>
            </div>
            <div style={{ 
              padding: "6px 12px", 
              borderRadius: "20px", 
              background: totalWeightCurrent === 100 ? "#10b98120" : "#ef444420", 
              color: totalWeightCurrent === 100 ? "#10b981" : "#ef4444", 
              fontWeight: "bold",
              fontSize: "13px"
            }}>
              Suma Total: {totalWeightCurrent}%
            </div>
          </div>
          
          <div className="weights-grid" style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {Object.entries(draft.pesosKpi || {}).map(([key, value]) => (
              <FormField
                key={key}
                field={{ name: key, label: key.charAt(0).toUpperCase() + key.slice(1) + " %", type: "number", min: 0, max: 100, required: true }}
                value={value}
                onChange={updateWeight}
              />
            ))}
          </div>
        </section>

        {/* Card: Panel de Seguridad */}
        <section className="content-panel" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="panel-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={18} style={{ color: "#f59e0b" }} />
              <h2>Seguridad y Gobernanza</h2>
            </div>
            <span>Restricciones de privilegios activos</span>
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.5" }}>
            La modificación de la configuración global requiere credenciales de nivel <strong>Gerente</strong>. 
            Los roles de <strong>Subgerente</strong> y <strong>Encargado</strong> cuentan con acceso restringido de solo visualización/bloqueo para asegurar la integridad de la base operativa de la empresa.
          </p>
        </section>

        {/* Footer de Acciones y Notificaciones */}
        <footer className="settings-footer" style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          justifyContent: "space-between", 
          alignItems: "center", 
          gap: "16px", 
          marginTop: "12px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border-color)"
        }}>
          <div>
            {message ? (
              <p className={message.includes("correctamente") ? "form-success" : "form-error"} style={{ margin: 0, fontWeight: "500" }}>
                {message}
              </p>
            ) : null}
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="button button--ghost" type="button" onClick={handleRestoreDefaults}>
              <RotateCcw size={16} />
              Restaurar valores
            </button>
            <button className="button button--ghost" type="button" onClick={onBack}>
              Volver
            </button>
            <button className="button button--primary" type="submit">
              <Save size={16} />
              Guardar cambios
            </button>
          </div>
        </footer>

      </form>
    </section>
  );
}
