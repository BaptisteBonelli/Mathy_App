import React, { useState, useEffect } from "react";
import MethodeContent from "../components/MethodeContent";
import "../App.css";
import "../styles/Resume.css"
import { useSearchParams, useNavigate } from "react-router-dom";

const METHODES_PAR_CATEGORIE = {
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
  ],
  "Calcul numérique et algébrique": [
    "Effectuer des opérations sur les puissances",
    "Effectuer des opérations et des comparaisons entre des fractions simples",
    "Passer d’une écriture d’un nombre à une autre",
    "Estimer un ordre de grandeur"
  ]
};

const CATEGORIES = Object.keys(METHODES_PAR_CATEGORIE);

function Methode() {
  const [methodesBDD, setMethodesBDD] = useState([]);
  const [indexMethode, setIndexMethode] = useState(0);
  const [categorie, setCategorie] = useState(null);
  const [methodes, setMethodes] = useState([]);
  const [selectedMethode, setSelectedMethode] = useState("");
  const [contenu, setContenu] = useState("");
  const [searchParams] = useSearchParams();
  const autoFromUrl = searchParams.get("automatisme");
  const navigate = useNavigate();

  useEffect(() => {
    if (!autoFromUrl) return;

    const normalize = s =>
      s.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const autoNorm = normalize(autoFromUrl);

    const found = Object.entries(METHODES_PAR_CATEGORIE)
      .find(([_, autos]) =>
        autos.some(a => normalize(a) === autoNorm)
      );

    if (!found) {
      console.warn("Automatisme introuvable :", autoFromUrl);
      return;
    }

    const [cat, autos] = found;
    const realName = autos.find(a => normalize(a) === autoNorm);

    setCategorie(cat);
    setMethodes(autos);
    setSelectedMethode(realName);
  }, [autoFromUrl]);

  useEffect(() => {
    if (!selectedMethode) return;
    handleMethodeChange(selectedMethode);
  }, [selectedMethode]);

  const handleCategorieClick = (cat) => {
    setCategorie(cat);
    setMethodes(METHODES_PAR_CATEGORIE[cat] || []);
    setSelectedMethode("");
    setMethodesBDD([]);
    setIndexMethode(0);
    setContenu("");
  };

  // ... (imports et constantes)
const handleMethodeChange = async (methode) => {
    setSelectedMethode(methode);
    if (!methode) return;

    try {
        const res = await fetch(
            `http://localhost:3001/methode/${encodeURIComponent(methode)}`,
            {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token")
                }
            }
        );

        if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            navigate("/login");
            return;
        }

        const data = await res.json();
        setMethodesBDD(data);
        afficherMethode(data, 0, methode);
    } catch {
        setContenu("❌ Méthode introuvable.");
    }
};

  const afficherMethode = (list, index, automatisme) => {
    const m = list[index];
    setContenu(`
### ${automatisme} — Méthode ${index + 1}

${m.contenu}

---

### Exemple

${m.exemple}
`);
  };

  return (
    <div className="container">
      <h2>📘 Méthodes</h2>
      <h3>Sélectionne une catégorie</h3>

      {/* Boutons catégories */}
      <div className="categorie-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`categorie-card ${categorie === cat ? "active" : ""}`}
            onClick={() => handleCategorieClick(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Liste déroulante */}
      {methodes.length > 0 && (
        <div className="methode-select">
          <h3>Méthode</h3>
          <select
            value={selectedMethode}
            onChange={(e) => handleMethodeChange(e.target.value)}
          >
            <option value="">-- Choisir une méthode --</option>
            {methodes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Boutons Méthode 1 / 2 / 3 */}
      {methodesBDD.length > 1 && (
        <div className="methodes-tabs">
          {methodesBDD.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndexMethode(i);
                afficherMethode(methodesBDD, i, selectedMethode);
              }}
              className={indexMethode === i ? "active" : ""}
            >
              Méthode {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Contenu */}
      {contenu && (
        <div className="methode-contenu">
          <MethodeContent text={contenu} />
        </div>
      )}

      {/* Bouton de redirection vers les exercices */}
      {selectedMethode && contenu && !contenu.includes("❌") && (
        <div style={{ marginTop: "2rem", textAlign: "center", paddingBottom: "2rem" }}>
          <button
            className="method-link-btn"
            onClick={() =>
              navigate(`/exercices?automatisme=${encodeURIComponent(selectedMethode)}`)
            }
          >
            ✏️ S'entraîner sur cet automatisme
          </button>
        </div>
      )}
    </div>
  );
}

export default Methode;