import {
  loadChatMessages,
  saveChatMessages,
} from "@/features/ai/actions/chat-store";
import { webSearch } from "@/features/ai/tools/web-search";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

export async function POST(req: Request) {
  await auth.protect();

  const { message, id }: { message: UIMessage; id: string } = await req.json();
  if (!message || !id) {
    return new Response("No Message or Conversation ID", { status: 400 });
  }

  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
  });
  if (!conversation) {
    return new Response("Conversation does not exist", { status: 404 });
  }

  const previousMessages = await loadChatMessages(id);

  const isMessageAlreadySaved = previousMessages.some(
    (prevmsg) => prevmsg.id === message.id,
  );
  if (!isMessageAlreadySaved) {
    await saveChatMessages(id, [message]);
  }

  const messages = isMessageAlreadySaved
    ? previousMessages
    : [...previousMessages, message];

  const result = streamText({
    model: getChatModel(conversation.model),
    system:
      conversation.systemPrompt ?? "You are InteliChat, a helpful AI Assistant",
    messages: await convertToModelMessages(messages),
    tools: { webSearch },
    stopWhen: stepCountIs(5),
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "MSG", size: 16 }),
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await saveChatMessages(id, finalMessages, { updateTitle: false });
        } catch (error) {
          console.error(error);
        }
      },
    }),
  });
}
