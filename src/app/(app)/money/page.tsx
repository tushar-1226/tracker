import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module/module-placeholder";

export const metadata: Metadata = { title: "Money" };

export default function Page() {
  return <ModulePlaceholder href="/money" />;
}
