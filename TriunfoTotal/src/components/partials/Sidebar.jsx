import { useState } from "react";
import "../../css/styles.css";

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="sidebar-handle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Cerrar menú de categorías" : "Abrir menú de categorías"}
      >
        <i className={`bi ${isOpen ? "bi-chevron-left" : "bi-chevron-right"}`}></i>
      </button>

      <div className="sidebar-content">
        <div className="sidebar-card">🏅</div>
        <div className="sidebar-card">⚽</div>
        <div className="sidebar-card">🏀</div>
        <div className="sidebar-card">♟️</div>
        <div className="sidebar-card">🎮</div>
      </div>
    </aside>
  );
}

export default Sidebar;