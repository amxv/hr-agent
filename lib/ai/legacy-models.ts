type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const legacyChatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Chat model",
    description: "Primary model for all-purpose chat",
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning model",
    description: "Uses advanced reasoning",
  },
];
