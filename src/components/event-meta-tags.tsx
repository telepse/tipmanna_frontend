// components/EventMetaTags.tsx
import Head from "next/head";

interface Props {
  eventName: string;
  organizationName: string;
  description?: string;
  imageUrl: string;
  eventUrl: string;
}

export const EventMetaTags = ({
  eventName,
  organizationName,
  description,
  imageUrl,
  eventUrl,
}: Props) => {
  const fullDescription =
    description || `Join ${eventName} organized by ${organizationName}`;

  return (
    <Head>
      {/* Open Graph / Facebook */}
      <meta
        property="og:type"
        content="website"
      />
      <meta
        property="og:url"
        content={eventUrl}
      />
      <meta
        property="og:title"
        content={eventName}
      />
      <meta
        property="og:description"
        content={fullDescription}
      />
      <meta
        property="og:image"
        content={imageUrl}
      />
      <meta
        property="og:image:width"
        content="1200"
      />
      <meta
        property="og:image:height"
        content="630"
      />
      <meta
        property="og:site_name"
        content="TipManna"
      />

      {/* Twitter */}
      <meta
        property="twitter:card"
        content="summary_large_image"
      />
      <meta
        property="twitter:url"
        content={eventUrl}
      />
      <meta
        property="twitter:title"
        content={eventName}
      />
      <meta
        property="twitter:description"
        content={fullDescription}
      />
      <meta
        property="twitter:image"
        content={imageUrl}
      />

      {/* Additional recommended tags */}
      <meta
        name="description"
        content={fullDescription}
      />
      <meta
        property="og:image:alt"
        content={`Event banner for ${eventName}`}
      />
      <meta
        property="twitter:image:alt"
        content={`Event banner for ${eventName}`}
      />
    </Head>
  );
};
