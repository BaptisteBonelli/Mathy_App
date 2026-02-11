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
  const values = {};

  // 1. Génération aléatoire de base
  vars.forEach((v) => {
    values[v] = Math.floor(Math.random() * 80) + 10; // Entre 10 et 89
  });

  // 2. Gestion des contraintes spécifiques par exercice
  // On utilise l'ID ou le numéro de l'exercice pour appliquer des règles
  
  // Exemple : Si l'exercice mentionne une diminution (ex: exo 8), 
  // on veut souvent que la valeur de départ (x) soit > valeur d'arrivée (y)
  if (exo.numero === 8 || exo.enonce.includes("diminution")) {
    if (values.x < values.y) {
      [values.x, values.y] = [values.y, values.x];
    }
  } 
  // 2. Gestion des contraintes spécifiques
  
  // Exercice 22 : Ordre de grandeur (x entre 1 et 4)
  if (exo.numero === 22) {
    values.x = Math.floor(Math.random() * 4) + 1; // 1, 2, 3 ou 4
    values.n = Math.floor(Math.random() * 10) + 1; // une puissance n entre 1 et 10
  }

  // Exercice 23 : Ordre de grandeur (x entre 6 et 9)
  else if (exo.numero === 23) {
    values.x = Math.floor(Math.random() * 4) + 6; // 6, 7, 8 ou 9
    values.n = Math.floor(Math.random() * 10) + 1;
  }

  // Correction pour les puissances de 10 (évite que n soit traité comme 10 par défaut)
  // On s'assure que n est bien défini s'il est présent dans l'énoncé
  if (vars.includes('n') && values.n === undefined) {
      values.n = Math.floor(Math.random() * 10) + 1;
  }
  
  // Exemple inverse : proportion (x joueurs parmi y)
  // Il faut absolument que x <= y
  else if (values.x !== undefined && values.y !== undefined) {
    if (values.x > values.y) {
      [values.x, values.y] = [values.y, values.x];
    }
  }

  // 3. Cas particulier : éviter les divisions par zéro ou résultats trop simples
  // Si x et y sont identiques, on ajoute un petit décalage
  if (values.x === values.y) {
    values.y += 5;
  }

    // Force le même dénominateur pour l'exo 13
  if (exo.numero === 13) {
      values.z = values.x + Math.floor(Math.random() * 5); // Juste pour varier
      // y reste le même pour les deux fractions
  }

  return values;
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
  
  // Nettoyage : remplace la virgule par un point et enlève les espaces
  let s = input.trim().replace(",", ".").replace(/\s+/g, "");

  // 1. Gestion des puissances (ex: 10^7)
  if (s.includes("^")) {
    const parts = s.split("^");
    if (parts.length === 2) {
      const base = parseFloat(parts[0]);
      const expo = parseFloat(parts[1]);
      if (!isNaN(base) && !isNaN(expo)) {
        return Math.pow(base, expo);
      }
    }
  }

  // 2. Gestion des fractions (ex: 3/4)
  if (s.includes("/")) {
    const [numStr, denStr] = s.split("/");
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (isNaN(num) || isNaN(den) || den === 0) return NaN;
    return num / den;
  }

  // 3. Gestion des nombres classiques
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

  /* --- Validation réponse --- */
  const handleSubmit = async () => {
    if (isSubmitted) return;

    const exo = exercicesBDD[indexExercice];
    if (!exo || !exo.reponse_expr) {
      setFeedback("❌ Correction automatique indisponible");
      return;
    }

    try {
      let expected;
      // userVal est déjà mis en minuscules par parseUserAnswer
      const userVal = parseUserAnswer(userAnswer);

      // 1. Calcul de la réponse attendue
      if (exo.numero === 16) {
        // Évaluation de la condition mathématique
        const boolResult = evaluateExpression(exo.reponse_expr, variablesGen);
        // On stocke "vrai" en minuscules pour la comparaison
        expected = boolResult ? "vrai" : "faux";
      } else {
        // Cas général numérique
        const rawExpected = evaluateExpression(exo.reponse_expr, variablesGen);
        expected = Math.round(rawExpected * 100) / 100;
      }

      // 2. Vérification de la validité
      if (exo.numero !== 16 && isNaN(userVal)) {
        setFeedback("❌ Réponse invalide (nombre ou fraction attendu)");
        return;
      }

      // 3. Logique de correction
      setIsSubmitted(true);
      let correct = false;

      if (exo.numero === 16) {
        // Comparaison insensible à la casse grâce au parseUserAnswer
        correct = (userVal === expected);
      } else {
        correct = isAnswerCorrect(userVal, expected);
      }

      // 4. Feedback et Correction
      if (correct) {
        setFeedback("✅ Correct !");
      } else {
        let texteCorr = replaceVariables(exo.correction, variablesGen);
        
        // On affiche la réponse avec une majuscule pour que ce soit plus joli
        const expectedDisplay = (exo.numero === 16) 
          ? expected.charAt(0).toUpperCase() + expected.slice(1) 
          : expected;

        setFeedback(`❌ Incorrect. La réponse attendue était : ${expectedDisplay}`);
        setCorrectionFinal(texteCorr);
      }

      // 5. Enregistrement des résultats
      await fetch(`${API_URL}/save-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercice_numero: exo.numero,
          exercice_categorie: exo.categorie || 0,
          correct,
          duree: 0
        }),
      });

    } catch (e) {
      console.error("Erreur validation:", e);
      setFeedback("❌ Erreur dans la correction");
      setIsSubmitted(false);
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
        <button onClick={() => navigate("/exercices")} className="categorie-card">📚 Parcourir les exercices</button>
        <button onClick={() => navigate("/methodes")} className="categorie-card">📖 Fiches méthodes</button>
        <button onClick={() => navigate("/retours")} className="categorie-card" style={{ backgroundColor: "#fab1a0" }}>💌 Signaler une erreur </button>
      </div>
    </div> /* Fin de container */
  );
}

export default Home;