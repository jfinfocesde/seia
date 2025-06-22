import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Montserrat, Roboto, Fira_Code, Ubuntu_Mono, Playfair_Display, Architects_Daughter, Merriweather } from "next/font/google";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";

import { ClerkProvider } from '@clerk/nextjs'
import { esES } from "@clerk/localizations";

// Fuentes predeterminadas
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fuentes para el tema Purple
const outfitFont = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const firaCodeFont = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

// Fuentes para el tema Amber
const montserratFont = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const ubuntuMonoFont = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const merriweatherFont = Merriweather({
  variable: "--font-merriweather",
  weight: ["400", "700"],
  subsets: ["latin"],
});

// Fuentes para el tema Bold Tech
const robotoFont = Roboto({
  variable: "--font-roboto",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const playfairDisplayFont = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

// Fuentes para el tema Notebook
const architectsDaughterFont = Architects_Daughter({
  variable: "--font-architects-daughter",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEIAC - Sistema de Evaluación con Inteligencia Artificial",
  description: "Plataforma de evaluación de algoritmos y código con detección de fraude",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esES}
      signInUrl="/admin"
      signUpUrl="/admin"
    >
      <html lang="en" suppressHydrationWarning className={`
      ${geistSans.variable} 
      ${geistMono.variable} 
      ${outfitFont.variable} 
      ${firaCodeFont.variable} 
      ${montserratFont.variable} 
      ${ubuntuMonoFont.variable}
      ${merriweatherFont.variable}
      ${robotoFont.variable}
      ${playfairDisplayFont.variable}
      ${architectsDaughterFont.variable}
    `}>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
