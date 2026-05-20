'use client';
import { useState, useEffect } from 'react';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useProjectTeam } from '@/hooks/useProjects';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
import { UserAvatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { CommentEditor } from './CommentEditor';
import { Pencil, Trash2, Reply, MessageSquare } from 'lucide-react';
import type { Comment, EntityType } from '@/types/api';
import { useQueryClient } from '@tanstack/react-query';

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const REACTIONS = ['👍', '❤️', '😂'];

function renderCommentBody(body: Record<string, unknown>): string {
  if (!body || typeof body !== 'object') return '';
  const content = body.content as Array<Record<string, unknown>> | undefined;
  if (!content) return '';

  function renderNode(node: Record<string, unknown>): string {
    if (node.type === 'text') {
      return (node.text as string) ?? '';
    }
    if (node.type === 'mention') {
      const attrs = node.attrs as Record<string, unknown>;
      return `@${attrs.label ?? attrs.id}`;
    }
    const children = (node.content as Array<Record<string, unknown>>) ?? [];
    return children.map(renderNode).join('');
  }

  return content.map(renderNode).join('\n');
}

interface CommentItemProps {
  comment: Comment;
  entityType: EntityType;
  entityId: string;
  projectId: string;
  depth?: number;
}

function CommentItem({ comment, entityType, entityId, projectId, depth = 0 }: CommentItemProps) {
  const { user } = useAuthStore();
  const { data: team = [] } = useProjectTeam(projectId);
  const updateComment = useUpdateComment(entityType, entityId);
  const deleteComment = useDeleteComment(entityType, entityId);
  const createReply = useCreateComment(entityType, entityId);

  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    const r = (comment.body as Record<string, unknown>).__reactions as Record<string, number> | undefined;
    return r ?? {};
  });

  const isOwn = user?.id === comment.authorId;
  const teamMembers = team.map(r => r.user);
  const bodyText = renderCommentBody(comment.body as Record<string, unknown>);

  const handleReact = (emoji: string) => {
    const updated = { ...reactions, [emoji]: (reactions[emoji] ?? 0) + 1 };
    setReactions(updated);
    // Persist reaction as part of the body's __reactions field
    const newBody = { ...(comment.body as Record<string, unknown>), __reactions: updated };
    updateComment.mutate({ id: comment.id, body: newBody });
  };

  return (
    <div className={depth > 0 ? 'ml-8 border-l border-c-border pl-4' : ''}>
      <div className="group flex items-start gap-2.5 py-2.5">
        <UserAvatar
          name={comment.author?.name ?? '?'}
          avatarUrl={comment.author?.avatarUrl ?? null}
          className="h-7 w-7 text-xs shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text">{comment.author?.name ?? 'Unknown'}</span>
            <span className="text-[10px] text-text2">{timeAgo(comment.createdAt)}</span>
            {comment.isEdited && <span className="text-[10px] text-text2">(edited)</span>}
          </div>

          {editing ? (
            <CommentEditor
              teamMembers={teamMembers}
              initialContent={comment.body as Record<string, unknown>}
              onSubmit={async (body) => {
                await updateComment.mutateAsync({ id: comment.id, body });
                setEditing(false);
              }}
              isSubmitting={updateComment.isPending}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <p className="text-sm text-text whitespace-pre-wrap break-words">{bodyText}</p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-xs hover:scale-110 transition-transform"
              >
                {emoji}{reactions[emoji] ? ` ${reactions[emoji]}` : ''}
              </button>
            ))}

            {depth === 0 && (
              <button
                onClick={() => setReplying(r => !r)}
                className="ml-1 flex items-center gap-1 text-[11px] text-text2 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
              >
                <Reply className="h-3 w-3" />Reply
              </button>
            )}

            {isOwn && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-[11px] text-text2 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteComment.mutate(comment.id)}
                  className="flex items-center gap-1 text-[11px] text-text2 hover:text-red transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>

          {replying && depth === 0 && (
            <div className="mt-2">
              <CommentEditor
                teamMembers={teamMembers}
                placeholder="Write a reply…"
                onSubmit={async (body) => {
                  await createReply.mutateAsync({ body, parentId: comment.id });
                  setReplying(false);
                }}
                isSubmitting={createReply.isPending}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  entityType={entityType}
                  entityId={entityId}
                  projectId={projectId}
                  depth={1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentThreadProps {
  entityType: EntityType;
  entityId: string;
  projectId: string;
}

export function CommentThread({ entityType, entityId, projectId }: CommentThreadProps) {
  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const { data: team = [] } = useProjectTeam(projectId);
  const createComment = useCreateComment(entityType, entityId);
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  // Real-time: listen for comment:new socket event
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    const handleNewComment = (data: { entityType: EntityType; entityId: string }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        qc.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      }
    };

    socket.on('comment:new', handleNewComment);
    return () => { socket.off('comment:new', handleNewComment); };
  }, [accessToken, entityType, entityId, qc]);

  const teamMembers = team.map(r => r.user);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4 text-text2" />
        <span className="text-sm font-semibold text-text">
          Comments {comments.length > 0 ? `(${comments.length})` : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-text2 py-2">No comments yet. Be the first!</p>
      ) : (
        <div className="divide-y divide-c-border">
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              entityType={entityType}
              entityId={entityId}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      <CommentEditor
        teamMembers={teamMembers}
        onSubmit={(body) => createComment.mutate({ body })}
        isSubmitting={createComment.isPending}
      />
    </div>
  );
}
