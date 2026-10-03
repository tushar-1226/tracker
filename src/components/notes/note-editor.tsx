"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Bold, Code, Heading2, Italic, List, ListOrdered, LoaderCircle, Pin, Quote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { deleteNote, saveNote, setNotePinned } from "@/server/actions/notes";

type Snapshot = { title: string; content: Record<string, unknown> | null; text: string; tags: string[] };

export function NoteEditor({
  note,
}: {
  note: { id: string; title: string; content: Record<string, unknown> | null; tags: string[]; pinned: boolean; updatedAt: number };
}) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pinned, setPinned] = useState(note.pinned);
  const [, startTransition] = useTransition();

  // ---------- Autosave ----------
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Snapshot | null>(null);
  const latest = useRef<Snapshot>({ title: note.title, content: note.content, text: "", tags: note.tags });

  const flush = async () => {
    timer.current = null;
    const snap = pending.current;
    pending.current = null;
    if (!snap) return;
    try {
      await saveNote(note.id, snap);
      setStatus((s) => (pending.current ? s : "saved"));
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };
  const schedule = (patch: Partial<Snapshot>) => {
    latest.current = { ...latest.current, ...patch };
    pending.current = latest.current;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Placeholder.configure({ placeholder: "Start writing… Markdown shortcuts work: # heading, - list, > quote" })],
    content: note.content ?? "",
    editorProps: { attributes: { class: "prose-note min-h-[50vh] outline-none", "aria-label": "Note body" } },
    onCreate: ({ editor }) => {
      latest.current.text = editor.getText();
    },
    onUpdate: ({ editor }) => schedule({ content: editor.getJSON(), text: editor.getText() }),
  });

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void saveNote(note.id, pending.current);
    };
  }, [note.id]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, "");
    setTagInput("");
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    schedule({ tags: next });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-2">
        <Link href="/notes" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Notes
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-muted" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn’t save" : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin" : "Pin"}
            onClick={() => {
              setPinned(!pinned);
              startTransition(() => setNotePinned(note.id, !pinned));
            }}
          >
            <Pin className={cn(pinned && "fill-foreground")} />
          </Button>
          <DeleteNote id={note.id} />
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          schedule({ title: e.target.value });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor?.commands.focus("start");
          }
        }}
        placeholder="Untitled"
        aria-label="Title"
        autoFocus={!note.title}
        className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-border md:text-5xl"
      />

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex h-7 items-center gap-1 rounded-none border pr-1 pl-2.5 text-xs">
            #{t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => {
                const next = tags.filter((x) => x !== t);
                setTags(next);
                schedule({ tags: next });
              }}
              className="inline-flex size-5 items-center justify-center rounded-none text-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ tag"
          aria-label="Add tag"
          className="h-7 w-20 bg-transparent text-xs outline-none placeholder:text-muted"
        />
      </div>

      {editor && <Toolbar editor={editor} />}
      <div className="mt-4" data-lenis-prevent>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
    }),
  });
  const items = [
    { key: "bold", label: "Bold", icon: Bold, run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", label: "Italic", icon: Italic, run: () => editor.chain().focus().toggleItalic().run() },
    { key: "h2", label: "Heading", icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "bullet", label: "Bullet list", icon: List, run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "ordered", label: "Numbered list", icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: "quote", label: "Quote", icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { key: "code", label: "Code block", icon: Code, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ] as const;
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mt-6 -mx-2 flex gap-0.5 border-b bg-background/80 px-2 py-1.5 backdrop-blur-md md:top-0" role="toolbar" aria-label="Formatting">
      {items.map(({ key, label, icon: Icon, run }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          aria-pressed={state[key]}
          onClick={run}
          className={cn("inline-flex size-8 items-center justify-center rounded-lg transition-colors", state[key] ? "bg-foreground text-background" : "text-muted hover:bg-subtle hover:text-foreground")}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function DeleteNote({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Delete note">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent title="Delete this note?" description="This can’t be undone.">
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={pending} onClick={() => startTransition(() => deleteNote(id))}>
            {pending ? <LoaderCircle className="animate-spin" /> : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
