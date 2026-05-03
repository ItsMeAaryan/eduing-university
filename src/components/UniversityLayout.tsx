'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, BookOpen,
  ClipboardList, Users, BarChart3,
  Building2, Settings, LogOut, Bell, ChevronRight,
  GraduationCap, Calendar, Armchair, TrendingUp, UserCircle
} from 'lucide-react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/applications', icon: ClipboardList, label: 'Applications' },
  { href: '/programs', icon: GraduationCap, label: 'Programs' },
  { href: '/exams', icon: Calendar, label: 'Exam Management' },
  { href: '/seats', icon: Armchair, label: 'Seat Allocation' },
  { href: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { href: '/profile', icon: UserCircle, label: 'University Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [uniData, setUniData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth/login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()

      if (!userData || userData.role !== 'uni_admin') {
        router.push('/auth/login')
        return
      }

      const unsubUni = onSnapshot(doc(db, 'universities', user.uid), (snap) => {
        if (snap.exists()) setUniData({ id: snap.id, ...snap.data() })
        setLoading(false)
      })
      return () => unsubUni()
    })
    return () => unsub()
  }, [router])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/auth/login')
  }

  const name = uniData?.name || uniData?.shortName || 'University'
  const initial = name.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(91,95,239,0.2)', borderTop: '2px solid #5B5FEF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'DM Sans', Inter, sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '900', color: 'white',
              boxShadow: '0 0 20px rgba(91,95,239,0.4)',
              position: 'relative'
            }}>
              E
              <div style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#F59E0B', border: '1.5px solid var(--bg-elevated)'
              }} />
            </div>
            <span style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              <span style={{ color: '#F0F0FF' }}>EDU</span>
              <span style={{ color: '#818CF8' }}>ING</span>
              <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: '700' }}>.in</span>
            </span>
          </Link>
          <div style={{ marginTop: '6px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            University Portal
          </div>
        </div>

        {/* University card */}
        <div style={{ padding: '14px 16px', margin: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(91,95,239,0.08)', border: '1px solid rgba(91,95,239,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: '800', color: 'white', overflow: 'hidden'
            }}>
              {uniData?.logoURL ? (
                <img src={uniData.logoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initial}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name.length > 18 ? name.substring(0, 18) + '…' : name}</div>
              <div style={{ fontSize: '11px', color: uniData?.isVerified ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: uniData?.isVerified ? '#10B981' : '#F59E0B', display: 'inline-block' }} />
                {uniData?.isVerified ? 'Verified' : 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                    marginBottom: '2px', cursor: 'pointer',
                    background: active ? 'rgba(91,95,239,0.15)' : 'transparent',
                    border: active ? '1px solid rgba(91,95,239,0.25)' : '1px solid transparent',
                    color: active ? '#818CF8' : 'var(--text-secondary)',
                    fontSize: '13.5px', fontWeight: active ? '600' : '400',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: 'var(--radius-sm)',
              background: 'transparent', border: '1px solid transparent',
              color: '#EF4444', fontSize: '13.5px', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <LogOut size={16} />
            Logout
          </motion.button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header style={{
          height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', borderBottom: '1px solid var(--border)',
          background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 40,
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <Bell size={16} />
            </button>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '800', color: 'white', cursor: 'pointer', overflow: 'hidden'
            }}>
              {uniData?.logoURL ? (
                <img src={uniData.logoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initial}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        :root {
          --bg: #0A0A0F; --bg-elevated: #111118; --bg-card: #16161F;
          --bg-card-hover: #1C1C28; --border: rgba(99,102,241,0.15);
          --border-hover: rgba(99,102,241,0.4); --text-primary: #F0F0FF;
          --text-secondary: #8B8BA8; --text-muted: #4A4A6A;
          --indigo: #5B5FEF; --indigo-light: #818CF8; --gold: #F59E0B;
          --green: #10B981; --red: #EF4444; --orange: #F97316;
          --radius-sm: 10px; --radius-md: 14px; --radius-lg: 20px;
          --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08);
          --shadow-glow: 0 0 40px rgba(91,95,239,0.12);
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 4px; }
      `}</style>
    </div>
  )
}
