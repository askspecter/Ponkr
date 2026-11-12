import { mascotPixels } from "./mascot";

export const OG_SIZE = { width: 1200, height: 630 };

export const C = {
  bg: "#0b0b0d",
  panel: "#131316",
  line: "#29292f",
  fg: "#f2ecdf",
  muted: "#8f897c",
  blue: "#4d6bff",
  acid: "#e6ff4a",
  up: "#45d69b",
};

/** Loads a Google font subset for the given text (falls back to the default font on failure). */
export async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | undefined> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { signal: AbortSignal.timeout(4000) })).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return undefined;
    return await (await fetch(src, { signal: AbortSignal.timeout(4000) })).arrayBuffer();
  } catch {
    return undefined;
  }
}

export async function ogFonts(text: string) {
  const [display, mono] = await Promise.all([
    loadFont("Bricolage Grotesque", 800, text),
    loadFont("IBM Plex Mono", 500, text),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 800 | 500; style: "normal" }[] = [];
  if (display) fonts.push({ name: "Display", data: display, weight: 800, style: "normal" });
  if (mono) fonts.push({ name: "Mono", data: mono, weight: 500, style: "normal" });
  return fonts;
}

export function Mascot({ px }: { px: number }) {
  return (
    <div style={{ position: "relative", width: px * 16, height: px * 16, display: "flex" }}>
      {mascotPixels().map(([x, y, c]) => (
        <div key={`${x}-${y}`} style={{ position: "absolute", left: x * px, top: y * px, width: px, height: px, background: c }} />
      ))}
    </div>
  );
}

/** Dotted backdrop used on every card. */
export const dots = {
  backgroundColor: C.bg,
  backgroundImage: `radial-gradient(circle at 1px 1px, ${C.line} 1.5px, transparent 0)`,
  backgroundSize: "28px 28px",
};
