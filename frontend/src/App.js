import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Methode from "./pages/Methode";
import Exercices from "./pages/Exercices";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Stats from "./pages/Stats";
import Home from "./pages/Home";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(localStorage.getItem("user"));

  // Vérification automatique au démarrage
  useEffect(() => {
    if (token) {
      fetch("http://localhost:3001/verify-token", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
        }
      })
      .catch(() => handleLogout());
    }
  }, [token]);

  const handleLogin = (username) => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    setUser(username);
    localStorage.setItem("user", username);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const RequireAuth = ({ children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <Router>
      {token && <Navbar onLogout={handleLogout} user={user} />}
      <Routes>
        <Route path="/" element={token ? <Home user={user} /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onRegister={handleLogin} />} />
        
        <Route path="/exercices" element={<RequireAuth><Exercices user={user} /></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><Stats user={user} /></RequireAuth>} />
        <Route path="/methodes" element={<RequireAuth><Methode /></RequireAuth>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;