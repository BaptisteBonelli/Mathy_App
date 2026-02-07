// src/pages/Register.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Listes pour la génération
const ANIMAUX = [
  "Lion", "Tigre", "Chat", "Chien", "Aigle", "Panda", "Renard", "Loup", "Ours", 
  "Lapin", "Singe", "Hibou", "Koala", "Requin", "Dauphin", "Tortue", "Lézard", 
  "Faucon", "Zèbre", "Loutre", "Castor", "Cygne", "Puma", "Lynx", "Cerf"
];

const ADJECTIFS = [
  "Rapide", "Calme", "Malin", "Fort", "Joyeux", "Bleu", "Rouge", "Vert", "Sage", 
  "Hardi", "Grand", "Petit", "Vif", "Zélé", "Franc", "Noble", "Génial", "Beau", 
  "Vrai", "Unique", "Clair", "Fier", "Doux", "Alerte", "Brave"
];

function Register({ onRegister }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fonction pour générer l'identifiant
  const generateRandomUser = () => {
    const animal = ANIMAUX[Math.floor(Math.random() * ANIMAUX.length)];
    const adjectif = ADJECTIFS[Math.floor(Math.random() * ADJECTIFS.length)];
    const numero = Math.floor(Math.random() * 900) + 100; // Nombre entre 100 et 999
    setUser(`${animal}${adjectif}${numero}`);
  };

  // Générer un identifiant dès l'affichage de la page
  useEffect(() => {
    generateRandomUser();
  }, []);

  // ... (imports et listes)
const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    localStorage.clear();

    try {
        const res = await fetch("http://localhost:3001/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, password }),
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Erreur lors de l'inscription");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", user);
        onRegister(user);
        navigate("/");
    } catch (err) {
        setError("Erreur serveur");
    }
};

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ padding: 30, border: "1px solid #ddd", borderRadius: "10px", textAlign: "center", background: "#f9f9f9" }}>
        <h2>Créer un compte</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <p style={{ fontWeight: "bold", color: "#555" }}>Voici ton identifiant, ne l'oublie pas :</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center" }}>
              <input
                style={{ padding: "8px", textAlign: "center", fontWeight: "bold", fontSize: "1.1rem" }}
                value={user}
                readOnly // L'utilisateur ne peut pas taper dedans
              />
              <button type="button" onClick={generateRandomUser} title="Changer d'identifiant">🔄</button>
            </div>
          </div>

          <input
            style={{ padding: "8px", width: "100%", marginBottom: "10px" }}
            type="password"
            placeholder="Choisis un mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />

          <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}>
            S'inscrire
          </button>
        </form>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

        <p style={{ marginTop: "20px" }}>
          Déjà un compte ?{" "}
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer" }}>
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;