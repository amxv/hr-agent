import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";

export type ArtifactToolResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
};
