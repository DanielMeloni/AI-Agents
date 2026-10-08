import { describe, expect, it } from "vitest";
import { isTrustedUrl, secureWebPreferences, windowOptions } from "../src/main/window";

describe("sicurezza finestra", () => {
  it("mantiene isolamento, sandbox e nessuna integrazione Node", () => {
    const p = windowOptions("/x/preload.cjs").webPreferences!;
    expect(p).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      preload: "/x/preload.cjs",
    });
    expect(secureWebPreferences("p").nodeIntegrationInSubFrames).toBe(false);
  });

  it("considera attendibile solo la pagina locale", () => {
    const app = "file:///repo/apps/desktop/dist/renderer/index.html";
    expect(isTrustedUrl(app, app)).toBe(true);
    expect(isTrustedUrl("https://example.com/", app)).toBe(false);
    expect(isTrustedUrl("file:///altro.html", app)).toBe(false);
    expect(isTrustedUrl(undefined, app)).toBe(false);
    expect(isTrustedUrl("non-un-url", app)).toBe(false);
  });
});
