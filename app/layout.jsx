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
						<div className="py-6 px-4">
							<h2 className="text-4xl mb-2">Sully Interpreter AI</h2>
							<h3 className="mb-8">
								Speak in Spanish / English, click &quot;Start Recording&quot; to record and &quot;Stop Recording&quot;
								to process the audio.
							</h3>

							{children}
						</div>
					</SnackbarProvider>
				</NextUIProvider>
			</body>
		</html>
	);
}
