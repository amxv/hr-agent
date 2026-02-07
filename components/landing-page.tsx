"use client";

import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Headphones,
  Lock,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

// ─── Animation helpers ───────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Sticky Nav ──────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Benefits", href: "#benefits" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
] as const;

function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-border/50 border-b bg-background/80 backdrop-blur-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-2" href="/">
          <Image
            alt="AgentDune"
            className="size-7"
            height={28}
            src={mounted && theme === "dark" ? "/icon-dark.svg" : "/icon.svg"}
            width={28}
          />
          <span className="font-semibold text-lg tracking-tight">
            AgentDune
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>

        <Button asChild size="sm">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-24 pb-20">
      {/* Gradient mesh background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.90 0.08 70), transparent), radial-gradient(ellipse 50% 50% at 80% 20%, oklch(0.92 0.05 200), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <FadeUp>
          <h1 className="font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Your employees deserve HR answers in seconds, not days.
          </h1>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
            AgentDune HR Agent is a conversational AI assistant that handles
            leave balances, benefits questions, case filing, and team
            scheduling&nbsp;&mdash; with enterprise-grade access controls and
            full audit trails.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="h-12 px-8 text-base" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="h-12 px-8 text-base"
              size="lg"
              variant="outline"
            >
              <a href="#how-it-works">
                See How It Works <ChevronRight className="ml-1 size-4" />
              </a>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Problem ─────────────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section className="bg-muted/40 py-24" id="problem">
      <div className="mx-auto max-w-3xl px-6">
        <FadeUp>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            HR teams are buried. Employees are waiting.
          </h2>
        </FadeUp>

        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <FadeUp delay={0.1}>
            <p>
              Every organization hits the same wall. Employees have
              questions&nbsp;&mdash; about their leave balance, their benefits
              plan, a paycheck discrepancy&nbsp;&mdash; and the answers sit
              locked inside systems that only HR can access.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p>
              So employees send emails. Open tickets. Wait. Follow up. Wait
              again. Meanwhile, HR teams spend their days answering the same
              questions they answered last week. Leave balances. Enrollment
              deadlines. Case status updates. The work is repetitive, but it
              can&rsquo;t be ignored&nbsp;&mdash; because every unanswered
              question erodes trust.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <p>
              The cost isn&rsquo;t just time. It&rsquo;s the manager who
              can&rsquo;t check team coverage before approving a request.
              It&rsquo;s the HR specialist toggling between three systems to
              look up one employee. It&rsquo;s the new hire who still
              doesn&rsquo;t understand their benefits plan two months in.
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ─── Solution ────────────────────────────────────────────────────────

function SolutionSection() {
  return (
    <section className="py-24" id="solution">
      <div className="mx-auto max-w-3xl px-6">
        <FadeUp>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            One conversation. Every HR answer.
          </h2>
        </FadeUp>

        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <FadeUp delay={0.1}>
            <p>
              AgentDune HR Agent gives your employees a single place to ask HR
              questions and get accurate, policy-aware answers&nbsp;&mdash;
              instantly. Employees type a question in plain language. The agent
              understands the context, checks the right data source, and
              responds with the specific information that employee is authorized
              to see.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p>
              No forms. No portals. No waiting for someone to get back to them.
              For managers and HR staff, the same conversational interface
              unlocks tools that match their role&nbsp;&mdash; from team
              scheduling to employee directory lookups&nbsp;&mdash; with
              permissions enforced automatically.
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ─── Benefits by Role ────────────────────────────────────────────────

const ROLES = [
  {
    icon: User,
    title: "For Employees",
    quote: "\u201CHow many vacation days do I have left?\u201D",
    description:
      "Employees ask questions in their own words and get immediate answers about their leave balance, benefits enrollment, accrual schedules, and carryover rules.",
    capabilities: [
      "Check vacation, sick, and personal leave balances",
      "View benefits plans, premiums, and enrolled dependents",
      "Compare available benefits plans side by side",
      "File HR support cases with automatic categorization",
      "Check the status and history of any open case",
      "Ask projection questions about future balances",
    ],
  },
  {
    icon: Users,
    title: "For Managers",
    quote: "\u201CWho on my team is off next week?\u201D",
    description:
      "Managers get a real-time view of team availability, pending leave requests, and coverage gaps \u2014 without opening a separate scheduling tool.",
    capabilities: [
      "View team schedules and daily coverage percentages",
      "Identify critical dates where coverage drops below thresholds",
      "See all pending leave requests with conflict analysis",
      "Approve or deny requests with a single message",
      "Get alerts when approving creates coverage gaps",
    ],
  },
  {
    icon: Shield,
    title: "For HR Staff",
    quote: "\u201CLook up Noor Al-Harbi\u2019s employment status.\u201D",
    description:
      "HR specialists search the employee directory, check org structures, review work authorization details, and track employment status changes \u2014 all from one interface.",
    capabilities: [
      "Search employees by name, email, or employee ID",
      "View org charts with manager chains and direct reports",
      "Check employment status and work authorization",
      "Track visa expiry dates and renewal requirements",
      "Access location details, tenure, and team assignments",
    ],
  },
] as const;

function BenefitsSection() {
  return (
    <section className="bg-muted/40 py-24" id="benefits">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUp>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Built for every role in your organization.
          </h2>
        </FadeUp>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {ROLES.map((role, i) => (
            <FadeUp key={role.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-xl border bg-background p-8">
                <role.icon className="mb-4 size-8 text-muted-foreground" />
                <h3 className="font-semibold text-lg">{role.title}</h3>
                <p className="mt-2 font-display text-muted-foreground italic">
                  {role.quote}
                </p>
                <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                  {role.description}
                </p>
                <ul className="mt-6 space-y-2">
                  {role.capabilities.map((cap) => (
                    <li
                      key={cap}
                      className="flex items-start gap-2 text-sm"
                    >
                      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────

const STEPS = [
  {
    number: "1",
    title: "Employee asks a question.",
    description:
      'They type naturally \u2014 "What medical plan am I on?" or "File a ticket about my missing bonus." No special syntax. No menus to navigate.',
  },
  {
    number: "2",
    title: "The agent checks permissions and retrieves the answer.",
    description:
      "Role-based access controls determine what data the employee can see. The agent pulls the relevant information from your HR systems in real time and assembles an accurate, specific response.",
  },
  {
    number: "3",
    title: "The employee gets an answer \u2014 and can keep the conversation going.",
    description:
      "Responses include the exact data they asked for. Follow-up questions are handled in context. If the issue requires human intervention, a case is filed automatically.",
  },
] as const;

function HowItWorksSection() {
  return (
    <section className="py-24" id="how-it-works">
      <div className="mx-auto max-w-4xl px-6">
        <FadeUp>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Three steps from question to answer.
          </h2>
        </FadeUp>

        <div className="relative mt-16">
          {/* Connecting line */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-6 hidden w-px bg-border md:block"
          />

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <FadeUp key={step.number} delay={i * 0.15}>
                <div className="flex gap-6">
                  <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border bg-background font-display text-xl">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Enterprise Features ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: Lock,
    title: "Role-Based Access Control",
    description:
      "Permissions enforced at every layer. Employees see only their own data. Managers access team-level tools. HR staff unlock directory capabilities.",
  },
  {
    icon: ClipboardCheck,
    title: "Full Audit Trails",
    description:
      "Every action is logged with timestamps, user identity, and operation details. Case updates, HR lookups, and admin operations maintain a complete history.",
  },
  {
    icon: Clock,
    title: "SLA Tracking and Compliance",
    description:
      "HR cases are automatically categorized and assigned SLA targets. The system tracks resolution due dates, hours remaining, and compliance status.",
  },
  {
    icon: Settings,
    title: "Admin Dashboard",
    description:
      "A centralized control panel for managing users, roles, credit allocations, and system documents \u2014 all from a single interface.",
  },
  {
    icon: Zap,
    title: "Real-Time Data Integration",
    description:
      "The agent pulls live data from your HR systems. Leave balances reflect today\u2019s accruals. Benefits enrollments show current coverage.",
  },
  {
    icon: BookOpen,
    title: "Document Knowledge Base",
    description:
      "Upload your employee handbook, benefits guides, and policies. The agent uses semantic search to find relevant passages with source citations.",
  },
] as const;

function EnterpriseFeaturesSection() {
  return (
    <section className="bg-muted/40 py-24" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUp>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Enterprise-grade from day one.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Built for organizations that take security, compliance, and
            operational control seriously. These aren&rsquo;t
            add-ons&nbsp;&mdash; they&rsquo;re foundational.
          </p>
        </FadeUp>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FadeUp key={feature.title} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-xl border bg-background p-6">
                <feature.icon className="mb-3 size-6 text-muted-foreground" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Use Cases ───────────────────────────────────────────────────────

const USE_CASES = [
  {
    icon: Headphones,
    title: "Employee Self-Service",
    description:
      "Reduce repetitive HR inquiries by giving employees direct access to their data through natural conversation.",
  },
  {
    icon: Users,
    title: "Manager Decision Support",
    description:
      "Give managers coverage data and approval tools to make informed scheduling decisions.",
  },
  {
    icon: Settings,
    title: "HR Operations",
    description:
      "Free HR staff from lookup-and-respond cycles so they can focus on strategic work.",
  },
  {
    icon: Shield,
    title: "Compliance and Governance",
    description:
      "Maintain auditable records of every HR interaction with role-based data access and SLA compliance.",
  },
  {
    icon: Search,
    title: "New Employee Onboarding",
    description:
      "Help new hires understand benefits, leave policies, and company procedures from day one.",
  },
] as const;

function UseCasesSection() {
  return (
    <section className="py-24" id="use-cases">
      <div className="mx-auto max-w-4xl px-6">
        <FadeUp>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Where AgentDune HR Agent fits.
          </h2>
        </FadeUp>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {USE_CASES.map((uc, i) => (
            <FadeUp key={uc.title} delay={i * 0.08}>
              <div className="flex gap-4 rounded-xl border bg-background p-6">
                <uc.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-sm">{uc.title}</h3>
                  <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {uc.description}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "How does the agent know what each employee is allowed to see?",
    answer:
      "Every tool checks the user\u2019s role before returning data. Employees see their own information. Managers see team-level data. HR staff access the employee directory. These permissions are enforced at the system level \u2014 not through UI hiding.",
  },
  {
    question: "Can employees access other employees\u2019 data?",
    answer:
      "No. The agent enforces strict data isolation. An employee asking about leave balances will only ever see their own. Attempting to access another employee\u2019s data returns a permission denied response.",
  },
  {
    question: "What happens when an employee\u2019s question requires human help?",
    answer:
      "The agent files an HR case automatically, categorizes it based on the description, assigns it to the appropriate team, and attaches an SLA. The employee gets a case number and can check status through the same conversation.",
  },
  {
    question: "How does the document knowledge base work?",
    answer:
      "Admins upload policy documents, handbooks, and guides. The system processes them for semantic search \u2014 meaning employees can ask questions in their own words and get relevant passages back, with citations pointing to the exact source and page.",
  },
  {
    question: "What kind of HR data does the agent integrate with?",
    answer:
      "Leave balances (vacation, sick, personal), benefits enrollments (medical, dental, vision, retirement), HR cases with full workflow tracking, team schedules and availability, employee directory and org charts, and uploaded policy documents.",
  },
  {
    question: "Is there an admin dashboard?",
    answer:
      "Yes. Admins manage users, roles, credit allocations, uploaded documents, and system configuration from a centralized dashboard with search, filtering, and real-time status indicators.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-muted/40 py-24" id="faq">
      <div className="mx-auto max-w-3xl px-6">
        <FadeUp>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Common questions.
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Accordion className="mt-12" collapsible type="single">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-15"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 60%, oklch(0.88 0.10 70), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <FadeUp>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Give your employees the HR experience they&rsquo;ve been asking for.
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground leading-relaxed">
            AgentDune HR Agent turns your HR knowledge, policies, and employee
            data into an always-available conversational assistant&nbsp;&mdash;
            with the access controls, audit trails, and compliance features your
            organization requires.
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="h-12 px-8 text-base" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="h-12 px-8 text-base"
              size="lg"
              variant="outline"
            >
              <a href="#how-it-works">
                See How It Works <ChevronRight className="ml-1 size-4" />
              </a>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function Footer() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="border-t py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image
            alt="AgentDune"
            className="size-5"
            height={20}
            src={mounted && theme === "dark" ? "/icon-dark.svg" : "/icon.svg"}
            width={20}
          />
          <span className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} AgentDune. All rights reserved.
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/terms"
          >
            Terms
          </Link>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/login"
          >
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <StickyNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <BenefitsSection />
        <HowItWorksSection />
        <EnterpriseFeaturesSection />
        <UseCasesSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
