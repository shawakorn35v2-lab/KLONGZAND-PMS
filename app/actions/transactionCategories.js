'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }
  return {}
}

export async function addTransactionCategory({ name, tx_type }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return auth

  const trimmed = String(name || '').trim()
  if (!trimmed) return { error: 'กรุณากรอกชื่อหมวดหมู่' }
  if (!['income', 'expense'].includes(tx_type)) return { error: 'ประเภทไม่ถูกต้อง' }

  const { data: last } = await supabase
    .from('transaction_categories')
    .select('sort_order')
    .eq('tx_type', tx_type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (last?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from('transaction_categories')
    .insert({ name: trimmed, tx_type, sort_order: nextSort })
  if (error) {
    if (error.code === '23505') return { error: 'มีหมวดหมู่ชื่อนี้อยู่แล้ว' }
    return { error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true }
}

export async function deleteTransactionCategory(id) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return auth

  const { error } = await supabase.from('transaction_categories').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { success: true }
}
