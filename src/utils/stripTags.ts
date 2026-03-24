export function stripTags(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}
