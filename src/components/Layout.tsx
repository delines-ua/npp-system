import { Outlet, NavLink } from 'react-router-dom'

export default function Layout() {
    const links = [
        { to: '/dashboard', label: '📊 Дашборд' },
        { to: '/departments', label: '🏛 Кафедри' },
        { to: '/staff', label: '👨‍🏫 НПП' },
        { to: '/disciplines', label: '📚 Дисципліни' },
        { to: '/assignments', label: '📋 Розподіл НПП' },
        { to: '/assistant', label: '🤖 AI Асистент' },

    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <nav style={{
                width: '220px',
                background: '#1e293b',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '24px',
                    lineHeight: '1.4'
                }}>
                    СППР<br/>
                    <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'normal' }}>
            Облік НПП ВІТІ
          </span>
                </div>

                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        style={({ isActive }) => ({
                            display: 'block',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            color: isActive ? '#fff' : '#94a3b8',
                            background: isActive ? '#3b82f6' : 'transparent',
                        })}
                    >
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <main style={{ flex: 1, padding: '32px', background: '#f8fafc' }}>
                <Outlet />
            </main>
        </div>
    )
}