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
    // On extrait les variables de TOUS les champs pour être sûr de ne rien oublier
    const vars = extractVariables(exo.enonce + " " + (exo.correction || "") + " " + (exo.reponse_expr || ""));
    const vals = {};
    vars.forEach((v) => {
      vals[v] = Math.floor(Math.random() * 80) + 10;
    });

    // Contrainte x > y pour éviter les résultats négatifs (ex: évolutions)
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
      // Remplace la variable isolée par sa valeur
      e = e.replace(new RegExp(`\\b${v}\\b`, 'g'), val);
    });

    try {
      // Nettoyage pour le calcul
      e = e.replace(/\s/g, "").replace(/,/g, ".");
      // eslint-disable-next-line no-new-func
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

    try {
      const res = await fetch("http://localhost:3001/recommend-exercise", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401 || res.status === 403) return logout();

      const data = await res.json();
      if (data.automatisme) {
        const resExos = await fetch(`http://localhost:3001/exercices/${encodeURIComponent(data.automatisme)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resExos.status === 401) return logout();
        
        const exos = await resExos.json();
        const exo = exos[Math.floor(Math.random() * exos.length)];
        setCurrentExo(exo);
        setVariables(generateVariables(exo));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const expected = evaluateExpression(currentExo.reponse_expr, variables);
    const userVal = parseUserAnswer(userAnswer);
    const isCorrect = !isNaN(userVal) && expected !== null && Math.abs(userVal - expected) < 0.01;

    try {
      const res = await fetch("http://localhost:3001/save-result", {
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
      message: isCorrect ? "Bravo ! ✅" : `Faux. La réponse était ${expected}. ❌`,
      correction: replaceVariables(currentExo.correction, variables)
    });
  };

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
            {/* CORRECTION : Utilisation du bon nom de fonction replaceVariables */}
            <MethodeContent text={replaceVariables(currentExo.enonce, variables)} />
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

          {feedback && (
            <div style={{
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: feedback.type === 'success' ? '#dff9fb' : '#ffeaed',
              borderLeft: `5px solid ${feedback.type === 'success' ? '#22a6b3' : '#eb4d4b'}`
            }}>
              <p style={{ fontWeight: "bold", margin: 0 }}>{feedback.message}</p>
              <div style={{ marginTop: "10px", fontSize: "0.95rem", fontStyle: "italic" }}>
                <strong>Explication :</strong>
                <MethodeContent text={feedback.correction} />
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button onClick={() => navigate("/exercices")} className="categorie-card">📚 Parcourir tout</button>
        <button onClick={() => navigate("/methodes")} className="categorie-card">📖 Fiches méthodes</button>
      </div>
    </div>
  );
}

export default Home;