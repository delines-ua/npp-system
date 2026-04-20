import { Outlet, NavLink } from 'react-router-dom'
import { Upload } from 'lucide-react'
import {
    LayoutDashboard, Building2, Users, BookOpen,
    ClipboardList, Bot, LogOut,
} from 'lucide-react'

const links = [
    { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { to: '/departments', label: 'Кафедри', icon: Building2 },
    { to: '/staff', label: 'НПП', icon: Users },
    { to: '/disciplines', label: 'Дисципліни', icon: BookOpen },
    { to: '/assignments', label: 'Розподіл НПП', icon: ClipboardList },
    { to: '/assistant', label: 'AI Асистент', icon: Bot },
    { to: '/import', label: 'Імпорт Excel', icon: Upload },
]

export default function Layout() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>

            {/* Sidebar */}
            <aside style={{
                width: '240px',
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
            }}>

                {/* Logo */}
                <div style={{
                    padding: '20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <img
                        src="/images (2).jpg"
                        alt="ВІТІ"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#f1f5f9', letterSpacing: '0.3px' }}>
                            СППР ВІТІ
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c6c5c', marginTop: '2px' }}>
                            Облік навантаження НПП
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{
                        fontSize: '10px',
                        color: '#ffffff',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        padding: '8px 8px 6px',
                        textTransform: 'uppercase',
                    }}>
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
                                color: isActive ? '#fff' : '#e3e3e3',
                                background: isActive ? '#f97316' : 'transparent',
                                transition: 'all 0.15s ease',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                                    <span style={{ flex: 1 }}>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ fontSize: '11px', color: '#8a8080', textAlign: 'center', lineHeight: '1.6', marginBottom: '10px' }}>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', color: '#e3e3e3', fontSize: '16px', cursor: 'pointer' }}>
                        <LogOut size={16} />
                        <span>Вийти</span>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div style={{ marginLeft: '264px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <header style={{
                    height: '56px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 28px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Військовий інститут телекомунікацій та інформатизації імені Героїв Крут
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            background: '#f97316',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: '700', color: '#fff',
                        }}>
                            А
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Адміністратор</span>
                    </div>
                </header>

                {/* Content */}
                <main style={{
                    flex: 1,
                    padding: '28px',
                    background: '#f0f2f5',
                    minHeight: 'calc(100vh - 56px)',
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}