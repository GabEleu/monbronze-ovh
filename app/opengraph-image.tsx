import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/content/site";

/**
 * Image de partage par défaut (BRIEF.md §8) : le buste en bronze du site (rendu numérique
 * d'un scan du SMK, domaine public) sur charbon, avec le titre et la signature.
 * Générée au build (statique).
 */
export const alt = "monbronze.fr : la fonderie d'art accessible au plus grand nombre";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const bust = await readFile(join(process.cwd(), "public/images/og/buste.png"));
const src = `data:image/png;base64,${bust.toString("base64")}`;

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "radial-gradient(circle at 78% 40%, #3a2414 0%, #0e0d0c 60%)",
        color: "#f2ece1",
        padding: "64px 72px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 720,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#c49a4a" }}>MONBRONZE.FR</div>
        <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -2 }}>
          {site.home.hero.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 28, color: "#8b867e" }}>{site.brand.baseline}</div>
          <div style={{ fontSize: 18, color: "#8b867e" }}>
            {"Sculpture : rendu numérique d’après un portrait romain anonyme (SMK, domaine public)"}
          </div>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" height={560} style={{ position: "absolute", right: 90, bottom: 0 }} />
    </div>,
    size,
  );
}
