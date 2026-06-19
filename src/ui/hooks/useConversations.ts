import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "../../types";
import { listChats, deleteChat } from "../../conversation/chatPersistence";
import { usePlugin } from "../context/PluginContext";

export function useConversations() {
  const plugin = usePlugin();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const chats = await listChats(
      plugin.app,
      plugin.settings.chatsFolderPath
    );
    setConversations(chats);
    setLoading(false);
  }, [plugin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (filePath: string) => {
      await deleteChat(plugin.app, filePath);
      await refresh();
    },
    [plugin, refresh]
  );

  return { conversations, loading, refresh, remove };
}
