"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import {
  Extension,
  Mark,
  Node,
  type Attributes,
  mergeAttributes,
} from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Transaction } from "@tiptap/pm/state";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Braces,
  CalendarDays,
  Columns3,
  FileText,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pencil,
  Search,
  ShieldCheck,
  Table2,
  Underline as UnderlineIcon,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getContrastColor, type AgencyBrandingData } from "@/lib/email/email-helpers";
import {
  MERGE_FIELD_CATEGORIES,
  MERGE_FIELD_MAP,
  type MergeFieldDef,
} from "@/lib/communications/merge-fields";
import {
  buildBrandedLinkSnippet,
  formatBrandedLinkLabel,
  getSimpleTableLimits,
  type BrandedLinkMode,
} from "@/lib/communications/template-utils";
import { LINK_MERGE_FIELD_KEYS } from "@/lib/communications/merge-fields";

export { MERGE_FIELD_CATEGORIES, MERGE_FIELD_MAP } from "@/lib/communications/merge-fields";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (textAlign: "left" | "center") => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
    textColor: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

const TEXT_COLORS = [
  { value: "", label: "Default", swatch: "#0f172a" },
  { value: "#475569", label: "Muted", swatch: "#475569" },
  { value: "#0866FF", label: "Brand", swatch: "#0866FF" },
  { value: "#047857", label: "Success", swatch: "#047857" },
  { value: "#b45309", label: "Warning", swatch: "#b45309" },
];

const SIMPLE_TABLE_LIMITS = getSimpleTableLimits();

type TablePreset = "simple" | "appointment" | "insurance" | "resources" | "actions";

interface EmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  branding: AgencyBrandingData | null;
  disabled?: boolean;
  placeholder?: string;
  fieldValues?: Record<string, string> | null;
  resolvePreviewLink?: (fieldKey: string) => Promise<string | null>;
}

interface TableDialogState {
  open: boolean;
  mode: "insert" | "edit";
  preset: TablePreset;
  initialDraft: TableDraft | null;
  targetPos: number | null;
}

interface TableDraft {
  preset: TablePreset;
  includeHeader: boolean;
  headers: string[];
  rows: string[][];
}

type SelectedBlockState =
  | {
      type: "table";
      draft: TableDraft;
      preset: TablePreset;
      pos: number;
    }
  | {
      type: "cta";
      fieldKey: string;
      label: string;
      description: string;
      pos: number;
    };

const TEMPLATE_HREF_PATTERN = /^\{([a-z0-9_]+)\}$/i;
const TOKENIZED_PREVIEW_FIELDS = new Set(["intake_link", "agreement_link"]);
const BRANDED_CTA_STYLE =
  "display:inline-block;padding:12px 18px;border:1px solid #0866FF;border-radius:999px;background-color:#0866FF;color:#ffffff;font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;";

function canonicalizeBrandedCtaMarkup(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild as HTMLDivElement | null;
  if (!root) {
    return html;
  }

  const anchors = root.querySelectorAll<HTMLAnchorElement>("a");
  anchors.forEach((anchor) => {
    const templateHref =
      anchor.getAttribute("data-template-href") || anchor.getAttribute("href") || "";
    const fieldKey = templateHref.match(TEMPLATE_HREF_PATTERN)?.[1] || "";
    if (!fieldKey || !LINK_MERGE_FIELD_KEYS.includes(fieldKey)) {
      return;
    }

    const looksLikeCta =
      !!anchor.closest("[data-email-block='branded-card']") ||
      /^open\s+/i.test(anchor.textContent?.trim() || "") ||
      anchor.getAttribute("style")?.includes("background-color:#0866FF") ||
      false;

    if (!looksLikeCta) {
      return;
    }

    const label =
      anchor.closest("[data-label]")?.getAttribute("data-label") ||
      MERGE_FIELD_MAP[fieldKey]?.label ||
      anchor.textContent?.trim().replace(/^Open\s+/i, "") ||
      fieldKey;
    const baseLabel = formatBrandedLinkLabel(label);

    let container = anchor.closest("p");
    if (!container) {
      container = document.createElement("p");
      anchor.replaceWith(container);
      container.append(anchor);
    }

    container.setAttribute("data-email-block", "branded-card");
    container.setAttribute("data-field-key", fieldKey);
    container.setAttribute("data-label", label);
    container.style.margin = "16px 0";

    anchor.setAttribute("href", `{${fieldKey}}`);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("style", BRANDED_CTA_STYLE);
    anchor.textContent = `Open ${baseLabel}`;
  });

  return root.innerHTML;
}

function convertBrandedCtasToEditorTags(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild as HTMLDivElement | null;
  if (!root) {
    return html;
  }

  const brandedCards = root.querySelectorAll<HTMLElement>("[data-email-block='branded-card']");
  brandedCards.forEach((card) => {
    const anchor = card.querySelector("a");
    const href = anchor?.getAttribute("href") || "";
    const fieldKey =
      card.getAttribute("data-field-key") ||
      href.match(TEMPLATE_HREF_PATTERN)?.[1] ||
      "";
    if (!fieldKey) {
      return;
    }

    const label =
      card.getAttribute("data-label") ||
      MERGE_FIELD_MAP[fieldKey]?.label ||
      anchor?.textContent?.trim().replace(/^Open\s+/i, "") ||
      fieldKey;
    const description =
      card.getAttribute("data-description") ||
      card.querySelector("span")?.textContent?.trim() ||
      "";

    const tag = document.createElement("fab-branded-cta");
    tag.setAttribute("data-field-key", fieldKey);
    tag.setAttribute("data-label", label);
    if (description) {
      tag.setAttribute("data-description", description);
    }

    card.replaceWith(tag);
  });

  return root.innerHTML;
}

function convertSimpleTablesToEditorTags(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild as HTMLDivElement | null;
  if (!root) {
    return html;
  }

  const tables = root.querySelectorAll<HTMLTableElement>("table[data-email-block='simple-table']");
  tables.forEach((table) => {
    const tag = document.createElement("fab-simple-table");
    const tablePreset = table.getAttribute("data-table-kind") || "simple";
    const tablePayload =
      table.getAttribute("data-table-payload") ||
      encodeTablePayload(createInitialTableDraft(isTablePreset(tablePreset) ? tablePreset : "simple"));
    tag.setAttribute("data-table-kind", tablePreset);
    tag.setAttribute("data-table-payload", tablePayload);
    table.replaceWith(tag);
  });

  return root.innerHTML;
}

function isTablePreset(value: string | null | undefined): value is TablePreset {
  return value === "simple" || value === "appointment" || value === "insurance" || value === "resources" || value === "actions";
}

function createInitialTableDraft(preset: TablePreset): TableDraft {
  switch (preset) {
    case "appointment":
      return {
        preset,
        includeHeader: true,
        headers: ["Field", "Details"],
        rows: [
          ["Date", "{assessment_date}"],
          ["Time", "{assessment_time}"],
          ["Location", "{assessment_location}"],
        ],
      };
    case "insurance":
      return {
        preset,
        includeHeader: true,
        headers: ["Field", "Details"],
        rows: [
          ["Provider", "{insurance_name}"],
          ["Plan", "{insurance_plan_name}"],
          ["Member ID", "{insurance_member_id}"],
        ],
      };
    case "resources":
      return {
        preset,
        includeHeader: true,
        headers: ["Resource", "Link", "Notes"],
        rows: [
          ["Contact Form", "{contact_link}", "Reach our team directly"],
          ["Intake Form", "{intake_link}", "Complete the next steps online"],
        ],
      };
    case "actions":
      return {
        preset,
        includeHeader: true,
        headers: ["Action Item", "Owner", "Due"],
        rows: [
          ["Review attached materials", "Parent", ""],
          ["Reply with questions", "Parent", ""],
        ],
      };
    case "simple":
    default:
      return {
        preset: "simple",
        includeHeader: true,
        headers: ["Column 1", "Column 2"],
        rows: [["", ""]],
      };
  }
}

function normalizeTableDraft(draft: Partial<TableDraft> | null | undefined, preset?: TablePreset): TableDraft {
  const resolvedPreset = isTablePreset(draft?.preset) ? draft.preset : preset || "simple";
  const fallback = createInitialTableDraft(resolvedPreset);
  return {
    preset: resolvedPreset,
    includeHeader: draft?.includeHeader !== false,
    headers: Array.isArray(draft?.headers) && draft.headers.length > 0 ? draft.headers : fallback.headers,
    rows: Array.isArray(draft?.rows) && draft.rows.length > 0 ? draft.rows : fallback.rows,
  };
}

function encodeTablePayload(payload: TableDraft): string {
  return JSON.stringify(normalizeTableDraft(payload, payload.preset));
}

function decodeTablePayload(value: string | null): TableDraft {
  if (!value) {
    return createInitialTableDraft("simple");
  }

  try {
    const parsed = JSON.parse(value) as Partial<TableDraft>;
    return normalizeTableDraft(parsed);
  } catch {
    return createInitialTableDraft("simple");
  }
}

function resolvePreviewHref(
  rawHref: string | null | undefined,
  fieldValues?: Record<string, string> | null
): string | null {
  if (!rawHref) {
    return null;
  }

  const trimmedHref = rawHref.trim();
  const match = trimmedHref.match(TEMPLATE_HREF_PATTERN);
  if (!match) {
    return trimmedHref;
  }

  const resolvedValue = fieldValues?.[match[1]]?.trim();
  return resolvedValue || null;
}

function getSelectedTableBlock(editor: Editor): { draft: TableDraft; preset: TablePreset; pos: number } | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "simpleTableBlock") {
    return null;
  }

  const tablePreset = isTablePreset(selection.node.attrs.tablePreset as string | undefined)
    ? (selection.node.attrs.tablePreset as TablePreset)
    : "simple";
  const draft = decodeTablePayload(selection.node.attrs.tablePayload as string | null);

  return {
    draft: normalizeTableDraft(draft, tablePreset),
    preset: tablePreset,
    pos: selection.from,
  };
}

function getSelectedCtaBlock(editor: Editor): {
  fieldKey: string;
  label: string;
  description: string;
  pos: number;
} | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "brandedCtaBlock") {
    return null;
  }

  return {
    fieldKey: (selection.node.attrs.fieldKey as string | undefined) || "contact_link",
    label: (selection.node.attrs.label as string | undefined) || "Contact Form Link",
    description: (selection.node.attrs.description as string | undefined) || "",
    pos: selection.from,
  };
}

function isRemovableEmailBlock(name: string | undefined): boolean {
  return name === "simpleTableBlock" || name === "brandedCtaBlock";
}

function resolveBlockPosFromDom(editor: Editor, element: HTMLElement): number | null {
  try {
    const directPos = editor.view.posAtDOM(element, 0);
    const directNode = editor.state.doc.nodeAt(directPos);
    if (isRemovableEmailBlock(directNode?.type.name)) {
      return directPos;
    }

    const previousPos = Math.max(0, directPos - 1);
    const previousNode = editor.state.doc.nodeAt(previousPos);
    if (isRemovableEmailBlock(previousNode?.type.name)) {
      return previousPos;
    }
  } catch {
    return null;
  }

  return null;
}

function deleteBlockAtPos(editor: Editor, pos: number): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }: { tr: Transaction; dispatch?: ((tr: Transaction) => void) | undefined }) => {
      const nodeAtPos = tr.doc.nodeAt(pos);
      const resolvedPos = nodeAtPos ? pos : Math.max(0, pos - 1);
      const node = nodeAtPos || tr.doc.nodeAt(resolvedPos);
      if (!node || !isRemovableEmailBlock(node.type.name)) {
        return false;
      }

      tr.delete(resolvedPos, resolvedPos + node.nodeSize);
      dispatch?.(tr);
      return true;
    })
    .run();
}

function renderSimpleTableSpec(payload: TableDraft): DOMOutputSpec {
  const headers = payload.headers.slice(0, SIMPLE_TABLE_LIMITS.maxColumns);
  const rows = payload.rows
    .slice(0, SIMPLE_TABLE_LIMITS.maxRows)
    .map((row) => row.slice(0, SIMPLE_TABLE_LIMITS.maxColumns));

  const children: DOMOutputSpec[] = [];

  if (payload.includeHeader && headers.length > 0) {
    children.push([
      "thead",
      {},
      [
        "tr",
        {},
        ...headers.map((header) => [
          "th",
          {
            style:
              "padding:10px 12px;border:1px solid #dbe4ee;background:#eff6ff;color:#0f172a;text-align:left;font-size:12px;font-weight:700;",
          },
          header,
        ]),
      ],
    ]);
  }

  children.push([
    "tbody",
    {},
    ...rows.map((row) => [
      "tr",
      {},
      ...row.map((cell) => [
        "td",
        {
          style:
            "padding:10px 12px;border:1px solid #dbe4ee;vertical-align:top;color:#0f172a;",
        },
        cell,
      ]),
    ]),
  ]);

  return [
    "table",
    {
      "data-email-block": "simple-table",
      "data-table-kind": payload.preset,
      "data-table-payload": encodeTablePayload(payload),
      cellpadding: "0",
      cellspacing: "0",
      width: "100%",
      style: "width:100%;margin:16px 0;border-collapse:collapse;",
    },
    ...children,
  ];
}

const TextAlignExtension = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: "left",
            parseHTML: (element: HTMLElement) =>
              element.style.textAlign || element.getAttribute("data-text-align") || "left",
            renderHTML: (attributes: Record<string, string>) => {
              if (!attributes.textAlign || attributes.textAlign === "left") {
                return {};
              }

              return {
                "data-text-align": attributes.textAlign,
                style: `text-align:${attributes.textAlign};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (textAlign: "left" | "center") =>
        ({ commands }) =>
          commands.updateAttributes("paragraph", { textAlign }) ||
          commands.updateAttributes("heading", { textAlign }),
      unsetTextAlign:
        () =>
        ({ commands }) =>
          commands.resetAttributes("paragraph", "textAlign") ||
          commands.resetAttributes("heading", "textAlign"),
    };
  },
});

const TextColorMark = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.color || null,
        renderHTML: (attributes: Record<string, string>) => {
          if (!attributes.color) return {};
          return { style: `color:${attributes.color};` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=color]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color: string) =>
        ({ commands }) =>
          commands.setMark("textColor", { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark("textColor"),
    };
  },
});

export const MergeFieldNode = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      fieldName: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-merge-field"),
        renderHTML: (attributes: Record<string, string>) => {
          if (!attributes.fieldName) return {};
          return { "data-merge-field": attributes.fieldName };
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label"),
        renderHTML: (attributes: Record<string, string>) => {
          if (!attributes.label) return {};
          return { "data-label": attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-merge-field]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    const label =
      (HTMLAttributes["data-label"] as string) ||
      (HTMLAttributes["data-merge-field"] as string) ||
      "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        style:
          "display:inline-block;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:9999px;padding:1px 8px;font-size:12px;font-weight:500;line-height:1.5;white-space:nowrap;user-select:all;",
      }),
      label,
    ];
  },
});

const SimpleTableNode = Node.create({
  name: "simpleTableBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      tablePreset: {
        default: "simple",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-table-kind") || "simple",
        renderHTML: (attributes: Record<string, string>) =>
          attributes.tablePreset ? { "data-table-kind": attributes.tablePreset } : {},
      },
      tablePayload: {
        default: encodeTablePayload(createInitialTableDraft("simple")),
        parseHTML: (element: HTMLElement) => element.getAttribute("data-table-payload"),
        renderHTML: (attributes: Record<string, string>) =>
          attributes.tablePayload ? { "data-table-payload": attributes.tablePayload } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "fab-simple-table" }, { tag: "table[data-email-block='simple-table']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    const tablePreset = isTablePreset(HTMLAttributes["data-table-kind"] as string | undefined)
      ? (HTMLAttributes["data-table-kind"] as TablePreset)
      : "simple";
    const payload = normalizeTableDraft(
      decodeTablePayload(HTMLAttributes["data-table-payload"] as string | null),
      tablePreset
    );
    return renderSimpleTableSpec(payload);
  },
});

const BrandedCtaNode = Node.create({
  name: "brandedCtaBlock",
  priority: 1000,
  group: "block",
  atom: true,

  addAttributes() {
    return {
      fieldKey: {
        default: "contact_link",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-field-key") || "contact_link",
        renderHTML: (attributes: Record<string, string>) =>
          attributes.fieldKey ? { "data-field-key": attributes.fieldKey } : {},
      },
      label: {
        default: "Contact Form Link",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label") || "Contact Form Link",
        renderHTML: (attributes: Record<string, string>) =>
          attributes.label ? { "data-label": attributes.label } : {},
      },
      description: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-description") || "",
        renderHTML: (attributes: Record<string, string>) =>
          attributes.description ? { "data-description": attributes.description } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "fab-branded-cta" }, { tag: "p[data-email-block='branded-card']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Attributes }) {
    const fieldKey = (HTMLAttributes["data-field-key"] as string | undefined) || "contact_link";
    const label = (HTMLAttributes["data-label"] as string | undefined) || "Contact Form Link";
    const description = (HTMLAttributes["data-description"] as string | undefined) || "";
    const baseLabel = formatBrandedLinkLabel(label);
    const buttonChildren: DOMOutputSpec = [
      "a",
      {
        href: `{${fieldKey}}`,
        target: "_blank",
        style: BRANDED_CTA_STYLE,
      },
      `Open ${baseLabel}`,
    ];

    if (description.trim()) {
      return [
        "p",
        mergeAttributes(HTMLAttributes, {
          "data-email-block": "branded-card",
          style: "margin:16px 0;",
        }),
        buttonChildren,
        [
          "span",
          {
            style:
              "margin-left:12px;color:#475569;font-size:13px;line-height:1.5;vertical-align:middle;",
          },
          description,
        ],
      ];
    }

    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-email-block": "branded-card",
        style: "margin:16px 0;",
      }),
      buttonChildren,
    ];
  },
});

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("h-7 w-7 p-0", active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  );
}

function MergeFieldPicker({
  editor,
  disabled,
  fieldValues,
}: {
  editor: Editor;
  disabled?: boolean;
  fieldValues?: Record<string, string> | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return MERGE_FIELD_CATEGORIES;
    return MERGE_FIELD_CATEGORIES.map((category) => ({
      ...category,
      fields: category.fields.filter(
        (field) =>
          field.label.toLowerCase().includes(q) ||
          field.key.toLowerCase().includes(q)
      ),
    })).filter((category) => category.fields.length > 0);
  }, [search]);

  const insertField = (field: MergeFieldDef) => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "mergeField",
        attrs: { fieldName: field.key, label: field.label },
      })
      .run();
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="Insert merge field"
          className="h-7 gap-1 px-2 text-xs font-medium"
        >
          <Braces className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fields</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fields..."
              className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <TooltipProvider delayDuration={300}>
          <div
            className="overflow-y-auto overscroll-contain p-1"
            style={{ maxHeight: 320 }}
            onWheel={(event) => {
              const element = event.currentTarget;
              element.scrollTop += event.deltaY;
              event.stopPropagation();
            }}
          >
            {filteredCategories.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No fields match &ldquo;{search}&rdquo;
              </p>
            )}
            {filteredCategories.map((category) => (
              <div key={category.id}>
                <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {category.label}
                </p>
                {category.fields.map((field) => {
                  const isEmpty = fieldValues && !field.manual && !fieldValues[field.key];
                  const value = fieldValues?.[field.key] || "";
                  const hasValue = !isEmpty && !field.manual && !!value;
                  const truncatedValue = value.length > 24 ? `${value.slice(0, 24)}…` : value;
                  const needsTooltip = value.length > 24;

                  const button = (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => !isEmpty && insertField(field)}
                      disabled={!!isEmpty}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                        isEmpty
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          isEmpty
                            ? "border-gray-200 bg-gray-100 text-gray-400"
                            : field.manual
                              ? "border-amber-200 bg-amber-100 text-amber-700"
                              : field.kind === "link"
                                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : "border-blue-200 bg-blue-100 text-blue-700"
                        )}
                      >
                        {field.label}
                      </span>
                      {isEmpty ? (
                        <span className="ml-auto shrink-0 text-[10px] italic text-muted-foreground">
                          No value
                        </span>
                      ) : field.manual ? (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          manual
                        </span>
                      ) : hasValue ? (
                        <span className="ml-auto max-w-[120px] truncate text-[10px] text-muted-foreground">
                          {truncatedValue}
                        </span>
                      ) : null}
                    </button>
                  );

                  if (hasValue && needsTooltip) {
                    return (
                      <Tooltip key={field.key}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-xs">
                          {value}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return button;
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}

function LinkPopover({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("https://");

  useEffect(() => {
    if (!open) return;
    const existingHref = (editor.getAttributes("link").href as string | undefined) || "https://";
    setHref(existingHref);
  }, [editor, open]);

  const applyLink = () => {
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setOpen(false);
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: href.trim() })
      .run();
    setOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || (!editor.isActive("link") && editor.state.selection.empty)}
          title="Add or edit link"
          className={cn("h-7 w-7 p-0", editor.isActive("link") && "bg-muted text-foreground")}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-url" className="text-xs text-muted-foreground">
              URL
            </Label>
            <Input
              id="link-url"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://example.com"
              className="h-8"
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={removeLink}>
              <Unlink className="mr-2 h-3.5 w-3.5" />
              Remove
            </Button>
            <Button type="button" size="sm" onClick={applyLink}>
              Save Link
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TextColorMenu({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1 px-2 text-xs">
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Text color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TEXT_COLORS.map((color) => (
          <DropdownMenuItem
            key={color.label}
            onClick={() => {
              if (!color.value) {
                editor.chain().focus().unsetTextColor().run();
                return;
              }
              editor.chain().focus().setTextColor(color.value).run();
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border"
              style={{ backgroundColor: color.swatch }}
            />
            {color.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BrandedLinkMenu({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const insertSnippet = (fieldKey: string, label: string, mode: BrandedLinkMode) => {
    if (mode === "card") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "brandedCtaBlock",
          attrs: {
            fieldKey,
            label,
            description: "",
          },
        })
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(
        buildBrandedLinkSnippet({
          fieldKey,
          label,
          mode,
        })
      )
      .run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1 px-2 text-xs">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">My Pages</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>My Pages</DropdownMenuLabel>
        {MERGE_FIELD_CATEGORIES.find((category) => category.id === "links")?.fields.map((field) => {
          const displayLabel = formatBrandedLinkLabel(field.label);
          return (
            <DropdownMenuItem
              key={`inline-${field.key}`}
              onClick={() => insertSnippet(field.key, field.label, "inline")}
            >
              {displayLabel}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Action Buttons</DropdownMenuLabel>
        {MERGE_FIELD_CATEGORIES.find((category) => category.id === "links")?.fields.map((field) => {
          const displayLabel = formatBrandedLinkLabel(field.label);
          return (
            <DropdownMenuItem
              key={`card-${field.key}`}
              onClick={() => insertSnippet(field.key, field.label, "card")}
            >
              {`Open ${displayLabel}`}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StructuredBlockMenu({
  disabled,
  onSelectPreset,
}: {
  disabled?: boolean;
  onSelectPreset: (preset: TablePreset) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1 px-2 text-xs">
          <Table2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Blocks</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Structured blocks</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSelectPreset("appointment")}>
          <CalendarDays className="h-3.5 w-3.5" />
          Appointment Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectPreset("insurance")}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Insurance Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectPreset("resources")}>
          <FileText className="h-3.5 w-3.5" />
          Resources List
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectPreset("actions")}>
          <Columns3 className="h-3.5 w-3.5" />
          Action Items
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelectPreset("simple")}>
          <Table2 className="h-3.5 w-3.5" />
          Simple Table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableBlockDialog({
  open,
  preset,
  mode,
  initialDraft,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  preset: TablePreset;
  mode: "insert" | "edit";
  initialDraft: TableDraft | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TableDraft) => void;
}) {
  const [draft, setDraft] = useState<TableDraft>(() => createInitialTableDraft(preset));

  useEffect(() => {
    if (open) {
      setDraft(normalizeTableDraft(initialDraft, preset));
    }
  }, [initialDraft, open, preset]);

  const setHeaderCount = (count: number) => {
    setDraft((current) => {
      const headers = [...current.headers];
      const rows = current.rows.map((row) => [...row]);

      while (headers.length < count) headers.push(`Column ${headers.length + 1}`);
      while (headers.length > count) headers.pop();

      for (const row of rows) {
        while (row.length < count) row.push("");
        while (row.length > count) row.pop();
      }

      return { ...current, headers, rows };
    });
  };

  const addRow = () => {
    setDraft((current) => {
      if (current.rows.length >= SIMPLE_TABLE_LIMITS.maxRows) return current;
      return {
        ...current,
        rows: [...current.rows, new Array(current.headers.length || 1).fill("")],
      };
    });
  };

  const removeRow = (index: number) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateHeader = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      headers: current.headers.map((header, headerIndex) => (headerIndex === index ? value : header)),
    }));
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell
            )
          : row
      ),
    }));
  };

  const titleMap: Record<TablePreset, string> = {
    simple: "Simple Table",
    appointment: "Appointment Details",
    insurance: "Insurance Details",
    resources: "Resources List",
    actions: "Action Items",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titleMap[preset]}</DialogTitle>
          <DialogDescription>
            Build a fixed-layout email table. Tables are limited to {SIMPLE_TABLE_LIMITS.maxColumns} columns and {SIMPLE_TABLE_LIMITS.maxRows} rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Header row</p>
              <p className="text-xs text-muted-foreground">Keep the first row styled as column labels.</p>
            </div>
            <Switch
              checked={draft.includeHeader}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, includeHeader: checked }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="column-count" className="text-sm font-medium">
              Columns
            </Label>
            <Input
              id="column-count"
              type="number"
              min={1}
              max={SIMPLE_TABLE_LIMITS.maxColumns}
              value={draft.headers.length}
              onChange={(event) => {
                const nextCount = Math.max(
                  1,
                  Math.min(SIMPLE_TABLE_LIMITS.maxColumns, Number(event.target.value) || 1)
                );
                setHeaderCount(nextCount);
              }}
              className="h-8 w-20"
            />
          </div>

          <div className="space-y-3">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${draft.headers.length}, minmax(0, 1fr))` }}>
              {draft.headers.map((header, index) => (
                <Input
                  key={`header-${index}`}
                  value={header}
                  onChange={(event) => updateHeader(index, event.target.value)}
                  placeholder={`Column ${index + 1}`}
                  className="h-8"
                />
              ))}
            </div>

            <div className="space-y-2">
              {draft.rows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex items-start gap-2">
                  <div
                    className="grid flex-1 gap-2"
                    style={{ gridTemplateColumns: `repeat(${draft.headers.length}, minmax(0, 1fr))` }}
                  >
                    {row.map((cell, columnIndex) => (
                      <Input
                        key={`cell-${rowIndex}-${columnIndex}`}
                        value={cell}
                        onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                        placeholder={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                        className="h-8"
                      />
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeRow(rowIndex)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={draft.rows.length >= SIMPLE_TABLE_LIMITS.maxRows}
            >
              Add Row
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSubmit(draft);
              onOpenChange(false);
            }}
          >
            {mode === "edit" ? "Save Block" : "Insert Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorToolbar({
  editor,
  fieldValues,
  disabled,
  onOpenTableDialog,
  onEditSelectedBlock,
  hasSelectedBlock,
}: {
  editor: Editor;
  fieldValues?: Record<string, string> | null;
  disabled?: boolean;
  onOpenTableDialog: (preset: TablePreset) => void;
  onEditSelectedBlock: () => void;
  hasSelectedBlock: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border-b bg-muted/30 px-2 py-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
        disabled={disabled}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
        disabled={disabled}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
        disabled={disabled}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading"
        disabled={disabled}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
        disabled={disabled}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
        disabled={disabled}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
        disabled={disabled}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
        disabled={disabled}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
        disabled={disabled}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <LinkPopover editor={editor} disabled={disabled} />
      <TextColorMenu editor={editor} disabled={disabled} />
      <MergeFieldPicker editor={editor} fieldValues={fieldValues} disabled={disabled} />
      <BrandedLinkMenu editor={editor} disabled={disabled} />
      {hasSelectedBlock && (
        <ToolbarButton
          onClick={onEditSelectedBlock}
          title="Edit selected block"
          disabled={disabled}
        >
          <Pencil className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      <StructuredBlockMenu disabled={disabled} onSelectPreset={onOpenTableDialog} />
    </div>
  );
}

function EmailHeader({ branding }: { branding: AgencyBrandingData }) {
  const textColor = getContrastColor(branding.brandColor);
  return (
    <div
      className="rounded-t-lg px-8 py-5 text-center"
      style={{ backgroundColor: branding.brandColor }}
    >
      {branding.logoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.logoUrl}
            alt={branding.agencyName}
            className="mx-auto mb-2 h-[45px] w-auto rounded-md"
          />
          <p className="m-0 text-base font-bold" style={{ color: textColor }}>
            {branding.agencyName}
          </p>
        </>
      ) : (
        <p className="m-0 text-xl font-bold" style={{ color: textColor }}>
          {branding.agencyName}
        </p>
      )}
    </div>
  );
}

function EmailFooter({ branding }: { branding: AgencyBrandingData }) {
  const parts: string[] = [];
  if (branding.contactEmail) parts.push(branding.contactEmail);
  if (branding.phone) parts.push(branding.phone);
  if (branding.website) parts.push(branding.website);

  return (
    <div className="rounded-b-lg border-t bg-slate-50 px-8 py-5 text-center">
      <p className="m-0 text-sm font-semibold text-slate-800">{branding.agencyName}</p>
      {parts.length > 0 && <p className="mt-1 text-xs text-slate-500">{parts.join(" · ")}</p>}
      <p className="mt-3 text-[11px] text-slate-400">Powered by GoodABA</p>
    </div>
  );
}

export function templateHtmlToMergeFieldHtml(html: string): string {
  return convertSimpleTablesToEditorTags(
    convertBrandedCtasToEditorTags(canonicalizeBrandedCtaMarkup(html))
  )
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) {
        return part;
      }

      return part.replace(/\{(\w+)\}/g, (_match, key: string) => {
        const def = MERGE_FIELD_MAP[key];
        const label = def?.label ?? key;
        return `<span data-merge-field="${key}" data-label="${label}">${label}</span>`;
      });
    })
    .join("");
}

export function mergeFieldHtmlToTemplate(html: string): string {
  return convertSimpleTablesToEditorTags(
    convertBrandedCtasToEditorTags(
      canonicalizeBrandedCtaMarkup(
        html.replace(
          /<span[^>]*data-merge-field="([^"]+)"[^>]*>[^<]*<\/span>/g,
          (_match, key: string) => `{${key}}`
        )
      )
    )
  );
}

function normalizeEditorHtmlForSync(html: string): string {
  return mergeFieldHtmlToTemplate(html)
    .replace(/\sdata-template-href="[^"]*"/g, "")
    .replace(/\sdata-preview-href="[^"]*"/g, "")
    .replace(/\srel="noopener noreferrer nofollow"/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function EmailEditor({
  content,
  onChange,
  branding,
  disabled,
  placeholder = "Write your email here...",
  fieldValues,
  resolvePreviewLink,
}: EmailEditorProps) {
  const [tableDialog, setTableDialog] = useState<TableDialogState>({
    open: false,
    mode: "insert",
    preset: "simple",
    initialDraft: null,
    targetPos: null,
  });
  const lastEmittedContentRef = useRef(normalizeEditorHtmlForSync(content));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          style: "color:#0866FF;text-decoration:underline;",
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlignExtension,
      TextColorMark,
      MergeFieldNode,
      SimpleTableNode,
      BrandedCtaNode,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }: { editor: Editor }) => {
      const nextHtml = currentEditor.getHTML();
      lastEmittedContentRef.current = normalizeEditorHtmlForSync(nextHtml);
      onChange(nextHtml);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[180px] px-10 py-8 [&_p]:my-2 [&_h2]:my-3 [&_ul]:my-2 [&_ol]:my-2 [&_hr]:my-6",
      },
      handleKeyDown: (view: EditorView, event: KeyboardEvent): boolean => {
        if (event.key !== "Backspace" && event.key !== "Delete") {
          return false;
        }

        if (!(view.state.selection instanceof NodeSelection)) {
          return false;
        }

        const nodeName = view.state.selection.node.type.name;
        if (!isRemovableEmailBlock(nodeName)) {
          return false;
        }

        event.preventDefault();
        const pos = view.state.selection.from;
        const nodeAtPos = view.state.doc.nodeAt(pos);
        const resolvedPos = nodeAtPos ? pos : Math.max(0, pos - 1);
        const node = nodeAtPos || view.state.doc.nodeAt(resolvedPos);
        if (!node || !isRemovableEmailBlock(node.type.name)) {
          return false;
        }

        const tr = view.state.tr.delete(resolvedPos, resolvedPos + node.nodeSize);
        view.dispatch(tr);
        return true;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;

    const normalizedIncomingContent = normalizeEditorHtmlForSync(content);
    const normalizedEditorContent = normalizeEditorHtmlForSync(editor.getHTML());
    if (
      normalizedIncomingContent === normalizedEditorContent ||
      normalizedIncomingContent === lastEmittedContentRef.current
    ) {
      return;
    }

    lastEmittedContentRef.current = normalizedIncomingContent;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;

    const syncPreviewLinks = () => {
      const root = editor.view.dom as HTMLElement;
      const anchors = root.querySelectorAll<HTMLAnchorElement>("a");

      anchors.forEach((anchor) => {
        const templateHref =
          anchor.getAttribute("data-template-href") || anchor.getAttribute("href") || "";
        anchor.setAttribute("data-template-href", templateHref);
        const previewHref =
          resolvePreviewHref(templateHref, fieldValues) ||
          (templateHref.match(TEMPLATE_HREF_PATTERN) ? "" : templateHref);

        anchor.setAttribute("data-preview-href", previewHref);
        anchor.removeAttribute("href");
        anchor.removeAttribute("target");
        anchor.setAttribute("rel", "noopener noreferrer nofollow");
        anchor.style.cursor = previewHref ? "pointer" : "default";

        if (anchor.closest("[data-email-block='branded-card']")) {
          anchor.style.cssText = `${BRANDED_CTA_STYLE};cursor:${previewHref ? "pointer" : "default"};`;
        }
      });
    };

    syncPreviewLinks();
    editor.on("update", syncPreviewLinks);

    return () => {
      editor.off("update", syncPreviewLinks);
    };
  }, [editor, fieldValues]);

  useEffect(() => {
    if (!editor) return;

    const root = editor.view.dom as HTMLElement;
    const handleAnchorEvent = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !root.contains(anchor)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const templateHref =
        anchor.getAttribute("data-template-href") || anchor.getAttribute("href") || "";
      const previewHref =
        anchor.getAttribute("data-preview-href")?.trim() ||
        resolvePreviewHref(templateHref, fieldValues) ||
        "";
      if (disabled || !previewHref) {
        return;
      }

      if (event.type === "click" && event.button === 0) {
        const fieldKey = templateHref.match(TEMPLATE_HREF_PATTERN)?.[1] || "";
        const currentPreviewHref = previewHref;
        const needsTokenizedPreview =
          !!resolvePreviewLink &&
          !!fieldKey &&
          TOKENIZED_PREVIEW_FIELDS.has(fieldKey) &&
          !currentPreviewHref.includes("?token=");
        const previewWindow = needsTokenizedPreview
          ? window.open("about:blank", "_blank")
          : null;
        if (previewWindow) {
          try {
            previewWindow.opener = null;
          } catch {
            // Ignore cross-window access restrictions in preview mode.
          }
        }

        void (async () => {
          let nextPreviewHref = currentPreviewHref;

          if (needsTokenizedPreview && resolvePreviewLink) {
            const resolvedPreviewHref = await resolvePreviewLink(fieldKey);
            if (resolvedPreviewHref?.trim()) {
              nextPreviewHref = resolvedPreviewHref.trim();
              anchor.setAttribute("data-preview-href", nextPreviewHref);
              anchor.style.cursor = "pointer";
            }
          }

          if (nextPreviewHref) {
            if (previewWindow && !previewWindow.closed) {
              previewWindow.location.href = nextPreviewHref;
              return;
            }

            window.open(nextPreviewHref, "_blank", "noopener,noreferrer");
            return;
          }

          if (previewWindow && !previewWindow.closed) {
            previewWindow.close();
          }
        })();
      }
    };

    root.addEventListener("mousedown", handleAnchorEvent, true);
    root.addEventListener("mouseup", handleAnchorEvent, true);
    root.addEventListener("click", handleAnchorEvent, true);
    root.addEventListener("auxclick", handleAnchorEvent, true);
    return () => {
      root.removeEventListener("mousedown", handleAnchorEvent, true);
      root.removeEventListener("mouseup", handleAnchorEvent, true);
      root.removeEventListener("click", handleAnchorEvent, true);
      root.removeEventListener("auxclick", handleAnchorEvent, true);
    };
  }, [disabled, editor, fieldValues, resolvePreviewLink]);

  const [selectedBlock, setSelectedBlock] = useState<SelectedBlockState | null>(null);

  useEffect(() => {
    if (!editor) {
      setSelectedBlock(null);
      return;
    }

    const syncSelectedBlock = () => {
      const selectedTableBlock = getSelectedTableBlock(editor);
      if (selectedTableBlock) {
        setSelectedBlock({
          type: "table",
          draft: selectedTableBlock.draft,
          preset: selectedTableBlock.preset,
          pos: selectedTableBlock.pos,
        });
        return;
      }

      const selectedCtaBlock = getSelectedCtaBlock(editor);
      if (selectedCtaBlock) {
        setSelectedBlock({
          type: "cta",
          fieldKey: selectedCtaBlock.fieldKey,
          label: selectedCtaBlock.label,
          description: selectedCtaBlock.description,
          pos: selectedCtaBlock.pos,
        });
        return;
      }

      setSelectedBlock(null);
    };

    syncSelectedBlock();
    editor.on("selectionUpdate", syncSelectedBlock);
    editor.on("update", syncSelectedBlock);

    return () => {
      editor.off("selectionUpdate", syncSelectedBlock);
      editor.off("update", syncSelectedBlock);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const syncBlockControls = () => {
      const root = editor.view.dom as HTMLElement;
      root.querySelectorAll<HTMLButtonElement>("[data-editor-block-delete]").forEach((button) => {
        button.remove();
      });

      const blocks = root.querySelectorAll<HTMLElement>(
        "[data-email-block='branded-card'], table[data-email-block='simple-table']"
      );

      blocks.forEach((block) => {
        const pos = resolveBlockPosFromDom(editor, block);
        if (pos == null) {
          return;
        }

        block.style.position = "relative";
        if (block.matches("[data-email-block='branded-card']")) {
          block.style.display = "inline-block";
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", "Delete block");
        deleteButton.title = "Delete";
        deleteButton.setAttribute("data-editor-block-delete", "true");
        deleteButton.style.cssText =
          "position:absolute;top:-8px;right:-8px;z-index:20;border:1px solid #dbe4ee;border-radius:999px;background:#ffffff;color:#64748b;font-size:14px;font-weight:700;line-height:1;width:24px;height:24px;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,23,42,0.12);cursor:pointer;";

        deleteButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        deleteButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteBlockAtPos(editor, pos);
        });

        block.appendChild(deleteButton);
      });
    };

    syncBlockControls();
    editor.on("update", syncBlockControls);
    editor.on("selectionUpdate", syncBlockControls);

    return () => {
      editor.off("update", syncBlockControls);
      editor.off("selectionUpdate", syncBlockControls);
    };
  }, [editor]);

  const submitTableBlock = useCallback(
    (draft: TableDraft) => {
      if (!editor) return;
      const normalizedDraft = normalizeTableDraft(draft, draft.preset);

      if (tableDialog.mode === "edit" && tableDialog.targetPos != null) {
        const targetPos = tableDialog.targetPos;
        editor
          .chain()
          .focus()
          .command(({ tr, dispatch }) => {
            const node = tr.doc.nodeAt(targetPos);
            if (!node || node.type.name !== "simpleTableBlock") {
              return false;
            }

            tr.setNodeMarkup(targetPos, undefined, {
              ...node.attrs,
              tablePreset: normalizedDraft.preset,
              tablePayload: encodeTablePayload(normalizedDraft),
            });
            dispatch?.(tr);
            return true;
          })
          .run();
        return;
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "simpleTableBlock",
          attrs: {
            tablePreset: normalizedDraft.preset,
            tablePayload: encodeTablePayload(normalizedDraft),
          },
        })
        .run();
    },
    [editor, tableDialog.mode, tableDialog.targetPos]
  );

  if (!editor) return null;

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-slate-100 shadow-sm">
        {branding && <EmailHeader branding={branding} />}

        <div className="bg-white">
          <EditorToolbar
            editor={editor}
            fieldValues={fieldValues}
            disabled={disabled}
            hasSelectedBlock={selectedBlock?.type === "table"}
            onEditSelectedBlock={() => {
              if (!selectedBlock || selectedBlock.type !== "table") return;
              setTableDialog({
                open: true,
                mode: "edit",
                preset: selectedBlock.preset,
                initialDraft: selectedBlock.draft,
                targetPos: selectedBlock.pos,
              });
            }}
            onOpenTableDialog={(preset) =>
              setTableDialog({
                open: true,
                mode: "insert",
                preset,
                initialDraft: createInitialTableDraft(preset),
                targetPos: null,
              })
            }
          />
          <EditorContent editor={editor} />
        </div>

        {branding && <EmailFooter branding={branding} />}
      </div>

      <TableBlockDialog
        open={tableDialog.open}
        preset={tableDialog.preset}
        mode={tableDialog.mode}
        initialDraft={tableDialog.initialDraft}
        onOpenChange={(open) => setTableDialog((current) => ({ ...current, open }))}
        onSubmit={submitTableBlock}
      />
    </>
  );
}
