import type { Metadata } from "next";
import "@fontsource/sarabun/400.css";
import "@fontsource/sarabun/600.css";
import "@fontsource/sarabun/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarDesk — Solar Proposal Workspace",
  description: "ระบบจัดการลูกค้าและใบเสนอราคาโซลาร์เซลล์",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
