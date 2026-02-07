import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css"; // Assurez-vous que le CSS est importé !

function MethodeContent({ text }) {
  if (!text) return null;

  // Étape 1 : On ne touche pas au texte avec normalizeLatex ici 
  // car cela ajoute des délimiteurs \( \) que votre split ne gère pas.

  // Étape 2 : Séparation Blocs ($$)
  const parts = text.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>
      {parts.map((part, i) => {
        if (!part) return null;

        // Rendu Bloc
        if (part.startsWith("$$")) {
          const content = part.replace(/\$\$/g, "");
          return <BlockMath key={i}>{content}</BlockMath>;
        }

        // Rendu Inline ($)
        const inlineParts = part.split(/(\$[^$]+\$)/g);
        return (
          <span key={i}>
            {inlineParts.map((sub, j) => {
              if (sub.startsWith("$")) {
                const content = sub.replace(/\$/g, "");
                return <InlineMath key={j}>{content}</InlineMath>;
              }
              // Texte pur
              return sub;
            })}
          </span>
        );
      })}
    </div>
  );
}

export default MethodeContent;