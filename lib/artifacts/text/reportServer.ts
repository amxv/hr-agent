import { streamText } from "ai";
import { createDocumentHandler } from "@/lib/artifacts/server";

type StreamTextConfig = Parameters<typeof streamText>[0];

export class ReportDocumentWriter {
  private readonly streamTextConfig: StreamTextConfig;

  // biome-ignore lint/style/useReadonlyClassProperties: It is reassigned
  private reportContent: string;

  constructor(streamTextConfig: StreamTextConfig) {
    this.streamTextConfig = streamTextConfig;
    this.reportContent = "";
  }

  createDocumentHandler = () =>
    createDocumentHandler<"text">({
      kind: "text",
      onCreateDocument: async ({
        title: _title,
        description: _description,
        dataStream,
        prompt: _prompt,
        selectedModel: _selectedModel,
      }) => {
        let draftContent = "";

        const { fullStream } = streamText(this.streamTextConfig);

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === "text-delta") {
            const { text } = delta;

            draftContent += text;

            dataStream.write({
              type: "data-textDelta",
              data: text,
              transient: true,
            });
          }
        }

        this.reportContent = draftContent;
        return draftContent;
      },
      onUpdateDocument: () => {
        throw new Error("Not implemented");
      },
    });

  getReportContent = () => this.reportContent;
}
