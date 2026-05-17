export type Category = "errand" | "date" | "trip" | "read" | "home";

export const categoryLabels: Record<Category, { emoji: string; label: string; bg: string }> = {
  errand: { emoji: "🌿", label: "errand", bg: "#E2F0DD" },
  date:   { emoji: "🍰", label: "date",   bg: "#FCE4E7" },
  trip:   { emoji: "✈️", label: "trip",   bg: "#E5F2FB" },
  read:   { emoji: "📚", label: "read",   bg: "#FFF3D1" },
  home:   { emoji: "🏡", label: "home",   bg: "#FFF9EF" },
};
