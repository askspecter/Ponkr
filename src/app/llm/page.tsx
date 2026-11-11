import { Suspense } from "react";
import { Gateway } from "./Gateway";

export const metadata = { title: "LLM Gateway | Ponkr", description: "One API key for every frontier model, billed per token from a prepaid balance." };

export default function Page() {
  return (
    <Suspense>
      <Gateway />
    </Suspense>
  );
}
