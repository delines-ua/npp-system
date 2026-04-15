import { supabase } from './supabase'
import type {Staff} from '../types/database'

export const getStaff = async (departmentId?: string): Promise<Staff[]> => {
    let query = supabase.from('staff').select('*').order('full_name')
    if (departmentId) query = query.eq('department_id', departmentId)
    const { data, error } = await query
    if (error) throw error
    return data || []
}

export const createStaff = async (staff: Omit<Staff, 'id' | 'created_at'>): Promise<Staff> => {
    const { data, error } = await supabase
        .from('staff')
        .insert(staff)
        .select()
        .single()
    if (error) throw error
    return data
}

export const deleteStaff = async (id: string): Promise<void> => {
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) throw error
}