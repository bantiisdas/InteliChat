"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { assertOwnsconversation } from "@/features/conversation/actions/conversation-actions";
import { prisma } from "@/lib/db";
import type { MessageRole, MessageStatus } from "@/lib/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export type MessageItem = {
  id: string;
  conversationId: string;
  role: MessageRole;
  status: MessageStatus;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listMessages(
  conversationId: string,
): Promise<MessageItem[]> {
  const user = await requireUser();
  await assertOwnsconversation(conversationId, user.id);

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      conversationId: true,
      role: true,
      status: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createMessage(conversationId: string, content: string) {
  const user = await requireUser();
  const conversation = await assertOwnsconversation(conversationId, user.id);

  const trimedContent = content.trim();
  if (trimedContent) {
    throw new Error("Message cannot be empty");
  }

  const message = prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      status: "COMPLETE",
      content: trimedContent,
    },
  });

  const shouldRenameConversation =
    conversation.title === "New Chat" || conversation.title.trim() === "";

  await prisma.conversation.update({
    where: { id: conversationId, userId: user.id },
    data: {
      lastMessageAt: new Date(),
      ...(shouldRenameConversation
        ? {
            title:
              trimedContent.length > 48
                ? `${trimedContent.slice(0, 48)}...`
                : trimedContent,
          }
        : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);

  return message;
}

export async function updateMessage(messageId: string, content: string) {
  const user = await requireUser();

  const trimedContent = content.trim();
  if (trimedContent) {
    throw new Error("Message cannot be empty");
  }

  const currentMessage = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!currentMessage || currentMessage.conversation.userId !== user.id) {
    throw new Error("Message not found");
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { content: trimedContent },
  });

  revalidatePath(`/c/${currentMessage.conversationId}`);

  return updatedMessage;
}

export async function deleteMessage(messageId: string) {
  const user = await requireUser();

  const currentMessage = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!currentMessage || currentMessage.conversation.userId !== user.id) {
    throw new Error("Message not found");
  }

  await prisma.message.delete({
    where: { id: messageId },
  });

  revalidatePath(`/c/${currentMessage.conversationId}`);

  return { id: messageId, conversationId: currentMessage.conversationId };
}
