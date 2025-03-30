"use client";

import "./globals.css";

import { Poppins } from "next/font/google";
import { SnackbarProvider } from "notistack";
import { NextUIProvider } from "@nextui-org/react";

const poppinsFont = Poppins({
	weight: ["400"],
	subsets: ["latin"],
});

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className={`${poppinsFont.className} antialiased`}>
				<NextUIProvider>
					<SnackbarProvider>
						<h2 className="text-4xl ml-4 mt-8">Sully Interpreter AI</h2>
						<h3 className="ml-4 mb-16">Speak in spanish/english, click message to speak it out</h3>
						{children}
					</SnackbarProvider>
				</NextUIProvider>
			</body>
		</html>
	);
}
