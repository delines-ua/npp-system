import { supabase } from './supabase'
import type {Discipline} from '../types/database'

export const getDisciplines = async (departmentId?: string, academicYear?: string): Promise<Discipline[]> => {
    let query = supabase.from('disciplines').select('*').order('name')
    if (departmentId) query = query.eq('department_id', departmentId)
    if (academicYear) query = query.eq('academic_year', academicYear)
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

// Оновлює дисципліну якщо вже є, інакше вставляє нову. Повертає id дисципліни.
// Ключ збігу: name + dept + year + рівень освіти + семестр + коди спеціальностей —
// одна й та сама дисципліна може читатись окремо для різних спеціальностей/семестрів
// (різне навантаження), тож такі рядки НЕ повинні перетирати один одного при імпорті.
export const upsertDiscipline = async (discipline: Omit<Discipline, 'id'>): Promise<string> => {
    const { data: existing } = await supabase
        .from('disciplines')
        .select('id')
        .eq('name', discipline.name)
        .eq('department_id', discipline.department_id)
        .eq('academic_year', discipline.academic_year)
        .eq('education_level', discipline.education_level)
        .eq('semester', discipline.semester)
        .eq('specialty_codes', discipline.specialty_codes)
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