export function truncateWords(text: string, limit: number): string {
  const words = text.split(" ");
  return words.length > limit ? words.slice(0, limit).join(" ") + "..." : text;
}
