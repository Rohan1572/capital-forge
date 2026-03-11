import { DEBATE_AGENT_PROFILES } from "@/lib/aiPrompts";
import type { DebateAgentCall } from "@/lib/debateEngine";
import { parseDebateSections } from "@/lib/debateEngine";

type AIDebatePanelProps = {
  calls: DebateAgentCall[];
};

const roleAccent: Record<DebateAgentCall["role"], string> = {
  conservative: "border-amber-500/40 bg-amber-950/30 text-amber-100",
  growth: "border-emerald-500/40 bg-emerald-950/30 text-emerald-100",
  risk: "border-rose-500/40 bg-rose-950/30 text-rose-100",
};

const roleBadge: Record<DebateAgentCall["role"], string> = {
  conservative: "bg-amber-500/20 text-amber-200",
  growth: "bg-emerald-500/20 text-emerald-200",
  risk: "bg-rose-500/20 text-rose-200",
};

function renderList(items: string[], fallback: string) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-300">{fallback}</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-zinc-100">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function AIDebatePanel({ calls }: AIDebatePanelProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">AI Debate Panel</h2>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300">
          Structured Debate Output
        </span>
      </header>

      <div className="mt-5 space-y-4">
        {calls.map((call, index) => {
          const profile = DEBATE_AGENT_PROFILES[call.role];
          const sections = parseDebateSections(call.response);

          return (
            <article
              key={`${call.role}-${index}`}
              className={`rounded-xl border px-4 py-4 ${roleAccent[call.role]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm uppercase tracking-wide text-zinc-300">Agent {index + 1}</p>
                  <h3 className="text-base font-semibold text-zinc-100">{profile.name}</h3>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${roleBadge[call.role]}`}
                >
                  {profile.focus}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                    Opening Statements
                  </h4>
                  <div className="mt-2">
                    {renderList(sections.openingStatements, "No opening statements provided.")}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                    Counter Arguments
                  </h4>
                  <div className="mt-2">
                    {renderList(sections.counterArguments, "No counter arguments provided.")}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                    Final Recommendation
                  </h4>
                  <div className="mt-2">
                    {renderList(sections.finalRecommendation, "No final recommendation provided.")}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
