'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function CustomerSearchInput({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '', note: '' })
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const supabase = createClient()
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10)
      setResults(data ?? [])
      setOpen(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function selectCustomer(c) {
    setSelected(c)
    setQuery(c.full_name)
    setOpen(false)
    setShowNew(false)
    onSelect({ existingId: c.id, newCustomer: null })
  }

  function handleNewCustomerChange(field, value) {
    const updated = { ...newCustomer, [field]: value }
    setNewCustomer(updated)
    onSelect({ existingId: null, newCustomer: updated })
  }

  function clearSelection() {
    setSelected(null)
    setQuery('')
    setShowNew(false)
    setNewCustomer({ full_name: '', phone: '', note: '' })
    onSelect({ existingId: null, newCustomer: null })
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg">
        <span className="text-sm text-blue-800 font-medium flex-1">{selected.full_name} {selected.phone && `(${selected.phone})`}</span>
        <button type="button" onClick={clearSelection} className="text-blue-500 hover:text-blue-700 text-lg leading-none">×</button>
      </div>
    )
  }

  return (
    <div ref={ref} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => query && setOpen(true)}
          className="input"
          placeholder="ค้นหาชื่อหรือเบอร์โทร..."
        />
        {open && results.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {results.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCustomer(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
              >
                <span className="font-medium">{c.full_name}</span>
                {c.phone && <span className="text-gray-500 ml-2">{c.phone}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => { setShowNew(!showNew); setSelected(null) }}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        {showNew ? '− ยกเลิกสร้างลูกค้าใหม่' : '+ สร้างลูกค้าใหม่'}
      </button>

      {showNew && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase">ข้อมูลลูกค้าใหม่</p>
          <input
            type="text"
            placeholder="ชื่อ-นามสกุล *"
            value={newCustomer.full_name}
            onChange={e => handleNewCustomerChange('full_name', e.target.value)}
            className="input text-sm"
            required
          />
          <input
            type="text"
            placeholder="เบอร์โทรศัพท์"
            value={newCustomer.phone}
            onChange={e => handleNewCustomerChange('phone', e.target.value)}
            className="input text-sm"
          />
        </div>
      )}
    </div>
  )
}
