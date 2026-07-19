import { ModeToggle } from "@/components/ui/mode-toggle";
import { createConversation } from "@/features/conversation/actions/conversation-actions";
import { startNewChat } from "@/features/home/actions/start-new-chat";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Home() {
  const conversationId = await startNewChat();

  redirect(`/c/${conversationId}`);

  return (
    <div>
      <h1>InteliChat</h1>
    </div>
  );
}
