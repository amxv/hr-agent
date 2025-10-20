import FirecrawlApp from "@mendable/firecrawl-js";
import { tool } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

const app = new FirecrawlApp({
  apiKey: env.FIRECRAWL_API_KEY,
});

export const retrieve = tool({
  description: `Fetch structured information from a single URL via Firecrawl.

Use for:
- Extract content from a specific URL supplied by the user

Avoid:
- General-purpose web searches`,
  inputSchema: z.object({
    url: z.string().describe("The URL to retrieve the information from."),
  }),
  execute: async ({ url }: { url: string }) => {
    try {
      const content = await app.scrapeUrl(url);
      if (!(content.success && content.metadata)) {
        return {
          results: [
            {
              error: content.error,
            },
          ],
        };
      }

      // Define schema for extracting missing content
      const schema = z.object({
        title: z.string(),
        content: z.string(),
        description: z.string(),
      });

      let title = content.metadata.title;
      let description = content.metadata.description;
      let extractedContent = content.markdown;

      // If any content is missing, use extract to get it
      if (!(title && description && extractedContent)) {
        const extractResult = await app.extract([url], {
          prompt:
            "Extract the page title, main content, and a brief description.",
          schema,
        });

        if (extractResult.success && extractResult.data) {
          title = title || extractResult.data.title;
          description = description || extractResult.data.description;
          extractedContent = extractedContent || extractResult.data.content;
        }
      }

      return {
        results: [
          {
            title: title || "Untitled",
            content: extractedContent || "",
            url: content.metadata.sourceURL,
            description: description || "",
            language: content.metadata.language,
          },
        ],
      };
    } catch (error) {
      console.error("Firecrawl API error:", error);
      return { error: "Failed to retrieve content" };
    }
  },
});
