'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStockMovement, createInventoryRequest, updateRequestStatus, createInventoryItem } from '@/app/actions/inventory'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatNum(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_LABELS = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', fulfilled: 'จัดส่งแล้ว', rejected: 'ปฏิเสธ' }
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const TABS = [
  { id: 'stock', label: 'สต๊อก' },
  { id: 'move', label: 'รับ/เบิก' },
  { id: 'requests', label: 'คำขอ' },
  { id: 'history', label: 'ประวัติ' },
]

export default function InventoryClient({ items, movements, requests, rooms, role }) {
  const router = useRouter()
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState('stock')

  // New item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', unit: 'ชิ้น', reorder_point: '' })
  const [itemLoading, setItemLoading] = useState(false)
  const [itemError, setItemError] = useState('')

  // Stock movement form
  const [moveType, setMoveType] = useState('stock_out')
  const [moveForm, setMoveForm] = useState({ item_id: '', quantity: '', room_id: '', unit_cost: '', note: '' })
  const [moveLoading, setMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState('')

  // Request form
  const [reqForm, setReqForm] = useState({ item_id: '', requested_qty: '', note: '' })
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState('')

  // History filters
  const [histFilter, setHistFilter] = useState({ item_id: '', type: '' })

  const lowStockItems = items.filter(i => Number(i.current_stock) < Number(i.reorder_point))
  const pendingCount = requests.filter(r => r.status === 'pending').length

  async function handleCreateItem(e) {
    e.preventDefault()
    setItemError('')
    if (!itemForm.name.trim()) { setItemError('กรุณากรอกชื่อรายการ'); return }
    setItemLoading(true)
    const result = await createInventoryItem({
      name: itemForm.name,
      unit: itemForm.unit,
      reorder_point: itemForm.reorder_point,
    })
    setItemLoading(false)
    if (result.error) { setItemError(result.error); return }
    setItemForm({ name: '', unit: 'ชิ้น', reorder_point: '' })
    setShowItemForm(false)
    router.refresh()
  }

  async function handleMove(e) {
    e.preventDefault()
    setMoveError('')
    if (!moveForm.item_id) { setMoveError('กรุณาเลือกรายการของใช้'); return }
    if (!moveForm.quantity || Number(moveForm.quantity) <= 0) { setMoveError('กรุณากรอกจำนวน'); return }
    setMoveLoading(true)
    const result = await addStockMovement({
      item_id: moveForm.item_id,
      movement_type: moveType,
      quantity: moveForm.quantity,
      room_id: moveForm.room_id || null,
      unit_cost: moveType === 'stock_in' ? (moveForm.unit_cost || null) : null,
      note: moveForm.note || null,
    })
    setMoveLoading(false)
    if (result.error) { setMoveError(result.error); return }
    setMoveForm({ item_id: '', quantity: '', room_id: '', unit_cost: '', note: '' })
    router.refresh()
  }

  async function handleRequest(e) {
    e.preventDefault()
    setReqError('')
    if (!reqForm.item_id) { setReqError('กรุณาเลือกรายการ'); return }
    if (!reqForm.requested_qty || Number(reqForm.requested_qty) <= 0) { setReqError('กรุณากรอกจำนวน'); return }
    setReqLoading(true)
    const result = await createInventoryRequest({
      item_id: reqForm.item_id,
      requested_qty: reqForm.requested_qty,
      note: reqForm.note,
    })
    setReqLoading(false)
    if (result.error) { setReqError(result.error); return }
    setReqForm({ item_id: '', requested_qty: '', note: '' })
    router.refresh()
  }

  async function handleReqStatus(id, status) {
    const result = await updateRequestStatus(id, status)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  const filteredMovements = movements.filter(m => {
    if (histFilter.item_id && m.item_id !== histFilter.item_id) return false
    if (histFilter.type && m.movement_type !== histFilter.type) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-red-700 text-sm font-semibold">⚠️ สต๊อกใกล้หมด:</span>
          {lowStockItems.map(i => (
            <span key={i.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              {i.name} ({formatNum(i.current_stock)} {i.unit})
            </span>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.id === 'requests' && pendingCount > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5 py-0.5 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: สต๊อก ── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button onClick={() => setShowItemForm(!showItemForm)} className="btn-primary">
                {showItemForm ? '✕ ปิด' : '+ เพิ่มรายการใหม่'}
              </button>
            </div>
          )}

          {showItemForm && isAdmin && (
            <div className="card max-w-md">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">เพิ่มรายการของใช้ใหม่</h3>
              <form onSubmit={handleCreateItem} className="space-y-3">
                <div>
                  <label className="label">ชื่อรายการ *</label>
                  <input
                    type="text" required value={itemForm.name}
                    onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))}
                    className="input" placeholder="เช่น สบู่เหลว"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">หน่วย *</label>
                    <input
                      type="text" required value={itemForm.unit}
                      onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
                      className="input" placeholder="ชิ้น / ขวด / ม้วน"
                    />
                  </div>
                  <div>
                    <label className="label">จุดเตือนสต๊อก</label>
                    <input
                      type="number" min="0" value={itemForm.reorder_point}
                      onChange={e => setItemForm(p => ({ ...p, reorder_point: e.target.value }))}
                      className="input" placeholder="0"
                    />
                  </div>
                </div>
                {itemError && <p className="text-sm text-red-600">{itemError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={itemLoading} className="btn-primary">
                    {itemLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button type="button" onClick={() => setShowItemForm(false)} className="btn-secondary">ยกเลิก</button>
                </div>
              </form>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th">รายการของใช้</th>
                    <th className="table-th">หน่วย</th>
                    <th className="table-th text-right">สต๊อกปัจจุบัน</th>
                    <th className="table-th text-right">จุดเตือน</th>
                    <th className="table-th">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
                  )}
                  {items.map(item => {
                    const isLow = Number(item.current_stock) < Number(item.reorder_point)
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                        <td className={`table-td font-medium ${isLow ? 'text-red-700' : ''}`}>{item.name}</td>
                        <td className="table-td text-gray-500">{item.unit}</td>
                        <td className={`table-td text-right font-bold text-lg ${isLow ? 'text-red-700' : 'text-gray-900'}`}>
                          {formatNum(item.current_stock)}
                        </td>
                        <td className="table-td text-right text-gray-500">{formatNum(item.reorder_point)}</td>
                        <td className="table-td">
                          {isLow
                            ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ ใกล้หมด</span>
                            : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ ปกติ</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: รับ/เบิก ── */}
      {tab === 'move' && (
        <div className="card max-w-md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">บันทึกรับเข้า / เบิกออก</h3>
          <form onSubmit={handleMove} className="space-y-4">
            <div>
              <label className="label">ประเภท</label>
              <div className="flex flex-wrap gap-4">
                {isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="moveType" value="stock_in" checked={moveType === 'stock_in'} onChange={() => setMoveType('stock_in')} />
                    <span className="text-sm font-medium text-gray-700">📦 ซื้อเข้า / รับเข้าสต๊อก</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="moveType" value="stock_out" checked={moveType === 'stock_out'} onChange={() => setMoveType('stock_out')} />
                  <span className="text-sm font-medium text-gray-700">📤 เบิกไปใช้</span>
                </label>
              </div>
            </div>

            <div>
              <label className="label">รายการของใช้ *</label>
              <select required value={moveForm.item_id} onChange={e => setMoveForm(p => ({ ...p, item_id: e.target.value }))} className="input">
                <option value="">-- เลือกรายการ --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} (คงเหลือ {formatNum(i.current_stock)} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">จำนวน *</label>
                <input
                  type="number" required min="0.01" step="0.01"
                  value={moveForm.quantity}
                  onChange={e => setMoveForm(p => ({ ...p, quantity: e.target.value }))}
                  className="input" placeholder="0"
                />
              </div>
              {moveType === 'stock_in' && (
                <div>
                  <label className="label">ราคาต่อหน่วย (บาท)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={moveForm.unit_cost}
                    onChange={e => setMoveForm(p => ({ ...p, unit_cost: e.target.value }))}
                    className="input" placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {moveType === 'stock_out' && (
              <div>
                <label className="label">เบิกไปใช้ห้อง (ถ้ามี)</label>
                <select value={moveForm.room_id} onChange={e => setMoveForm(p => ({ ...p, room_id: e.target.value }))} className="input">
                  <option value="">-- ใช้ทั่วไป ไม่เจาะห้อง --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>ห้อง {r.room_no} (อาคาร {r.building})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">หมายเหตุ</label>
              <input
                type="text" value={moveForm.note}
                onChange={e => setMoveForm(p => ({ ...p, note: e.target.value }))}
                className="input" placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>

            {moveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{moveError}</p>}

            <button type="submit" disabled={moveLoading} className="btn-primary w-full justify-center py-3">
              {moveLoading ? 'กำลังบันทึก...' : moveType === 'stock_in' ? '📦 บันทึกรับเข้าสต๊อก' : '📤 บันทึกเบิกออก'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB: คำขอ ── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="card max-w-md">
            <h3 className="text-base font-semibold text-gray-900 mb-4">ขอเบิกของใช้เพิ่มเติม</h3>
            <form onSubmit={handleRequest} className="space-y-3">
              <div>
                <label className="label">รายการของใช้ *</label>
                <select required value={reqForm.item_id} onChange={e => setReqForm(p => ({ ...p, item_id: e.target.value }))} className="input">
                  <option value="">-- เลือกรายการ --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ {formatNum(i.current_stock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">จำนวนที่ขอ *</label>
                <input
                  type="number" required min="1" step="1"
                  value={reqForm.requested_qty}
                  onChange={e => setReqForm(p => ({ ...p, requested_qty: e.target.value }))}
                  className="input" placeholder="0"
                />
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input
                  type="text" value={reqForm.note}
                  onChange={e => setReqForm(p => ({ ...p, note: e.target.value }))}
                  className="input" placeholder="เหตุผล / รายละเอียด"
                />
              </div>
              {reqError && <p className="text-sm text-red-600">{reqError}</p>}
              <button type="submit" disabled={reqLoading} className="btn-primary w-full justify-center">
                {reqLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอ'}
              </button>
            </form>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">รายการคำขอทั้งหมด</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th">รายการ</th>
                    <th className="table-th text-right">จำนวน</th>
                    <th className="table-th">ผู้ขอ</th>
                    <th className="table-th">หมายเหตุ</th>
                    <th className="table-th">วันที่</th>
                    <th className="table-th">สถานะ</th>
                    {isAdmin && <th className="table-th">จัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-gray-400 py-8">ไม่มีคำขอ</td></tr>
                  )}
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{r.item?.name ?? '—'}</td>
                      <td className="table-td text-right">{formatNum(r.requested_qty)} {r.item?.unit}</td>
                      <td className="table-td text-gray-500">{r.requester?.full_name ?? '—'}</td>
                      <td className="table-td text-gray-500">{r.note ?? '—'}</td>
                      <td className="table-td text-gray-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="table-td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="table-td">
                          {r.status === 'pending' && (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleReqStatus(r.id, 'approved')}
                                className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >อนุมัติ</button>
                              <button
                                onClick={() => handleReqStatus(r.id, 'rejected')}
                                className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-red-100 hover:text-red-700"
                              >ปฏิเสธ</button>
                            </div>
                          )}
                          {r.status === 'approved' && (
                            <button
                              onClick={() => handleReqStatus(r.id, 'fulfilled')}
                              className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >จัดส่งแล้ว</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ประวัติ ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-700">กรอง:</span>
              <select
                value={histFilter.item_id}
                onChange={e => setHistFilter(p => ({ ...p, item_id: e.target.value }))}
                className="input sm:max-w-[180px]"
              >
                <option value="">ทุกรายการ</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <select
                value={histFilter.type}
                onChange={e => setHistFilter(p => ({ ...p, type: e.target.value }))}
                className="input sm:max-w-[160px]"
              >
                <option value="">ทุกประเภท</option>
                <option value="stock_in">รับเข้า</option>
                <option value="stock_out">เบิกออก</option>
              </select>
              <button onClick={() => setHistFilter({ item_id: '', type: '' })} className="text-sm text-gray-500 hover:text-gray-700">
                รีเซ็ต
              </button>
              <span className="text-xs text-gray-400 ml-auto">{filteredMovements.length} รายการ</span>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th whitespace-nowrap">วันที่</th>
                    <th className="table-th">ประเภท</th>
                    <th className="table-th">รายการ</th>
                    <th className="table-th text-right">จำนวน</th>
                    <th className="table-th">ห้อง</th>
                    <th className="table-th text-right">ราคา/หน่วย</th>
                    <th className="table-th">หมายเหตุ</th>
                    <th className="table-th">บันทึกโดย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMovements.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
                  )}
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="table-td text-gray-500 whitespace-nowrap">{formatDate(m.created_at)}</td>
                      <td className="table-td whitespace-nowrap">
                        {m.movement_type === 'stock_in'
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">📦 รับเข้า</span>
                          : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">📤 เบิกออก</span>
                        }
                      </td>
                      <td className="table-td font-medium">{m.item?.name ?? '—'}</td>
                      <td className={`table-td text-right font-semibold whitespace-nowrap ${m.movement_type === 'stock_in' ? 'text-green-700' : 'text-orange-700'}`}>
                        {m.movement_type === 'stock_in' ? '+' : '-'}{formatNum(m.quantity)} {m.item?.unit}
                      </td>
                      <td className="table-td text-gray-500">{m.room?.room_no ? `ห้อง ${m.room.room_no}` : '—'}</td>
                      <td className="table-td text-right text-gray-500">{m.unit_cost ? `฿${formatNum(m.unit_cost)}` : '—'}</td>
                      <td className="table-td text-gray-500">{m.note ?? '—'}</td>
                      <td className="table-td text-gray-500">{m.creator?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
