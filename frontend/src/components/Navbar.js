// src/components/Navbar.js
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar({ onLogout }) {
  const loc = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Appel de la fonction parent pour nettoyer l'état
    if (onLogout) onLogout();
    // Redirection vers la page login
    navigate("/login", { replace: true });
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-inner">
        {/* Logo / Brand */}
        <div className="brand">
          <span className="brand-icon"></span>
          <span className="brand-text">Mathy</span>
        </div>

        {/* Liens de navigation */}
        <div className="nav-links">
          <Link  to="/" className={loc.pathname === "/" ? "active" : ""}
>
            <span className="icon">🏠</span>
            <span className="text">Accueil</span>
          </Link>
         <Link  to="/methodes" className={loc.pathname === "/methodes" ? "active" : ""}
>
            <span className="icon">📓</span>
            <span className="text">Méthodes</span>
          </Link>
          
          <Link to="/exercices" className={loc.pathname === "/exercices" ? "active" : ""}>
            <span className="icon">📝</span>
            <span className="text">Exercices</span>
          </Link>

          <Link to="/flashcards" className={loc.pathname === "/flashcards" ? "active" : ""}>
            <span className="icon">⚡</span>
            <span className="text">Examens Blancs</span>
          </Link>
          
          <Link to="/stats" className={loc.pathname === "/stats" ? "active" : ""}>
            <span className="icon">📊</span>
            <span className="text">Ma progression</span>
          </Link>

          <Link to="/" className={loc.pathname === "/" ? "active" : ""}>
            <span className="icon">👤</span>
            <span className="text">Mon compte</span>
          </Link>
        </div>

        {/* Footer avec Logout */}
{/* Footer avec Logout */}
<div className="nav-footer">
  <span className="logout-icon" onClick={handleLogout}>🚪</span>
  <span className="logout-text">Se déconnecter</span>
</div>



      </div>
    </nav>
  );
}

export default Navbar;
