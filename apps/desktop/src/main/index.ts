import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, Menu, session } from "electron";
import { createBlackstarExecutor } from "@daniel-ai-os/blackstar";
import { findRepoRoot, loadAgentManifests } from "@daniel-ai-os/runtime";
import { CHAT_CHANNEL } from "../shared/channel";
import { createChatHandler } from "./chat-handler";
import { isTrustedUrl, windowOptions } from "./window";

const rendererFile = join(__dirname, "renderer", "index.html");
const appUrl = pathToFileURL(rendererFile).href;

function registerChat(): void {
  const repoRoot = findRepoRoot(__dirname);
  const manifests = loadAgentManifests(repoRoot);
  const executors = manifests.filter((m) => m.id === "blackstar").map(createBlackstarExecutor);
  const handleChat = createChatHandler({
    repoRoot,
    manifests,
    executors,
    appUrl,
    log: (e) => console.error("[blackstar] errore handler:", e),
  });
  ipcMain.handle(CHAT_CHANNEL, (event, raw: unknown) => handleChat(event.senderFrame?.url, raw));
}

function lockDownSession(): void {
  const s = session.defaultSession;
  s.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  s.setPermissionCheckHandler(() => false);
  // Nessuna rete: la UI è locale e ogni richiesta http(s)/ws viene annullata.
  s.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_d, cb) =>
    cb({ cancel: true }),
  );
}

function createWindow(): void {
  const win = new BrowserWindow(windowOptions(join(__dirname, "preload.cjs")));
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url, appUrl)) event.preventDefault();
  });
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  win.once("ready-to-show", () => win.show());
  void win.loadFile(rendererFile);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    lockDownSession();
    registerChat();
    createWindow();
  });
  app.on("window-all-closed", () => app.quit());
}
