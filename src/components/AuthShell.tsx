'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles, ShieldCheck, TrendingUp } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

/** Split-screen auth layout: animated brand panel (desktop) + form slot. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <aside className="on-dark relative m-3 hidden h-[calc(100vh-24px)] w-[54%] shrink-0 flex-col overflow-hidden rounded-[32px] p-10 text-white lg:sticky lg:top-3 lg:flex" style={{ background: '#161326' }}>
        <motion.div aria-hidden className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#4B2FC9] opacity-70 blur-[110px]" animate={{ x: [0, 60, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden className="absolute -bottom-32 -right-20 h-[380px] w-[380px] rounded-full bg-[#F5B829] opacity-30 blur-[110px]" animate={{ x: [0, -50, 0], y: [0, -40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white"><Image src="/eduing-logo.png" alt="" width={30} height={31} /></span>
          <span className="font-display text-[21px] font-bold tracking-tight">EDU<span className="text-[#B2A2FF]">ING</span><span className="text-[13px] text-[#F5B829]">.in</span></span>
          <span className="ml-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">University portal</span>
        </div>

        <div className="relative z-10 mx-auto my-auto h-[440px] w-full max-w-[560px]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}
            className="animate-float-y absolute left-0 top-2 w-[340px] rounded-[26px] bg-white p-6 text-[#17142B] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold">Admissions today</h3>
              <span className="flex items-center gap-1 rounded-full bg-[#16A373]/10 px-2.5 py-1 text-[11px] font-bold text-[#16A373]"><TrendingUp size={12} />+18%</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['142', 'New'], ['38', 'Pending'], ['86%', 'Seats']].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-[#F5F3EE] p-3 text-center">
                  <div className="text-[20px] font-bold">{v}</div>
                  <div className="text-[11px] text-[#17142B]/50">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-16 items-end gap-1.5">
              {[35, 52, 44, 70, 58, 86, 74].map((h, i) => (
                <motion.div key={i} className={`flex-1 rounded-t-md ${i === 5 ? 'bg-[#F5B829]' : 'bg-[#4B2FC9]/25'}`} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.9, delay: 0.4 + i * 0.06, ease: EASE }} />
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="absolute right-0 top-[200px] w-[300px] rounded-[26px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl"
            style={{ animation: 'float-y 7s ease-in-out infinite 1s' }}>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold"><Sparkles size={14} className="text-[#F5B829]" />AI candidate insights</div>
            {[['Computer Science', 98], ['Data Science & ML', 95], ['Electronics', 92]].map(([p, m], i) => (
              <div key={p as string} className="mb-2.5 last:mb-0">
                <div className="mb-1 flex justify-between text-[12px]"><span>{p}</span><b className="text-[#F5B829]">{m}%</b></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#B2A2FF] to-[#F5B829]" initial={{ width: 0 }} animate={{ width: `${m}%` }} transition={{ duration: 1.1, delay: 0.5 + i * 0.12, ease: EASE }} /></div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="absolute bottom-0 left-10 flex items-center gap-3 rounded-full bg-white py-2.5 pl-2.5 pr-5 text-[#17142B] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4B2FC9] text-white"><ShieldCheck size={17} /></span>
            <div><div className="text-[13px] font-bold">1,204 documents verified</div><div className="text-[11px] text-[#17142B]/50">this admission cycle</div></div>
          </motion.div>
        </div>

        <p className="relative z-10 font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">
          Admissions, simplified.<br /><span className="text-[#F5B829]">For every department.</span>
        </p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  )
}
