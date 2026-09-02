'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TransactionForm from '@/components/TransactionForm'
import ExportButtons from '@/components/ExportButtons'
import ManageCategoriesModal from '@/components/ManageCategoriesModal'
import { TxTypeBadge } from '@/components/RoomStatusBadge'
import { deleteTransaction } from '@/app/actions/transactions'
import { sellItem } from '@/app/actions/inventory'
import { formatDate } from '@/lib/dateUtils'
function formatCurrency(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

const EXPORT_COLS = [
  { key: 'tx_date', header: 'วันที่', format: 'date' },
  { key: 'tx_type', header: 'ประเภท', format: 'txtype' },
  { key: 'category', header: 'หมวดหมู่' },
  { key: 'room_no', header: 'ห้อง', format: 'nullable' },
  { key: 'amount', header: 'จำนวนเงิน', format: 'number2' },
  { key: 'note', header: 'หมายเหตุ', format: 'nullable' },
]

export default function TransactionsClient({
  transactions, exportTransactions, exportLimitReached, rangeTotals,
  page, totalPages, totalCount,
  today, from, to,
  todayIncome, todayExpense, saleItems, isAdmin,
  categories, incomeCategories, expenseCategories, categoryUsage,
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [fromDate, setFromDate] = useState(from)
  const [toDate, setToDate] = useState(to)
  const [deletingId, setDeletingId] = useState(null)
  const [showCategories, setShowCategories] = useState(false)

  // ตัวกรองประเภท/หมวดหมู่ (client-side, ทำงานร่วมกับ date range ที่กรองมาจาก server แล้ว)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [typeFilter, setTypeFilter] = useState({ income: true, expense: true })
  const [categoryFilter, setCategoryFilter] = useState(() => new Set([...incomeCategories, ...expenseCategories]))

  // เพิ่มหมวดหมู่ใหม่ (เช่น จากการจัดการหมวดหมู่) เข้า filter แบบติ๊กไว้ default โดยไม่ล้างการเลือกเดิม
  useEffect(() => {
    setCategoryFilter(prev => {
      const next = new Set(prev)
      let changed = false
      for (const name of [...incomeCategories, ...expenseCategories]) {
        if (!next.has(name)) { next.add(name); changed = true }
      }
      return changed ? next : prev
    })
  }, [incomeCategories, expenseCategories])

  function toggleType(key) {
    setTypeFilter(prev => ({ ...prev, [key]: !prev[key] }))
  }
  function toggleCategory(name) {
    setCategoryFilter(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }
  function selectAllCategories(names) {
    setCategoryFilter(prev => new Set([...prev, ...names]))
  }
  function deselectAllCategories(names) {
    setCategoryFilter(prev => {
      const next = new Set(prev)
      names.forEach(n => next.delete(n))
      return next
    })
  }

  // บันทึกขายของ
  const [showSellForm, setShowSellForm] = useState(false)
  const [sellForm, setSellForm] = useState({ item_id: '', quantity: '' })
  const [sellLoading, setSellLoading] = useState(false)
  const [sellError, setSellError] = useState('')

  function applyFilter() {
    router.push(`/transactions?dateFrom=${fromDate}&dateTo=${toDate}`)
  }

  function goToPage(p) {
    router.push(`/transactions?dateFrom=${from}&dateTo=${to}&page=${p}`)
  }

  async function handleDelete(id, txDate, category) {
    const isSale = category === 'ขายของ'
    const msg = isSale
      ? 'รายการนี้เป็นการขายของ\nลบแล้วสต๊อกจะถูกคืนกลับให้อัตโนมัติ\nยืนยันลบหรือไม่?'
      : 'ลบรายการนี้?'
    if (!confirm(msg)) return
    setDeletingId(id)
    const result = await deleteTransaction(id, txDate)
    setDeletingId(null)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  const selectedSaleItem = saleItems.find(i => i.id === sellForm.item_id)
  const sellTotal = selectedSaleItem && Number(sellForm.quantity) > 0
    ? Number(selectedSaleItem.sale_price) * Number(sellForm.quantity)
    : null
  const sellOverStock = selectedSaleItem && Number(sellForm.quantity) > 0
    && Number(sellForm.quantity) > Number(selectedSaleItem.current_stock)

  async function handleSell(e) {
    e.preventDefault()
    setSellError('')
    if (!sellForm.item_id) { setSellError('กรุณาเลือกสินค้า'); return }
    if (!sellForm.quantity || Number(sellForm.quantity) <= 0) { setSellError('กรุณากรอกจำนวน'); return }
    if (sellOverStock) {
      setSellError(`สต๊อกไม่พอ — มีอยู่ ${Number(selectedSaleItem.current_stock).toLocaleString('th-TH')} ${selectedSaleItem.unit}`)
      return
    }
    setSellLoading(true)
    const result = await sellItem({ item_id: sellForm.item_id, quantity: sellForm.quantity })
    setSellLoading(false)
    if (result.error) { setSellError(result.error); return }
    setSellForm({ item_id: '', quantity: '' })
    setShowSellForm(false)
    router.refresh()
  }

  const knownCategoryNames = new Set(categories.map(c => c.name))
  function matchesFilter(t) {
    const inType = (t.tx_type === 'income' && typeFilter.income) || (t.tx_type === 'expense' && typeFilter.expense)
    // category ที่ไม่ตรงกับหมวดหมู่ที่รู้จัก (เช่น พิมพ์เองอิสระในอดีต) ต้องผ่านเสมอ ไม่ให้ checkbox กรองหาย
    const inCategory = !knownCategoryNames.has(t.category) || categoryFilter.has(t.category)
    return inType && inCategory
  }

  // ตาราง: กรองเฉพาะหน้าปัจจุบัน (transactions มาจาก .range() pagination)
  const filtered = transactions.filter(matchesFilter)
  // Export: กรองจากช่วงวันที่ทั้งหมด (สูงสุด 5,000 แถว แยกจาก query ที่ paginate ตาราง)
  const exportFiltered = exportTransactions.filter(matchesFilter)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-t-4 border-t-green-500">
          <p className="text-xs font-semibold text-gray-500 uppercase">รายรับวันนี้</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(todayIncome)}</p>
        </div>
        <div className="card border-t-4 border-t-red-500">
          <p className="text-xs font-semibold text-gray-500 uppercase">รายจ่ายวันนี้</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(todayExpense)}</p>
        </div>
        <div className={`card border-t-4 ${todayIncome - todayExpense >= 0 ? 'border-t-blue-500' : 'border-t-red-500'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase">กำไรสุทธิวันนี้</p>
          <p className={`text-2xl font-bold mt-1 ${todayIncome - todayExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(todayIncome - todayExpense)}
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setShowForm(!showForm); setShowSellForm(false) }} className="btn-primary">
          {showForm ? '✕ ปิดฟอร์ม' : '+ เพิ่มรายการ'}
        </button>
        {saleItems.length > 0 && (
          <button
            onClick={() => { setShowSellForm(!showSellForm); setShowForm(false); setSellError(''); setSellForm({ item_id: '', quantity: '' }) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
            {showSellForm ? '✕ ปิด' : '🛒 บันทึกขายของ'}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowCategories(true)}
            className="btn-secondary"
            title="เพิ่ม/ลบหมวดหมู่รายรับ-รายจ่าย"
          >
            ⚙ จัดการหมวดหมู่
          </button>
        )}
        <div className="flex-1" />
        <div className="flex flex-col items-end gap-1">
          <ExportButtons
            data={exportFiltered}
            filename={`รายรับ-รายจ่าย-${from}-ถึง-${to}`}
            title={`รายรับ-รายจ่าย ${from} ถึง ${to}`}
            columns={EXPORT_COLS}
          />
          {exportLimitReached && (
            <p className="text-xs text-amber-600">
              ⚠ ข้อมูลอาจถูกตัด (ถึงขีดจำกัด 5,000 แถว) — export อาจไม่ครบทุกรายการ
            </p>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card max-w-md">
          <h2 className="text-base font-semibold text-gray-900 mb-4">เพิ่มรายการ</h2>
          <TransactionForm
            onClose={() => setShowForm(false)}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        </div>
      )}

      {/* Manage categories modal */}
      {showCategories && (
        <ManageCategoriesModal
          categories={categories}
          usage={categoryUsage}
          onClose={() => setShowCategories(false)}
        />
      )}

      {/* Sell form */}
      {showSellForm && (
        <div className="card max-w-md border-l-4 border-purple-500">
          <h2 className="text-base font-semibold text-gray-900 mb-4">🛒 บันทึกขายของ</h2>
          <form onSubmit={handleSell} className="space-y-3">
            <div>
              <label className="label">สินค้า *</label>
              <select required value={sellForm.item_id}
                onChange={e => setSellForm(p => ({ ...p, item_id: e.target.value, quantity: '' }))}
                className="input">
                <option value="">-- เลือกสินค้า --</option>
                {saleItems.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} — คงเหลือ {Number(i.current_stock).toLocaleString('th-TH')} {i.unit} — ฿{Number(i.sale_price).toLocaleString('th-TH')}/{i.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">จำนวนที่ขาย *</label>
              <input type="number" required min="1" step="1" inputMode="numeric"
                value={sellForm.quantity}
                onChange={e => setSellForm(p => ({ ...p, quantity: e.target.value }))}
                onWheel={e => e.currentTarget.blur()}
                className={`input ${sellOverStock ? 'border-red-400 bg-red-50' : ''}`}
                placeholder="0" />
              {sellOverStock && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠ เกินสต๊อกที่มีอยู่ ({Number(selectedSaleItem.current_stock).toLocaleString('th-TH')} {selectedSaleItem.unit})
                </p>
              )}
            </div>
            {sellTotal !== null && !sellOverStock && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                <span className="text-gray-600">ยอดรวม</span>
                <span className="font-bold text-purple-700 text-base">
                  ฿{sellTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {sellError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sellError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={sellLoading || sellOverStock || !sellForm.quantity}
                className="btn-primary disabled:opacity-50">
                {sellLoading ? 'กำลังบันทึก...' : '🛒 บันทึก'}
              </button>
              <button type="button" onClick={() => setShowSellForm(false)} className="btn-secondary">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}

      {/* Date filter */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">กรองช่วงวันที่:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input max-w-[160px]" />
          <span className="text-gray-500 text-sm">ถึง</span>
          <input type="date" value={toDate} max={today} onChange={e => setToDate(e.target.value)} className="input max-w-[160px]" />
          <button onClick={applyFilter} className="btn-secondary">ค้นหา</button>
          <button onClick={() => { setFromDate(today); setToDate(today); router.push('/transactions') }} className="text-sm text-gray-500 hover:text-gray-700">
            รีเซ็ต
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFilterPanel(v => !v)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          {showFilterPanel ? '▴' : '▾'} ตัวกรองเพิ่มเติม (ประเภท/หมวดหมู่)
        </button>

        {showFilterPanel && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">ประเภท</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input type="checkbox" checked={typeFilter.income} onChange={() => toggleType('income')} className="w-4 h-4 accent-green-600 rounded" />
                  รายรับ
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input type="checkbox" checked={typeFilter.expense} onChange={() => toggleType('expense')} className="w-4 h-4 accent-red-600 rounded" />
                  รายจ่าย
                </label>
              </div>
            </div>

            {incomeCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">หมวดรายรับ</p>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => selectAllCategories(incomeCategories)} className="text-blue-600 hover:text-blue-700">เลือกทั้งหมด</button>
                    <button type="button" onClick={() => deselectAllCategories(incomeCategories)} className="text-gray-500 hover:text-gray-700">ยกเลิก</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {incomeCategories.map(name => (
                    <label key={name} className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
                      <input type="checkbox" checked={categoryFilter.has(name)} onChange={() => toggleCategory(name)} className="w-4 h-4 accent-green-600 rounded" />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {expenseCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">หมวดรายจ่าย</p>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => selectAllCategories(expenseCategories)} className="text-blue-600 hover:text-blue-700">เลือกทั้งหมด</button>
                    <button type="button" onClick={() => deselectAllCategories(expenseCategories)} className="text-gray-500 hover:text-gray-700">ยกเลิก</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {expenseCategories.map(name => (
                    <label key={name} className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
                      <input type="checkbox" checked={categoryFilter.has(name)} onChange={() => toggleCategory(name)} className="w-4 h-4 accent-red-600 rounded" />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span>รายรับรวม: <strong className="text-green-600">{formatCurrency(rangeTotals.income)}</strong></span>
            <span>รายจ่ายรวม: <strong className="text-red-600">{formatCurrency(rangeTotals.expense)}</strong></span>
            <span>กำไรสุทธิ: <strong className={rangeTotals.net >= 0 ? 'text-blue-600' : 'text-red-600'}>{formatCurrency(rangeTotals.net)}</strong></span>
            <span className="text-gray-400 text-xs">(ทั้งช่วงวันที่ {from} – {to} ไม่ขึ้นกับตัวกรองประเภท/หมวดหมู่ด้านบน)</span>
          </div>
        )}
      </div>

      {/* Transactions table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">วันที่</th>
                <th className="table-th">ประเภท</th>
                <th className="table-th">หมวดหมู่</th>
                <th className="table-th">ห้อง</th>
                <th className="table-th text-right">จำนวนเงิน</th>
                <th className="table-th">หมายเหตุ</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-td">{formatDate(t.tx_date)}</td>
                  <td className="table-td"><TxTypeBadge type={t.tx_type} /></td>
                  <td className="table-td">{t.category}</td>
                  <td className="table-td text-gray-500">{t.room_no ?? '—'}</td>
                  <td className={`table-td text-right font-semibold ${t.tx_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.tx_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="table-td text-gray-500">{t.note ?? '—'}</td>
                  <td className="table-td">
                    {isAdmin ? (
                      <button
                        onClick={() => handleDelete(t.id, t.tx_date, t.category)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">หน้า {page} จาก {totalPages} ({totalCount.toLocaleString('th-TH')} รายการ)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="btn-secondary disabled:opacity-50">
                ก่อนหน้า
              </button>
              <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="btn-secondary disabled:opacity-50">
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
