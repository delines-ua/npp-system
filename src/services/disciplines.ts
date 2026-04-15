import { supabase } from './supabase'
import type {Discipline} from '../types/database'

export const getDisciplines = async (departmentId?: string): Promise<Discipline[]> => {
    let query = supabase.from('disciplines').select('*').order('name')
    if (departmentId) query = query.eq('department_id', departmentId)
    const { data, error } = await query
    if (error) throw error
    return data || []
}

export const createDiscipline = async (
    discipline: Omit<Discipline, 'id'>
): Promise<Discipline> => {
    const { data, error } = await supabase
        .from('disciplines')
        .insert(discipline)
        .select()
        .single()
    if (error) throw error
    return data
}

export const deleteDiscipline = async (id: string): Promise<void> => {
    const { error } = await supabase.from('disciplines').delete().eq('id', id)
    if (error) throw error
}