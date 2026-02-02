import type { Metadata } from "next";
import "./globals.css";
import Script from 'next/script';

export const metadata: Metadata = {
  title: "WaitStop - Smart Route Hybrid",
  description: "Taxi + Subway Hybrid Route Finder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&libraries=services,clusterer`}
          strategy="beforeInteractive"
        />
      </head>
      {/* dark:bg-gray-950 적용으로 다크모드 배경색 지정 */}
      <body className="bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 min-h-screen flex justify-center selection:bg-indigo-200 dark:selection:bg-indigo-800">
        <div className="w-full max-w-[430px] bg-white dark:bg-black min-h-screen shadow-xl overflow-hidden relative flex flex-col transition-colors duration-300">
          {children}
        </div>
      </body>
    </html>
  );
}
