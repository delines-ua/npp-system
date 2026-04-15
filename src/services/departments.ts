import { supabase } from './supabase'
import type {Department} from '../types/database'

export const getDepartments = async (): Promise<Department[]> => {
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('number')

    if (error) throw error
    return data || []
}

export const createDepartment = async (
    name: string,
    number: string
): Promise<Department> => {
    const { data, error } = await supabase
        .from('departments')
        .insert({ name, number })
        .select()
        .single()

    if (error) throw error
    return data
}

export const deleteDepartment = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

    if (error) throw error
}