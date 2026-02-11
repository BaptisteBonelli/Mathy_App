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
  const [isSubmitted, setIsSubmitted] = useState(false); // Ajouté pour corriger l'erreur

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
    const values = {};

    vars.forEach((v) => {
      values[v] = Math.floor(Math.random() * 80) + 10;
    });

    if (exo.numero === 8 || (exo.enonce && exo.enonce.includes("diminution"))) {
      if (values.x < values.y) [values.x, values.y] = [values.y, values.x];
    }
    
    if (exo.numero === 22) {
      values.x = Math.floor(Math.random() * 4) + 1;
      values.n = Math.floor(Math.random() * 10) + 1;
    } else if (exo.numero === 23) {
      values.x = Math.floor(Math.random() * 4) + 6;
      values.n = Math.floor(Math.random() * 10) + 1;
    }

    if (vars.includes('n') && values.n === undefined) {
      values.n = Math.floor(Math.random() * 10) + 1;
    }

    if (values.x !== undefined && values.y !== undefined && values.x > values.y) {
       // Pour les proportions classiques
       if (exo.numero !== 8) [values.x, values.y] = [values.y, values.x];
    }

    if (values.x === values.y) values.y += 5;
    if (exo.numero === 13) values.z = values.x + Math.floor(Math.random() * 5);

    return values;
  };

  const replaceVariables = (text, vars) => {
    if (!text) return "";
    let result = text;
    Object.entries(vars).forEach(([v, val]) => {
      result = result
        .replace(new RegExp(`{{${v}}}`, "g"), val)
        .replace(new RegExp(`\\\\var\\(${v}\\)`, "g"), val);
    });
    return result;
  };

  const evaluateExpression = (expr, vars) => {
    let e = expr;
    Object.entries(vars).forEach(([v, val]) => {
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
    let s = input.trim().toLowerCase().replace(",", ".");
    
    if (s === "vrai" || s === "v") return "vrai";
    if (s === "faux" || s === "f") return "faux";

    if (s.includes("^")) {
      const parts = s.split("^");
      if (parts.length === 2) {
        const base = parseFloat(parts[0]);
        const expo = parseFloat(parts[1]);
        return Math.pow(base, expo);
      }
    }
    if (s.includes("/")) {
      const [num, den] = s.split("/").map(parseFloat);
      return den === 0 ? NaN : num / den;
    }
    return parseFloat(s);
  };

  const isAnswerCorrect = (userValue, expectedValue) => {
    if (isNaN(userValue) || isNaN(expectedValue)) return false;
    return Math.abs(userValue - expectedValue) < 0.01 || 
           Math.abs(userValue - expectedValue) / Math.abs(expectedValue) < 0.01;
  };

  /* =========================
      ACTIONS
  ========================= */

  const fetchRecommendation = async () => {
    setLoading(true);
    setFeedback(null);
    setUserAnswer("");
    setIsSubmitted(false);
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
        const exos = await resExos.json();
        const exo = exos[Math.floor(Math.random() * exos.length)];
        const generatedVars = generateVariables(exo);
        
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
    if (e) e.preventDefault(); // Empêche le rechargement de la page
    if (isSubmitted || !currentExo) return;

    const token = localStorage.getItem("token");
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

    try {
      let expected;
      const userVal = parseUserAnswer(userAnswer);

      if (currentExo.numero === 16) {
        const boolResult = evaluateExpression(currentExo.reponse_expr, variables);
        expected = boolResult ? "vrai" : "faux";
      } else {
        const rawExpected = evaluateExpression(currentExo.reponse_expr, variables);
        expected = Math.round(rawExpected * 100) / 100;
      }

      if (currentExo.numero !== 16 && isNaN(userVal)) {
        setFeedback({ type: 'error', message: "❌ Réponse invalide (nombre ou fraction attendu)", correction: "" });
        return;
      }

      setIsSubmitted(true);
      const correct = (currentExo.numero === 16) ? (userVal === expected) : isAnswerCorrect(userVal, expected);
      
      const expectedDisplay = (currentExo.numero === 16) 
          ? expected.charAt(0).toUpperCase() + expected.slice(1) 
          : expected;

      setFeedback({
        type: correct ? 'success' : 'error',
        message: correct ? "✅ Correct !" : `❌ Incorrect. La réponse attendue était : ${expectedDisplay}`,
        correction: replaceVariables(currentExo.correction, variables)
      });

      await fetch(`${apiUrl}/save-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          exercice_numero: currentExo.numero,
          exercice_categorie: currentExo.categorie || 0,
          correct,
          duree: 0
        }),
      });
    } catch (err) {
      console.error("Erreur validation:", err);
    }
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
            <MethodeContent text={currentExo.enonce_affiche} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Ta réponse..."
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", flex: 1 }}
              disabled={isSubmitted}
            />
            <button type="submit" className="categorie-card" style={{ margin: 0 }} disabled={isSubmitted}>
              Valider
            </button>
          </form>

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
        </div>
      )}

      <div style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/exercices")} className="categorie-card">📚 Parcourir les exercices</button>
        <button onClick={() => navigate("/methodes")} className="categorie-card">📖 Fiches méthodes</button>
        <button onClick={() => navigate("/retours")} className="categorie-card" style={{ backgroundColor: "#fab1a0" }}>💌 Signaler une erreur </button>
      </div>
    </div>
  );
}

export default Home;