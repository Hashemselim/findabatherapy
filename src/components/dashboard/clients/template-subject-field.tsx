"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MERGE_FIELD_CATEGORIES,
  MERGE_FIELD_MAP,
} from "@/lib/communications/merge-fields";
import { cn } from "@/lib/utils";
import { MergeFieldNode } from "./email-editor";

function subjectTemplateToContent(subject: string) {
  const parts: Array<
    | { type: "text"; text: string }
    | { type: "mergeField"; attrs: { fieldName: string; label: string } }
  > = [];
  const pattern = /\{(\w+)\}/g;
  let lastIndex = 0;

  for (const match of subject.matchAll(pattern)) {
    const index = match.index ?? 0;
    const [raw, fieldName] = match;

    if (index > lastIndex) {
      parts.push({
        type: "text",
        text: subject.slice(lastIndex, index),
      });
    }

    parts.push({
      type: "mergeField",
      attrs: {
        fieldName,
        label: MERGE_FIELD_MAP[fieldName]?.label ?? fieldName,
      },
    });

    lastIndex = index + raw.length;
  }

  if (lastIndex < subject.length) {
    parts.push({
      type: "text",
      text: subject.slice(lastIndex),
    });
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: parts,
      },
    ],
  };
}

function subjectEditorToTemplate(editor: Editor): string {
  const json = editor.getJSON();
  const parts: string[] = [];

  const visit = (node: any) => {
    if (!node) return;

    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }

    if (node.type === "mergeField" && node.attrs?.fieldName) {
      parts.push(`{${node.attrs.fieldName}}`);
      return;
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  };

  visit(json);
  return parts.join("").replace(/\n+/g, " ");
}

export function TemplateSubjectField({
  id,
  label = "Subject",
  value,
  onChange,
  disabled,
  placeholder = "Welcome, {parent_first_name}",
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Placeholder.configure({ placeholder }),
      MergeFieldNode,
    ],
    content: subjectTemplateToContent(value),
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(subjectEditorToTemplate(currentEditor));
    },
    editorProps: {
      attributes: {
        class:
          "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none [&_p]:m-0 [&_[data-merge-field]]:align-middle",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          return true;
        }

        return false;
      },
      transformPastedText: (text) => text.replace(/\s*\n+\s*/g, " "),
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const currentValue = subjectEditorToTemplate(editor);
    if (currentValue !== value) {
      editor.commands.setContent(subjectTemplateToContent(value), {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  const insertToken = (fieldKey: string) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "mergeField",
        attrs: {
          fieldName: fieldKey,
          label: MERGE_FIELD_MAP[fieldKey]?.label ?? fieldKey,
        },
      })
      .run();
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={disabled}>
              Fields
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-96 w-72 overflow-y-auto"
          >
            {MERGE_FIELD_CATEGORIES.map((category) => (
              <div key={category.id}>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category.label}
                </div>
                {category.fields.map((field) => (
                  <DropdownMenuItem
                    key={field.key}
                    onClick={() => insertToken(field.key)}
                  >
                    {field.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditorContent
        editor={editor}
        id={id}
        className={cn(
          "rounded-md",
          "[&_.ProseMirror]:min-h-10 [&_.ProseMirror]:rounded-md [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror-focused]:ring-2 [&_.ProseMirror-focused]:ring-ring/20",
          disabled && "opacity-70"
        )}
      />
    </div>
  );
}
