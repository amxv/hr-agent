import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { siteConfig } from "@/lib/config";

export function register() {
  registerOTel({
    serviceName: siteConfig.appPrefix,
    traceExporter: new LangfuseExporter(),
  });
}
