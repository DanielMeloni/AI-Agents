import type { BrowserWindowConstructorOptions, WebPreferences } from "electron";

/** Impostazioni di sicurezza della finestra: isolate in una funzione per poterle testare. */
export function secureWebPreferences(preloadPath: string): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
  };
}

export function windowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    title: "BLACKSTAR Desktop",
    width: 480,
    height: 760,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: "#07080c",
    autoHideMenuBar: true,
    show: false,
    webPreferences: secureWebPreferences(preloadPath),
  };
}

/** Una navigazione è lecita solo verso la pagina locale dell'app. */
export function isTrustedUrl(url: string | undefined, appUrl: string): boolean {
  if (!url) return false;
  try {
    const a = new URL(url);
    const b = new URL(appUrl);
    return a.protocol === "file:" && a.pathname === b.pathname;
  } catch {
    return false;
  }
}
