"use client";

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getRoot } from "lexical";
import { memo, useEffect, useRef } from "react";

import type { Suggestion } from "@/lib/db/schema";
import { createEditorConfig, handleEditorChange } from "@/lib/editor/config";
import {
  projectWithPositions,
  registerSuggestions,
  SuggestionNode,
} from "@/lib/editor/suggestions";

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Suggestion[];
  isReadonly?: boolean;
};

// Content update plugin
function ContentUpdatePlugin({
  content,
  status,
  onSaveContent,
  isReadonly,
}: {
  content: string;
  status: "streaming" | "idle";
  onSaveContent: (content: string, debounce: boolean) => void;
  isReadonly?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const isProgrammaticUpdate = useRef(false);

  useEffect(() => {
    if (content) {
      isProgrammaticUpdate.current = true;

      if (status === "streaming") {
        editor.update(
          () => {
            const root = $getRoot();
            const children = root.getChildren();
            for (const child of children) {
              child.remove();
            }
            $convertFromMarkdownString(content);
          },
          {
            discrete: true,
            onUpdate: () => {
              isProgrammaticUpdate.current = false;
            },
          }
        );
        return;
      }

      // For non-streaming, only update if content actually differs
      let currentMarkdown = "";
      editor.getEditorState().read(() => {
        currentMarkdown = $convertToMarkdownString(TRANSFORMERS);
      });

      // Simple trim comparison is usually sufficient
      if (currentMarkdown.trim() !== content.trim()) {
        editor.update(
          () => {
            const root = $getRoot();
            const children = root.getChildren();
            for (const child of children) {
              child.remove();
            }
            $convertFromMarkdownString(content);
          },
          {
            discrete: true,
            onUpdate: () => {
              isProgrammaticUpdate.current = false;
            },
          }
        );
      }
    }
  }, [content, status, editor]);

  const handleChange = (editorState: any) => {
    if (!(isReadonly || isProgrammaticUpdate.current)) {
      handleEditorChange({
        editorState,
        editor,
        onSaveContent,
      });
    }
  };

  return <OnChangePlugin onChange={handleChange} />;
}

// Suggestions plugin
function SuggestionsPlugin({
  suggestions,
  content,
}: {
  suggestions: Suggestion[];
  content: string;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (content) {
      const projectedSuggestions = projectWithPositions(
        editor,
        suggestions
      ).filter(
        (suggestion) => suggestion.selectionStart && suggestion.selectionEnd
      );

      registerSuggestions(editor, projectedSuggestions);
    }
  }, [suggestions, content, editor]);

  return null;
}

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
  isReadonly,
}: EditorProps) {
  const initialConfig = createEditorConfig();

  // Add SuggestionNode to the editor config
  const editorConfig = {
    ...initialConfig,
    nodes: [...initialConfig.nodes, SuggestionNode],
    editable: !isReadonly,
  };

  return (
    <div className="prose dark:prose-invert relative text-left">
      <LexicalComposer initialConfig={editorConfig}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="lexical-editor text-left outline-hidden" />
          }
          ErrorBoundary={LexicalErrorBoundary}
          placeholder={<div className="text-gray-400">Start typing...</div>}
        />
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ContentUpdatePlugin
          content={content}
          isReadonly={isReadonly}
          onSaveContent={onSaveContent}
          status={status}
        />
        <SuggestionsPlugin content={content} suggestions={suggestions} />
      </LexicalComposer>
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.onSaveContent === nextProps.onSaveContent &&
    prevProps.isReadonly === nextProps.isReadonly
  );
}

export const Editor = memo(PureEditor, areEqual);
