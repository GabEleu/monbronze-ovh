import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { realisationCaption } from "@/lib/content/resolve";
import { getRealisation, getRealisations } from "@/content/realisations";
import { site } from "@/content/site";

/**
 * Image de partage d'une histoire (BRIEF.md §8) : titre, badge « Exemple illustratif » et
 * légende « Rendu numérique d'après… » à côté du rendu. Générée au build.
 */
export const alt = "Histoire illustrative de monbronze.fr";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const items = await getRealisations();
  return items.map((r) => ({ slug: r.slug }));
}

export default async function StoryImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getRealisation(slug);
  const r = data?.realisation;
  const png = await readFile(join(process.cwd(), `public/images/og/${slug}.png`)).catch(() => null);
  const legend = r ? realisationCaption(r) : undefined;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0e0d0c",
        color: "#f2ece1",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 700,
          padding: "60px 64px",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 5, color: "#c49a4a" }}>MONBRONZE.FR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.04 }}>
            {r?.titre ?? site.realisations.title}
          </div>
          <div style={{ fontSize: 26, color: "#8b867e" }}>{r?.description ?? ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {r?.type === "illustratif" && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 16px",
                border: "1px solid #c49a4a",
                borderRadius: 999,
                fontSize: 18,
                letterSpacing: 2,
                color: "#c49a4a",
              }}
            >
              {site.realisations.badge.toUpperCase()}
            </div>
          )}
          {legend && <div style={{ fontSize: 16, color: "#8b867e" }}>{legend}</div>}
        </div>
      </div>
      {png && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${png.toString("base64")}`}
          alt=""
          width={480}
          height={600}
          style={{ position: "absolute", right: 15, top: 15 }}
        />
      )}
    </div>,
    size,
  );
}
