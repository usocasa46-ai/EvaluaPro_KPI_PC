import { useState } from "react";
import { ClipboardCheck, Lightbulb, Lock, LogIn, ShieldCheck, TrendingUp, User, Users } from "lucide-react";

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
      <section className="login-shell">
        <section className="login-hero">
          <div className="login-hero-inner">
            <div className="login-logo">
              <div className="login-logo-mark" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="img">
                  <rect x="7" y="8" width="50" height="48" rx="15" />
                  <path d="M18 43V31M30 43V24M42 43V18" />
                  <path d="M18 26l10 6 14-16" />
                  <path d="M43 16h7v7" />
                  <circle cx="49" cy="49" r="6" />
                  <path d="M46.4 49.1l1.8 1.8 3.4-4" />
                </svg>
              </div>
              <div className="login-logo-copy">
                <h1>
                  EvaluaPro <span>KPI</span>
                </h1>
                <p>{supermarketName || "Supermercado"}</p>
              </div>
            </div>

            <p className="login-hero-text">
              Sistema de evaluación y seguimiento para impulsar el desempeño y la productividad de tu equipo.
            </p>

            <div className="login-feature-grid">
              <article className="login-feature">
                <div className="login-feature-icon login-feature-icon--blue">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <strong>Evaluación Inteligente</strong>
                  <span>Mide y mejora el rendimiento de tu equipo.</span>
                </div>
              </article>

              <article className="login-feature">
                <div className="login-feature-icon login-feature-icon--cyan">
                  <Users size={18} />
                </div>
                <div>
                  <strong>Gestión de Colaboradores</strong>
                  <span>Administra áreas, cargos y colaboradores fácilmente.</span>
                </div>
              </article>

              <article className="login-feature">
                <div className="login-feature-icon login-feature-icon--gold">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <strong>Decisiones con Impacto</strong>
                  <span>Reportes y KPI para mejores decisiones.</span>
                </div>
              </article>
            </div>

            <div className="login-hero-badge">
              <ShieldCheck size={16} />
              <span>Acceso <strong>seguro</strong> para personal autorizado</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-access-card">
            <div className="login-card-header">
              <div className="login-card-icon">
                <ClipboardCheck size={23} />
              </div>
              <div className="login-security-badge">
                <ShieldCheck size={14} />
                Acceso seguro
              </div>
            </div>

            <h1 className="login-title">Iniciar sesión</h1>
            <p className="login-subtitle">Acceso autorizado para personal del sistema.</p>

            <form className="login-form" onSubmit={submit}>
              <label className="login-input-group">
                <span className="login-input-icon"><User size={17} /></span>
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
                <span className="login-input-icon"><Lock size={17} /></span>
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
                <LogIn size={18} />
                Entrar al sistema
              </button>
            </form>

            <div className="login-secure-note">
              <Lock size={13} />
              <span>Acceso seguro para personal autorizado</span>
            </div>

            <footer className="login-footer-right">
              EvaluaPro KPI Supermercado | Versión 1.0.0
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
