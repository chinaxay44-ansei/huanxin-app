import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const pages = [
    "/",
    "/fun",
    "/generate",
    "/messages",
    "/profile",
    "/settings",
    "/search",
    "/video",
  ]
  const lastModified = new Date().toISOString()
  return pages.map((path) => ({
    url: baseUrl ? `${baseUrl}${path}` : path,
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }))
}