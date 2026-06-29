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
  icons: { icon: '/logo-icon.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={mali.variable}>
      <body>{children}</body>
    </html>
  )
}
