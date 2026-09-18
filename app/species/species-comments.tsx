"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CommentWithAuthor } from "./types";

// Matches the length check on the comments table
const MAX_COMMENT_LENGTH = 1000;

function errorToast(description: string) {
  toast({ title: "Something went wrong.", description, variant: "destructive" });
}

// Icon-only delete button that asks for confirmation before removing the comment
function DeleteCommentButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 shrink-0 p-0" aria-label="Delete comment">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove your comment. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CommentItem({
  comment,
  canDelete,
  onDelete,
}: {
  comment: CommentWithAuthor;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{comment.profiles?.display_name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
        </div>
        {canDelete && <DeleteCommentButton onConfirm={onDelete} />}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
    </li>
  );
}

export default function SpeciesComments({ speciesId, sessionId }: { speciesId: number; sessionId: string }) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const latestLoad = useRef(0);

  // Shared by the initial load and the refreshes after posting or deleting. Only the newest request may update the
  // list, so a slow earlier response can never overwrite a later one
  const loadComments = useCallback(async () => {
    const requestId = ++latestLoad.current;
    const { data, error } = await createBrowserSupabaseClient()
      .from("comments")
      .select("*, profiles(display_name)")
      .eq("species_id", speciesId)
      .order("created_at", { ascending: false });
    if (requestId !== latestLoad.current) return;
    setLoadFailed(error !== null);
    if (!error) setComments(data);
    setLoading(false);
  }, [speciesId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const postComment = async () => {
    // Clear the box right away so anything typed during the request is kept; the text only comes back on failure
    const content = draft.trim();
    setDraft("");
    setPosting(true);
    const { error } = await createBrowserSupabaseClient()
      .from("comments")
      .insert({ species_id: speciesId, author: sessionId, content });
    if (error) {
      errorToast(error.message);
      setDraft((current) => current || content);
    } else {
      await loadComments();
    }
    setPosting(false);
  };

  const deleteComment = async (id: number) => {
    const { error } = await createBrowserSupabaseClient().from("comments").delete().eq("id", id);
    if (error) {
      return errorToast(error.message);
    }
    // Re-fetch instead of filtering locally so a select that started before the delete can't bring the row back
    await loadComments();
  };

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">Comments</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : loadFailed ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-destructive">Could not load comments.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadComments()}>
            Retry
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={comment.author === sessionId}
              onDelete={() => deleteComment(comment.id)}
            />
          ))}
        </ul>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void postComment();
        }}
        className="space-y-2"
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment..."
          maxLength={MAX_COMMENT_LENGTH}
          aria-label="Add a comment"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {draft.length} / {MAX_COMMENT_LENGTH}
          </span>
          <Button type="submit" disabled={draft.trim() === "" || posting}>
            Post comment
          </Button>
        </div>
      </form>
    </section>
  );
}
