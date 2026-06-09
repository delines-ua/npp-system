import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Upload, Layers, Boxes, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import {
    LayoutDashboard, Building2, Users, BookOpen,
    GraduationCap, Bot, Settings,
} from 'lucide-react'
import Select from './Select'
import { useSettings } from '../contexts/SettingsContext'
import { ACADEMIC_YEARS } from '../utils/settings'

const links = [
    { to: '/dashboard',        label: 'Дашборд',          icon: LayoutDashboard },
    { to: '/departments',      label: 'Кафедри',           icon: Building2 },
    { to: '/staff',            label: 'НПП',               icon: Users },
    { to: '/disciplines',      label: 'Дисципліни',        icon: BookOpen },
    { to: '/groups',           label: 'Навчальні групи',   icon: Boxes },
    { to: '/workload',         label: 'Розподіл',          icon: Layers },
    { to: '/scientific-works', label: 'Здобувачі',          icon: GraduationCap },
    { to: '/assistant',        label: 'AI Асистент',       icon: Bot },
    { to: '/import',           label: 'Імпорт Excel',      icon: Upload },
    { to: '/settings',         label: 'Налаштування',      icon: Settings },
]

const SIDEBAR_FULL = 240
const SIDEBAR_MINI = 64

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false)
    const { academicYear, setAcademicYear } = useSettings()

    const sideW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL
    const mainML = sideW + 24  // 12px gap on each side

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#e8eaee' }}>

            {/* Sidebar */}
            <aside style={{
                width: `${sideW}px`,
                background: '#433a2c',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: '12px',
                left: '12px',
                height: 'calc(100vh - 24px)',
                borderRadius: '16px',
                zIndex: 100,
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                overflow: 'hidden',
                transition: 'width 0.22s ease',
            }}>

                {/* Logo */}
                <div style={{
                    padding: '20px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minWidth: `${SIDEBAR_FULL}px`,
                }}>
                    <img
                        src="/images (2).jpg"
                        alt="ВІТІ"
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s ease', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#f1f5f9', letterSpacing: '0.3px' }}>
                            СППР ВІТІ
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c6c5c', marginTop: '2px' }}>
                            Облік навантаження НПП
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={collapsed ? label : undefined}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                gap: '10px',
                                padding: collapsed ? '10px 0' : '10px 12px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: isActive ? '600' : '400',
                                color: isActive ? '#fff' : '#e3e3e3',
                                background: isActive ? '#f97316' : 'transparent',
                                transition: 'all 0.15s ease',
                                minWidth: `${SIDEBAR_MINI - 16}px`,
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        opacity: collapsed ? 0 : 1,
                                        width: collapsed ? 0 : 'auto',
                                        overflow: 'hidden',
                                        transition: 'opacity 0.15s ease',
                                    }}>
                                        {label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Toggle button */}
                <div style={{
                    padding: '10px 8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: collapsed ? 'center' : 'flex-end',
                    transition: 'justify-content 0.22s ease',
                }}>
                    <button
                        onClick={() => setCollapsed(v => !v)}
                        title={collapsed ? 'Розгорнути' : 'Згорнути'}
                        style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#b0a898',
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div style={{ marginLeft: `${mainML}px`, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.22s ease' }}>

                {/* Header */}
                <header style={{
                    height: '56px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e4e9',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 28px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Військовий інститут телекомунікацій та інформатизації імені Героїв Крут
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={15} color="#9ca3af" />
                        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>Навч. рік</span>
                        <Select value={academicYear} onChange={setAcademicYear}
                            options={ACADEMIC_YEARS.map(y => ({ value: y, label: y }))} style={{ minWidth: '130px' }} />
                    </div>
                </header>

                {/* Content */}
                <main style={{
                    flex: 1,
                    padding: '28px',
                    background: '#e8eaee',
                    minHeight: 'calc(100vh - 56px)',
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
