"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "capital-forge:onboarding-seen:v1";

type GuideStep = {
  title: string;
  body: string;
  example: string;
};

const onboardingSteps: GuideStep[] = [
  {
    title: "Build an allocation",
    body: "Start on Simulate. Pick a preset, then fine-tune sliders, lock assets, or let auto-balance keep the total at 100%.",
    example: "Lock Bonds at 25% and move the rest of the portfolio around it.",
  },
  {
    title: "Run the model",
    body: "Launch a simulation to see the return distribution, risk cards, and AI commentary for the current mix.",
    example: "Use the live donut chart to spot whether Crypto is crowding out steadier assets.",
  },
  {
    title: "Read the glossary",
    body: "Open the glossary drawer anytime to translate metrics and assumptions into plain language.",
    example: "Sharpe ratio tells you how much return you get per unit of volatility.",
  },
];

const glossarySections = [
  {
    title: "Metrics",
    items: [
      {
        term: "Sharpe ratio",
        definition:
          "Return per unit of volatility. Higher means you are getting paid more for the amount of swinging up and down.",
        example: "A Sharpe of 1.2 is better than 0.4 when the risk level is similar.",
      },
      {
        term: "VaR (5%)",
        definition:
          "A rough loss cutoff for the worst 5% of outcomes. It is not the worst case, just a warning line.",
        example: "If VaR is -8%, then 1 in 20 outcomes is expected to be worse than an 8% loss.",
      },
      {
        term: "CVaR (95%)",
        definition:
          "The average loss inside that worst 5% tail. It shows how bad the bad cases tend to be.",
        example: "If CVaR is -14%, the rough average of the worst outcomes is a 14% loss.",
      },
      {
        term: "Max drawdown",
        definition: "The biggest peak-to-trough decline during the simulated path.",
        example:
          "A 22% drawdown means the portfolio fell 22% from its high point before recovering or ending.",
      },
      {
        term: "Probability of loss over 30%",
        definition: "Chance the portfolio loses more than 30% over the simulation horizon.",
        example: "A 6% value means about 6 out of 100 runs crossed that loss line.",
      },
    ],
  },
  {
    title: "Assumptions",
    items: [
      {
        term: "Mean return",
        definition: "The model's central guess for how much an asset may earn over time.",
        example:
          "A 10% mean return means the engine expects roughly 10% on average, before randomness.",
      },
      {
        term: "Volatility",
        definition:
          "How wide the returns can swing around the mean. Higher volatility means bigger surprises.",
        example: "Crypto usually has higher volatility than cash, so its results spread out more.",
      },
      {
        term: "Correlation",
        definition:
          "How often assets move together. Positive correlation means they rise and fall in the same direction more often.",
        example: "Equity and startups often move together more than equity and cash do.",
      },
      {
        term: "Crash regime",
        definition:
          "A stress scenario where markets stumble, volatility rises, and risky assets can fall together.",
        example: "Think of a sudden recession, not a normal trading week.",
      },
      {
        term: "Shock modifiers",
        definition:
          "Temporary adjustments that nudge means, volatility, or correlations for a specific scenario.",
        example: "A shock can lower expected returns and increase correlation at the same time.",
      },
    ],
  },
];

function getStoredSeenFlag() {
  if (globalThis.window === undefined) return true;
  return globalThis.window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function AppGuide() {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = getStoredSeenFlag();
    const frame = globalThis.window.requestAnimationFrame(() => {
      setHasSeenOnboarding(seen);
      setIsOnboardingOpen(!seen);
      setIsReady(true);
    });

    return () => globalThis.window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (globalThis.window === undefined || !isReady) return;
    globalThis.window.localStorage.setItem(STORAGE_KEY, hasSeenOnboarding ? "true" : "false");
  }, [hasSeenOnboarding, isReady]);

  const currentStep = useMemo(() => onboardingSteps[stepIndex], [stepIndex]);

  function openTour() {
    setStepIndex(0);
    setIsOnboardingOpen(true);
  }

  function openGlossary() {
    setIsGlossaryOpen(true);
  }

  function closeTour() {
    setIsOnboardingOpen(false);
    setHasSeenOnboarding(true);
  }

  function finishTour() {
    setIsOnboardingOpen(false);
    setHasSeenOnboarding(true);
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={openTour}
          className="rounded-full border border-zinc-700 bg-zinc-950/95 px-4 py-2 text-xs font-medium text-zinc-100 shadow-lg shadow-black/20 transition hover:border-amber-400/60 hover:text-amber-100"
        >
          Take tour
        </button>
        <button
          type="button"
          onClick={openGlossary}
          className="rounded-full border border-zinc-700 bg-zinc-950/95 px-4 py-2 text-xs font-medium text-zinc-100 shadow-lg shadow-black/20 transition hover:border-cyan-400/60 hover:text-cyan-100"
        >
          Glossary
        </button>
      </div>

      {isOnboardingOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300">
                  First run guide
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
                  Welcome to CapitalForge
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  A quick walkthrough of how to move from allocation to analysis to comparison.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTour}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
              >
                Skip
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                <p className="text-sm font-medium text-zinc-100">
                  Step {stepIndex + 1} of {onboardingSteps.length}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-50">{currentStep.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{currentStep.body}</p>
              </section>

              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Example</p>
                <p className="mt-3 text-sm leading-6 text-zinc-200">{currentStep.example}</p>
              </section>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {onboardingSteps.map((step, index) => (
                  <span
                    key={step.title}
                    className={`h-2 w-8 rounded-full transition ${
                      index === stepIndex ? "bg-amber-400" : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                  disabled={stepIndex === 0}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                >
                  Back
                </button>
                {stepIndex < onboardingSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1))
                    }
                    className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finishTour}
                    className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300"
                  >
                    Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isGlossaryOpen ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close glossary drawer"
            onClick={() => setIsGlossaryOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
            <div className="sticky top-0 border-b border-zinc-800 bg-zinc-950/95 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Glossary</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                    Metrics and assumptions in plain language
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGlossaryOpen(false)}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6">
              {glossarySections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <article
                        key={item.term}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                      >
                        <h4 className="text-sm font-semibold text-zinc-100">{item.term}</h4>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">{item.definition}</p>
                        <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-400">
                          Example: {item.example}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
