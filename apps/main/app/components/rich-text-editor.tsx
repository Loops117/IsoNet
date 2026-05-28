"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type ToolbarButtonProps = {
  label: string;
  title: string;
  active?: boolean;
  onClick: () => void;
};

function ToolbarButton({ label, title, active = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={[
        "rich-text-editor__toolbar-btn",
        active ? "rich-text-editor__toolbar-btn--active" : "",
      ].join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function EditorSkeleton() {
  return (
    <div className="rich-text-editor" aria-hidden="true">
      <div className="rich-text-editor__toolbar rich-text-editor__toolbar--loading" />
      <div className="rich-text-editor__content rich-text-editor__content--loading" />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tell customers about your business...",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      FontFamily,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.getHTML();
    const next = value || "<p></p>";
    if (value !== current && next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <EditorSkeleton />;
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label="Formatting">
        <div className="rich-text-editor__toolbar-group">
          <ToolbarButton
            label="B"
            title="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="I"
            title="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="U"
            title="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
        </div>

        <div className="rich-text-editor__toolbar-divider" aria-hidden="true" />

        <div className="rich-text-editor__toolbar-group">
          <ToolbarButton
            label="H1"
            title="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <ToolbarButton
            label="H2"
            title="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="• List"
            title="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Quote"
            title="Blockquote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
        </div>

        <div className="rich-text-editor__toolbar-divider" aria-hidden="true" />

        <div className="rich-text-editor__toolbar-group">
          <ToolbarButton
            label="Left"
            title="Align left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          />
          <ToolbarButton
            label="Center"
            title="Align center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          />
          <ToolbarButton
            label="Right"
            title="Align right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          />
        </div>

        <div className="rich-text-editor__toolbar-divider" aria-hidden="true" />

        <div className="rich-text-editor__toolbar-group">
          <label className="rich-text-editor__font-select">
            <span className="sr-only">Font family</span>
            <select
              className="rich-text-editor__font-select-input"
              value={
                (editor.getAttributes("textStyle").fontFamily as string | undefined) || "Inter"
              }
              onChange={(event) =>
                editor.chain().focus().setFontFamily(event.target.value).run()
              }
            >
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="'Trebuchet MS'">Trebuchet</option>
              <option value="Verdana">Verdana</option>
            </select>
          </label>
        </div>

        <div className="rich-text-editor__toolbar-divider" aria-hidden="true" />

        <div className="rich-text-editor__toolbar-group">
          <ToolbarButton
            label="Undo"
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="Redo"
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      </div>
      <EditorContent editor={editor} className="rich-text-editor__content" />
    </div>
  );
}
