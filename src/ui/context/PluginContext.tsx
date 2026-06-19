import { createContext, useContext } from "react";
import type ClaudeChatPlugin from "../../main";

export const PluginContext = createContext<ClaudeChatPlugin | null>(null);

export function usePlugin(): ClaudeChatPlugin {
  const plugin = useContext(PluginContext);
  if (!plugin) {
    throw new Error("usePlugin must be used within PluginContext.Provider");
  }
  return plugin;
}
