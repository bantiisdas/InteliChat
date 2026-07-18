import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "../utils/query-keys";
import {
  createConversation,
  deleteConversation,
  listConversations,
  updateConversation,
} from "../actions/conversation-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useConversations() {
  return useQuery({
    queryKey: userKeys.conversations.all,
    queryFn: () => listConversations(),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: userKeys.conversations.all,
      });
      router.push(`/c/${conversation.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create Chat");
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      isPinned?: boolean;
      isarchived?: boolean;
    }) => updateConversation(id, data),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({
        queryKey: userKeys.conversations.all,
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.conversations.detail(conversation.id),
      });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Problem in updating chat"),
  });
}

export function useDeleteConversation(activeId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({
        queryKey: userKeys.conversations.all,
      });
      queryClient.refetchQueries({
        queryKey: userKeys.messages.byConversation(id),
      });

      if (activeId === id) {
        router.push("/");
      }

      toast.success("Chat deleted");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Problem in deleting chat"),
  });
}
