export function getDomainFromUrl(url: string) {
  return new URL(url).hostname.replace("www.", "");
}
export function getFaviconUrl(result: {
  title: string;
  source: "web" | "academic" | "x";
  url: string;
  content: string;
  tweetId?: string | undefined;
}) {
  return `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=128`;
}
