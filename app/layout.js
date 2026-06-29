import { Mali } from 'next/font/google'
import './globals.css'

const mali = Mali({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mali',
  display: 'swap',
})

export const metadata = {
  title: 'KLONGZAND PMS',
  description: 'ระบบจัดการรีสอร์ท KLONGZAND',
  manifest: '/manifest.json',
  icons: {
    icon: ['/icon-192.png', '/icon-512.png'],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#001840',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={mali.variable}>
      <body>{children}</body>
    </html>
  )
}
