import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module/module-placeholder";

export const metadata: Metadata = { title: "Notes" };

export default function Page() {
  return <ModulePlaceholder href="/notes" />;
}
