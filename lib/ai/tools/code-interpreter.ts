import CodeInterpreter from "@e2b/code-interpreter";
import { tool } from "ai";
import z from "zod";
import { env } from "@/lib/env";

export const codeInterpreter = tool({
  description: `Python-only sandbox for calculations, data analysis & simple visualisations.

Use for:
- Execute Python (matplotlib, pandas, numpy, sympy, yfinance pre-installed)
- Produce line / scatter / bar charts (must call 'plt.show()' for line charts)
- Install extra libs inline with '!pip install pkg'

Restrictions:
- No images in the assistant response; don't embed them

Avoid:
- Any non-Python language
- Chart types other than line / scatter / bar`,
  inputSchema: z.object({
    title: z.string().describe("The title of the code snippet."),
    code: z
      .string()
      .describe(
        "The Python code to execute. put the variables in the end of the code to print them. do not use the print function."
      ),
    icon: z
      .enum(["stock", "date", "calculation", "default"])
      .describe("The icon to display for the code snippet."),
  }),
  execute: async ({
    code,
    title,
    icon,
  }: {
    code: string;
    title: string;
    icon: string;
  }) => {
    console.log("Code:", code);
    console.log("Title:", title);
    console.log("Icon:", icon);

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
      }
    }

    if (execution.error) {
      message += `Error: ${execution.error}\n`;
      console.log("Error: ", execution.error);
    }

    console.log(execution.results);
    if (execution.results[0].chart) {
      execution.results[0].chart.elements.map((element: any) => {
        console.log(element.points);
      });
    }

    return {
      message: message.trim(),
      chart: execution.results[0].chart ?? "",
    };
  },
});
