import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Exercices.css"; // Réutilisation de tes styles existants

function Feedback() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // 'success' ou 'error'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const token = localStorage.getItem("token");
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      if (res.ok) {
        setStatus({ type: "success", text: "Merci ! Votre retour a bien été envoyé. ✅" });
        setMessage("");
      } else {
        setStatus({ type: "error", text: "Une erreur est survenue lors de l'envoi. ❌" });
      }
    } catch (err) {
      setStatus({ type: "error", text: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ marginTop: "5vh", textAlign: "center" }}>
      <h2 className="main-title">💌 Envoyer un retour</h2>
      <p style={{ marginBottom: "2rem", color: "#636e72" }}>
        Une idée d'amélioration ? Un bug ? N'hésitez pas à nous en faire part !
      </p>

      <div className="exo-card" style={{ maxWidth: "600px", margin: "0 auto", padding: "30px" }}>
        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrivez votre message ici..."
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "15px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              fontSize: "1rem",
              fontFamily: "inherit",
              marginBottom: "1rem",
              boxSizing: "border-box"
            }}
            required
          />
          <button 
            type="submit" 
            className="categorie-card" 
            style={{ width: "100%", margin: 0 }}
            disabled={loading}
          >
            {loading ? "Envoi en cours..." : "Envoyer mon retour"}
          </button>
        </form>

        {status && (
          <div className={`feedback-message ${status.type}`} style={{ marginTop: "20px" }}>
            {status.text}
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate("/")} 
        className="refresh-btn" 
        style={{ marginTop: "2rem" }}
      >
        ⬅ Retour à l'accueil
      </button>
    </div>
  );
}

export default Feedback;