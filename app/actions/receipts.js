'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

function bangkokDateStr() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${p.year}${p.month}${p.day}`
}

function roundMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

export async function getReceipts({ page = 1, limit = 20, search = '' } = {}) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabase
    .from('receipts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const s = String(search || '').trim()
  if (s) {
    const escaped = s.replace(/[%_,]/g, m => `\\${m}`)
    q = q.or(`receipt_no.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`)
  }

  const { data, count, error } = await q
  if (error) return { error: error.message, data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getReceipt(id) {
  const supabase = await createClient()
  const [{ data: receipt, error: rErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from('receipts').select('*').eq('id', id).maybeSingle(),
    supabase.from('receipt_items').select('*').eq('receipt_id', id).order('sort_order'),
  ])
  if (rErr) return { error: rErr.message }
  if (iErr) return { error: iErr.message }
  if (!receipt) return { error: 'ไม่พบใบเสร็จ' }
  return { data: { ...receipt, items: items ?? [] } }
}

export async function createReceipt(payload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const {
    customerName = '',
    customerAddress = '',
    customerTel = '',
    customerTaxId = '',
    paymentMethod = 'cash',
    paymentOtherNote = '',
    remark = '',
    items = [],
    discount = 0,
  } = payload ?? {}

  if (!['cash', 'transfer', 'other'].includes(paymentMethod)) {
    return { error: 'ช่องทางชำระไม่ถูกต้อง' }
  }

  const cleanItems = (items ?? [])
    .map((it, i) => ({
      sort_order: i + 1,
      description: String(it.description || '').trim(),
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unitPrice ?? it.unit_price) || 0,
    }))
    .filter(it => it.description || it.quantity > 0 || it.unit_price > 0)
    .map(it => ({ ...it, amount: roundMoney(it.quantity * it.unit_price) }))

  if (cleanItems.length === 0) return { error: 'กรุณากรอกอย่างน้อย 1 รายการ' }
  if (cleanItems.length > 10) return { error: 'รายการเกิน 10 แถว' }

  const subtotal = roundMoney(cleanItems.reduce((s, it) => s + it.amount, 0))
  const disc = Math.max(0, roundMoney(Number(discount) || 0))
  const total = Math.max(0, roundMoney(subtotal - disc))

  // Generate receipt_no with retry on unique-violation race
  const dateStr = bangkokDateStr()
  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .like('receipt_no', `RC-${dateStr}-%`)

  let attempt = count ?? 0
  let insertedReceipt = null
  let lastError = null
  for (let i = 0; i < 5; i++) {
    attempt += 1
    const receiptNo = `RC-${dateStr}-${String(attempt).padStart(3, '0')}`
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        receipt_no: receiptNo,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_tel: customerTel,
        customer_tax_id: customerTaxId,
        payment_method: paymentMethod,
        payment_other_note: paymentOtherNote,
        remark,
        subtotal,
        discount: disc,
        total_amount: total,
        created_by: user.id,
      })
      .select('id, receipt_no')
      .single()
    if (!error) { insertedReceipt = data; break }
    lastError = error
    if (error.code !== '23505') return { error: error.message }
  }
  if (!insertedReceipt) return { error: 'สร้างเลขใบเสร็จซ้ำหลายครั้ง กรุณาลองใหม่: ' + (lastError?.message ?? '') }

  const { error: itemsErr } = await supabase
    .from('receipt_items')
    .insert(cleanItems.map(it => ({ ...it, receipt_id: insertedReceipt.id })))
  if (itemsErr) {
    await supabase.from('receipts').delete().eq('id', insertedReceipt.id)
    return { error: itemsErr.message }
  }

  revalidatePath('/receipts')
  return { success: true, id: insertedReceipt.id, receipt_no: insertedReceipt.receipt_no }
}

export async function deleteReceipt(id) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }

  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/receipts')
  return { success: true }
}
