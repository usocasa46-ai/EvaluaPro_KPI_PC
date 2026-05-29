import { useState } from "react";
import { LogIn, Lock, User, ShieldCheck, BarChart3, Users, ClipboardCheck, TrendingUp } from "lucide-react";

export default function Login({ supermarketName, onLogin }) {
  const [form, setForm] = useState({ usuario: "", password: "" });
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    const result = onLogin(form.usuario, form.password);
    if (!result.ok) {
      setError(result.message || "Usuario o contraseña incorrectos.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel-left">
        <div className="login-brand-left">
          <div className="login-logo-icon">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="login-brand-title">
              EvaluaPro <span>KPI</span>
            </h1>
            <p className="login-brand-subtitle">{supermarketName || "Supermercado"}</p>
          </div>
        </div>

        <p className="login-brand-desc">
          Sistema de evaluación y seguimiento operativo
        </p>

        <div className="login-features-grid">
          <div className="login-feature-card">
            <div className="login-feature-icon login-feature-icon--blue">
              <Users size={16} />
            </div>
            <strong>Gestión de Colaboradores</strong>
            <span>Administra tu equipo de trabajo</span>
          </div>
          <div className="login-feature-card">
            <div className="login-feature-icon login-feature-icon--indigo">
              <ClipboardCheck size={16} />
            </div>
            <strong>Evaluación KPI</strong>
            <span>Control mensual y diario de indicadores</span>
          </div>
          <div className="login-feature-card">
            <div className="login-feature-icon login-feature-icon--emerald">
              <TrendingUp size={16} />
            </div>
            <strong>Reportes y Análisis</strong>
            <span>Información clara para tomar decisiones</span>
          </div>
          <div className="login-feature-card">
            <div className="login-feature-icon login-feature-icon--rose">
              <ShieldCheck size={16} />
            </div>
            <strong>Seguridad</strong>
            <span>Acceso protegido por roles y permisos</span>
          </div>
        </div>

        <div className="login-access-badge">
          <Lock size={12} />
          <span>Acceso <strong>seguro</strong> para personal autorizado</span>
        </div>
      </section>

      <section className="login-panel-right">
        <div className="login-card-right">
          <div className="login-avatar">
            <Users size={26} />
          </div>

          <p className="login-welcome">Bienvenido a</p>
          <h1 className="login-title">EvaluaPro <span>KPI</span></h1>
          <p className="login-subtitle">Inicia sesión para continuar</p>

          <form className="login-form" onSubmit={submit}>
            <label className="login-input-group">
              <span className="login-input-icon"><User size={16} /></span>
              <input
                name="usuario"
                type="text"
                placeholder="Usuario"
                value={form.usuario}
                autoComplete="username"
                onChange={updateField}
              />
            </label>
            <label className="login-input-group">
              <span className="login-input-icon"><Lock size={16} /></span>
              <input
                name="password"
                type="password"
                placeholder="Contraseña"
                value={form.password}
                autoComplete="current-password"
                onChange={updateField}
              />
            </label>

            {error ? <p className="form-error login-error">{error}</p> : null}

            <button className="login-btn-submit" type="submit">
              <LogIn size={16} />
              Entrar al sistema
            </button>
          </form>

          <footer className="login-footer-right">
            <span>{supermarketName || "EvaluaPro KPI Supermercado"}</span>
            <span>Versión 1.0.0</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
