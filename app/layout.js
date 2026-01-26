import "./globals.css";

export const metadata = {
  title: "People & Tasks",
  description: "Next.js + Tailwind"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
