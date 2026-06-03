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

// Оновлює дисципліну якщо вже є (по name+dept+year), інакше вставляє нову
// Повертає id дисципліни
export const upsertDiscipline = async (discipline: Omit<Discipline, 'id'>): Promise<string> => {
    const { data: existing } = await supabase
        .from('disciplines')
        .select('id')
        .eq('name', discipline.name)
        .eq('department_id', discipline.department_id)
        .eq('academic_year', discipline.academic_year)
        .maybeSingle()

    if (existing) {
        const { error } = await supabase
            .from('disciplines')
            .update(discipline)
            .eq('id', existing.id)
        if (error) throw error
        return existing.id
    } else {
        const { data, error } = await supabase
            .from('disciplines')
            .insert(discipline)
            .select('id')
            .single()
        if (error) throw error
        return data.id
    }
}

export const updateDiscipline = async (id: string, data: Partial<Omit<Discipline, 'id'>>): Promise<void> => {
    const { error } = await supabase.from('disciplines').update(data).eq('id', id)
    if (error) throw error
}

export const deleteDiscipline = async (id: string): Promise<void> => {
    const { error } = await supabase.from('disciplines').delete().eq('id', id)
    if (error) throw error
}