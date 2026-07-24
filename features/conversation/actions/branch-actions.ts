"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { assertOwnsconversation } from "./conversation-actions";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type BranchItems = {
  id: string;
  conversationId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listBranches(
  conversationId: string,
): Promise<BranchItems[]> {
  const user = await requireUser();
  await assertOwnsconversation(conversationId, user.id);

  return prisma.branch.findMany({
    where: { conversationId },
    select: {
      id: true,
      conversationId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getActiveBranch(conversationId: string) {
  const user = await requireUser();
  const conversation = await assertOwnsconversation(conversationId, user.id);

  if (conversation.activeBranchId) {
    const active = await prisma.branch.findFirst({
      where: {
        id: conversation.activeBranchId,
        conversationId,
      },
    });

    if (active) return active;
  }

  let branch = await prisma.branch.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        conversationId,
        title: "Main",
      },
    });
  }

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      activeBranchId: branch.id,
    },
  });
}

export async function createBranch(
  conversationId: string,
  fromMessageId: string,
  title?: string,
) {
  const user = await requireUser();
  await assertOwnsconversation(conversationId, user.id);

  const forkMessage = await prisma.message.findFirst({
    where: { id: fromMessageId, conversationId },
  });
  if (!forkMessage) throw new Error("Message not found");

  const sourceMessages = await prisma.message.findMany({
    where: {
      branchId: forkMessage.branchId,
      createdAt: { lte: forkMessage.createdAt },
    },
    orderBy: { createdAt: "asc" },
  });

  const branch = await prisma.branch.create({
    data: {
      conversationId,
      title: title?.trim() || "Branch",
    },
  });

  if (sourceMessages.length > 0) {
    const data: Prisma.MessageCreateManyInput[] = sourceMessages.map((m) => ({
      conversationId,
      branchId: branch.id,
      id: m.id,
      role: m.role,
      status: m.status,
      content: m.content,
      parts: m.parts === null ? undefined : (m.parts as Prisma.InputJsonValue),
      metadata:
        m.metadata === null ? undefined : (m.parts as Prisma.InputJsonValue),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    await prisma.message.createMany({ data });
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { activeBranchId: branch.id },
  });

  revalidatePath(`/c/${conversationId}`);
}

export async function renameBranch(branchId: string, title: string) {
  const user = await requireUser();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { conversationId: true, title: true },
  });
  if (!branch) throw new Error("Branch not found");

  await assertOwnsconversation(branch.conversationId, user.id);

  if (branch.title === "" || branch.title === title.trim()) return;

  const updatedBranch = await prisma.branch.update({
    where: { id: branchId },
    data: { title: title.trim() },
  });

  revalidatePath(`/c/${branch.conversationId}`);
  return updatedBranch;
}
