import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*", // This targets all search engines (Google, Bing, etc.)
      allow: "/", // This tells them they are allowed to crawl your whole site
    },
    sitemap: "https://duelle.vercel.app/sitemap.xml", // Directs them to your sitemap
  };
}
