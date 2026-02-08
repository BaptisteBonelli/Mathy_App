require('dotenv').config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@libsql/client");
const jwt = require("jsonwebtoken");



const app = express();
const PORT = process.env.PORT || 3001;
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
  origin: "*",
  credentials: true
}));
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
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
app.get("/recommend-exercise", authJWT, async (req, res) => {
  const userIdentifiant = req.user.identifiant;

  try {
    // 1. On lance les deux requêtes de manière asynchrone
    // On récupère tous les exercices possibles
    const rsAutos = await db.execute("SELECT DISTINCT automatisme, categorie FROM Exercices");
    const allAutos = rsAutos.rows;

    if (allAutos.length === 0) {
      return res.status(404).json({ error: "Aucun exercice disponible" });
    }

    // 2. On récupère les stats de l'utilisateur
    const rsStats = await db.execute({
      sql: `SELECT Exercice_categorie, SUM(nbre_realisation) as fait, SUM(nbre_juste) as juste 
            FROM Utilisateur_Exercice 
            WHERE Utilisateur_identifiant = ? 
            GROUP BY Exercice_categorie`,
      args: [userIdentifiant]
    });
    const stats = rsStats.rows;

    // --- À partir d'ici, ta logique de calcul reste quasiment identique ---
    
    const statsMap = {};
    stats.forEach(s => { 
      statsMap[s.Exercice_categorie] = s; 
    });

    let bestTarget = allAutos[0].automatisme;
    let minScore = Infinity;

    allAutos.forEach(auto => {
      // Note : Avec Turso, vérifie si les noms de colonnes sont respectés (majuscules/minuscules)
      const stat = statsMap[auto.categorie] || { fait: 0, juste: 0 };
      
      // Ton algorithme de priorité
      let score = stat.fait === 0 ? 0 : (stat.juste / stat.fait) * 100 + (stat.fait * 2);

      if (score < minScore) {
        minScore = score;
        bestTarget = auto.automatisme;
      }
    });

    res.json({ automatisme: bestTarget });

  } catch (err) {
    console.error("Erreur recommandation :", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { user, password } = req.body;

  try {
    // 1. On cherche l'utilisateur avec Turso
    const rs = await db.execute({
      sql: "SELECT * FROM Utilisateur WHERE identifiant = ?",
      args: [user]
    });

    // 2. On récupère la première ligne (s'il y en a une)
    const dbUser = rs.rows[0];

    if (!dbUser) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    // 3. bcrypt.compare est déjà asynchrone, on garde le await
    const isMatch = await bcrypt.compare(password, dbUser.mot_de_passe);

    if (!isMatch) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    // 4. Génération du token (synchrone, pas de changement)
    const token = jwt.sign(
      { id: dbUser.id, identifiant: dbUser.identifiant }, 
      JWT_SECRET, 
      { expiresIn: "8h" }
    );

    res.json({ 
      token, 
      user: dbUser.identifiant, 
      score: dbUser.score || 0 
    });

  } catch (err) {
    console.error("Erreur Login Turso :", err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
});

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { user, password } = req.body;

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const rsCheck = await db.execute({
      sql: "SELECT * FROM Utilisateur WHERE identifiant = ?",
      args: [user]
    });

    if (rsCheck.rows.length > 0) {
      return res.status(400).json({ error: "Utilisateur déjà existant" });
    }

    // 2. Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insertion du nouvel utilisateur
    const rsInsert = await db.execute({
      sql: "INSERT INTO Utilisateur (identifiant, mot_de_passe) VALUES (?, ?)",
      args: [user, hashedPassword]
    });

    // Note : Turso utilise 'lastInsertRowid' au lieu de 'this.lastID'
    const newId = rsInsert.lastInsertRowid;

    // 4. Création du token
    const token = jwt.sign(
      { id: String(newId), identifiant: user }, 
      JWT_SECRET, 
      { expiresIn: "8h" }
    );

    res.json({ token, user });

  } catch (e) {
    console.error("Erreur Register Turso :", e);
    res.status(500).json({ error: "Erreur lors de la création du compte" });
  }
});

// ===== ENVOYER UN RETOUR (PROTÉGÉ) =====
app.post("/feedback", authJWT, async (req, res) => {
  const { message } = req.body;
  const userIdentifiant = req.user.identifiant;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Le message ne peut pas être vide." });
  }

  try {
    await db.execute({
      sql: "INSERT INTO Retours (utilisateur_identifiant, message) VALUES (?, ?)",
      args: [userIdentifiant, message]
    });

    res.json({ success: true, message: "Retour envoyé avec succès !" });
  } catch (err) {
    console.error("Erreur insertion retour :", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du retour." });
  }
});

// ===== AUTOMATISMES (PROTÉGÉ) =====
app.get("/automatismes", authJWT, async (req, res) => {
  const categoriesMap = {
    1: "Proportions et pourcentages",
    2: "Évolutions et variations",
    3: "Calcul numérique et algébrique",
  };

  try {
    // 1. On utilise await pour attendre la réponse de Turso
    const rs = await db.execute("SELECT * FROM Exercices ORDER BY categorie, automatisme");
    
    // 2. Les données sont dans rs.rows
    const rows = rs.rows;

    const map = {};
    rows.forEach((r) => {
      // Note : Vérifie que r.categorie et r.automatisme sont bien écrits ainsi dans ta DB
      const cat = categoriesMap[r.categorie] || "Autres";
      if (!map[cat]) map[cat] = [];
      if (r.automatisme && !map[cat].includes(r.automatisme)) {
        map[cat].push(r.automatisme);
      }
    });

    res.json(map);

  } catch (err) {
    console.error("Erreur récup automatismes :", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== EXERCICES PAR AUTOMATISME (PROTÉGÉ) =====
app.get("/exercices/:automatisme", authJWT, async (req, res) => {
  const autoClient = normalize(req.params.automatisme);

  try {
    // 1. On récupère tous les exercices
    const rs = await db.execute("SELECT * FROM Exercices");
    const rows = rs.rows;

    // 2. On filtre avec ta fonction normalize
    const resultats = rows.filter(
      r => normalize(r.automatisme) === autoClient
    );

    if (resultats.length === 0) {
      return res.status(404).json({ error: "Exercices introuvables" });
    }

    res.json(resultats);

  } catch (err) {
    console.error("Erreur récup exercices :", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== METHODES PAR AUTOMATISME (PROTÉGÉ) =====
app.get("/methode/:automatisme", authJWT, async (req, res) => {
  const autoClient = normalize(req.params.automatisme);

  try {
    // 1. On récupère toutes les méthodes
    const rs = await db.execute("SELECT * FROM Methode");
    const rows = rs.rows;

    // 2. On filtre avec ta fonction normalize
    const resultats = rows.filter(
      r => normalize(r.automatisme) === autoClient
    );

    if (resultats.length === 0) {
      return res.status(404).json({ error: "Méthode introuvable" });
    }

    res.json(resultats);

  } catch (err) {
    console.error("Erreur récup méthode :", err);
    res.status(500).json({ error: err.message });
  }
});


// ===== STATS (PROTÉGÉ) =====
app.get("/stats", authJWT, async (req, res) => {
  const userIdentifiant = req.user.identifiant;

  try {
    const rs = await db.execute({
      sql: `
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
      args: [userIdentifiant]
    });

    res.json(rs.rows);
  } catch (err) {
    console.error("Erreur SQL stats :", err);
    res.status(500).json({ error: err.message });
  }
});


// ===== SAVE RESULT (PROTÉGÉ) =====
app.post("/save-result", authJWT, async (req, res) => {
  const {
    exercice_numero,
    exercice_categorie = 0,
    correct,
    duree = 0
  } = req.body;

  const userIdentifiant = req.user.identifiant;
  const dateNow = new Date().toISOString();

  const score = correct ? 1 : 0;
  // Note : score et incrementJuste sont identiques ici (1 si correct, 0 sinon)

  try {
    await db.execute({
      sql: `
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
          meilleur_score = MAX(Utilisateur_Exercice.meilleur_score, excluded.meilleur_score),
          date_derniere_realisation = excluded.date_derniere_realisation,
          duree_realisation = excluded.duree_realisation,
          nbre_realisation = Utilisateur_Exercice.nbre_realisation + 1,
          nbre_juste = Utilisateur_Exercice.nbre_juste + excluded.nbre_juste
      `,
      args: [
        userIdentifiant,
        exercice_numero,
        exercice_categorie,
        score,
        score,
        dateNow,
        duree,
        score
      ]
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur Turso UPSERT :", err);
    res.status(500).json({ error: err.message });
  }
});

// ... (reste du code inchangé)

// ===== VERIFY TOKEN (Nouveau) =====
app.get("/verify-token", authJWT, (req, res) => {
  // Si le middleware authJWT passe, le token est valide
  res.json({ valid: true, user: req.user.identifiant });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

