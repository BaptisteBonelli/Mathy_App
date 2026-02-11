import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import MethodeContent from "../components/MethodeContent";

function Home({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentExo, setCurrentExo] = useState(null);
  const [variables, setVariables] = useState({});
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* =========================
      FONCTIONS UTILITAIRES
  ========================= */

  const extractVariables = (text) => {
    if (!text) return [];
    const vars = new Set();
    const braces = /{{([a-z0-9]+)}}/gi;
    const latexVar = /\\var\(([a-z0-9]+)\)/g;

    let m;
    while ((m = braces.exec(text))) vars.add(m[1]);
    while ((m = latexVar.exec(text))) vars.add(m[1]);

    return Array.from(vars);
  };

  const generateVariables = (exo) => {
    const vars = extractVariables(exo.enonce + " " + (exo.correction || "") + " " + (exo.reponse_expr || ""));
    const vals = {};
    vars.forEach((v) => {
      vals[v] = Math.floor(Math.random() * 80) + 10;
    });

    if (vals.x !== undefined && vals.y !== undefined && vals.x < vals.y) {
      [vals.x, vals.y] = [vals.y, vals.x];
    }
    return vals;
  };

  const replaceVariables = (text, variables) => {
    if (!text) return "";
    let result = text;
    Object.entries(variables).forEach(([v, val]) => {
      result = result
        .replace(new RegExp(`{{${v}}}`, "g"), val)
        .replace(new RegExp(`\\\\var\\(${v}\\)`, "g"), val);
    });
    return result;
  };

  const evaluateExpression = (expr, variables) => {
    let e = expr;
    Object.entries(variables).forEach(([v, val]) => {
      e = e.replace(new RegExp(`\\b${v}\\b`, 'g'), val);
    });
    try {
      e = e.replace(/\s/g, "").replace(/,/g, ".");
      return Function(`return ${e}`)();
    } catch (err) {
      console.error("Erreur d'évaluation :", e, err);
      return null;
    }
  };

  const parseUserAnswer = (input) => {
    if (!input) return NaN;
    let s = input.trim().replace(",", ".");
    if (s.includes("/")) {
      const [numStr, denStr] = s.split("/");
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return num / den;
    }
    return parseFloat(s);
  };

  /* =========================
      ACTIONS
  ========================= */

  const fetchRecommendation = async () => {
    setLoading(true);
    setFeedback(null);
    setUserAnswer("");
    const token = localStorage.getItem("token");
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/recommend-exercise`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401 || res.status === 403) return logout();

      const data = await res.json();
      
      if (data.automatisme) {
        const resExos = await fetch(
          `${apiUrl}/exercices/${encodeURIComponent(data.automatisme)}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (resExos.status === 401) return logout();
        
        const exos = await resExos.json();
        const exo = exos[Math.floor(Math.random() * exos.length)];
        
        const generatedVars = generateVariables(exo);
        
        // Logique ajout pourcentage
        let enoncePart = replaceVariables(exo.enonce, generatedVars);
        if (exo.type_reponse === 'pourcentage') {
          enoncePart += " *(La réponse devra être donnée en pourcentage)*";
        }
        
        setCurrentExo({ ...exo, enonce_affiche: enoncePart }); 
        setVariables(generatedVars);
      }
    } catch (err) {
      console.error("Erreur recommandation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const rawExpected = evaluateExpression(currentExo.reponse_expr, variables);
    
    // Arrondi à 2 chiffres pour l'affichage
    const expectedDisplay = Number(rawExpected).toFixed(2).replace(".", ",");
    
    const userVal = parseUserAnswer(userAnswer);
    const isCorrect = !isNaN(userVal) && rawExpected !== null && Math.abs(userVal - rawExpected) < 0.01;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/save-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exercice_numero: currentExo.numero,
          exercice_categorie: currentExo.categorie,
          correct: isCorrect,
          duree: 0
        }),
      });
      if (res.status === 401) return logout();
    } catch (err) {
      console.error(err);
    }

    setFeedback({
      type: isCorrect ? "success" : "error",
      message: isCorrect ? "Bravo ! ✅" : `Faux. La réponse était ${expectedDisplay}. ❌`,
      correction: replaceVariables(currentExo.correction, variables)
    });
  }; // <--- FERMETURE MANQUANTE ICI

  return (
    <div className="container" style={{ textAlign: "center", marginTop: "5vh" }}>
      <h1>Bonjour {user} ! 👋</h1>

      {!currentExo ? (
        <div style={{ marginTop: "2rem" }}>
          <button onClick={fetchRecommendation} className="method-link-btn" disabled={loading}>
            {loading ? "Recherche..." : "🚀 Propose-moi un exercice"}
          </button>
        </div>
      ) : (
        <div className="exo-card" style={{ marginTop: "2rem", padding: "30px", border: "2px solid #6c5ce7", borderRadius: "15px", textAlign: "left", backgroundColor: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span className="badge">Cible : {currentExo.automatisme}</span>
            <button onClick={fetchRecommendation} className="refresh-btn">🔄 Autre exercice</button>
          </div>

          <h3 style={{ color: "#2d3436" }}>Exercice n°{currentExo.numero}</h3>
          
          <div style={{ fontSize: "1.2rem", margin: "20px 0" }}>
            {/* ✅ Utilisation de enonce_affiche pour avoir la mention pourcentage */}
            <MethodeContent text={currentExo.enonce_affiche} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Ta réponse..."
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", flex: 1 }}
              disabled={feedback !== null}
            />
            <button type="submit" className="categorie-card" style={{ margin: 0 }} disabled={feedback !== null}>
              Valider
            </button>
          </form>

          {/* Section Feedback & Bouton Méthode */}
          {feedback && (
            <div style={{
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: feedback.type === 'success' ? '#dff9fb' : '#ffeaed',
              borderLeft: `5px solid ${feedback.type === 'success' ? '#22a6b3' : '#eb4d4b'}`,
              marginTop: "20px"
            }}>
              <p style={{ fontWeight: "bold", margin: 0 }}>{feedback.message}</p>
              <div style={{ marginTop: "10px", fontSize: "0.95rem", fontStyle: "italic" }}>
                <strong>Correction :</strong>
                <MethodeContent text={feedback.correction} />
              </div>

              {/* Bouton vers la méthode si erreur */}
              {feedback.type === 'error' && (
                <button
                  className="method-link-btn"
                  style={{ marginTop: "15px", width: "100%" }}
                  onClick={() =>
                    navigate(`/methodes?automatisme=${encodeURIComponent(currentExo.automatisme)}`)
                  }
                >
                  📘 Voir la méthode : {currentExo.automatisme}
                </button>
              )}
            </div>
          )}
        </div> /* Fin de exo-card */
      )}

      {/* Boutons de navigation du bas */}
      <div style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/exercices")} className="categorie-card">📚 Parcourir tout</button>
        <button onClick={() => navigate("/methodes")} className="categorie-card">📖 Fiches méthodes</button>
        <button onClick={() => navigate("/retours")} className="categorie-card" style={{ backgroundColor: "#fab1a0" }}>💌 Signaler une erreur </button>
      </div>
    </div> /* Fin de container */
  );
}

export default Home;