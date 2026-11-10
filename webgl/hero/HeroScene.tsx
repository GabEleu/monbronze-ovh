"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Quality } from "@/webgl/quality";
import type { HeroRegistration } from "@/webgl/scenes";
import { getStage, reportLoad, setStage, startPour } from "@/webgl/stage";
import { FluidSim, FLUID_HIGH, FLUID_MEDIUM } from "@/webgl/fluid/FluidSim";
import { drawTitleLayout, titleSignature, type TitleLine } from "@/webgl/hero/titleLayout";
import { heroCompositeFragment, heroCompositeVertex } from "@/shaders/heroComposite";
import {
  applyPatina,
  createBronzeMaterial,
  PATINA_PRESETS,
  setReveal,
  type BronzeMaterial,
} from "@/webgl/materials/bronze";
import { getPatineDuJour } from "@/lib/patine";
import { playTing } from "@/lib/sound";
import { Sculpture } from "@/webgl/scene/Sculpture";

/** Rythme de la coulée (secondes). */
const T = {
  /** Chute du filet, du bec du creuset jusqu'à la dernière ligne. */
  fall: 0.42,
  /** Décalage entre deux lignes : le moule se remplit de bas en haut. */
  lineStep: 0.5,
  /** Étalement du métal depuis le point d'impact (hauteurs de section par seconde). */
  spread: 1.1,
  /** Montée du niveau dans une colonne de lettre. */
  fill: 0.8,
  /** Refroidissement d'un point après son remplissage (blanc → rouge → bronze). */
  cool: 1.4,
  /** La sculpture émerge de son bain une fois le remplissage bien engagé. */
  revealDelay: 1.6,
  revealDuration: 1.5,
  heatDuration: 2.4,
};

type Timeline = {
  pourEnd: number;
  revealStart: number;
  done: number;
  lineStarts: number[];
  entries: number[];
};

/** Chronologie déduite de la mise en page réelle du titre (nombre et largeur des lignes). */
function timeline(lines: TitleLine[], pourX: number, aspect: number): Timeline {
  const n = Math.max(1, lines.length);
  let fillEnd = T.fall + T.fill;
  const lineStarts: number[] = [];
  const entries: number[] = [];
  lines.forEach((line, i) => {
    const start = T.fall + (n - 1 - i) * T.lineStep;
    const entry = Math.min(line.right, Math.max(line.left, pourX));
    const spread = (Math.max(entry - line.left, line.right - entry) * aspect) / T.spread;
    lineStarts.push(start);
    entries.push(entry);
    fillEnd = Math.max(fillEnd, start + spread + T.fill);
  });
  const revealStart = T.fall + T.revealDelay;
  return {
    pourEnd: T.fall + (n - 1) * T.lineStep + T.fill * 0.7,
    revealStart,
    done: Math.max(fillEnd + T.cool, revealStart + T.heatDuration) + 0.1,
    lineStarts,
    entries,
  };
}

const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);

// Un seul matériau, gardé d'une visite de l'accueil à l'autre (pas de recompilation).
let heroMaterial: BronzeMaterial | null = null;
function getHeroMaterial() {
  if (!heroMaterial) {
    heroMaterial = createBronzeMaterial("brun-medaille");
    setReveal(heroMaterial, true);
    // Patine du jour (tirée une fois par session).
    applyPatina(heroMaterial, PATINA_PRESETS[getPatineDuJour()]);
  }
  return heroMaterial;
}

function ReportLoaded({ name }: { name: "model" }) {
  useEffect(() => reportLoad(name, 1), [name]);
  return null;
}

export function HeroScene({
  hero,
  quality,
  onVisibility,
  demand,
}: {
  hero: HeroRegistration;
  quality: Quality;
  onVisibility: (visible: boolean) => void;
  /** Le canvas ne rend que si la scène le demande (aucun coût au repos). */
  demand: React.RefObject<() => boolean>;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const sim = useMemo(() => {
    const r = hero.section.getBoundingClientRect();
    return new FluidSim(
      gl,
      r.width / Math.max(1, r.height),
      quality === "high" ? FLUID_HIGH : FLUID_MEDIUM,
    );
  }, [gl, hero, quality]);

  const material = useMemo(() => {
    const m = getHeroMaterial();
    m.userData.uniforms.uReveal.value = 0;
    m.userData.uniforms.uHeat.value = 1;
    return m;
  }, []);

  const composite = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: heroCompositeVertex,
        fragmentShader: heroCompositeFragment,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uDye: { value: null },
          uMask: { value: null },
          uMaskReady: { value: 0 },
          uHero: { value: new THREE.Vector4(0, 0, 1, 1) },
          uTime: { value: -1 },
          uLines: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
          uLineCount: { value: 0 },
          uHeat: { value: 0 },
          uPointer: { value: new THREE.Vector2(-1, -1) },
          uLight: { value: 0 },
          uMaskTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
          uAspect: { value: 1 },
          uPour: { value: new THREE.Vector4(0.4, 1.02, 0.2, 10) },
          uPourEnd: { value: 1 },
          uSpread: { value: T.spread },
          uFill: { value: T.fill },
          uCoolTime: { value: T.cool },
          uBust: { value: new THREE.Vector4(0.8, 0.3, 0.1, 0) },
          uBustShadow: { value: 0 },
        },
      }),
    [],
  );

  const layout = useRef<{
    texture: THREE.CanvasTexture;
    lines: TitleLine[];
    pourX: number;
    signature: string;
    timeline: Timeline;
  } | null>(null);
  const alive = useRef(true);
  const visible = useRef(true);
  const compositeMesh = useRef<THREE.Mesh>(null);
  const firstFrame = useRef(false);
  const dirty = useRef(true);
  const lastRect = useRef("");
  const lastSplat = useRef(0);
  const pointer = useRef({ x: -1, y: -1, ax: 0, ay: 0, moved: false, at: 0, touch: false });
  /** Écran tactile : la sculpture se tourne aussi avec le défilement (aucun survol possible). */
  const touchUI = useMemo(() => window.matchMedia("(hover: none)").matches, []);
  /** Rotation pas encore arrivée : on continue de dessiner jusqu'à ce qu'elle se pose. */
  const turning = useRef(false);
  const taps = useRef<{ x: number; y: number }[]>([]);
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  // Masque du titre : reconstruit dès que la mise en page change (polices, taille,
  // espacement du texte, traduction de la page…), sinon les lettres du canvas glisseraient.
  useEffect(() => {
    alive.current = true;
    let aspect = 0;
    const build = () => {
      if (!alive.current) return;
      if (layout.current && layout.current.signature === titleSignature(hero.title, hero.section))
        return;
      const l = drawTitleLayout(hero.title, hero.section);
      if (!l) return;
      layout.current?.texture.dispose();
      const texture = new THREE.CanvasTexture(l.canvas);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      const r = hero.section.getBoundingClientRect();
      const a = r.width / Math.max(1, r.height);
      const tl = timeline(l.lines, l.pourX, a);
      layout.current = { ...l, texture, timeline: tl };

      const u = composite.uniforms;
      u.uMask!.value = texture;
      u.uMaskReady!.value = 1;
      u.uMaskTexel!.value.set(1 / l.canvas.width, 1 / l.canvas.height);
      u.uLineCount!.value = l.lines.length;
      l.lines.forEach((line, i) => {
        u.uLines!.value[i].set(line.top, line.bottom, tl.lineStarts[i], tl.entries[i]);
      });
      u.uPourEnd!.value = tl.pourEnd;
      sim.mask = texture;
      // Nouvelle allocation du fluide seulement si les proportions changent vraiment.
      if (Math.abs(a - aspect) / Math.max(aspect, 0.001) > 0.01) {
        sim.resize(a);
        aspect = a;
      }
      dirty.current = true;
    };
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 60);
    };
    document.fonts.ready.then(() => {
      reportLoad("fonts", 1);
      build();
    });
    document.fonts.addEventListener("loadingdone", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(hero.section);
    ro.observe(hero.title);
    const mo = new MutationObserver(schedule);
    mo.observe(hero.title, { subtree: true, childList: true, characterData: true });
    // Filet de sécurité (espacement du texte modifié par une extension, zoom…).
    const poll = window.setInterval(build, 500);
    return () => {
      alive.current = false;
      ro.disconnect();
      mo.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [hero, composite, sim]);

  // Visibilité de la section (le rendu s'arrête quand elle sort de l'écran).
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        onVisibility(visible.current);
        dirty.current = true;
      },
      { threshold: 0, rootMargin: "20% 0px" },
    );
    io.observe(hero.section);
    return () => {
      io.disconnect();
      onVisibility(false);
    };
  }, [hero, onVisibility]);

  // Pointeur : remue le métal chaud, puis devient lumière rasante.
  // Écran tactile (sans survol) : le doigt fait de même dès qu'il se pose, y compris pendant
  // un défilement (événements tactiles passifs, que le navigateur envoie aussi pendant le
  // défilement, contrairement aux événements de pointeur). L'ordinateur est inchangé.
  useEffect(() => {
    const place = (clientX: number, clientY: number, stir: boolean, touch: boolean) => {
      const r = hero.section.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = 1 - (clientY - r.top) / r.height;
      const p = pointer.current;
      if (stir && p.x >= 0) {
        p.ax += (x - p.x) * r.width;
        p.ay += (y - p.y) * r.height;
        p.moved = true;
      }
      p.x = x;
      p.y = y;
      p.at = performance.now();
      p.touch = touch;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      place(e.clientX, e.clientY, true, false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    if (!touchUI) return () => window.removeEventListener("pointermove", onMove);

    // Un seul doigt, posé dans l'accueil visible, hors des liens, boutons et de l'en-tête.
    // Son identifiant est suivi : un second doigt (pincement) ou un autre geste n'agit pas.
    // Le toucher place la lumière sans remuer (pas de saut depuis le geste précédent).
    let finger: number | null = null;
    const onStart = (e: TouchEvent) => {
      finger = null;
      const t = e.touches[0];
      if (!t || e.touches.length > 1 || !visible.current) return;
      const target = e.target as Element | null;
      if (target?.closest?.("a, button, input, label, header, dialog")) return;
      const r = hero.section.getBoundingClientRect();
      if (t.clientY < r.top || t.clientY > r.bottom) return;
      finger = t.identifier;
      place(t.clientX, t.clientY, false, true);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (finger === null) return;
      const t = e.touches[0];
      if (!t || e.touches.length > 1 || t.identifier !== finger || !visible.current) {
        finger = null;
        return;
      }
      place(t.clientX, t.clientY, true, true);
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) finger = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [hero, touchUI]);

  // Écran tactile (sans survol) : un toucher dans l'accueil fait une onde dans le métal et
  // y place la lumière rasante. Un défilement ne déclenche rien (« click » = toucher bref).
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const onTap = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("a, button, input, label")) return;
      const r = hero.section.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      taps.current.push({ x, y });
      const p = pointer.current;
      p.x = x;
      p.y = y;
      p.at = performance.now();
      dirty.current = true;
    };
    window.addEventListener("click", onTap);
    return () => window.removeEventListener("click", onTap);
  }, [hero]);

  // « Tinter le bronze » : un clic sur la sculpture lance une onde de lumière et un tintement.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("a, button, input, label")) return;
      if (material.userData.uniforms.uReveal.value < 0.9) return;
      const b = hero.bust.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
        return;
      const u = material.userData.uniforms;
      // Origine approximative : hauteur du clic dans la boîte (le modèle mesure 1 de haut).
      u.uPulseOrigin.value.set(0, 0.5 - (e.clientY - b.top) / b.height, 0.15);
      u.uPulse.value = 0;
      dirty.current = true;
      playTing();
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [hero, material]);

  // Rendu à la demande : pendant la coulée, puis seulement si quelque chose bouge.
  useEffect(() => {
    demand.current = () => {
      const now = performance.now();
      const stage = getStage();
      if (dirty.current || stage.intro !== "done" || turning.current) return true;
      if (material.userData.uniforms.uPulse.value < 1.6) return true;
      const t = (now - stage.pourAt) / 1000;
      if (t < (layout.current?.timeline.done ?? 6) + 1.5) return true;
      if (now - pointer.current.at < 1500 || now - lastSplat.current < 3000) return true;
      const r = hero.section.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height}`;
      return key !== lastRect.current;
    };
    return () => {
      demand.current = () => true;
    };
  }, [demand, hero, material]);

  // Nettoyage GPU (le matériau bronze est gardé pour la prochaine visite).
  useEffect(
    () => () => {
      sim.dispose();
      composite.dispose();
      layout.current?.texture.dispose();
      delete document.documentElement.dataset.heroPhase;
      if (document.documentElement.dataset.webgl === "ready")
        document.documentElement.dataset.webgl = "loading";
    },
    [sim, composite],
  );

  /** Fin de chaque image : canvas prêt, phase de l'intro (même accueil hors écran). */
  const finish = (hasLayout: boolean, t: number, done: number) => {
    // Le canvas devient visible (et le H1 passe en lighten) dès qu'il peint ses lettres,
    // si le contexte est toujours valide et la scène toujours montée.
    if (hasLayout && !firstFrame.current) {
      firstFrame.current = true;
      requestAnimationFrame(() => {
        if (!alive.current || gl.getContext().isContextLost()) {
          firstFrame.current = false;
          return;
        }
        document.documentElement.dataset.webgl = "ready";
        setStage({ webgl: "ready" });
      });
    }
    const phase = t < 0 ? "loading" : t < done ? "pour" : "done";
    if (document.documentElement.dataset.heroPhase !== phase) {
      document.documentElement.dataset.heroPhase = phase;
      if (phase === "done" && getStage().intro !== "done") setStage({ intro: "done" });
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const u = composite.uniforms;
    const stage = getStage();
    const r = hero.section.getBoundingClientRect();
    lastRect.current = `${r.left},${r.top},${r.width},${r.height}`;
    dirty.current = false;
    const vw = size.width;
    const vh = size.height;
    const aspect = r.width / Math.max(1, r.height);
    u.uHero!.value.set(r.left / vw, 1 - r.bottom / vh, r.width / vw, r.height / vh);
    u.uAspect!.value = aspect;

    const l = layout.current;
    const tl = l?.timeline;
    // Départ de la coulée : immédiat si pas de creuset (visites suivantes).
    if (l && stage.progress >= 0.999 && stage.intro === "loading" && stage.crucible !== "active")
      startPour();
    const t = stage.intro === "loading" ? -1 : (performance.now() - stage.pourAt) / 1000;
    u.uTime!.value = t;

    // Accueil hors écran : rien à dessiner ni à simuler (la chronologie continue).
    const hidden = !visible.current;
    if (compositeMesh.current) compositeMesh.current.visible = !hidden;
    if (group.current) group.current.visible = !hidden;
    if (hidden) {
      // Mouvement accumulé hors écran : oublié (sinon, une gerbe brûlante au retour).
      pointer.current.moved = false;
      pointer.current.ax = 0;
      pointer.current.ay = 0;
      turning.current = false;
      finish(Boolean(l), t, tl?.done ?? 6);
      return;
    }

    // Filet : du bec du creuset (ou du haut de la section) jusqu'à la dernière ligne.
    if (l && tl) {
      const bottomLine = l.lines[l.lines.length - 1]!;
      const lipY = stage.lip?.y ?? 1.03;
      const landY = bottomLine.bottom + (bottomLine.top - bottomLine.bottom) * 0.15;
      u.uPour!.value.set(l.pourX, lipY, landY, (2 * (lipY - landY)) / (T.fall * T.fall));
      // Le métal qui arrive brasse le bain au point d'impact.
      if (t > T.fall && t < tl.pourEnd + T.fall) {
        sim.splat(l.pourX, landY, 0, -260, 0.22, 0.0007);
        lastSplat.current = performance.now();
      }
    }

    // Pointeur : remue le métal chaud ; après refroidissement, un geste vif le réchauffe.
    const p = pointer.current;
    const done = tl?.done ?? 6;
    if (p.moved && t >= 0) {
      const speed = Math.hypot(p.ax, p.ay) / Math.max(dt, 1 / 120);
      const hot = t < done;
      // Au doigt, un glissement franc suffit (un doigt va moins vite qu'une souris).
      if (hot || speed > (p.touch ? 700 : 1800)) {
        // Le doigt est plus large que le curseur : trace plus large et un peu plus vive.
        sim.splat(
          p.x,
          p.y,
          p.ax / dt / 2,
          p.ay / dt / 2,
          hot ? 0.25 : p.touch ? 0.5 : 0.4,
          p.touch ? 0.0024 : 0.0016,
        );
        lastSplat.current = performance.now();
      }
    }
    p.moved = false;
    p.ax = 0;
    p.ay = 0;
    // Toucher : une onde en étoile, assez vive pour réchauffer le métal refroidi.
    for (const tap of taps.current.splice(0)) {
      if (t < 0) continue;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        sim.splat(tap.x, tap.y, Math.cos(a) * 900, Math.sin(a) * 900, 0.4, 0.0014);
      }
      lastSplat.current = performance.now();
    }
    if (performance.now() - lastSplat.current < 3000 || t < done) sim.step(dt);
    u.uDye!.value = sim.dyeTexture;

    const heat =
      t < 0 ? 0 : smooth(T.fall, T.fall + 0.5, t) * (1 - smooth(done - T.cool - 0.6, done, t));
    u.uHeat!.value = heat;
    const lightAmount = smooth(done - 1.2, done, t);
    u.uLight!.value = p.x >= 0 ? lightAmount : 0;
    u.uPointer!.value.set(p.x, p.y);

    // Sculpture : émerge de son bain, incandescente, puis refroidit en bronze.
    const reveal = tl ? tl.revealStart : 1;
    const bu = material.userData.uniforms;
    bu.uReveal.value = t < 0 ? 0 : smooth(reveal, reveal + T.revealDuration, t);
    bu.uHeat.value = t < 0 ? 1 : 1 - smooth(reveal, reveal + T.heatDuration, t);
    bu.uTime.value = state.clock.elapsedTime;
    if (bu.uPulse.value < 1.6) bu.uPulse.value += dt;

    // Placement : la sculpture 3D se superpose à l'image statique (même boîte CSS).
    const b = hero.bust.getBoundingClientRect();
    const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleW = visibleH * camera.aspect;
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    u.uBust!.value.set(
      (cx - r.left) / r.width,
      1 - (b.bottom - r.top) / r.height,
      (b.width * 0.42) / r.width,
      t < 0
        ? 0
        : smooth(reveal - 0.1, reveal + 0.2, t) *
            (1 - smooth(reveal + 0.4, reveal + T.heatDuration, t)),
    );
    u.uBustShadow!.value = t < 0 ? 0 : smooth(reveal, reveal + T.revealDuration, t);
    if (group.current) {
      group.current.position.set((cx / vw - 0.5) * visibleW, (0.5 - cy / vh) * visibleH, 0);
      group.current.scale.setScalar((b.height / vh) * visibleH);
      // Rotation suivant le pointeur (aucun mouvement perpétuel). Écran tactile : elle suit
      // aussi le défilement, réversible, le temps que l'accueil quitte l'écran.
      const scrolled = touchUI ? Math.min(1, Math.max(0, -r.top / r.height)) : 0;
      const targetY = -0.35 + (p.x >= 0 ? (p.x - 0.5) * 0.5 : 0) + scrolled * 1.2;
      // Écran tactile : lissage indexé sur le temps réel (et non plafonné à 1/30 s), pour
      // que la pièce se pose en une seconde environ même sur un téléphone lent ; seuil
      // d'arrêt à 0,2° (invisible). L'ordinateur garde exactement son lissage et son rendu.
      const step = touchUI ? Math.min(delta, 0.25) : dt;
      group.current.rotation.y +=
        (targetY - group.current.rotation.y) * (1 - Math.pow(0.95, step * 60));
      turning.current = touchUI && Math.abs(targetY - group.current.rotation.y) > 3e-3;
    }
    if (light.current) {
      light.current.intensity = 6 * lightAmount * (p.x >= 0 ? 1 : 0);
      const px = (p.x * r.width + r.left) / vw;
      const py = (r.top + (1 - p.y) * r.height) / vh;
      light.current.position.set((px - 0.5) * visibleW, (0.5 - py) * visibleH, 0.9);
    }

    finish(Boolean(l), t, done);
  });

  return (
    <>
      <mesh ref={compositeMesh} frustumCulled={false} renderOrder={-1000} material={composite}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <pointLight ref={light} color="#fff4e6" intensity={0} distance={3} decay={1.6} />
      <group ref={group}>
        <Suspense fallback={null}>
          <Sculpture id="buste-romain" material={material} />
          <ReportLoaded name="model" />
        </Suspense>
      </group>
    </>
  );
}
