import { streamObject } from "ai";
import { z } from "zod";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({
    title: _title,
    description: _description,
    dataStream,
    prompt,
    selectedModel,
  }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getLanguageModel(selectedModel),
      system: codePrompt,
      prompt,
      experimental_telemetry: { isEnabled: true },
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({
    document,
    description,
    dataStream,
    selectedModel,
  }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getLanguageModel(selectedModel),
      system: updateDocumentPrompt(document.content || "", "code"),
      experimental_telemetry: { isEnabled: true },
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
