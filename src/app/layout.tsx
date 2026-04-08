import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import PWACapture from '@/components/pwa-capture'

const bebasNeue = Bebas_Neue({
  weight: '400',
  variable: '--font-bebas',
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Barbearia Brusquense',
  description: 'Barbearia em Brusque com equipe preparada para oferecer cortes tradicionais e modernos, com atendimento de qualidade.',
  metadataBase: new URL('https://agenda-barbearia-git-main-djoneis-projects.vercel.app'),
  openGraph: {
    title: 'Barbearia Brusquense',
    description: 'Barbearia em Brusque com equipe preparada para oferecer cortes tradicionais e modernos, com atendimento de qualidade.',
    url: 'https://agenda-barbearia-git-main-djoneis-projects.vercel.app',
    siteName: 'Barbearia Brusquense',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Barbearia Brusquense',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barbearia Brusquense',
    description: 'Barbearia em Brusque com equipe preparada para oferecer cortes tradicionais e modernos, com atendimento de qualidade.',
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body>
        <PWACapture />
        {children}
      </body>
    </html>
  )
}
