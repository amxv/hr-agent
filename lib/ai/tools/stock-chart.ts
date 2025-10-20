import CodeInterpreter from "@e2b/code-interpreter";
import { tool } from "ai";
import z from "zod";
import { env } from "@/lib/env";

export const stockChart = tool({
  description: `Generate a line stock chart and fetch price data via Python (yfinance + matplotlib).

Use for:
- Create line charts for publicly traded stocks
- Fetch historical price data for investment analysis

Avoid:
- Non-line or non-stock charts
- Private-company or non-stock datasets`,
  inputSchema: z.object({
    title: z.string().describe("The title of the chart."),
    code: z
      .string()
      .describe(
        "The Python code with matplotlib line chart and yfinance to execute."
      ),
    icon: z
      .enum(["stock", "date", "calculation", "default"])
      .describe("The icon to display for the chart."),
    stock_symbols: z
      .array(z.string())
      .describe("The stock symbols to display for the chart."),
    interval: z
      .enum([
        "1d",
        "5d",
        "1mo",
        "3mo",
        "6mo",
        "1y",
        "2y",
        "5y",
        "10y",
        "ytd",
        "max",
      ])
      .describe("The interval of the chart. default is 1y."),
  }),
  execute: async ({
    code,
    title,
    icon,
    stock_symbols,
    interval,
  }: {
    code: string;
    title: string;
    icon: string;
    stock_symbols: string[];
    interval: string;
  }) => {
    console.log("Code:", code);
    console.log("Title:", title);
    console.log("Icon:", icon);
    console.log("Stock symbols:", stock_symbols);
    console.log("Interval:", interval);
    const sandbox = await CodeInterpreter.create(
      env.SANDBOX_TEMPLATE_ID as string
    );
    const execution = await sandbox.runCode(code);
    let message = "";

    if (execution.results.length > 0) {
      for (const result of execution.results) {
        if (result.isMainResult) {
          message += `${result.text}\n`;
        } else {
          message += `${result.text}\n`;
        }
      }
    }

    if (execution.logs.stdout.length > 0 || execution.logs.stderr.length > 0) {
      if (execution.logs.stdout.length > 0) {
        message += `${execution.logs.stdout.join("\n")}\n`;
      }
      if (execution.logs.stderr.length > 0) {
        message += `${execution.logs.stderr.join("\n")}\n`;
        console.log("Error: ", execution.logs.stderr);
      }
    }

    if (execution.error) {
      message += `Error: ${execution.error}\n`;
      console.log("Error: ", execution.error);
    }

    console.log("Chart details: ", execution.results[0].chart);
    if (execution.results[0].chart) {
      execution.results[0].chart.elements.map((element: any) => {
        console.log(element.points);
      });
    }

    if (execution.results[0].chart === null) {
      console.log("No chart found");
    }

    return {
      message: message.trim(),
      chart: execution.results[0].chart ?? "",
    };
  },
});
