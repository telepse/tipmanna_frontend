import { PartnerV2PageLink } from "./partner-v2-page-link.client";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerV2PageLink />
      {children}
    </>
  );
}
