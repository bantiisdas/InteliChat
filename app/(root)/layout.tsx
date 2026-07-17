import { auth } from "@clerk/nextjs/server";
import { onboard } from "@/features/auth/action/onboard";

import React from "react";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  await auth.protect();
  await onboard();

  return <div>{children}</div>;
};

export default RootLayout;
