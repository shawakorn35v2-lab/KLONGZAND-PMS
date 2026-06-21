'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { closeDailyTransactions } from '@/app/actions/transactions'
import { formatLongDate } from '@/lib/dateUtils'

export default function DailyCloseButton({ date, alreadyClosed, totalIncome, totalExpense }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (alreadyClosed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
        🔒 ปิดยอดแล้ว
      </div>
    )
  }

  async function handleClose() {
    setLoading(true)
    setError('')
    const result = await closeDailyTransactions(date)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setShowModal(false)
    router.refresh()
  }

  const formatCurrency = (n) => '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn-danger">
        🔒 ปิดยอดประจำวัน
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">ยืนยันปิดยอด</h3>
            <p className="text-sm text-gray-500 mb-4">วันที่ {formatLongDate(date)}</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">รายรับ</span>
                <span className="text-green-700 font-medium">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">รายจ่าย</span>
                <span className="text-red-700 font-medium">{formatCurrency(totalExpense)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>กำไรสุทธิ</span>
                <span className={totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {formatCurrency(totalIncome - totalExpense)}
                </span>
              </div>
            </div>

            <p className="text-xs text-red-600 mb-4">⚠️ หลังปิดยอดแล้ว ไม่สามารถแก้ไขรายการวันนี้ได้อีก</p>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={handleClose} disabled={loading} className="btn-danger flex-1 justify-center">
                {loading ? 'กำลังปิดยอด...' : 'ยืนยันปิดยอด'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
