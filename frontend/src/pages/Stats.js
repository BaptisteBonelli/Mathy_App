import React, { useEffect, useState, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../styles/Stats.css";
import "../App.css";

const rootStyles = getComputedStyle(document.documentElement);

const COLOR_PURPLE = rootStyles.getPropertyValue("--purple-main");
const COLOR_LIGHT = rootStyles.getPropertyValue("--purple-light");
const COLOR_YELLOW = rootStyles.getPropertyValue("--yellow-accent");
const COLOR_SOFT = rootStyles.getPropertyValue("--purple-soft");

function Stats({ user }) {
  const [stats, setStats] = useState([]);
  const [globalData, setGlobalData] = useState({ total: 0, correct: 0 });
  const [message, setMessage] = useState("");

  const pdfRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Non autorisé");
        return res.json();
      })
      .then((data) => {
        if (!data || data.length === 0) {
          setStats([]);
          setGlobalData({ total: 0, correct: 0 });
          return;
        }

        const CATEGORY_LABELS = {
          1: "Proportions et pourcentages",
          2: "Évolutions et variations",
          3: "Calcul numérique et algébrique",
        };

        const formatted = data.map((d) => ({
          category:
            CATEGORY_LABELS[d.category] || `Catégorie ${d.category}`,
          total: d.total || 0,
          correct: d.correct || 0,
          rate: d.rate || 0,
        }));

        setStats(formatted);

        const total = formatted.reduce((a, c) => a + c.total, 0);
        const correct = formatted.reduce((a, c) => a + c.correct, 0);

        setGlobalData({ total, correct });
      })
      .catch((err) => {
        console.error(err);
        setMessage("Impossible de charger les statistiques.");
      });
  }, [user]);

  const COLORS = [
  COLOR_PURPLE,
  COLOR_SOFT,
  COLOR_YELLOW,
  COLOR_LIGHT,
];


  const pieData = stats.map((s) => ({
    name: s.category,
    value: s.correct,
  }));

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString();

    pdf.setFontSize(22);
    pdf.text("Rapport de révision", 20, 30);
    pdf.setFontSize(14);
    pdf.text(`Utilisateur : ${user || "Utilisateur"}`, 20, 45);
    pdf.text(`Date : ${today}`, 20, 55);

    pdf.addPage();

    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 10, pageWidth, imgHeight);
    pdf.save(`rapport_stats_${today.replaceAll("/", "-")}.pdf`);
  };

  return (
    <div className="stats-page">
      <div className="stats-card" ref={pdfRef}>
        <h2 className="stats-title">📊 Statistiques générales</h2>

        {stats.length === 0 ? (
          <p>Aucune donnée enregistrée pour le moment.</p>
        ) : (
          <>
            {/* Graphique circulaire */}
            <div className="graph-card">
              <h3>Taux de réussite par catégorie</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                        stroke={COLOR_PURPLE}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique en barres */}
            <div className="graph-card">
              <h3>Résultats détaillés</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="correct"
                    fill={COLOR_PURPLE}
                    radius={[8, 8, 0, 0]}
                    name="Réussites"
                  />

                  <Bar
                    dataKey="total"
                    fill={COLOR_YELLOW}
                    radius={[8, 8, 0, 0]}
                    name="Tentatives"
                  />

                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Résumé global */}
            <div className="global-stats">
              <p>
                Total tentatives : <strong>{globalData.total}</strong>
              </p>
              <p>
                Total réussites : <strong>{globalData.correct}</strong>
              </p>
              <p>
                Taux global :{" "}
                <strong>
                  {globalData.total
                    ? Math.round(
                        (globalData.correct / globalData.total) * 100
                      )
                    : 0}
                  %
                </strong>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="stats-actions">
        <button className="btn-pdf" onClick={handleExportPDF}>
          📄 Exporter en PDF
        </button>
      </div>

      {message && <p style={{ color: "#f44336" }}>{message}</p>}
    </div>
  );
}

export default Stats;
