import { NextUIProvider } from "@nextui-org/react";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppinsFont = Poppins({
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sully Interpreter",
  description: "TTS & STT clinical interpreter for Sully",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppinsFont.className} antialiased`}>
        <NextUIProvider>
          <h2 className="text-4xl ml-4 mt-8">Sully Interpreter AI</h2>
          <h3 className="ml-4 mb-16">
            Speak in spanish/english, click message to speak it out
          </h3>
          {children}
        </NextUIProvider>
      </body>
    </html>
  );
}
