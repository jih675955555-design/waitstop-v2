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
      <body className="bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 min-h-screen flex justify-center selection:bg-indigo-200 dark:selection:bg-indigo-800">
        <div className="w-full max-w-[430px] bg-white dark:bg-black min-h-screen shadow-xl overflow-hidden relative flex flex-col transition-colors duration-300">
          {children}
        </div>
        
        {/* Kakao SDK - body 끝에 로드, autoload=false 추가 */}
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&libraries=services,clusterer&autoload=false`}
          strategy="beforeInteractive"
        />
        <Script id="kakao-init" strategy="afterInteractive">
          {`
            if (window.kakao && window.kakao.maps) {
              window.kakao.maps.load(() => {
                console.log('Kakao Maps SDK loaded successfully');
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
