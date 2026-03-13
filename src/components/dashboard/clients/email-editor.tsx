"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Unlink,
  Braces,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getContrastColor, type AgencyBrandingData } from "@/lib/email/email-helpers";

// ---------------------------------------------------------------------------
// Merge Field Registry
// ---------------------------------------------------------------------------

export interface MergeFieldDef {
  key: string;
  label: string;
  manual?: boolean;
}

export interface MergeFieldCategory {
  id: string;
  label: string;
  fields: MergeFieldDef[];
}

export const MERGE_FIELD_CATEGORIES: MergeFieldCategory[] = [
  {
    id: "client",
    label: "Client",
    fields: [
      { key: "client_name", label: "Client Name" },
      { key: "child_first_name", label: "Child First Name" },
      { key: "child_last_name", label: "Child Last Name" },
      { key: "child_date_of_birth", label: "Date of Birth" },
      { key: "child_diagnosis", label: "Diagnosis" },
      { key: "child_school_name", label: "School Name" },
      { key: "child_school_district", label: "School District" },
      { key: "child_grade_level", label: "Grade Level" },
      { key: "child_pediatrician_name", label: "Pediatrician Name" },
      { key: "child_pediatrician_phone", label: "Pediatrician Phone" },
      { key: "preferred_language", label: "Preferred Language" },
      { key: "service_start_date", label: "Service Start Date" },
      { key: "referral_source", label: "Referral Source" },
      { key: "referral_date", label: "Referral Date" },
      { key: "status", label: "Client Status" },
      { key: "funding_source", label: "Funding Source" },
    ],
  },
  {
    id: "parent",
    label: "Parent / Guardian",
    fields: [
      { key: "parent_name", label: "Parent Name" },
      { key: "parent_first_name", label: "Parent First Name" },
      { key: "parent_last_name", label: "Parent Last Name" },
      { key: "parent_email", label: "Parent Email" },
      { key: "parent_phone", label: "Parent Phone" },
      { key: "parent_relationship", label: "Relationship" },
    ],
  },
  {
    id: "insurance",
    label: "Insurance",
    fields: [
      { key: "insurance_name", label: "Insurance Name" },
      { key: "insurance_plan_name", label: "Plan Name" },
      { key: "insurance_member_id", label: "Member ID" },
      { key: "insurance_group_number", label: "Group Number" },
      { key: "insurance_type", label: "Insurance Type" },
    ],
  },
  {
    id: "authorization",
    label: "Authorization",
    fields: [
      { key: "auth_reference_number", label: "Auth Reference #" },
      { key: "auth_start_date", label: "Auth Start Date" },
      { key: "auth_end_date", label: "Auth End Date" },
      { key: "auth_units_requested", label: "Units Requested" },
      { key: "auth_units_used", label: "Units Used" },
      { key: "auth_units_remaining", label: "Units Remaining" },
      { key: "auth_status", label: "Auth Status" },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    fields: [
      { key: "agency_name", label: "Agency Name" },
      { key: "agency_phone", label: "Agency Phone" },
      { key: "agency_email", label: "Agency Email" },
    ],
  },
  {
    id: "links",
    label: "Links",
    fields: [
      { key: "resources_link", label: "Resources Link" },
      { key: "intake_link", label: "Intake Link" },
      { key: "contact_link", label: "Contact Link" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    fields: [
      { key: "assessment_date", label: "Assessment Date", manual: true },
      { key: "assessment_time", label: "Assessment Time", manual: true },
      { key: "assessment_location", label: "Assessment Location", manual: true },
    ],
  },
];

/** Flat lookup: key → MergeFieldDef */
export const MERGE_FIELD_MAP: Record<string, MergeFieldDef> = {};
for (const cat of MERGE_FIELD_CATEGORIES) {
  for (const f of cat.fields) {
    MERGE_FIELD_MAP[f.key] = f;
  }
}

// ---------------------------------------------------------------------------
// MergeField Tiptap Extension
// ---------------------------------------------------------------------------

const MergeFieldNode = Node.create({
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
    return [{ tag: 'span[data-merge-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const label = (HTMLAttributes["data-label"] as string) || (HTMLAttributes["data-merge-field"] as string) || "";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailEditorProps {
  /** HTML content to initialise the editor with */
  content: string;
  /** Called whenever the editor content changes (HTML string) */
  onChange: (html: string) => void;
  /** Agency branding data for the email chrome */
  branding: AgencyBrandingData | null;
  /** Disable editing (e.g. while sending) */
  disabled?: boolean;
  placeholder?: string;
  /** Resolved merge field values for the current client (used to show empty indicators) */
  fieldValues?: Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

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
      className={cn(
        "h-7 w-7 p-0",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Searchable Merge Field Picker
// ---------------------------------------------------------------------------

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
    return MERGE_FIELD_CATEGORIES.map((cat) => ({
      ...cat,
      fields: cat.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.fields.length > 0);
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
          <span className="hidden sm:inline">Insert Field</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields..."
              className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <TooltipProvider delayDuration={300}>
          <div
            className="overflow-y-auto overscroll-contain p-1"
            style={{ maxHeight: 320 }}
            onWheel={(e) => {
              // Radix Dialog scroll-lock eats wheel events; handle manually
              const el = e.currentTarget;
              el.scrollTop += e.deltaY;
              e.stopPropagation();
            }}
          >
            {filteredCategories.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No fields match &ldquo;{search}&rdquo;
              </p>
            )}
            {filteredCategories.map((cat) => (
              <div key={cat.id}>
                <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </p>
                {cat.fields.map((field) => {
                  const isEmpty = fieldValues && !field.manual && !fieldValues[field.key];
                  const value = fieldValues?.[field.key] || "";
                  const hasValue = !isEmpty && !field.manual && !!value;
                  const truncatedValue = value.length > 24 ? value.slice(0, 24) + "…" : value;
                  const needsTooltip = value.length > 24;

                  const btn = (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => !isEmpty && insertField(field)}
                      disabled={!!isEmpty}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                        isEmpty
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          isEmpty
                            ? "bg-gray-100 text-gray-400 border border-gray-200"
                            : field.manual
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                        )}
                      >
                        {field.label}
                      </span>
                      {isEmpty ? (
                        <span className="ml-auto text-[10px] text-muted-foreground italic shrink-0">
                          No value
                        </span>
                      ) : field.manual ? (
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                          manual
                        </span>
                      ) : hasValue ? (
                        <span className="ml-auto truncate text-[10px] text-muted-foreground max-w-[120px]">
                          {truncatedValue}
                        </span>
                      ) : null}
                    </button>
                  );

                  if (hasValue && needsTooltip) {
                    return (
                      <Tooltip key={field.key}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-xs">
                          {value}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return btn;
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Formatting toolbar
// ---------------------------------------------------------------------------

function EditorToolbar({ editor, fieldValues }: { editor: Editor; fieldValues?: Record<string, string> | null }) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1 rounded-t-md flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive("heading", { level: 2 })}
        title="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={setLink}
        active={editor.isActive("link")}
        title="Add link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      {editor.isActive("link") && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove link"
        >
          <Unlink className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}

      <div className="mx-1 h-4 w-px bg-border" />

      <MergeFieldPicker editor={editor} fieldValues={fieldValues} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branded email chrome (header + footer)
// ---------------------------------------------------------------------------

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
          <p
            className="m-0 text-base font-bold"
            style={{ color: textColor }}
          >
            {branding.agencyName}
          </p>
        </>
      ) : (
        <p
          className="m-0 text-xl font-bold"
          style={{ color: textColor }}
        >
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
    <div className="border-t bg-slate-50 px-8 py-5 text-center rounded-b-lg">
      <p className="m-0 text-sm font-semibold text-slate-800">
        {branding.agencyName}
      </p>
      {parts.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {parts.join(" \u00B7 ")}
        </p>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        Powered by GoodABA
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers: convert {field_name} placeholders to MergeField nodes in HTML
// ---------------------------------------------------------------------------

/**
 * Convert raw template HTML containing {field_name} placeholders into HTML
 * with `<span data-merge-field="...">Label</span>` tags so Tiptap parses
 * them as MergeField nodes.
 */
export function templateHtmlToMergeFieldHtml(html: string): string {
  return html.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const def = MERGE_FIELD_MAP[key];
    const label = def?.label ?? key;
    return `<span data-merge-field="${key}" data-label="${label}">${label}</span>`;
  });
}

/**
 * Convert editor HTML with merge-field spans back to `{field_name}` syntax
 * for server-side processing.
 */
export function mergeFieldHtmlToTemplate(html: string): string {
  // Replace <span data-merge-field="key" ...>...</span> → {key}
  return html.replace(
    /<span[^>]*data-merge-field="([^"]+)"[^>]*>[^<]*<\/span>/g,
    (_match, key: string) => `{${key}}`
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EmailEditor({
  content,
  onChange,
  branding,
  disabled,
  placeholder = "Write your email here...",
  fieldValues,
}: EmailEditorProps) {
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
          style: "color: #0866FF; text-decoration: underline;",
        },
      }),
      Placeholder.configure({ placeholder }),
      MergeFieldNode,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[180px] px-10 py-8 [&_p]:my-2 [&_h2]:my-3 [&_ul]:my-2 [&_ol]:my-2",
      },
    },
  });

  // Sync disabled prop
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Sync external content changes (template selection)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // Only react to content prop changes, not editor HTML
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border bg-slate-100 shadow-sm">
      {/* Agency header */}
      {branding && <EmailHeader branding={branding} />}

      {/* White content area with toolbar + editor */}
      <div className="bg-white">
        <EditorToolbar editor={editor} fieldValues={fieldValues} />
        <EditorContent editor={editor} />
      </div>

      {/* Agency footer */}
      {branding && <EmailFooter branding={branding} />}
    </div>
  );
}
