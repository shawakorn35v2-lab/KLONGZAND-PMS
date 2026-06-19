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

export default function Sidebar({ user, isOpen, onClose }) {
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
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-screen
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:transition-none md:shrink-0
      `}>
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏖️</span>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">KLONGZAND</p>
              <p className="text-xs text-gray-500">PMS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="ปิดเมนู"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
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
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <span>🚪</span> ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  )
}
