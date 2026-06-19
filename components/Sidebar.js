'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const allNavItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: '📊', adminOnly: true },
  { href: '/bookings', label: 'จองห้องพัก', icon: '📅', adminOnly: false },
  { href: '/customers', label: 'ลูกค้า', icon: '👥', adminOnly: false },
  { href: '/transactions', label: 'รายรับ-รายจ่าย', icon: '💰', adminOnly: false },
  { href: '/housekeeping', label: 'ทำความสะอาด', icon: '🧹', adminOnly: false },
  { href: '/rooms', label: 'ห้องพัก', icon: '🏠', adminOnly: true },
]

export default function Sidebar({ user }) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user?.role ?? 'staff'

  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏖️</span>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">KLONGZAND</p>
            <p className="text-xs text-gray-500">PMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
            {(user?.full_name ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name ?? 'ผู้ใช้งาน'}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {role === 'admin' ? 'แอดมิน' : 'พนักงาน'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <span>🚪</span> ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
