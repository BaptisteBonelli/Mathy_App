// src/pages/Exercices.js
import React, { useState, useEffect } from "react";
import MethodeContent from "../components/MethodeContent";
import "../styles/Exercices.css";
import { useSearchParams, useNavigate } from "react-router-dom";

/* =========================
   FONCTIONS UTILITAIRES
========================= */

const isLatexSafe = (text) => {
  return !text.includes("\\var(");
};


const extractVariables = (text) => {
  if (!text) return [];
  const vars = new Set();
  
  // Détecte {{x}}, {{y}}, etc.
  const braces = /{{([a-z0-9]+)}}/gi;
  // Détecte \var(x), \var(y), etc.
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
    // Utilisation d'une regex pour remplacer la variable exacte (pas juste la lettre dans un mot)
    e = e.replace(new RegExp(`\\b${v}\\b`, 'g'), val);
  });

  try {
    return Function(`return ${e}`)();
  } catch (err) {
    console.error("Erreur d'évaluation de la formule :", e, err);
    throw err;
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

const isAnswerCorrect = (userValue, expectedValue) => {
  if (isNaN(userValue) || isNaN(expectedValue)) return false;
  if (Math.abs(userValue - expectedValue) < 0.01) return true;
  if (Math.abs(userValue - expectedValue) / Math.abs(expectedValue) < 0.01)
    return true;
  return false;
};

/* =========================
   COMPOSANT REACT
========================= */

function Exercices({ user }) {
  const [categories, setCategories] = useState([]);
  const [automatismesMap, setAutomatismesMap] = useState({});
  const [categorie, setCategorie] = useState(null);
  const [automatismes, setAutomatismes] = useState([]);
  const [selectedAutomatisme, setSelectedAutomatisme] = useState("");

  const [exercicesBDD, setExercicesBDD] = useState([]);
  const [indexExercice, setIndexExercice] = useState(0);

  const [variablesGen, setVariablesGen] = useState({});
  const [enonceFinal, setEnonceFinal] = useState("");
  const [correctionFinal, setCorrectionFinal] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [searchParams] = useSearchParams();
const autoFromUrl = searchParams.get("automatisme");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const checkAuth = (res) => {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      navigate("/login");
      return false;
    }
    return true;
  };

  useEffect(() => {
    fetch("http://localhost:3001/automatismes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!checkAuth(res)) return;
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCategories(Object.keys(data));
          setAutomatismesMap(data);
        }
      });
  }, [token]);

  /* --- Gestion de la redirection via URL (?automatisme=...) --- */
useEffect(() => {
  // 1. On vérifie si un automatisme est présent dans l'URL
  const autoFromUrl = new URLSearchParams(window.location.search).get("automatisme");
  
  // 2. On attend que les catégories soient chargées (le fetch initial)
  if (autoFromUrl && categories.length > 0) {
    
    // 3. On cherche à quelle catégorie appartient cet automatisme
    const foundEntry = Object.entries(automatismesMap).find(([cat, autos]) =>
      autos.includes(autoFromUrl)
    );

    if (foundEntry) {
      const [catName, autosList] = foundEntry;
      
      // 4. On simule la sélection de la catégorie et de l'automatisme
      setCategorie(catName);
      setAutomatismes(autosList);
      handleAutomatismeChange(autoFromUrl);
    }
  }
}, [autoFromUrl, categories, automatismesMap]);

  /* --- Sélection catégorie --- */
  const handleCategorieClick = (cat) => {
    setCategorie(cat);
    setAutomatismes(automatismesMap[cat] || []);
    setSelectedAutomatisme("");
    setExercicesBDD([]);
    setEnonceFinal("");
    setCorrectionFinal("");
    setFeedback("");
    setUserAnswer("");
  };

  /* --- Sélection automatisme --- */
  const handleAutomatismeChange = async (auto) => {
  setSelectedAutomatisme(auto); // Crucial pour que le <select> affiche le bon nom
  setFeedback("");
  setUserAnswer("");
  setIsSubmitted(false);

  if (!auto) return;

  try {
    const res = await fetch(
      `http://localhost:3001/exercices/${encodeURIComponent(auto)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Erreur récupération exercices");
    const data = await res.json();
    setExercicesBDD(data);
    setIndexExercice(0); // On repart du premier
    afficherExercice(data, 0);
  } catch (err) {
    console.error(err);
  }
};

  /* --- Affichage exercice --- */
  const afficherExercice = (list, index) => {
  const exo = list[index];
  if (!exo) return;

  const vars = generateVariables(exo);
  setVariablesGen(vars);

  setEnonceFinal(replaceVariables(exo.enonce, vars));
  setCorrectionFinal("");
  setFeedback("");
  setUserAnswer("");
  setIsSubmitted(false); // <--- AJOUT : On autorise à nouveau la validation
};

  /* --- Changement exercice --- */
  const selectExercice = (i) => {
    setIndexExercice(i);
    afficherExercice(exercicesBDD, i);
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
    const expected = evaluateExpression(exo.reponse_expr, variablesGen);
    const userVal = parseUserAnswer(userAnswer);

    if (isNaN(userVal)) {
      setFeedback("❌ Réponse invalide (nombre ou fraction attendu)");
      return;
    }

    // On bloque le bouton dès que la saisie est valide
    setIsSubmitted(true); 
    
    const correct = isAnswerCorrect(userVal, expected);
    setFeedback(correct ? "✅ Correct !" : "❌ Incorrect");

    // IMPORTANT : On génère la correction si c'est faux
    if (!correct) {
      setCorrectionFinal(replaceVariables(exo.correction, variablesGen));
    }

    // Envoi au backend
    await fetch("http://localhost:3001/save-result", {
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
    console.error(e);
    setFeedback("❌ Erreur dans la correction");
    setIsSubmitted(false); // On débloque en cas d'erreur technique
  }
};
  return (
    <div className="exercices-page">
      <h2 className="main-title">📘 Exercices</h2>

      {/* Catégories */}
      <div className="categorie-grid">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`categorie-card ${categorie === cat ? "active" : ""}`}
            onClick={() => handleCategorieClick(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Automatismes */}
      {automatismes.length > 0 && (
        <div className="select-wrapper" style={{ marginTop: "1rem" }}>
          <select
            value={selectedAutomatisme}
            onChange={(e) => handleAutomatismeChange(e.target.value)}
          >
            <option value="">-- Choisir un automatisme --</option>
            {automatismes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Onglets exercices */}
      {exercicesBDD.length > 1 && (
        <div className="methodes-tabs">
          {exercicesBDD.map((_, i) => (
            <button
              key={i}
              className={`exercice-tab ${indexExercice === i ? "active" : ""}`}
              onClick={() => selectExercice(i)}
            >
              Exercice {i + 1}
            </button>
          ))}
        </div>
      )}
      
      {/* Énoncé */}
      {enonceFinal && (
  <div className="exercise-area">
    <MethodeContent text={enonceFinal} />
  </div>
)}


      {/* Réponse */}
      {enonceFinal && (
        <div className="input-group">
          <input
            type="text"
            placeholder="Ta réponse"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          <button onClick={handleSubmit}>✔</button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`feedback-message ${
            feedback.startsWith("✅") ? "success" : "error"
          }`}
        >
          {feedback}
        </div>
      )}

      {feedback.startsWith("❌") && correctionFinal && (
        <div className="correction-box">
          <h4>Correction détaillée</h4>
          <MethodeContent text={correctionFinal} />
          <button
            className="method-link-btn"
            onClick={() =>
              navigate(
                `/methodes?automatisme=${encodeURIComponent(
                  exercicesBDD[indexExercice].automatisme
                )}`
              )
            }
          >
            📘 Revoir la méthode correspondante
          </button>
        </div>
      )}
    </div>
  );
}

export default Exercices;
