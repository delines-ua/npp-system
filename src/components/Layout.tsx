import { Outlet, NavLink } from 'react-router-dom'
import {
    LayoutDashboard, Building2, Users, BookOpen,
    ClipboardList, Bot, ChevronRight
} from 'lucide-react'

const links = [
    { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { to: '/departments', label: 'Кафедри', icon: Building2 },
    { to: '/staff', label: 'НПП', icon: Users },
    { to: '/disciplines', label: 'Дисципліни', icon: BookOpen },
    { to: '/assignments', label: 'Розподіл НПП', icon: ClipboardList },
    { to: '/assistant', label: 'AI Асистент', icon: Bot },
]

export default function Layout() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#13203a' }}>

            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'linear-gradient(180deg, #111827 0%, #1a2744 100%)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 100,
            }}>

                {/* Logo */}
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <img
                        src="/images (2).jpg"
                        alt="ВІТІ"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#f1f5f9', letterSpacing: '0.5px' }}>
                            СППР ВІТІ
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            Облік навантаження НПП
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                        fontSize: '10px',
                        color: '#4b5563',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        padding: '8px 8px 8px',
                        textTransform: 'uppercase'
                    }}>
                        Навігація
                    </div>

                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: isActive ? '600' : '400',
                                color: isActive ? '#fff' : '#9ca3af',
                                background: isActive
                                    ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                                    : 'transparent',
                                boxShadow: isActive ? '0 4px 15px rgba(37,99,235,0.25)' : 'none',
                                transition: 'all 0.2s ease',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                                    <span style={{ flex: 1 }}>{label}</span>
                                    {isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '11px',
                    color: '#374151',
                    textAlign: 'center',
                    lineHeight: '1.6',
                }}>
                    <div style={{ color: '#4b5563' }}>ВІТІ імені Героїв Крут</div>
                    <div style={{ color: '#374151' }}>2025-2026 навч. рік</div>
                </div>
            </aside>

            {/* Main */}
            <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <header style={{
                    height: '60px',
                    background: 'rgba(17,24,39,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 32px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                }}>
                    <div style={{ fontSize: '13px', color: '#4b5563' }}>
                        Військовий інститут телекомунікацій та інформатизації імені Героїв Крут
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: '20px',
                            fontSize: '12px',
                            color: '#4ade80',
                            fontWeight: '500',
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                background: '#22c55e',
                                borderRadius: '50%',
                                animation: 'pulse 2s infinite',
                            }} />
                            Система активна
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main style={{
                    flex: 1,
                    padding: '32px',
                    background: '#111827',
                    minHeight: 'calc(100vh - 60px)',
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}