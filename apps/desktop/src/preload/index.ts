import { contextBridge, ipcRenderer } from "electron";
import { CHAT_CHANNEL } from "../shared/channel";
import type { BlackstarApi } from "../shared/ipc";

// Unica superficie esposta alla UI. Nessun accesso diretto a ipcRenderer, Node o filesystem.
const api: BlackstarApi = {
  chat: (message, options) => ipcRenderer.invoke(CHAT_CHANNEL, { message, options }),
};

contextBridge.exposeInMainWorld("blackstar", Object.freeze(api));
