"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ConversationListItem = {
  id: string;
  title: string;
  isPinned: boolean;
  isarchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};

export async function assertOwnsconversation(
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) throw new Error("Conversation not found or access denied");
  return conversation;
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, isarchived: false },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPinned: true,
      isarchived: true,
      createdAt: true,
      updatedAt: true,
      lastMessageAt: true,
    },
  });
}

export async function createConversation(title = "New Chat") {
  const user = await requireUser();

  return prisma.conversation.create({
    data: {
      userId: user.id,
      title: title.trim() ?? "New Chat",
    },
  });
}

export async function updateConversation(
  conversationId: string,
  data: {
    title?: string;
    isPinned?: boolean;
    isarchived?: boolean;
  },
) {
  const user = await requireUser();

  await assertOwnsconversation(conversationId, user.id);

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(data.title !== undefined
        ? { title: data.title.trim() || "New Chat" }
        : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      ...(data.isarchived !== undefined ? { isPinned: data.isarchived } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`c/${conversationId}`);

  return conversation;
}

export async function deleteConversation(conversationId: string) {
  const user = await requireUser();

  await assertOwnsconversation(conversationId, user.id);

  await prisma.conversation.delete({ where: { id: conversationId } });

  revalidatePath("/");
  return { id: conversationId };
}
