import { ClerkProvider } from "@clerk/nextjs";
// import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Geist, JetBrains_Mono } from "next/font/google";

// const inter = Inter({ subsets: ["latin"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "Developer Hub - Task Management System",
  description: "Manage tasks, notes, and system design with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={mono.className}>
          {children}
          <Toaster position={"top-right"} />
        </body>
      </html>
    </ClerkProvider>
  );
}
