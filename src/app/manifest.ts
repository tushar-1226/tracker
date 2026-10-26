import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Track — daily life tracker",
    short_name: "Track",
    description: "Habits, money, gym, learning, books and journal in one place.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", short_name: "Expense", url: "/money?add=expense", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Start workout", short_name: "Workout", url: "/gym?start=1", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Today’s habits", short_name: "Habits", url: "/habits", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Write journal", short_name: "Journal", url: "/journal", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
  };
}
