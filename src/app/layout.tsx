import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { SSEProvider } from '@/components/providers/SSEProvider'

export const metadata: Metadata = {
  title: 'WorldCup 竞猜 - 五大联赛实时竞猜平台',
  description: '2026 世界杯&五大联赛实时竞猜，丰厚奖金等你来拿！支持胜平负、让球、大小球等多种玩法。',
  keywords: ['世界杯', '足球竞猜', '英超', '西甲', '意甲', '德甲', '法甲', '投注', '赔率'],
  authors: [{ name: 'WorldCup Betting' }],
  openGraph: {
    title: 'WorldCup 竞猜',
    description: '2026 世界杯&五大联赛实时竞猜，丰厚奖金等你来拿！',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com',
    siteName: 'WorldCup 竞猜',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WorldCup 竞猜平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorldCup 竞猜',
    description: '2026 世界杯&五大联赛实时竞猜，丰厚奖金等你来拿！',
    images: ['/og-image.png'],
  },
  // 微信/QQ 分享配置
  other: {
    'og:image': '/og-image.png',
    'og:type': 'website',
    'weixin:desc': '2026 世界杯&五大联赛实时竞猜，丰厚奖金等你来拿！',
    // QQ 分享
    'qq:title': 'WorldCup 竞猜',
    'qq:description': '2026 世界杯&五大联赛实时竞猜，丰厚奖金等你来拿！',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen flex flex-col bg-[var(--bg-base)]">
        <ToastProvider>
          <AuthProvider>
            <SSEProvider>
              {children}
            </SSEProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
