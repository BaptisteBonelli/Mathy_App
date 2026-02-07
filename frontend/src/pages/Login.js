// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ... (imports)
const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    localStorage.clear(); // 🧹 On nettoie avant toute tentative

    try {
        const res = await fetch("http://localhost:3001/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, password }),
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Erreur de connexion");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", data.user); // On stocke l'user ici aussi
        onLogin(data.user);
        navigate("/"); // Redirection vers l'accueil
    } catch (err) {
        setError("Impossible de se connecter au serveur");
    }
};

  return (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Identifiant"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <br />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        <button type="submit">Se connecter</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        Pas de compte ?{" "}
        <button onClick={() => navigate("/register")}>
          Créer un compte
        </button>
      </p>
    </div>
  </div>
);
}

export default Login;
