import './globals.css'

export const metadata = {
  title: 'KLONGZAND PMS',
  description: 'ระบบจัดการรีสอร์ท KLONGZAND',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
