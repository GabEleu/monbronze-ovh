"use client";

/**
 * Dernier filet : une erreur dans le layout racine. Next remplace alors tout le document,
 * sans nos styles globaux : page autonome, sobre, en français, avec styles en ligne.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0e0d0c",
          color: "#f2ece1",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <title>Une erreur est survenue · monbronze.fr</title>
        <main style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "2rem" }}>
            Une erreur est survenue.
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            La page n&apos;a pas pu s&apos;afficher. Vous pouvez réessayer, ou nous écrire à{" "}
            <a href="mailto:contact@monbronze.fr" style={{ color: "#c49a4a" }}>
              contact@monbronze.fr
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.25rem",
              background: "#c49a4a",
              color: "#0e0d0c",
              border: 0,
              borderRadius: "999px",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
