import { Suspense } from "react";
import { Chat } from "./Chat";

export const metadata = { title: "Agent — Ponkr" };

export default function Page() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
