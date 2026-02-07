// src/pages/Exercices.js
import React, { useState } from "react";
import "../styles/Exercices.css";

/* =========================
   MAPPING CATÉGORIES → TYPES
   ========================= */
const EXERCICES_PAR_CATEGORIE = {
  "Calcul numérique et algébrique": [
    "Effectuer des opérations sur les puissances",
    "Effectuer des opérations et des comparaisons entre des fractions simples",
    "Passer d’une écriture d’un nombre à une autre",
    "Estimer un ordre de grandeur"
  ],
  "Proportions et pourcentages": [
    "Déterminer une proportion",
    "Calculer un effectif",
    "Calculer une proportion de proportion"
  ],
  "Évolutions et variations": [
    "Passer d’une formule additive à une formule multiplicative",
    "Calculer un taux d’évolution entre deux valeurs",
    "Appliquer un taux d’évolution pour calculer une valeur de départ ou d’arrivée",
    "Calculer un taux d’évolution global",
    "Calculer un taux d’évolution réciproque"
  ]
};

/* =========================
   GÉNÉRATION DES EXERCICES
   ========================= */
function generateExercise(type) {
  switch (type) {
    // ===== Calcul numérique et algébrique =====
    case "Effectuer des opérations sur les puissances": {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 5) + 2;
      return {
        question: `Calcule : ${a}^${b} × ${a}^${b}`,
        answer: Math.pow(a, b) * Math.pow(a, b)
      };
    }

    case "Effectuer des opérations et des comparaisons entre des fractions simples": {
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      const c = Math.floor(Math.random() * 9) + 1;
      const d = Math.floor(Math.random() * 9) + 1;
      return {
        question: `Calcule et compare : ${a}/${b} ? ${c}/${d}`,
        answer: (a / b > c / d) ? ">" : (a / b < c / d) ? "<" : "="
      };
    }

    case "Passer d’une écriture d’un nombre à une autre": {
      const n = Math.floor(Math.random() * 9000) + 1000;
      return {
        question: `Écris ${n} en notation scientifique.`,
        answer: `${n / 1000}×10^3`
      };
    }

    case "Estimer un ordre de grandeur": {
      const n = Math.floor(Math.random() * 9000) + 1000;
      return {
        question: `Quel est l'ordre de grandeur de ${n} ?`,
        answer: Math.pow(10, Math.floor(Math.log10(n)))
      };
    }

    // ===== Proportions et pourcentages =====
    case "Déterminer une proportion": {
      const total = Math.floor(Math.random() * 90) + 10;
      const part = Math.floor(Math.random() * total) + 1;
      return {
        question: `Quelle proportion représente ${part} sur ${total} ? (en %)`,
        answer: ((part / total) * 100).toFixed(1)
      };
    }

    case "Calculer un effectif": {
      const proportion = Math.floor(Math.random() * 90) + 10;
      const total = Math.floor(Math.random() * 90) + 10;
      return {
        question: `Si ${proportion}% de ${total} personnes ont réussi, combien ?`,
        answer: Math.round((proportion / 100) * total)
      };
    }

    case "Calculer une proportion de proportion": {
      const p1 = Math.floor(Math.random() * 90) + 10;
      const p2 = Math.floor(Math.random() * 90) + 10;
      return {
        question: `Calcule ${p1}% de ${p2}% (en %)`,
        answer: ((p1 / 100) * (p2 / 100) * 100).toFixed(1)
      };
    }

    // ===== Évolutions et variations =====
    case "Passer d’une formule additive à une formule multiplicative": {
      const v0 = Math.floor(Math.random() * 100) + 1;
      const t = Math.floor(Math.random() * 50) + 1;
      return {
        question: `Si une valeur passe de ${v0} à ${v0 + t}, trouve le taux multiplicatif.`,
        answer: ((v0 + t) / v0).toFixed(2)
      };
    }

    case "Calculer un taux d’évolution entre deux valeurs": {
      const v0 = Math.floor(Math.random() * 100) + 1;
      const v1 = Math.floor(Math.random() * 200) + 1;
      return {
        question: `Taux d'évolution de ${v0} à ${v1} (%) ?`,
        answer: (((v1 - v0) / v0) * 100).toFixed(1)
      };
    }

    case "Appliquer un taux d’évolution pour calculer une valeur de départ ou d’arrivée": {
      const v0 = Math.floor(Math.random() * 100) + 1;
      const t = Math.floor(Math.random() * 50) + 1;
      return {
        question: `Si une valeur ${v0} augmente de ${t}%, quelle est la valeur finale ?`,
        answer: (v0 * (1 + t / 100)).toFixed(1)
      };
    }

    case "Calculer un taux d’évolution global": {
      const v0 = Math.floor(Math.random() * 100) + 50;
      const v1 = Math.floor(Math.random() * 200) + 50;
      const v2 = Math.floor(Math.random() * 300) + 50;
      return {
        question: `Valeur passe de ${v0} à ${v1} puis à ${v2}. Taux global ? (%)`,
        answer: (((v2 - v0) / v0) * 100).toFixed(1)
      };
    }

    case "Calculer un taux d’évolution réciproque": {
      const t = Math.floor(Math.random() * 50) + 10;
      return {
        question: `Une valeur augmente de ${t}%. De combien doit-elle diminuer pour revenir à l'original ? (%)`,
        answer: (100 - 100 / (1 + t / 100)).toFixed(1)
      };
    }

    default:
      return { question: "Choisis un type d’exercice", answer: null };
  }
}

/* =========================
   COMPOSANT PRINCIPAL
   ========================= */
function Exercices({ user }) {
  const [categorie, setCategorie] = useState(null);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState("");
  const [exercise, setExercise] = useState({ question: "", answer: null });
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  /* -------- Sélection catégorie -------- */
  const handleCategorieClick = (cat) => {
    setCategorie(cat);
    setTypes(EXERCICES_PAR_CATEGORIE[cat]);
    setType("");
    setExercise({ question: "", answer: null });
    setFeedback("");
  };

  /* -------- Sélection type -------- */
  const handleTypeChange = (value) => {
    setType(value);
    setExercise(generateExercise(value));
    setUserAnswer("");
    setFeedback("");
  };

  /* -------- Générer un nouvel exercice -------- */
  const handleNewExercise = () => {
    if (type) {
      setExercise(generateExercise(type));
      setUserAnswer("");
      setFeedback("");
    }
  };

 /* -------- Validation -------- */
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!exercise.answer) return;

  let correct = false;

  // Si la réponse attendue est un nombre
  if (!isNaN(exercise.answer)) {
    const userNum = parseFloat(userAnswer.replace(",", "."));
    const answerNum = parseFloat(exercise.answer);
    correct = Math.abs(userNum - answerNum) < 0.001;
  } else {
    // Sinon, comparer en string après trim et en minuscule
    correct = userAnswer.trim().toLowerCase() === String(exercise.answer).trim().toLowerCase();
  }

  setFeedback(
    correct
      ? "✅ Bonne réponse !"
      : `❌ Mauvaise réponse. Solution : ${exercise.answer}`
  );

  // Debug log
  console.log({
    user,
    exercise: exercise.question,
    userAnswer,
    answer: exercise.answer,
    correct
  });

  // Envoi au backend
  try {
    await fetch("http://localhost:3001/save-result", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, correct }),
    });
  } catch (err) {
    console.error("Erreur serveur :", err);
  }

  setUserAnswer("");
};


  return (
    <div className="container tests-page">
      <h2>🧠 Exercices d’automatismes</h2>

      {/* CATÉGORIES */}
      <h3>Choisis une catégorie</h3>
      <div className="categorie-grid">
        {Object.keys(EXERCICES_PAR_CATEGORIE).map((cat) => (
          <button
            key={cat}
            className={`categorie-card ${categorie === cat ? "active" : ""}`}
            onClick={() => handleCategorieClick(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* TYPES */}
      {types.length > 0 && (
        <div className="methode-select">
          <h3>Type d’exercice</h3>
          <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="">-- Choisir un type --</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* EXERCICE */}
      {exercise.question && (
        <div className="exercise-card">
          <h3>{exercise.question}</h3>
          <form onSubmit={handleSubmit} className="exercise-form">
            <input
              type="text"
              placeholder="Ta réponse"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              required
            />
            <button type="submit">Valider</button>
            <button
              type="button"
              onClick={handleNewExercise}
              style={{ marginLeft: "10px" }}
            >
              Générer un nouvel exercice
            </button>
          </form>
          {feedback && <p className="feedback">{feedback}</p>}
        </div>
      )}
    </div>
  );
}

export default Exercices;
