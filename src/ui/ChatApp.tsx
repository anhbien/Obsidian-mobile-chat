import { useMemo } from "react";
import type ClaudeChatPlugin from "../main";
import { PluginContext } from "./context/PluginContext";
import { ChatContainer } from "./components/ChatContainer";
import { ConversationManager } from "../conversation/conversationManager";

interface ChatAppProps {
  plugin: ClaudeChatPlugin;
}

export function ChatApp({ plugin }: ChatAppProps) {
  const conversationManager = useMemo(
    () => new ConversationManager(plugin.app, plugin.settings),
    [plugin]
  );

  return (
    <PluginContext.Provider value={plugin}>
      <ChatContainer conversationManager={conversationManager} />
    </PluginContext.Provider>
  );
}
