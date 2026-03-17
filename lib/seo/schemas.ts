export function RestaurantSchema({ name, description, logo, location }: {
  name: string;
  description?: string;
  logo?: string;
  location?: { address?: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": name,
    "description": description || "",
    "image": logo,
    "url": "https://fymenu.vercel.app",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
    },
  };
}

export function LocalBusinessSchema({ name, location }: {
  name: string;
  location?: { address?: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": location?.address || "",
    },
  };
}
