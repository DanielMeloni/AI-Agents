import type { BlackstarApi } from "../shared/ipc";

declare global {
  interface Window {
    blackstar: BlackstarApi;
  }
}
export {};
