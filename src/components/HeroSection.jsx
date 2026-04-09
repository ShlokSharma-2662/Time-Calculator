import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Briefcase, Clock, BarChart2, CloudLightning, ArrowRight, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: Clock,         label: 'Smart Shift Tracking',   desc: 'Automatic start/end detection from your logs'       },
  { icon: BarChart2,     label: 'Deep Analytics',          desc: 'Monthly adherence, overtime trends, and heatmaps'   },
  { icon: CloudLightning,label: 'Real-Time Cloud Sync',    desc: 'Firestore-backed sync across all your devices'      },
  { icon: Sparkles,      label: 'Holiday Intelligence',    desc: 'Country-aware holiday & leave management'           },
];

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 },
  }),
};

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, label, desc, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-4 group-hover:bg-indigo-500/25 transition-colors">
        <Icon className="w-5 h-5 text-indigo-400" />
      </div>
      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export function HeroSection({ onGetStarted }) {
  const containerRef = useRef(null);

  // Parallax on the big gradient orbs
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  const orbY1 = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const orbY2 = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale  = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col">

      {/* ── Indigo gradient orbs ── */}
      <motion.div
        style={{ y: orbY1 }}
        className="pointer-events-none absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <motion.div
        style={{ y: orbY2 }}
        className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-violet-600/15 blur-[140px]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-slate-950" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Hero copy ── */}
      <motion.div
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20"
      >
        <AnimatedSection delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-black uppercase tracking-widest mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Work Intelligence Platform
          </div>
        </AnimatedSection>

        <AnimatedSection delay={1}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[1.05] mb-6 max-w-4xl">
            Own Your{' '}
            <span className="relative">
              <span className="relative z-10 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                WorkShift
              </span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-indigo-500/20 blur-sm rounded-full" />
            </span>
            <br />Like Never Before
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={2}>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Paste your attendance log. Get instant shift calculations, overtime tracking,
            leave management, and cloud-synced analytics — all in one place.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={3}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-2 px-7 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-indigo-500/30 transition-all duration-200 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
              No credit card · Works with any attendance log
            </div>
          </div>
        </AnimatedSection>

        {/* Live preview card */}
        <AnimatedSection delay={4} className="w-full max-w-md mt-16">
          <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl shadow-black/40 text-left overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Today's Shift</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Live</span>
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Clock In',   value: '09:02 AM',    color: 'text-white'        },
                { label: 'Effective',  value: '7h 43m',       color: 'text-indigo-300'   },
                { label: 'End Time',   value: '06:02 PM',    color: 'text-emerald-300'  },
                { label: 'Status',     value: 'On Track ✓',  color: 'text-emerald-400'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
                  <span className={`text-sm font-black ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                <span>Progress</span><span>86%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '86%' }}
                  transition={{ duration: 1.4, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                />
              </div>
            </div>
          </div>
        </AnimatedSection>
      </motion.div>

      {/* ── Features strip ── */}
      <div className="relative z-10 px-6 pb-24 max-w-5xl mx-auto w-full">
        <AnimatedSection className="text-center mb-10">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
            Everything you need to track smarter
          </p>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.label} {...f} index={i} />
          ))}
        </div>
      </div>

    </div>
  );
}
