import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chroma — Trust the color",
  description: "A playable Stroop-inspired game prototype. Move with arrow keys and select with Space.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
