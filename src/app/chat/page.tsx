import { Suspense } from "react";
import { Chat } from "./Chat";

export const metadata = { title: "Chat | Ponkr" };

export default function Page() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
