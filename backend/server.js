const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const JWT_SECRET = "SECRET_KEY";
const bcrypt = require("bcrypt");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// ===== SQLITE =====
const db = new sqlite3.Database("BDD1.db", (err) => {
  if (err) {
    console.error("Erreur ouverture DB :", err);
  } else {
    console.log("📦 SQLite connecté");
  }
});

// 🔐 Autoriser lecture pendant écriture
db.serialize(() => {
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA busy_timeout = 5000;");
});

// ===== JWT MIDDLEWARE =====
// Remplace ton middleware authJWT par celui-ci (plus robuste) :
const authJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou format invalide" });
  }

  const token = authHeader.split(" ")[1];
  
  // Correction ici : on utilise uniquement la constante JWT_SECRET
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Session expirée, veuillez vous reconnecter" });
    }
    req.user = decoded;
    next();
  });
};

// Ajoute bien la route de vérification pour App.js
app.get("/verify-token", authJWT, (req, res) => {
  res.json({ valid: true, user: req.user.identifiant });
});

// ===== NORMALIZE =====
const normalize = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// ===== LOGIN =====
// ===== EXERCICE RECOMMANDÉ (PROTÉGÉ) =====
app.get("/recommend-exercise", authJWT, (req, res) => {
  const userIdentifiant = req.user.identifiant;

  // On récupère tous les exercices possibles
  db.all("SELECT DISTINCT automatisme, categorie FROM Exercices", [], (err, allAutos) => {
    if (err) return res.status(500).json({ error: err.message });

    // On récupère les stats de l'utilisateur
    db.all(
      `SELECT Exercice_categorie, SUM(nbre_realisation) as fait, SUM(nbre_juste) as juste 
       FROM Utilisateur_Exercice 
       WHERE Utilisateur_identifiant = ? 
       GROUP BY Exercice_categorie`,
      [userIdentifiant],
      (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        const statsMap = {};
        stats.forEach(s => { statsMap[s.Exercice_categorie] = s; });

        // Algorithme de priorité
        // On cherche l'automatisme dont la catégorie a le score le plus bas
        let bestTarget = allAutos[0].automatisme;
        let minScore = Infinity;

        allAutos.forEach(auto => {
          const stat = statsMap[auto.categorie] || { fait: 0, juste: 0 };
          
          // Calcul du score : (Taux de réussite) + (Nombre de fois fait / 10)
          // Si fait = 0, le score est 0 (priorité maximale)
          let score = stat.fait === 0 ? 0 : (stat.juste / stat.fait) * 100 + (stat.fait * 2);

          if (score < minScore) {
            minScore = score;
            bestTarget = auto.automatisme;
          }
        });

        res.json({ automatisme: bestTarget });
      }
    );
  });
});

app.post("/login", (req, res) => {
  const { user, password } = req.body;

  db.get("SELECT * FROM Utilisateur WHERE identifiant = ?", [user], async (err, dbUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!dbUser) return res.status(401).json({ error: "Utilisateur introuvable" });

    // bcrypt.compare vérifie si le mot de passe clair correspond au hachage
    const isMatch = await bcrypt.compare(password, dbUser.mot_de_passe);

    if (!isMatch) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const token = jwt.sign({ id: dbUser.id, identifiant: dbUser.identifiant }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: dbUser.identifiant, score: dbUser.score || 0 });
  });
});

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { user, password } = req.body;

  db.get("SELECT * FROM Utilisateur WHERE identifiant = ?", [user], async (err, dbUser) => {
    if (dbUser) return res.status(400).json({ error: "Utilisateur déjà existant" });

    try {
      // On génère le hachage (le nombre 10 correspond au coût de calcul)
      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        "INSERT INTO Utilisateur (identifiant, mot_de_passe) VALUES (?, ?)",
        [user, hashedPassword],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          
          const token = jwt.sign({ id: this.lastID, identifiant: user }, JWT_SECRET, { expiresIn: "8h" });
          res.json({ token, user });
        }
      );
    } catch (e) {
      res.status(500).json({ error: "Erreur lors du hachage" });
    }
  });
});

// ===== AUTOMATISMES (PROTÉGÉ) =====
app.get("/automatismes", authJWT, (req, res) => {
  const categoriesMap = {
    1: "Proportions et pourcentages",
    2: "Évolutions et variations",
    3: "Calcul numérique et algébrique",
  };

  db.all(
    "SELECT * FROM Exercices ORDER BY categorie, automatisme",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const map = {};
      rows.forEach((r) => {
        const cat = categoriesMap[r.categorie] || "Autres";
        if (!map[cat]) map[cat] = [];
        if (r.automatisme && !map[cat].includes(r.automatisme)) {
          map[cat].push(r.automatisme);
        }
      });

      res.json(map);
    }
  );
});

// ===== EXERCICES PAR AUTOMATISME (PROTÉGÉ) =====
app.get("/exercices/:automatisme", authJWT, (req, res) => {
  const autoClient = normalize(req.params.automatisme);

  db.all("SELECT * FROM Exercices", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const resultats = rows.filter(
      r => normalize(r.automatisme) === autoClient
    );

    if (resultats.length === 0) {
      return res.status(404).json({ error: "Exercices introuvables" });
    }

    res.json(resultats);
  });
});

// ===== METHODES PAR AUTOMATISME (PROTÉGÉ) =====
app.get("/methode/:automatisme", authJWT, (req, res) => {
  const autoClient = normalize(req.params.automatisme);

  db.all(
    "SELECT * FROM Methode",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const resultats = rows.filter(
        r => normalize(r.automatisme) === autoClient
      );

      if (resultats.length === 0) {
        return res.status(404).json({ error: "Méthode introuvable" });
      }

      res.json(resultats);
    }
  );
});


// ===== STATS (PROTÉGÉ) =====
app.get("/stats", authJWT, (req, res) => {
  const userIdentifiant = req.user.identifiant;

  db.all(
    `
    SELECT
      Exercice_categorie AS category,
      SUM(nbre_realisation) AS total,
      SUM(nbre_juste) AS correct,
      CASE
        WHEN SUM(nbre_realisation) > 0
        THEN ROUND(100.0 * SUM(nbre_juste) / SUM(nbre_realisation))
        ELSE 0
      END AS rate
    FROM Utilisateur_Exercice
    WHERE Utilisateur_identifiant = ?
    GROUP BY Exercice_categorie
    ORDER BY Exercice_categorie
    `,
    [userIdentifiant],
    (err, rows) => {
      if (err) {
        console.error("Erreur SQL stats :", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});


// ===== SAVE RESULT (PROTÉGÉ) =====
app.post("/save-result", authJWT, (req, res) => {
  const {
    exercice_numero,
    exercice_categorie = 0,
    correct,
    duree = 0
  } = req.body;

  const userIdentifiant = req.user.identifiant;
  const dateNow = new Date().toISOString();

  const score = correct ? 1 : 0;
  const incrementJuste = correct ? 1 : 0;

  db.run(
    `
    INSERT INTO Utilisateur_Exercice (
      Utilisateur_identifiant,
      Exercice_numero,
      Exercice_categorie,
      dernier_score,
      meilleur_score,
      date_derniere_realisation,
      duree_realisation,
      nbre_realisation,
      nbre_juste
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(Utilisateur_identifiant, Exercice_numero)
    DO UPDATE SET
      dernier_score = excluded.dernier_score,
      meilleur_score = MAX(meilleur_score, excluded.meilleur_score),
      date_derniere_realisation = excluded.date_derniere_realisation,
      duree_realisation = excluded.duree_realisation,
      nbre_realisation = nbre_realisation + 1,
      nbre_juste = nbre_juste + excluded.nbre_juste
    `,
    [
      userIdentifiant,
      exercice_numero,
      exercice_categorie,
      score,
      score,
      dateNow,
      duree,
      incrementJuste
    ],
    function (err) {
      if (err) {
        console.error("Erreur SQL UPSERT :", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// ... (reste du code inchangé)

// ===== VERIFY TOKEN (Nouveau) =====
app.get("/verify-token", authJWT, (req, res) => {
  // Si le middleware authJWT passe, le token est valide
  res.json({ valid: true, user: req.user.identifiant });
});

app.listen(PORT, () => {
  console.log("✅ Serveur JWT lancé sur http://localhost:" + PORT);
});

app.listen(PORT, () => {
  console.log("✅ Serveur JWT lancé sur http://localhost:" + PORT);
});
