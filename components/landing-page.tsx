"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Fingerprint,
  Gauge,
  Menu,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const workflows = [
  {
    eyebrow: "Employee self-service",
    question: "How many vacation days do I have left?",
    answer: "You have 14.5 days available. Your next accrual of 1.25 days posts August 1.",
    icon: CalendarDays,
    accent: "var(--signal-blue)",
  },
  {
    eyebrow: "Manager approval",
    question: "Can I approve Amina’s leave next week?",
    answer: "Yes. Coverage stays at 82%, above your team’s 75% minimum. Approve request?",
    icon: Users,
    accent: "var(--signal-green)",
  },
  {
    eyebrow: "Policy retrieval",
    question: "Does our plan cover orthodontics?",
    answer: "Yes, at 50% after deductible, up to the lifetime maximum. Source: 2026 Benefits Guide, p. 18.",
    icon: BookOpenText,
    accent: "var(--signal-orange)",
  },
];

const capabilities = [
  {
    number: "01",
    title: "Answers grounded in live HR data",
    copy: "The agent checks balances, plans, employment records, and case histories in the systems where they actually live—not in a stale export.",
    icon: Gauge,
  },
  {
    number: "02",
    title: "Permissions enforced at the tool layer",
    copy: "Employees, managers, and HR staff get different capabilities. Sensitive tools simply do not exist for roles that cannot use them.",
    icon: Fingerprint,
  },
  {
    number: "03",
    title: "Policy answers with receipts",
    copy: "Uploaded handbooks and benefits guides are semantically searched, with every answer linked back to the exact source passage.",
    icon: FileText,
  },
  {
    number: "04",
    title: "Cases with real workflow behind them",
    copy: "Open, categorize, assign, track, escalate, and resolve HR cases with SLA timers and a complete history of every action.",
    icon: Clock3,
  },
];

const roleRows = [
  ["Employee", "Balances, benefits, policies, personal cases", "Self only"],
  ["Manager", "Team availability, requests, coverage", "Direct reports"],
  ["HR staff", "People search, cases, documents, operations", "Organization"],
] as const;

const faqs = [
  {
    q: "Does the model see every employee’s data?",
    a: "No. Access is role-aware and enforced where tools are defined. An employee cannot call a manager or HR-only tool because it is never exposed to their session.",
  },
  {
    q: "Can it answer questions from our own policies?",
    a: "Yes. HR teams upload handbooks, benefits guides, and policy documents. The agent searches those sources and returns citations to the precise passage used.",
  },
  {
    q: "What happens when a question becomes a case?",
    a: "The agent can create a structured HR case without leaving the conversation. The case gets a category, owner, SLA target, timeline, and full audit history.",
  },
  {
    q: "Can administrators inspect what the agent did?",
    a: "Yes. Conversations, tool calls, retrieval events, usage, and case updates are tied to user identity and timestamped for review.",
  },
];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      transition={{ duration: 0.75, delay, ease }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="HR Agent home">
      <span className="wordmark-mark"><span>H</span><span>R</span></span>
      <span>HR Agent</span>
    </Link>
  );
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-nav ${scrolled ? "site-nav--scrolled" : ""}`}>
      <div className="nav-inner">
        <Wordmark />
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#roles">Roles</a>
          <a href="#governance">Governance</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-actions">
          <Link className="text-link desktop-only" href="/login">Sign in</Link>
          <Link className="button button--small" href="/register">Open HR Agent <ArrowRight /></Link>
          <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.nav
            className="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <a href="#product" onClick={() => setOpen(false)}>Product</a>
            <a href="#roles" onClick={() => setOpen(false)}>Roles</a>
            <a href="#governance" onClick={() => setOpen(false)}>Governance</a>
            <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
            <Link href="/login">Sign in</Link>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
      <div className="page-shell hero-layout">
        <div className="hero-copy">
          <motion.div className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <span className="live-dot" /> Enterprise HR, conversationally
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease }}>
            The shortest path<br />to an HR answer is<br /><em>asking for it.</em>
          </motion.h1>
          <motion.p className="hero-lede" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.12, ease }}>
            One role-aware AI assistant for leave, benefits, people data, approvals, and HR cases—connected to live systems and accountable for every action.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22, ease }}>
            <Link className="button" href="/register">Try the assistant <ArrowRight /></Link>
            <a className="button button--ghost" href="#product">See how it works</a>
          </motion.div>
          <motion.div className="trust-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.38 }}>
            <span><ShieldCheck /> Role-aware access</span>
            <span><BadgeCheck /> Citation-backed answers</span>
            <span><Clock3 /> SLA-aware cases</span>
          </motion.div>
        </div>

        <motion.div className="hero-console" initial={{ opacity: 0, x: 35, rotate: 1.5 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: 0.95, delay: 0.15, ease }}>
          <div className="console-topbar">
            <div className="console-user"><span>AM</span><div><strong>Amara Malik</strong><small>Employee · London</small></div></div>
            <span className="secure-pill"><ShieldCheck /> Secure session</span>
          </div>
          <div className="console-body">
            <div className="message message--user">Can I take 6 days off in September?</div>
            <div className="message message--agent">
              <span className="agent-spark"><Sparkles /></span>
              <div>
                <p>You have enough leave. After 6 days, your projected balance will be <strong>9.75 days</strong>.</p>
                <div className="data-card">
                  <div><small>Available now</small><strong>14.5 days</strong></div>
                  <div><small>September accrual</small><strong>+1.25 days</strong></div>
                  <div><small>After request</small><strong>9.75 days</strong></div>
                </div>
                <div className="coverage-card">
                  <span><Users /> Team coverage</span><strong>81%</strong><small>Above 75% minimum</small>
                </div>
                <button className="inline-action">Prepare leave request <ArrowRight /></button>
              </div>
            </div>
          </div>
          <div className="console-input"><span>Ask anything about HR…</span><button><ArrowRight /></button></div>
          <div className="floating-audit"><Fingerprint /><div><strong>Access verified</strong><small>3 tools available for this role</small></div></div>
        </motion.div>
      </div>
      <div className="hero-footer page-shell">
        <span>Connected context</span>
        <div className="system-strip"><span>HRIS</span><i /><span>Policy library</span><i /><span>Case management</span><i /><span>Org directory</span></div>
      </div>
    </section>
  );
}

function ProductSection() {
  const [active, setActive] = useState(0);
  const item = workflows[active];
  const Icon = item.icon;

  return (
    <section className="section product-section" id="product">
      <div className="page-shell">
        <Reveal className="section-heading split-heading">
          <div><span className="section-index">01 / Product</span><h2>One conversation.<br /><em>Every HR workflow.</em></h2></div>
          <p>The interface stays simple because the complexity has somewhere deliberate to go: typed tools, live data, retrieval, permissions, and auditable operations behind every response.</p>
        </Reveal>

        <div className="workflow-layout">
          <Reveal className="workflow-tabs">
            {workflows.map((workflow, index) => {
              const WorkflowIcon = workflow.icon;
              return (
                <button className={active === index ? "active" : ""} key={workflow.eyebrow} onClick={() => setActive(index)}>
                  <span className="workflow-number">0{index + 1}</span>
                  <span className="workflow-icon" style={{ color: workflow.accent }}><WorkflowIcon /></span>
                  <span><small>{workflow.eyebrow}</small><strong>{workflow.question}</strong></span>
                  <ArrowRight />
                </button>
              );
            })}
          </Reveal>
          <Reveal className="workflow-stage" delay={0.12}>
            <div className="stage-label"><span style={{ background: item.accent }} /><span>Live interaction</span><small>Role: {active === 0 ? "Employee" : active === 1 ? "Manager" : "All staff"}</small></div>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <div className="stage-question"><span>“</span>{item.question}</div>
                <div className="stage-route">
                  <div><Icon /><span><small>Tool selected</small><strong>{active === 0 ? "get_leave_balance" : active === 1 ? "analyze_team_coverage" : "search_policy_documents"}</strong></span></div>
                  <div className="route-line"><i /><i /><i /></div>
                  <span className="route-ok"><Check /> Permission granted</span>
                </div>
                <div className="stage-answer"><Sparkles /><p>{item.answer}</p></div>
                <div className="stage-receipt"><Fingerprint /><span><strong>Action receipt</strong><small>User, tool, source, and timestamp recorded</small></span><BadgeCheck /></div>
              </motion.div>
            </AnimatePresence>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="section capabilities" id="governance">
      <div className="page-shell">
        <Reveal className="section-heading split-heading inverse">
          <div><span className="section-index">02 / Infrastructure</span><h2>Useful enough for employees.<br /><em>Serious enough for HR.</em></h2></div>
          <p>A conversational surface only earns trust when the system underneath can explain what it saw, what it did, and why it was allowed to do it.</p>
        </Reveal>
        <div className="capability-grid">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <Reveal className="capability-card" delay={index * 0.06} key={capability.number}>
                <div className="capability-top"><span>{capability.number}</span><Icon /></div>
                <h3>{capability.title}</h3>
                <p>{capability.copy}</p>
              </Reveal>
            );
          })}
        </div>
        <Reveal className="audit-marquee">
          <span>Every answer has context.</span><i />
          <span>Every action has an identity.</span><i />
          <span>Every case has a history.</span>
        </Reveal>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section className="section roles" id="roles">
      <div className="page-shell">
        <Reveal className="roles-intro">
          <span className="section-index">03 / Role-aware by design</span>
          <h2>The same assistant.<br /><em>A different toolbox.</em></h2>
          <p>Permissions are not a filter wrapped around the model. They determine which tools the model can access in the first place.</p>
        </Reveal>
        <Reveal className="permissions-table" delay={0.1}>
          <div className="table-header"><span>Role</span><span>Available capabilities</span><span>Data scope</span></div>
          {roleRows.map(([role, capabilitiesText, scope], index) => (
            <div className="table-row" key={role}>
              <span className="role-name"><i>0{index + 1}</i>{role}</span>
              <span>{capabilitiesText}</span>
              <span><ShieldCheck /> {scope}</span>
            </div>
          ))}
        </Reveal>
        <div className="role-cards">
          <Reveal className="role-note role-note--employee">
            <MessagesSquare /><span><small>Employee experience</small><strong>Ask, understand, act.</strong><p>No portal archaeology. No ticket for a question the system already knows how to answer.</p></span>
          </Reveal>
          <Reveal className="role-note role-note--manager" delay={0.08}>
            <BriefcaseBusiness /><span><small>Manager experience</small><strong>Decisions with context.</strong><p>See availability, conflicts, and policy constraints before approving a request.</p></span>
          </Reveal>
          <Reveal className="role-note role-note--hr" delay={0.16}>
            <Search /><span><small>HR operations</small><strong>One console for the work.</strong><p>People lookup, policy retrieval, cases, documents, audit trails, and usage oversight.</p></span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function GenerativeUI() {
  return (
    <section className="section generative-section">
      <div className="page-shell generative-layout">
        <Reveal className="generative-copy">
          <span className="section-index">04 / Generative interface</span>
          <h2>Sometimes the best answer<br />isn’t <em>another paragraph.</em></h2>
          <p>The model emits a constrained schema. The frontend turns it into a real, interactive component—a leave approval, coverage view, or case form—without letting the model generate code.</p>
          <div className="schema-line"><span>Model</span><ArrowRight /><span>Typed schema</span><ArrowRight /><span>React UI</span></div>
        </Reveal>
        <Reveal className="approval-card" delay={0.12}>
          <div className="approval-head"><div className="avatar">NA</div><span><small>Leave request</small><strong>Noor Al-Harbi</strong></span><span className="status-chip">Pending</span></div>
          <div className="approval-dates"><div><small>FROM</small><strong>14 Sep</strong><span>Monday</span></div><ArrowRight /><div><small>TO</small><strong>19 Sep</strong><span>Saturday</span></div></div>
          <div className="approval-metric"><div><span>Projected team coverage</span><strong>82%</strong></div><div className="meter"><i /></div><small><Check /> 7 points above policy minimum</small></div>
          <div className="approval-actions"><button>Decline</button><button>Approve request <Check /></button></div>
          <div className="component-tag"><span>&lt;LeaveApproval /&gt;</span><small>Rendered from validated JSON</small></div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq" id="faq">
      <div className="page-shell faq-layout">
        <Reveal className="faq-heading"><span className="section-index">05 / Questions</span><h2>Before you hand<br />HR to an agent.</h2></Reveal>
        <Reveal className="faq-list" delay={0.1}>
          {faqs.map((faq, index) => (
            <button className={open === index ? "open" : ""} key={faq.q} onClick={() => setOpen(open === index ? -1 : index)}>
              <span className="faq-question"><i>0{index + 1}</i><strong>{faq.q}</strong><ChevronDown /></span>
              <AnimatePresence initial={false}>
                {open === index ? <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}>{faq.a}</motion.p> : null}
              </AnimatePresence>
            </button>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="page-shell final-cta-inner">
        <Reveal><span className="section-index">HR should feel this simple</span><h2>Stop sending people<br />into the portal.</h2><p>Bring the data, documents, permissions, and actions to the conversation instead.</p></Reveal>
        <Reveal className="final-action" delay={0.1}><Link className="button button--light" href="/register">Open HR Agent <ArrowRight /></Link><span>No credit card required</span></Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer"><div className="page-shell footer-inner"><Wordmark /><p>Enterprise HR AI assistant for self-service and operations.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link></div><span>© {new Date().getFullYear()} HR Agent</span></div></footer>
  );
}

export function LandingPage() {
  return (
    <main className="landing-root">
      <Navigation />
      <Hero />
      <ProductSection />
      <Capabilities />
      <Roles />
      <GenerativeUI />
      <FAQ />
      <FinalCTA />
      <Footer />
      <style jsx global>{`
        .landing-root {
          --paper: #f2efe7;
          --paper-deep: #e6e0d3;
          --ink: #161b17;
          --muted-ink: #5b625b;
          --line: rgba(22, 27, 23, 0.16);
          --signal-orange: #f26a3d;
          --signal-green: #4c7a5b;
          --signal-blue: #3576a8;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--font-geist), sans-serif;
          overflow: hidden;
        }
        .landing-root * { box-sizing: border-box; }
        .landing-root h1, .landing-root h2, .landing-root h3 { font-family: var(--font-instrument), Georgia, serif; font-weight: 400; }
        .landing-root em { color: var(--signal-orange); font-style: italic; }
        .page-shell { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
        .site-nav { position: fixed; inset: 0 0 auto; z-index: 100; border-bottom: 1px solid transparent; transition: background .25s, border-color .25s; }
        .site-nav--scrolled { background: rgba(242,239,231,.88); border-color: var(--line); backdrop-filter: blur(18px); }
        .nav-inner { width: min(1240px, calc(100% - 48px)); height: 74px; margin: auto; display: flex; align-items: center; justify-content: space-between; }
        .wordmark { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 11px; font-weight: 700; letter-spacing: -.03em; }
        .wordmark-mark { width: 34px; height: 34px; border: 1px solid currentColor; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
        .wordmark-mark span { display: grid; place-items: center; font-family: var(--font-geist-mono); font-size: 9px; font-weight: 700; }
        .wordmark-mark span:first-child { background: var(--ink); color: var(--paper); }
        .desktop-nav { display: flex; gap: 32px; margin-left: auto; margin-right: 42px; }
        .desktop-nav a, .text-link, .mobile-nav a { color: inherit; text-decoration: none; font-size: 13px; font-weight: 600; }
        .desktop-nav a { color: var(--muted-ink); }
        .desktop-nav a:hover { color: var(--ink); }
        .nav-actions { display: flex; align-items: center; gap: 20px; }
        .button { min-height: 48px; padding: 0 22px; display: inline-flex; align-items: center; justify-content: center; gap: 12px; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); text-decoration: none; font-size: 13px; font-weight: 700; transition: transform .2s, box-shadow .2s, background .2s; }
        .button svg { width: 16px; height: 16px; }
        .button:hover { transform: translateY(-2px); box-shadow: 5px 5px 0 var(--signal-orange); }
        .button--small { min-height: 40px; padding: 0 16px; }
        .button--ghost { background: transparent; color: var(--ink); }
        .button--ghost:hover { box-shadow: none; background: rgba(22,27,23,.06); }
        .menu-button { display: none; border: 0; background: transparent; padding: 6px; }
        .menu-button svg { width: 22px; }
        .mobile-nav { display: none; overflow: hidden; }
        .hero { position: relative; min-height: 850px; padding: 150px 0 0; border-bottom: 1px solid var(--line); }
        .hero-grid { position: absolute; inset: 0; opacity: .28; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 72px 72px; mask-image: linear-gradient(to bottom, black, transparent 83%); }
        .hero-orbit { position: absolute; border: 1px solid rgba(22,27,23,.11); border-radius: 50%; }
        .hero-orbit--one { width: 660px; height: 660px; right: -210px; top: 60px; }
        .hero-orbit--two { width: 410px; height: 410px; right: -85px; top: 185px; }
        .hero-layout { position: relative; display: grid; grid-template-columns: .92fr 1.08fr; align-items: center; gap: 82px; }
        .kicker, .section-index { font-family: var(--font-geist-mono); text-transform: uppercase; letter-spacing: .13em; font-size: 10px; font-weight: 700; }
        .kicker { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 27px; }
        .live-dot { width: 7px; height: 7px; background: var(--signal-green); border-radius: 50%; box-shadow: 0 0 0 5px rgba(76,122,91,.14); }
        .hero h1 { font-size: clamp(58px, 6vw, 88px); line-height: .95; letter-spacing: -.055em; margin: 0; }
        .hero-lede { max-width: 570px; font-size: 17px; line-height: 1.72; color: var(--muted-ink); margin: 32px 0 0; }
        .hero-actions { display: flex; gap: 12px; margin-top: 36px; }
        .trust-line { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 30px; color: var(--muted-ink); }
        .trust-line span { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 600; }
        .trust-line svg { width: 14px; }
        .hero-console { position: relative; background: #fbfaf6; border: 1px solid var(--ink); box-shadow: 14px 14px 0 rgba(22,27,23,.12); }
        .console-topbar { height: 72px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
        .console-user { display: flex; align-items: center; gap: 11px; }
        .console-user > span, .avatar { width: 37px; height: 37px; border-radius: 50%; background: #d8a44a; display: grid; place-items: center; font-size: 11px; font-weight: 800; }
        .console-user div, .approval-head span { display: flex; flex-direction: column; }
        .console-user strong { font-size: 12px; }
        .console-user small, .secure-pill, .stage-label, .component-tag { font-size: 9px; color: var(--muted-ink); }
        .secure-pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 99px; padding: 7px 9px; }
        .secure-pill svg { width: 12px; }
        .console-body { min-height: 420px; padding: 28px 22px; display: flex; flex-direction: column; gap: 20px; }
        .message { font-size: 13px; line-height: 1.55; }
        .message--user { align-self: flex-end; max-width: 70%; background: var(--ink); color: white; padding: 13px 16px; border-radius: 14px 14px 2px 14px; }
        .message--agent { display: grid; grid-template-columns: 30px 1fr; gap: 10px; max-width: 92%; }
        .agent-spark { width: 30px; height: 30px; border: 1px solid var(--line); display: grid; place-items: center; }
        .agent-spark svg { width: 14px; }
        .message--agent p { margin: 4px 0 14px; }
        .data-card { display: grid; grid-template-columns: repeat(3,1fr); border: 1px solid var(--line); }
        .data-card div { padding: 13px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 3px; }
        .data-card div:last-child { border: 0; background: #eef2e8; }
        .data-card small, .coverage-card small { font-size: 8px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted-ink); }
        .data-card strong { font-size: 13px; }
        .coverage-card { display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; margin-top: 9px; padding: 12px 13px; background: #e9f0f4; }
        .coverage-card span { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; }
        .coverage-card span svg { width: 13px; }
        .coverage-card strong { font-size: 15px; }
        .coverage-card small { grid-column: 1/-1; }
        .inline-action { margin-top: 12px; border: 0; border-bottom: 1px solid var(--ink); background: transparent; padding: 0 0 4px; font-size: 10px; font-weight: 800; display: inline-flex; gap: 7px; align-items: center; }
        .inline-action svg { width: 12px; }
        .console-input { border-top: 1px solid var(--line); height: 63px; margin: 0 15px 15px; padding: 0 9px 0 15px; display: flex; align-items: center; justify-content: space-between; color: #8b8d88; font-size: 11px; background: #f2f0eb; }
        .console-input button { width: 34px; height: 34px; border: 0; background: var(--signal-orange); display: grid; place-items: center; }
        .console-input svg { width: 14px; }
        .floating-audit { position: absolute; right: -26px; bottom: 86px; background: var(--ink); color: white; padding: 13px 16px; display: flex; gap: 10px; align-items: center; box-shadow: 7px 7px 0 var(--signal-orange); }
        .floating-audit > svg { width: 18px; color: #8bb69a; }
        .floating-audit div { display: flex; flex-direction: column; }
        .floating-audit strong { font-size: 10px; }.floating-audit small { font-size: 8px; color: #b8bdb9; }
        .hero-footer { position: relative; margin-top: 78px; border-top: 1px solid var(--line); height: 94px; display: flex; align-items: center; justify-content: space-between; }
        .hero-footer > span { font-family: var(--font-geist-mono); text-transform: uppercase; font-size: 9px; letter-spacing: .12em; }
        .system-strip { display: flex; align-items: center; gap: 16px; color: var(--muted-ink); font-size: 11px; font-weight: 700; }
        .system-strip i { width: 20px; height: 1px; background: var(--line); }
        .section { padding: 130px 0; border-bottom: 1px solid var(--line); }
        .section-heading { margin-bottom: 72px; }
        .split-heading { display: grid; grid-template-columns: 1.35fr .65fr; gap: 80px; align-items: end; }
        .section-index { display: block; margin-bottom: 22px; color: var(--muted-ink); }
        .section-heading h2, .roles-intro h2, .generative-copy h2, .faq-heading h2 { font-size: clamp(46px, 5vw, 70px); line-height: 1; letter-spacing: -.045em; margin: 0; }
        .split-heading > p, .roles-intro > p, .generative-copy > p { color: var(--muted-ink); font-size: 15px; line-height: 1.75; margin: 0; max-width: 480px; }
        .workflow-layout { display: grid; grid-template-columns: .8fr 1.2fr; border: 1px solid var(--ink); min-height: 530px; }
        .workflow-tabs { border-right: 1px solid var(--ink); }
        .workflow-tabs button { width: 100%; min-height: 176px; padding: 24px; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: inherit; display: grid; grid-template-columns: 34px 42px 1fr 20px; gap: 14px; align-items: center; text-align: left; transition: background .2s; }
        .workflow-tabs button:last-child { border-bottom: 0; }
        .workflow-tabs button:hover, .workflow-tabs button.active { background: #fbfaf6; }
        .workflow-tabs button.active { box-shadow: inset 4px 0 0 var(--signal-orange); }
        .workflow-number { font-family: var(--font-geist-mono); font-size: 9px; color: var(--muted-ink); }
        .workflow-icon { width: 40px; height: 40px; border: 1px solid var(--line); display: grid; place-items: center; }
        .workflow-icon svg { width: 18px; }
        .workflow-tabs button > span:nth-child(3) { display: flex; flex-direction: column; gap: 7px; }
        .workflow-tabs small { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted-ink); }
        .workflow-tabs strong { font-family: var(--font-instrument); font-size: 21px; line-height: 1.15; font-weight: 400; }
        .workflow-tabs button > svg { width: 16px; opacity: .35; }
        .workflow-stage { background: #fbfaf6; padding: 38px 44px; }
        .stage-label { display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: .09em; }
        .stage-label > span:first-child { width: 7px; height: 7px; border-radius: 50%; }.stage-label small { margin-left: auto; }
        .stage-question { font-family: var(--font-instrument); font-size: clamp(34px,4vw,52px); line-height: 1.04; letter-spacing: -.035em; max-width: 650px; margin: 55px 0 42px; }
        .stage-question > span { color: var(--signal-orange); margin-right: 6px; }
        .stage-route { border: 1px solid var(--line); padding: 15px 17px; display: flex; align-items: center; gap: 16px; }
        .stage-route > div:first-child { display: flex; gap: 10px; align-items: center; }.stage-route svg { width: 17px; }
        .stage-route span { display: flex; flex-direction: column; }.stage-route small { color: var(--muted-ink); font-size: 8px; }.stage-route strong { font-family: var(--font-geist-mono); font-size: 9px; }
        .route-line { flex: 1; display: flex; gap: 4px; }.route-line i { height: 1px; flex: 1; background: var(--line); }
        .route-ok { flex-direction: row!important; align-items: center; gap: 5px; font-size: 8px; color: var(--signal-green); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }.route-ok svg { width: 12px; }
        .stage-answer { display: grid; grid-template-columns: 24px 1fr; gap: 12px; margin-top: 22px; padding: 20px; background: #edf2eb; }.stage-answer svg { width: 18px; }.stage-answer p { font-size: 14px; line-height: 1.65; margin: 0; }
        .stage-receipt { display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--line); margin-top: 24px; padding-top: 18px; }.stage-receipt > svg { width: 17px; }.stage-receipt span { display: flex; flex-direction: column; }.stage-receipt strong { font-size: 10px; }.stage-receipt small { font-size: 8px; color: var(--muted-ink); }.stage-receipt > svg:last-child { margin-left: auto; color: var(--signal-green); }
        .capabilities { background: var(--ink); color: var(--paper); }
        .inverse .section-index, .inverse > p { color: #aeb4ae; }
        .capability-grid { display: grid; grid-template-columns: repeat(4,1fr); border: 1px solid rgba(242,239,231,.24); }
        .capability-card { min-height: 340px; padding: 26px; border-right: 1px solid rgba(242,239,231,.2); display: flex; flex-direction: column; }
        .capability-card:last-child { border: 0; }.capability-top { display: flex; justify-content: space-between; color: #9da49e; font-family: var(--font-geist-mono); font-size: 9px; }.capability-top svg { width: 22px; color: var(--signal-orange); }
        .capability-card h3 { font-size: 30px; line-height: 1.05; margin: auto 0 20px; }.capability-card p { color: #aeb4ae; font-size: 12px; line-height: 1.65; margin: 0; }
        .audit-marquee { display: flex; align-items: center; justify-content: center; gap: 22px; padding-top: 65px; font-family: var(--font-instrument); font-size: 20px; }.audit-marquee i { width: 5px; height: 5px; background: var(--signal-orange); border-radius: 50%; }
        .roles-intro { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 80px; align-items: end; margin-bottom: 64px; }.roles-intro .section-index { grid-column: 1/-1; }.roles-intro > p { justify-self: end; }
        .permissions-table { border-top: 1px solid var(--ink); }
        .table-header, .table-row { display: grid; grid-template-columns: .7fr 1.5fr .6fr; gap: 24px; align-items: center; padding: 18px 14px; border-bottom: 1px solid var(--line); }
        .table-header { font-family: var(--font-geist-mono); font-size: 8px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted-ink); }
        .table-row { min-height: 88px; font-size: 12px; }.role-name { font-family: var(--font-instrument); font-size: 24px; display: flex; align-items: center; gap: 14px; }.role-name i { font-family: var(--font-geist-mono); font-size: 8px; font-style: normal; color: var(--muted-ink); }.table-row > span:last-child { display: flex; align-items: center; gap: 7px; color: var(--signal-green); font-weight: 700; }.table-row svg { width: 15px; }
        .role-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--ink); margin-top: 64px; border: 1px solid var(--ink); }
        .role-note { min-height: 250px; background: var(--paper); padding: 28px; display: flex; flex-direction: column; justify-content: space-between; }.role-note > svg { width: 26px; }.role-note span { display: flex; flex-direction: column; }.role-note small { font-family: var(--font-geist-mono); text-transform: uppercase; letter-spacing: .1em; font-size: 8px; margin-bottom: 8px; }.role-note strong { font-family: var(--font-instrument); font-size: 27px; font-weight: 400; }.role-note p { color: var(--muted-ink); font-size: 11px; line-height: 1.6; max-width: 300px; }.role-note--employee > svg { color: var(--signal-blue); }.role-note--manager > svg { color: var(--signal-green); }.role-note--hr > svg { color: var(--signal-orange); }
        .generative-section { background: #dcd5c7; }.generative-layout { display: grid; grid-template-columns: .85fr 1.15fr; gap: 120px; align-items: center; }.generative-copy p { margin-top: 30px; }.schema-line { display: flex; align-items: center; gap: 10px; margin-top: 30px; font-family: var(--font-geist-mono); font-size: 8px; text-transform: uppercase; letter-spacing: .08em; }.schema-line svg { width: 13px; }
        .approval-card { background: #fbfaf6; border: 1px solid var(--ink); padding: 26px; box-shadow: 13px 13px 0 rgba(22,27,23,.13); }.approval-head { display: flex; align-items: center; gap: 12px; padding-bottom: 22px; border-bottom: 1px solid var(--line); }.approval-head .avatar { background: #e8b25d; }.approval-head small { font-size: 8px; color: var(--muted-ink); text-transform: uppercase; letter-spacing: .08em; }.approval-head strong { font-size: 12px; }.status-chip { margin-left: auto; padding: 6px 9px; border: 1px solid #d6a447; color: #946b21; font-size: 8px!important; text-transform: uppercase; }
        .approval-dates { display: grid; grid-template-columns: 1fr 30px 1fr; align-items: center; padding: 30px 0; }.approval-dates div { display: flex; flex-direction: column; }.approval-dates div:last-child { text-align: right; }.approval-dates small { font-family: var(--font-geist-mono); font-size: 7px; letter-spacing: .1em; color: var(--muted-ink); }.approval-dates strong { font-family: var(--font-instrument); font-size: 38px; font-weight: 400; }.approval-dates span { font-size: 9px; color: var(--muted-ink); }.approval-dates svg { width: 16px; }
        .approval-metric { background: #edf2eb; padding: 18px; }.approval-metric > div:first-child { display: flex; justify-content: space-between; font-size: 10px; }.approval-metric strong { font-size: 15px; }.meter { height: 6px; background: #d3ddd1; margin: 10px 0; }.meter i { display: block; width: 82%; height: 100%; background: var(--signal-green); }.approval-metric small { display: flex; align-items: center; gap: 4px; color: var(--signal-green); font-size: 8px; }.approval-metric small svg { width: 11px; }
        .approval-actions { display: grid; grid-template-columns: .7fr 1.3fr; gap: 9px; margin-top: 18px; }.approval-actions button { height: 43px; background: transparent; border: 1px solid var(--ink); font-size: 10px; font-weight: 800; }.approval-actions button:last-child { background: var(--ink); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }.approval-actions svg { width: 13px; }.component-tag { margin-top: 18px; display: flex; justify-content: space-between; font-family: var(--font-geist-mono); }
        .faq-layout { display: grid; grid-template-columns: .7fr 1.3fr; gap: 100px; }.faq-list { border-top: 1px solid var(--ink); }.faq-list button { width: 100%; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: inherit; padding: 24px 4px; text-align: left; }.faq-question { display: grid; grid-template-columns: 34px 1fr 24px; gap: 12px; align-items: center; }.faq-question i { font-family: var(--font-geist-mono); font-size: 8px; font-style: normal; color: var(--muted-ink); }.faq-question strong { font-family: var(--font-instrument); font-size: 23px; font-weight: 400; }.faq-question svg { width: 18px; transition: transform .25s; }.faq-list button.open svg { transform: rotate(180deg); }.faq-list p { padding-left: 46px; padding-right: 40px; color: var(--muted-ink); font-size: 12px; line-height: 1.7; overflow: hidden; margin: 14px 0 0; }
        .final-cta { background: var(--signal-orange); color: var(--ink); padding: 110px 0; }.final-cta-inner { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }.final-cta h2 { font-size: clamp(58px,7vw,96px); line-height: .9; letter-spacing: -.05em; margin: 22px 0; }.final-cta p { max-width: 550px; line-height: 1.6; }.final-action { display: flex; flex-direction: column; align-items: center; gap: 10px; }.button--light { background: var(--paper); color: var(--ink); min-width: 210px; }.button--light:hover { box-shadow: 5px 5px 0 var(--ink); }.final-action span { font-size: 9px; font-weight: 700; }
        .site-footer { background: var(--ink); color: var(--paper); padding: 50px 0; }.footer-inner { display: grid; grid-template-columns: .8fr 1.3fr .8fr auto; align-items: center; gap: 30px; }.footer-inner p, .footer-inner > span { color: #aeb4ae; font-size: 10px; }.footer-inner div { display: flex; gap: 18px; }.footer-inner div a { color: #d7dbd7; text-decoration: none; font-size: 10px; }
        @media (max-width: 1000px) {
          .desktop-nav { display: none; }.hero-layout { grid-template-columns: 1fr; }.hero-copy { max-width: 760px; }.hero-console { max-width: 720px; }.hero { padding-top: 130px; }.split-heading, .roles-intro, .generative-layout, .faq-layout { grid-template-columns: 1fr; gap: 38px; }.roles-intro > p { justify-self: start; }.workflow-layout { grid-template-columns: 1fr; }.workflow-tabs { border-right: 0; border-bottom: 1px solid var(--ink); display: grid; grid-template-columns: repeat(3,1fr); }.workflow-tabs button { min-height: 150px; grid-template-columns: 24px 1fr; }.workflow-tabs .workflow-icon, .workflow-tabs button > svg { display: none; }.capability-grid { grid-template-columns: repeat(2,1fr); }.capability-card:nth-child(2) { border-right: 0; }.capability-card:nth-child(-n+2) { border-bottom: 1px solid rgba(242,239,231,.2); }.generative-layout { max-width: 760px; }.faq-heading h2 { max-width: 650px; }.footer-inner { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .page-shell, .nav-inner { width: min(100% - 30px, 1240px); }.site-nav--scrolled { background: rgba(242,239,231,.95); }.desktop-only { display: none; }.nav-actions .button { display: none; }.menu-button { display: grid; }.mobile-nav { display: flex; flex-direction: column; padding: 5px 15px 20px; background: var(--paper); border-bottom: 1px solid var(--line); }.mobile-nav a { padding: 13px 0; border-bottom: 1px solid var(--line); }.hero { min-height: auto; padding-top: 120px; }.hero h1 { font-size: clamp(50px,15vw,68px); }.hero-lede { font-size: 15px; }.hero-actions { align-items: stretch; flex-direction: column; }.trust-line { display: grid; grid-template-columns: 1fr; }.hero-console { margin-top: 15px; box-shadow: 7px 7px 0 rgba(22,27,23,.12); }.console-topbar { padding: 0 13px; }.secure-pill { display: none; }.console-body { min-height: 390px; padding: 22px 13px; }.message--user { max-width: 88%; }.message--agent { max-width: 100%; }.data-card { grid-template-columns: 1fr; }.data-card div { border-right: 0; border-bottom: 1px solid var(--line); }.floating-audit { display: none; }.hero-footer { height: auto; padding: 28px 0; align-items: flex-start; gap: 18px; flex-direction: column; }.system-strip { flex-wrap: wrap; gap: 9px; }.section { padding: 90px 0; }.section-heading h2, .roles-intro h2, .generative-copy h2, .faq-heading h2 { font-size: 48px; }.section-heading { margin-bottom: 46px; }.workflow-tabs { grid-template-columns: 1fr; }.workflow-tabs button { min-height: 105px; grid-template-columns: 30px 1fr; }.workflow-stage { padding: 28px 18px; }.stage-label small { display: none; }.stage-question { margin: 38px 0 30px; font-size: 38px; }.stage-route { align-items: flex-start; flex-direction: column; }.route-line { width: 100%; }.capability-grid { grid-template-columns: 1fr; }.capability-card { min-height: 270px; border-right: 0!important; border-bottom: 1px solid rgba(242,239,231,.2)!important; }.audit-marquee { align-items: flex-start; flex-direction: column; font-size: 18px; }.audit-marquee i { display: none; }.table-header { display: none; }.table-row { grid-template-columns: 1fr; gap: 13px; padding: 22px 8px; }.role-cards { grid-template-columns: 1fr; }.role-note { min-height: 230px; }.approval-card { padding: 18px; box-shadow: 7px 7px 0 rgba(22,27,23,.13); }.approval-dates strong { font-size: 30px; }.component-tag small { display: none; }.faq-question strong { font-size: 20px; }.faq-list p { padding-left: 46px; padding-right: 10px; }.final-cta { padding: 85px 0; }.final-cta-inner { align-items: flex-start; flex-direction: column; }.final-cta h2 { font-size: 62px; }.final-action { width: 100%; }.final-action .button { width: 100%; }.footer-inner { grid-template-columns: 1fr; gap: 24px; }.footer-inner div { flex-wrap: wrap; }
        }
        @media (prefers-reduced-motion: reduce) { .landing-root *, .landing-root *::before, .landing-root *::after { scroll-behavior: auto!important; transition-duration: .01ms!important; animation-duration: .01ms!important; animation-iteration-count: 1!important; } }
      `}</style>
    </main>
  );
}
