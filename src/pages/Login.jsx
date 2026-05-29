import { useState } from "react";
import { LogIn, ShoppingCart } from "lucide-react";

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
      <section className="login-card">
        <div className="login-brand">
          <div className="sidebar__logo">
            <ShoppingCart size={22} />
          </div>
          <div>
            <strong>EvaluaPro</strong>
            <span>{supermarketName || "KPI Supermercado"}</span>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <h1>Iniciar sesión</h1>
          <label className="form-field">
            <span>Usuario</span>
            <input name="usuario" value={form.usuario} autoComplete="username" onChange={updateField} />
          </label>
          <label className="form-field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              value={form.password}
              autoComplete="current-password"
              onChange={updateField}
            />
          </label>
          {error ? <p className="form-error login-error">{error}</p> : null}
          <button className="button button--primary" type="submit">
            <LogIn size={16} />
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
