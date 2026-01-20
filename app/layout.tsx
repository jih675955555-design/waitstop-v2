import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaitStop - 기다림을 멈추세요",
  description: "시간을 사는 스마트한 이동 습관",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* dark:bg-gray-950 적용으로 다크모드 배경색 지정 */}
      <body className="bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 min-h-screen flex justify-center selection:bg-indigo-200 dark:selection:bg-indigo-800">
        <div className="w-full max-w-[430px] bg-white dark:bg-black min-h-screen shadow-xl overflow-hidden relative flex flex-col transition-colors duration-300">
          {children}
        </div>
      </body>
    </html>
  );
}
