import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listings", "/cards", "/how-it-works", "/faq", "/card-condition-guide", "/shipping-guide", "/legal/tos", "/legal/privacy"],
        disallow: ["/admin/", "/settings", "/dashboard", "/collection", "/trades/", "/matches", "/friends", "/auth/", "/support/tickets/", "/verify-email"],
      },
    ],
    sitemap: "https://www.holoswaps.com/sitemap.xml",
  };
}
