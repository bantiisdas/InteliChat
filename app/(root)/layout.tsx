import { auth } from "@clerk/nextjs/server";
import { onboard } from "@/features/auth/action/onboard";

import React from "react";
import { ChatShell } from "@/features/conversation/components/ChatShell";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  await auth.protect();
  await onboard();

  return (
    <div>
      <ChatShell>{children}</ChatShell>
    </div>
  );
};

export default RootLayout;
