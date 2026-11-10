/**
 * Composition plein écran de l'accueil « La coulée » (BRIEF.md §3.3).
 * Dessinée en premier (fond), en coordonnées écran ; la sculpture 3D est rendue par-dessus.
 *
 * Le titre se comporte comme un MOULE : un filet de bronze en fusion tombe du bec du
 * creuset (gravité), touche la dernière ligne, puis le métal s'étale depuis le point
 * d'impact et son niveau monte dans chaque lettre, ligne après ligne, de bas en haut.
 * Chaque point refroidit dans l'ordre où il a été rempli : blanc-jaune → orange → rouge
 * sombre → bronze. La simulation de fluide (uDye) n'est jamais affichée telle quelle :
 * elle agite le métal liquide (remous du pointeur, impact) et le réchauffe localement.
 *
 * Lisibilité : le <h1> HTML est peint en `mix-blend-mode: lighten` dans la couleur du jeton
 * bronze (globals.css) : la lettre visible vaut max(HTML, canvas), donc jamais moins que
 * le bronze (3,3:1 sur le charbon, grand texte), même si le canvas ne peint rien.
 *
 * Sorties en sRGB direct (pas de tone mapping) : le fond doit égaler le charbon de la page.
 */
import { thermalGLSL } from "@/shaders/thermal";

export const heroCompositeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const heroCompositeFragment = /* glsl */ `
precision highp float;
uniform sampler2D uDye;
uniform sampler2D uMask;
uniform float uMaskReady;
uniform vec4 uHero;        // rectangle de la section : x, y (bas), largeur, hauteur (uv écran)
uniform float uTime;       // secondes depuis le début de la coulée (< 0 : pas encore)
uniform vec4 uLines[6];    // haut, bas, début du remplissage (s), x d'arrivée du métal (uv)
uniform float uLineCount;
uniform float uHeat;       // chaleur globale (halo)
uniform vec2 uPointer;     // pointeur, uv de la section
uniform float uLight;      // lumière rasante du pointeur (0 à 1)
uniform vec2 uMaskTexel;
uniform float uAspect;     // largeur / hauteur de la section
uniform vec4 uPour;        // x du filet, y du bec, y de l'impact (uv), gravité (uv/s²)
uniform float uPourEnd;    // arrêt du versement (s)
uniform float uSpread;     // vitesse d'étalement (hauteurs de section par seconde)
uniform float uFill;       // montée du niveau dans une colonne de lettre (s)
uniform float uCoolTime;   // refroidissement d'un point après son remplissage (s)
uniform vec4 uBust;        // socle de la sculpture : x, y (uv), demi-largeur (uv x), chaleur
uniform float uBustShadow; // ombre de contact sous la sculpture (0 à 1)
varying vec2 vUv;

${thermalGLSL}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float readDye(vec2 uv) {
  float t = texture2D(uDye, uv).r;
  return (t == t) ? clamp(t, 0.0, 1.5) : 0.0;
}

const vec3 CHARBON = vec3(0.0549, 0.0510, 0.0471);
const vec3 IVOIRE = vec3(0.949, 0.925, 0.882);
// Jeton « bronze » de la charte : contraste 3,3:1 sur le charbon (grand texte).
const vec3 BRONZE = vec3(0.541, 0.353, 0.196);

void main() {
  vec2 huv = (vUv - uHero.xy) / uHero.zw;
  if (huv.x < 0.0 || huv.x > 1.0 || huv.y < 0.0 || huv.y > 1.0) {
    gl_FragColor = vec4(CHARBON, 1.0);
    return;
  }
  vec3 col = CHARBON;

  // Socle de la sculpture : ombre de contact, et bain de métal d'où elle émerge.
  vec2 bd = vec2(huv.x - uBust.x, (huv.y - uBust.y) * 5.0 / uAspect) / max(uBust.z, 0.001);
  float bdist = length(bd);
  col *= 1.0 - 0.55 * uBustShadow * (1.0 - smoothstep(0.35, 1.0, bdist));
  if (uBust.w > 0.001) {
    float pool = 1.0 - smoothstep(0.15, 0.95, bdist + (noise(huv * vec2(90.0, 30.0) + uTime * 0.6) - 0.5) * 0.25);
    col += thermal(0.35 + 0.4 * uBust.w) * pool * uBust.w * 0.6;
  }

  // Halo incandescent autour des lettres chaudes, qui s'estompe au refroidissement.
  float halo = texture2D(uMask, huv, 5.0).r * uMaskReady;
  col += thermal(0.7) * halo * uHeat * 0.2;

  // Lettres : un moule que le métal remplit.
  vec4 mk = texture2D(uMask, huv);
  float m = smoothstep(0.35, 0.5, mk.r) * uMaskReady;
  if (m > 0.0) {
    // Remous : le fluide simulé déforme la surface du métal liquide et le réchauffe.
    float dye = readDye(huv);
    vec2 e = uMaskTexel * 4.0;
    vec2 grad = vec2(
      readDye(huv + vec2(e.x, 0.0)) - readDye(huv - vec2(e.x, 0.0)),
      readDye(huv + vec2(0.0, e.y)) - readDye(huv - vec2(0.0, e.y))
    );
    vec2 wuv = huv + grad * 0.004;
    vec2 sp = vec2(wuv.x * uAspect, wuv.y); // espace isotrope (unités de hauteur)

    // Abscisse du centre de la lettre : le niveau monte à l'horizontale dans chaque glyphe.
    float glyphX = mk.g / max(mk.r, 0.004);
    float filled = 0.0;
    float temp = 0.0;
    float menisc = 0.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uLineCount) break;
      vec4 L = uLines[i];
      if (huv.y <= L.x + 0.01 && huv.y >= L.y - 0.01) {
        float local = clamp((huv.y - L.y) / max(L.x - L.y, 0.0001), 0.0, 1.0);
        // Le métal arrive au pied de cette colonne, puis son niveau monte.
        float arrive = L.z + abs(glyphX - L.w) * uAspect / uSpread;
        float level = (uTime - arrive) / uFill;
        // Surface du bain : ondes qui s'amortissent quand la colonne est pleine.
        level += (sin(sp.x * 60.0 + uTime * 8.0) * 0.5 + noise(vec2(sp.x * 40.0, uTime * 2.0)) - 0.5)
               * 0.05 * (1.0 - clamp(level, 0.0, 1.0));
        filled = smoothstep(-0.02, 0.02, level - local);
        float age = uTime - (arrive + local * uFill);
        temp = 1.0 - smoothstep(0.0, uCoolTime, age);
        menisc = (1.0 - smoothstep(0.0, 0.04, level - local)) * filled * (1.0 - smoothstep(0.9, 1.05, level));
      }
    }
    temp = max(temp * filled, clamp(dye, 0.0, 1.0) * 0.85 * filled);

    // Bronze refroidi : face plate, chanfrein net (masque peu flouté), reflet en bande.
    float mx = texture2D(uMask, huv + vec2(uMaskTexel.x, 0.0), 0.5).r - texture2D(uMask, huv - vec2(uMaskTexel.x, 0.0), 0.5).r;
    float my = texture2D(uMask, huv + vec2(0.0, uMaskTexel.y), 0.5).r - texture2D(uMask, huv - vec2(0.0, uMaskTexel.y), 0.5).r;
    vec3 n = normalize(vec3(-mx, -my, 0.6));
    vec3 Lfix = normalize(vec3(-0.45, 0.6, 0.65));
    vec2 toPointer = (uPointer - huv) * vec2(uAspect, 1.0);
    vec3 Lptr = normalize(vec3(toPointer, 0.35));
    vec3 Ld = normalize(mix(Lfix, Lptr, uLight));
    float spec = pow(max(dot(reflect(-Ld, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);
    float ptrFalloff = mix(1.0, 1.0 / (1.0 + dot(toPointer, toPointer) * 6.0), uLight);
    vec3 bronze = mix(BRONZE, vec3(0.93, 0.78, 0.52), pow(1.0 - abs(n.y - 0.3), 3.0) * 0.8);
    bronze += spec * vec3(1.0, 0.86, 0.62) * 0.6 * ptrFalloff;
    bronze *= 0.94 + 0.06 * noise(huv * vec2(220.0, 90.0));

    // Métal liquide : croûte sombre qui se forme en refroidissant, lueur qui ondule.
    vec3 hot = thermal(0.36 + 0.5 * temp);
    float crust = smoothstep(0.55, 0.75, noise(sp * vec2(26.0, 9.0) + vec2(uTime * 0.15, -uTime * 0.08)));
    hot *= 1.0 - 0.4 * crust * smoothstep(0.95, 0.5, temp);
    hot *= 0.92 + 0.16 * noise(sp * vec2(70.0, 24.0) + vec2(0.0, uTime * 1.5));
    vec3 metal = mix(bronze, hot, smoothstep(0.02, 0.3, temp));
    metal += thermal(1.0) * menisc * 1.2;

    // Avant la coulée : lettres ivoire. Dès le versement, elles deviennent un MOULE vide
    // (cavité sombre, arête ivoire) que le métal incandescent vient remplir. Pendant ce
    // temps, le contour ivoire du <h1> HTML garantit la lisibilité (globals.css).
    float rim = 1.0 - smoothstep(0.75, 0.97, texture2D(uMask, huv, 2.0).r);
    vec3 mold = mix(CHARBON * 1.8, IVOIRE * 0.9, rim);
    vec3 empty = mix(IVOIRE, mold, smoothstep(0.0, 0.4, uTime));
    vec3 letter = mix(empty, metal, filled);
    if (!(letter.r == letter.r) || !(letter.g == letter.g) || !(letter.b == letter.b)) letter = IVOIRE;
    // Métal (rempli) : jamais plus sombre que le jeton bronze.
    letter = mix(letter, max(letter, BRONZE), filled);
    col = mix(col, letter, m);
  }

  // Filet de coulée : une corde de métal OPAQUE au bord net, cœur blanc-jaune, qui tombe
  // du bec (gravité), s'affine en accélérant et se détache à l'arrêt du versement.
  if (uTime > 0.0) {
    float g = uPour.w;
    float headY = uPour.y - 0.5 * g * uTime * uTime;
    float tt = max(uTime - uPourEnd, 0.0);
    float tailY = uPour.y - 0.5 * g * tt * tt;
    float lowY = max(headY, uPour.z);
    if (tailY > uPour.z && huv.y < tailY + 0.02 && huv.y > lowY - 0.02) {
      float fall = clamp((uPour.y - huv.y) / max(uPour.y - uPour.z, 0.001), 0.0, 1.0);
      float halfW = mix(0.016, 0.0075, sqrt(fall));
      float wob = (sin(huv.y * 40.0 - uTime * 9.0) * 0.004 + sin(huv.y * 97.0 - uTime * 15.0) * 0.0012) * fall;
      float u = ((huv.x - uPour.x) * uAspect - wob) / halfW;
      float d = abs(u) + (noise(vec2(huv.y * 140.0 - uTime * 40.0, 0.5)) - 0.5) * 0.18 * fall;
      float along = smoothstep(lowY - 0.004, lowY + 0.004, huv.y) * (1.0 - smoothstep(tailY - 0.006, tailY, huv.y));
      float a = (1.0 - smoothstep(0.78, 1.0, d)) * along;
      float flow = noise(vec2(u * 1.5 + 4.0, huv.y * 60.0 + uTime * 7.0));
      // Peau orange, cœur blanc-jaune au centre seulement.
      vec3 c = thermal(0.62 + 0.3 * (1.0 - u * u)) * (0.9 + 0.2 * flow);
      c += vec3(1.0, 0.97, 0.9) * pow(max(1.0 - abs(u + 0.35) * 2.2, 0.0), 3.0) * 0.35;
      col += thermal(0.62) * exp(-max(d - 1.0, 0.0) * 2.5) * 0.22 * along * (1.0 - a);
      col = mix(col, c, a);
    }
    // Impact : éclaboussure lumineuse là où le filet touche le métal.
    if (headY <= uPour.z + 0.01 && tailY > uPour.z) {
      vec2 q = vec2((huv.x - uPour.x) * uAspect, (huv.y - uPour.z) * 2.4);
      col += thermal(0.92) * exp(-dot(q, q) / 0.0006) * 0.55;
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
