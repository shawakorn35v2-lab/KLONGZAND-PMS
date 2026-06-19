'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function createCustomer(data) {
  const supabase = await createClient()
  const { error } = await supabase.from('customers').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/customers')
  return { success: true }
}

export async function updateCustomer(id, data) {
  const supabase = await createClient()
  const { error } = await supabase.from('customers').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return { success: true }
}
