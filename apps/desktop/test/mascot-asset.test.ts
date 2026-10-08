import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MASCOT_STATES, speakingMs } from "../src/renderer/mascot";

const rendererDir = join(__dirname, "../src/renderer");
const html = readFileSync(join(rendererDir, "index.html"), "utf8");
const css = readFileSync(join(rendererDir, "styles.css"), "utf8");

describe("immagine della mascotte", () => {
  it("usa un asset locale incluso nel repository, senza risorse esterne", () => {
    const src = /<img[^>]*class="mascot-img"[^>]*src="([^"]+)"/.exec(html)![1]!;
    expect(src).toBe("assets/blackstar.webp");
    expect(existsSync(join(rendererDir, src))).toBe(true);
    expect(html).not.toMatch(/(src|href)="(https?:)?\/\//);
    expect(html).toContain("img-src 'self'");
  });

  it("ha un'animazione CSS per ogni stato, e 'responding' pulsa", () => {
    for (const s of MASCOT_STATES) expect(css).toContain(`.mascot[data-state="${s}"]`);
    expect(css).toMatch(/\[data-state="responding"\] \.mascot-img \{ animation: speak/);
  });

  it("rispetta prefers-reduced-motion", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("la durata dell'animazione 'parla' cresce con la risposta, entro i limiti", () => {
    expect(speakingMs("")).toBe(1800);
    expect(speakingMs("x".repeat(100))).toBe(3500);
    expect(speakingMs("x".repeat(10000))).toBe(6000);
  });
});
