// src/pages/Exam.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Exam() {
  const navigate = useNavigate();

  return (
    <div className="exams-container">
      <div className="maintenance-card">
        <div className="icon-wrapper">
          <span role="img" aria-label="construction">🚧</span>
        </div>
        
        <h2>Page en cours de développement</h2>
        
        <p>
          Cette page sera disponible sous peu. Nous travaillons actuellement 
          sur des sujets d'examens blancs pour vous aider dans vos révisions.
        </p>

        <button 
          className="back-home-btn" 
          onClick={() => navigate("/")}
        >
          🏠 Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

export default Exam;