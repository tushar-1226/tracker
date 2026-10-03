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
      { name: "Today’s habits", url: "/habits", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Add expense", url: "/money?add=expense", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Journal", url: "/journal", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
  };
}
