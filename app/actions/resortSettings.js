'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function getResortSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resort_settings')
    .select('investment_cost, investment_start_date, updated_at')
    .eq('id', 1)
    .maybeSingle()
  if (error) return { error: error.message }
  return { data: data ?? { investment_cost: 0, investment_start_date: null, updated_at: null } }
}

export async function updateResortSettings({ investment_cost, investment_start_date }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }

  const cost = Number(investment_cost)
  if (!Number.isFinite(cost) || cost < 0) return { error: 'ต้นทุนต้องเป็นตัวเลขที่ไม่ติดลบ' }
  if (!investment_start_date) return { error: 'กรุณาระบุวันที่เริ่มนับกำไรสะสม' }

  const { error } = await supabase
    .from('resort_settings')
    .update({
      investment_cost: cost,
      investment_start_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
