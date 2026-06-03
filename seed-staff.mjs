import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env manually (no dotenv needed)
const envPath = join(__dirname, '.env')
const envVars = {}
try {
    const envContent = readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
        envVars[key] = val
    }
} catch {
    console.error('❌ Не знайдено .env файл')
    process.exit(1)
}

const SUPABASE_URL = envVars['VITE_SUPABASE_URL']
const SUPABASE_KEY = envVars['VITE_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Відсутні VITE_SUPABASE_URL або VITE_SUPABASE_ANON_KEY в .env')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Mapping helpers ───────────────────────────────────────────────────────────

function normalizePosition(raw) {
    const p = raw.toLowerCase()
    if (p.includes('начальник кафедри'))    return 'Начальник кафедри'
    if (p.includes('заступник'))             return 'Заступник начальника кафедри'
    if (p.includes('професор'))             return 'Професор'
    if (p.includes('доцент'))               return 'Доцент'
    if (p.includes('старший викладач'))     return 'Старший викладач'
    if (p.includes('викладач'))             return 'Викладач'
    if (p.includes('асистент'))             return 'Асистент'
    return raw
}

function parseServiceCategory(category) {
    if (!category || category === 'цивільний НПП') {
        return { is_military: false, service_years: 0 }
    }
    if (category === 'менше 10 років') {
        return { is_military: true, service_years: 5 }
    }
    if (category === 'від 10 до 15 років') {
        return { is_military: true, service_years: 12 }
    }
    if (category === 'від 15 до 20 років') {
        return { is_military: true, service_years: 17 }
    }
    if (category === 'від 20 років') {
        return { is_military: true, service_years: 20 }
    }
    return { is_military: true, service_years: 0 }
}

// ── Raw data from teacher_roster.yml ─────────────────────────────────────────

const teachers = [
    { name: 'Редзюк Є.В.',        position: 'Начальник кафедри',      service_category: 'від 10 до 15 років', department: 22 },
    { name: 'Бовда Е.М.',         position: 'професор кафедри',       service_category: 'від 20 років',       department: 22 },
    { name: 'Стоцький І.В.',      position: 'Старший викладач',       service_category: 'менше 10 років',     department: 22 },
    { name: 'Романенко С.О.',     position: 'Старший викладач',       service_category: 'менше 10 років',     department: 22 },
    { name: 'Голуб О.О.',         position: 'Старший викладач',       service_category: 'менше 10 років',     department: 22 },
    { name: 'Костенко В.П.',      position: 'Старший викладач',       service_category: 'менше 10 років',     department: 22 },
    { name: 'Люк С.С.',           position: 'Викладач',               service_category: 'менше 10 років',     department: 22 },
    { name: 'Налісний Г.І.',      position: 'Викладач',               service_category: 'менше 10 років',     department: 22 },
    { name: 'Сачук О.В.',         position: 'Викладач',               service_category: 'менше 10 років',     department: 22 },
    { name: 'Задворний А.В.',     position: 'Викладач',               service_category: 'менше 10 років',     department: 22 },
    { name: 'Устинов Д.А.',       position: 'Викладач кафедри',       service_category: 'менше 10 років',     department: 22 },
    { name: 'Субач І.Ю.',         position: 'Професор кафедри',       service_category: 'цивільний НПП',      department: 22 },
    { name: 'Любарський С.В.',    position: 'Доцент кафедри',         service_category: 'від 20 років',       department: 22 },
    { name: 'Гріньков В.О.',      position: 'Доцент кафедри',         service_category: 'від 10 до 15 років', department: 22 },
    { name: 'Макарчук О.М.',      position: 'Доцент кафедри',         service_category: 'від 20 років',       department: 22 },
    { name: 'Успенський О.А.',    position: 'Доцент кафедри',         service_category: 'цивільний НПП',      department: 22 },
    { name: 'Сокульський О.Є.',   position: 'Старший викладач',       service_category: 'цивільний НПП',      department: 22 },
    { name: 'Клименко В.М.',      position: 'Старший викладач',       service_category: 'від 20 років',       department: 22 },
    { name: 'Кондратюк А.Г.',     position: 'Старший викладач',       service_category: 'цивільний НПП',      department: 22 },
    { name: 'Тетерятник І.В.',    position: 'Старший викладач',       service_category: 'цивільний НПП',      department: 22 },
    { name: 'Шарнін С.А.',        position: 'Викладач',               service_category: 'цивільний НПП',      department: 22 },
    { name: 'Самохвалов Ю.Я.',    position: 'Професор кафедри',       service_category: 'цивільний НПП',      department: 22 },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    // 1. Find department by number
    const { data: depts, error: deptErr } = await supabase
        .from('departments')
        .select('id, number, name')
        .eq('number', '22')
        .single()

    if (deptErr || !depts) {
        console.error('❌ Кафедра №22 не знайдена:', deptErr?.message)
        console.log('   Доступні кафедри:')
        const { data: all } = await supabase.from('departments').select('number, name')
        all?.forEach(d => console.log(`   №${d.number} — ${d.name}`))
        process.exit(1)
    }

    const deptId = depts.id
    console.log(`✅ Кафедра знайдена: №${depts.number} — ${depts.name} (id: ${deptId})`)

    // 2. Check existing staff (avoid duplicates by name)
    const { data: existing } = await supabase
        .from('staff')
        .select('full_name')
        .eq('department_id', deptId)

    const existingNames = new Set((existing || []).map(s => s.full_name))
    console.log(`   Вже є ${existingNames.size} НПП у цій кафедрі`)

    // 3. Build insert rows
    const toInsert = []
    const skipped = []

    for (const t of teachers) {
        if (existingNames.has(t.name)) {
            skipped.push(t.name)
            continue
        }
        const { is_military, service_years } = parseServiceCategory(t.service_category)
        toInsert.push({
            department_id: deptId,
            full_name: t.name,
            position: normalizePosition(t.position),
            is_military,
            service_years,
            rate: 1.0,
        })
    }

    if (skipped.length > 0) {
        console.log(`\n⏩ Пропущено (вже існують): ${skipped.join(', ')}`)
    }

    if (toInsert.length === 0) {
        console.log('\n✅ Всі викладачі вже є в базі. Нічого не додано.')
        return
    }

    // 4. Insert
    const { data: inserted, error: insertErr } = await supabase
        .from('staff')
        .insert(toInsert)
        .select()

    if (insertErr) {
        console.error('❌ Помилка вставки:', insertErr.message)
        process.exit(1)
    }

    console.log(`\n✅ Додано ${inserted.length} викладачів:\n`)
    for (const s of inserted) {
        const mil = s.is_military ? `військ. ${s.service_years}р.` : 'цивільний'
        console.log(`   • ${s.full_name.padEnd(22)} ${s.position.padEnd(26)} ${mil}`)
    }
}

main().catch(err => {
    console.error('❌ Помилка:', err.message)
    process.exit(1)
})
