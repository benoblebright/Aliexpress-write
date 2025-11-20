import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Aliexpress 밴드 글쓰기',
  description: '알리익스프레스 상품 포스팅용 HTML을 생성하고, SEO에 최적화된 메타 태그를 자동으로 추가하여 블로그 방문자를 늘려보세요.',
  keywords: ['AliExpress', '알리익스프레스', 'HTML 생성기', '블로그 포스팅', '제휴 마케팅', 'SEO', '메타 태그', '밴드 글쓰기'],
  openGraph: {
    title: 'Aliexpress 밴드 글쓰기',
    description: '클릭 몇 번으로 알리익스프레스 상품의 HTML 포스팅을 생성하고 SEO를 강화하세요.',
    url: 'https://your-app-url.com', // TODO: 실제 앱 URL로 변경해주세요.
    siteName: 'Aliexpress 밴드 글쓰기',
    images: [
      {
        url: 'https://your-app-url.com/og-image.png', // TODO: OG 이미지 URL로 변경해주세요.
        width: 1200,
        height: 630,
        alt: 'Aliexpress 밴드 글쓰기 OG Image',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aliexpress 밴드 글쓰기',
    description: '클릭 몇 번으로 알리익스프레스 상품의 HTML 포스팅을 생성하고 SEO를 강화하세요.',
    images: ['https://your-app-url.com/twitter-image.png'], // TODO: Twitter 이미지 URL로 변경해주세요.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
