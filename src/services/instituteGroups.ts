import { supabase } from './supabase'
import type { InstituteGroup, DisciplineGroupFull, Discipline, DetailedAssignment } from '../types/database'
import { getApplicableSlots } from '../utils/workload'

export const getInstituteGroups = async (): Promise<InstituteGroup[]> => {
    const { data, error } = await supabase
        .from('institute_groups')
        .select('*')
        .order('faculty')
        .order('course', { ascending: false })
        .order('group_name')
    if (error) throw error
    return data || []
}

export type InstituteGroupInput = Omit<InstituteGroup, 'id' | 'created_at'>

export const createInstituteGroup = async (group: InstituteGroupInput): Promise<InstituteGroup> => {
    const { data, error } = await supabase
        .from('institute_groups')
        .insert(group)
        .select()
        .single()
    if (error) throw error
    return data
}

export const updateInstituteGroup = async (id: string, group: Partial<InstituteGroupInput>): Promise<void> => {
    const { error } = await supabase.from('institute_groups').update(group).eq('id', id)
    if (error) throw error
}

export const deleteInstituteGroup = async (id: string): Promise<void> => {
    // institute_groups не має FK ON DELETE CASCADE на discipline_groups, тож
    // спершу прибираємо прив'язки цієї групи — інакше лишається «висяче»
    // посилання (dg.group == null), яке зсуває нумерацію груп у getApplicableSlots
    // і псує зіставлення слотів із призначеннями під час перерахунку.
    const { data: links } = await supabase
        .from('discipline_groups')
        .select('discipline_id')
        .eq('group_id', id)
    const disciplineIds = [...new Set((links || []).map(l => l.discipline_id))]

    if (disciplineIds.length > 0) {
        const { error: delLinksErr } = await supabase
            .from('discipline_groups')
            .delete()
            .eq('group_id', id)
        if (delLinksErr) throw delLinksErr
    }

    const { error } = await supabase.from('institute_groups').delete().eq('id', id)
    if (error) throw error

    // Група зникла зі складу дисциплін → пересинхронізуємо к-сть курсантів і
    // перераховуємо навантаження задіяних дисциплін.
    for (const discId of disciplineIds) {
        await syncDisciplineStudentCount(discId)
        await recalcDisciplineAssignmentHours(discId)
    }
}

// Масовий імпорт: оновлює існуючі групи (за назвою + навч. роком), решту вставляє
export const upsertInstituteGroups = async (
    groups: InstituteGroupInput[]
): Promise<{ inserted: number; updated: number }> => {
    if (groups.length === 0) return { inserted: 0, updated: 0 }

    const years = [...new Set(groups.map(g => g.academic_year))]
    const { data: existing, error } = await supabase
        .from('institute_groups')
        .select('id, group_name, academic_year')
        .in('academic_year', years)
    if (error) throw error

    const key = (name: string, year: string) => `${name.trim()}__${year}`
    const existingMap = new Map((existing || []).map(g => [key(g.group_name, g.academic_year), g.id]))

    const toInsert: InstituteGroupInput[] = []
    let updated = 0
    for (const g of groups) {
        const id = existingMap.get(key(g.group_name, g.academic_year))
        if (id) {
            await updateInstituteGroup(id, g)
            updated++
        } else {
            toInsert.push(g)
        }
    }
    if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('institute_groups').insert(toInsert)
        if (insErr) throw insErr
    }
    return { inserted: toInsert.length, updated }
}

// HARD RESET: видаляє ВСІ навчальні групи за навчальний рік разом із прив'язками
// до дисциплін (discipline_groups), щоб не лишалося «висячих» посилань.
// Незворотна дія — використовується лише з підтвердженням «DELETE».
export const resetInstituteGroups = async (
    academicYear: string
): Promise<{ groups: number; links: number }> => {
    const { data: groups, error: gErr } = await supabase
        .from('institute_groups')
        .select('id')
        .eq('academic_year', academicYear)
    if (gErr) throw gErr

    const ids = (groups || []).map(g => g.id)
    let links = 0
    if (ids.length > 0) {
        // Спершу прибираємо прив'язки, які посилаються на ці групи (за будь-який рік),
        // інакше лишаться записи discipline_groups із неіснуючим group_id.
        const { data: delLinks, error: lErr } = await supabase
            .from('discipline_groups')
            .delete()
            .in('group_id', ids)
            .select('id')
        if (lErr) throw lErr
        links = delLinks?.length ?? 0
    }

    const { data: delGroups, error: dErr } = await supabase
        .from('institute_groups')
        .delete()
        .eq('academic_year', academicYear)
        .select('id')
    if (dErr) throw dErr

    return { groups: delGroups?.length ?? 0, links }
}

export const getDisciplineGroups = async (disciplineId: string): Promise<DisciplineGroupFull[]> => {
    const { data: dgData, error } = await supabase
        .from('discipline_groups')
        .select('*')
        .eq('discipline_id', disciplineId)
        .order('group_order')
    if (error) throw error
    if (!dgData || dgData.length === 0) return []

    const groupIds = dgData.map(dg => dg.group_id)
    const { data: groups } = await supabase
        .from('institute_groups')
        .select('*')
        .in('id', groupIds)

    const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g]))
    return dgData.map(dg => ({ ...dg, group: groupMap[dg.group_id] })) as DisciplineGroupFull[]
}

// Масовий варіант getDisciplineGroups — прив'язки груп одразу для багатьох
// дисциплін (для звіту по кафедрі). Один запит замість N.
export const getDisciplineGroupsForDisciplines = async (
    disciplineIds: string[]
): Promise<DisciplineGroupFull[]> => {
    if (disciplineIds.length === 0) return []

    const { data: dgData, error } = await supabase
        .from('discipline_groups')
        .select('*')
        .in('discipline_id', disciplineIds)
        .order('group_order')
    if (error) throw error
    if (!dgData || dgData.length === 0) return []

    const groupIds = [...new Set(dgData.map(dg => dg.group_id))]
    const { data: groups } = await supabase
        .from('institute_groups')
        .select('*')
        .in('id', groupIds)

    const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g]))
    return dgData.map(dg => ({ ...dg, group: groupMap[dg.group_id] })) as DisciplineGroupFull[]
}

// Перераховує disciplines.student_count = сума всіх прив'язаних груп
const syncDisciplineStudentCount = async (disciplineId: string): Promise<void> => {
    const { data } = await supabase
        .from('discipline_groups')
        .select('student_count')
        .eq('discipline_id', disciplineId)
    const total = (data || []).reduce((s, g) => s + (g.student_count || 0), 0)
    await supabase
        .from('disciplines')
        .update({ student_count: total })
        .eq('id', disciplineId)
}

export const addDisciplineGroup = async (
    disciplineId: string,
    groupId: string,
    studentCount: number,
    groupOrder: number,
    academicYear = '2025-2026'
): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .insert({ discipline_id: disciplineId, group_id: groupId, student_count: studentCount, group_order: groupOrder, academic_year: academicYear })
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
}

export const removeDisciplineGroup = async (id: string, disciplineId: string): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .delete()
        .eq('id', id)
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
}

export const updateDisciplineGroupCount = async (id: string, disciplineId: string, studentCount: number): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .update({ student_count: studentCount })
        .eq('id', id)
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
    await recalcDisciplineAssignmentHours(disciplineId)
}

// Перераховує години у workload_assignments дисципліни під поточну кількість
// курсантів у групах. Години типів, що залежать від курсантів (курсові,
// контрольні, іспити, заліки), генеруються getApplicableSlots і зіставляються з
// наявними призначеннями за (тип + номер групи). Викладач у слоті зберігається —
// оновлюються лише hours/student_count. Повертає к-сть змінених записів.
export const recalcDisciplineAssignmentHours = async (disciplineId: string): Promise<number> => {
    const { data: disc, error: discErr } = await supabase
        .from('disciplines')
        .select('*')
        .eq('id', disciplineId)
        .single()
    if (discErr || !disc) return 0

    const discGroups = await getDisciplineGroups(disciplineId)
    const slots = getApplicableSlots(disc as Discipline, discGroups.length > 0 ? discGroups : undefined)
    const slotMap = new Map(slots.map(s => [`${s.type}|${s.groupNumber}`, s]))

    const { data: assigns, error: aErr } = await supabase
        .from('workload_assignments')
        .select('*')
        .eq('discipline_id', disciplineId)
    if (aErr || !assigns) return 0

    // Рахуємо лише слоти, де змінились ГОДИНИ (курсові/контрольні/іспити/заліки) —
    // саме це впливає на навантаження. Поле student_count синхронізуємо завжди,
    // але метадані-без-зміни-годин (лекції/ГЗ/ПЗ) у лічильник не потрапляють.
    const bySlotKey = new Map<string, DetailedAssignment[]>()
    for (const a of assigns as DetailedAssignment[]) {
        const key = `${a.workload_type}|${a.group_number}`
        const arr = bySlotKey.get(key) ?? []
        arr.push(a)
        bySlotKey.set(key, arr)
    }

    let updated = 0
    const updates: Promise<void>[] = []
    const orphanIds: string[] = []
    for (const [key, rows] of bySlotKey) {
        const slot = slotMap.get(key)
        if (!slot) {
            // Атестаційні дисципліни (is_thesis) мають окремий планувальник, що не
            // будує слоти через getApplicableSlots — там неспівпадіння очікуване й
            // навмисне, не чіпаємо. Для звичайних дисциплін неспівпадіння означає
            // «осиротілий» рядок, що лишився після зміни складу груп (напр.
            // переприв'язки «Авто» чи видалення групи, яке зсунуло нумерацію
            // решти слотів) — прибираємо його, інакше він і далі накручує години
            // викладачу та занижує % заповненості дисципліни.
            if (!disc.is_thesis) orphanIds.push(...rows.map(r => r.id))
            continue
        }
        // Слот, поділений між кількома викладачами (напр. курсові — керівництво
        // розбите на кількох НПП), не чіпаємо автоматично: як розподілити нове
        // значення год/курсантів між рядками — неоднозначно, це ручне рішення.
        if (rows.length > 1) continue
        const a = rows[0]
        const hoursChanged = slot.hours !== a.hours
        if (hoursChanged || slot.studentCount !== a.student_count) {
            updates.push(
                supabase
                    .from('workload_assignments')
                    .update({ hours: slot.hours, student_count: slot.studentCount })
                    .eq('id', a.id)
                    .then(({ error }) => { if (error) throw error })
            )
            if (hoursChanged) updated++
        }
    }
    if (orphanIds.length > 0) {
        updates.push(
            supabase.from('workload_assignments').delete().in('id', orphanIds)
                .then(({ error }) => { if (error) throw error })
        )
    }
    await Promise.all(updates)   // незалежні оновлення рядків — виконуємо паралельно
    return updated
}

// Каскад при зміні кількості курсантів у групі institute_groups:
// 1) оновлює student_count у всіх прив'язках цієї групи (discipline_groups),
// 2) пересинхронізує disciplines.student_count задіяних дисциплін,
// 3) перераховує години у workload_assignments цих дисциплін.
export const propagateGroupStudentCount = async (
    groupId: string,
    newStudentCount: number,
    prevCount?: number,   // якщо задано — оновлюємо лише прив'язки, що досі
                          // тримали стару к-сть групи (зберігає ручні override)
): Promise<{ disciplines: number; assignmentsUpdated: number }> => {
    const { data: links, error } = await supabase
        .from('discipline_groups')
        .select('discipline_id')
        .eq('group_id', groupId)
    if (error) throw error
    if (!links || links.length === 0) return { disciplines: 0, assignmentsUpdated: 0 }

    // Оновлюємо student_count у прив'язках. Якщо передано prevCount — чіпаємо лише
    // ті, що досі дорівнювали старому розміру групи, не затираючи ручні правки
    // окремих дисциплін (updateDisciplineGroupCount).
    let upQuery = supabase
        .from('discipline_groups')
        .update({ student_count: newStudentCount })
        .eq('group_id', groupId)
    if (prevCount !== undefined) upQuery = upQuery.eq('student_count', prevCount)
    const { error: upErr } = await upQuery
    if (upErr) throw upErr

    const disciplineIds = [...new Set(links.map(l => l.discipline_id))]
    let assignmentsUpdated = 0
    for (const discId of disciplineIds) {
        await syncDisciplineStudentCount(discId)
        assignmentsUpdated += await recalcDisciplineAssignmentHours(discId)
    }
    return { disciplines: disciplineIds.length, assignmentsUpdated }
}

// Авто-зв'язок: знаходить групи по кодах спеціальностей і прив'язує до дисципліни
// semester → course: 1-2→1, 3-4→2, 5-6→3, 7-8→4
// isZaochna — форма навчання дисципліни: підбираємо лише групи тієї ж форми
// (очна дисципліна → лише очні групи 241/242, заочна → лише заочні 2401).
export const autoLinkGroupsBySpecialty = async (
    disciplineId: string,
    specialtyCodes: string,   // "122,126"
    semester = 0,
    academicYear = '2025-2026',
    isZaochna = false
): Promise<number> => {
    if (!specialtyCodes.trim()) return 0

    const codes = specialtyCodes.split(',').map(s => s.trim()).filter(Boolean)
    if (codes.length === 0) return 0

    const isMasters = semester >= 9
    const course = semester > 0
        ? (isMasters ? Math.ceil((semester - 8) / 2) : Math.ceil(semester / 2))
        : 0

    // Знаходимо групи з відповідними кодами спеціальностей (та курсом, якщо вказано)
    let query = supabase
        .from('institute_groups')
        .select('*')
        .in('specialty_code', codes)
        .eq('academic_year', academicYear)
        .eq('is_masters', isMasters)
        .eq('zaochna', isZaochna)
    if (course > 0) query = query.eq('course', course)
    const { data: groups, error } = await query.order('group_name')
    if (error) throw error
    if (!groups || groups.length === 0) return 0

    // Видаляємо старі зв'язки
    await supabase.from('discipline_groups').delete().eq('discipline_id', disciplineId)

    // Вставляємо нові
    const inserts = groups.map((g, idx) => ({
        discipline_id: disciplineId,
        group_id: g.id,
        group_order: idx + 1,
        student_count: g.student_count,
        academic_year: academicYear,
    }))
    const { error: insErr } = await supabase.from('discipline_groups').insert(inserts)
    if (insErr) throw insErr

    await syncDisciplineStudentCount(disciplineId)
    // Переприв'язка групами могла змінити їх кількість/порядок — слоти
    // перенумеровуються позиційно (1..N), тож наявні призначення потребують
    // пересинхронізації (і прибирання «осиротілих» рядків), як і при ручній
    // зміні складу груп.
    await recalcDisciplineAssignmentHours(disciplineId)
    return groups.length
}
