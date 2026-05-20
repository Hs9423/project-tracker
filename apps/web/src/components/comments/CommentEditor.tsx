'use client';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import type { UserPublic } from '@/types/api';

// ─── Mention suggestion list ─────────────────────────────────────────────────

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, SuggestionProps<UserPublic>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) props.command({ id: item.id, label: item.name } as Record<string, string>);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === 'Enter') { selectItem(selectedIndex); return true; }
        return false;
      },
    }));

    if (!props.items.length) return null;

    return (
      <div className="z-50 rounded-md border border-c-border bg-surface shadow-lg overflow-hidden min-w-[180px]">
        {props.items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => selectItem(i)}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors ${
              i === selectedIndex ? 'bg-accent/15 text-accent' : 'text-text hover:bg-surface2'
            }`}
          >
            <UserAvatar name={item.name} avatarUrl={item.avatarUrl} className="h-5 w-5 text-[9px] shrink-0" />
            {item.name}
          </button>
        ))}
      </div>
    );
  },
);
MentionList.displayName = 'MentionList';

// ─── CommentEditor ────────────────────────────────────────────────────────────

interface CommentEditorProps {
  teamMembers: UserPublic[];
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  placeholder?: string;
  initialContent?: Record<string, unknown>;
  onCancel?: () => void;
}

export function CommentEditor({
  teamMembers,
  onSubmit,
  isSubmitting,
  placeholder = 'Write a comment… (@ to mention)',
  initialContent,
  onCancel,
}: CommentEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderLabel: ({ node }) => `@${(node.attrs as Record<string, string>).label ?? (node.attrs as Record<string, string>).id}`,
        suggestion: {
          items: ({ query }: { query: string }) =>
            teamMembers.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
          render: () => {
            let component: ReactRenderer<MentionListRef, SuggestionProps<UserPublic>>;
            let popup: HTMLDivElement | null = null;

            return {
              onStart: (props: SuggestionProps<UserPublic>) => {
                component = new ReactRenderer(MentionList as React.ComponentType<SuggestionProps<UserPublic>>, {
                  props,
                  editor: props.editor,
                });
                popup = document.createElement('div');
                popup.style.cssText = 'position:fixed;z-index:9999;';
                document.body.appendChild(popup);
                popup.appendChild(component.element);
                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.x}px`;
                  popup.style.top = `${rect.y + rect.height + 4}px`;
                }
              },
              onUpdate: (props: SuggestionProps<UserPublic>) => {
                component.updateProps(props);
                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.x}px`;
                  popup.style.top = `${rect.y + rect.height + 4}px`;
                }
              },
              onKeyDown: (props: SuggestionKeyDownProps) =>
                component.ref?.onKeyDown(props) ?? false,
              onExit: () => {
                popup?.remove();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[72px] px-3 py-2 text-text',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          handleSubmit();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => () => { editor?.destroy(); }, [editor]);

  const handleSubmit = () => {
    if (!editor || editor.isEmpty) return;
    onSubmit(editor.getJSON() as Record<string, unknown>);
    editor.commands.clearContent();
  };

  return (
    <div className="rounded-lg border border-c-border bg-surface overflow-hidden focus-within:border-accent/50 transition-colors">
      <style>{`.mention{color:var(--accent);font-weight:500}.ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:var(--text2);pointer-events:none;float:left;height:0}`}</style>
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between border-t border-c-border px-3 py-2 bg-surface2/50">
        <span className="text-[10px] text-text2">Ctrl+Enter to submit · @ to mention</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Posting…' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// React import for the ReactRenderer cast
import React from 'react';
