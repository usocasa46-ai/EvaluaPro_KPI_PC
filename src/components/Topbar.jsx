import { CalendarDays, LogOut, UserRound } from "lucide-react";

export default function Topbar({ activeLabel, activeUser, supermarketName, onLogout }) {
  const currentDate = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div>
        <span className="topbar__eyebrow">{supermarketName}</span>
        <h2>{activeLabel}</h2>
      </div>

      <div className="topbar__controls">
        <div className="topbar__date">
          <CalendarDays size={16} />
          {currentDate}
        </div>
        <div className="user-switcher">
          <UserRound size={16} />
          <span>{activeUser?.usuario}</span>
          <strong>{activeUser?.nombre}</strong>
        </div>
        <div className="role-badge">
          {activeUser?.rol}
          {activeUser?.areaAsignada ? <span>{activeUser.areaAsignada}</span> : null}
        </div>
        <button className="button button--ghost" type="button" onClick={onLogout}>
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
