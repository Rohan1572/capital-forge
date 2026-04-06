type AiDisclaimerBannerProps = Readonly<{
  message: string;
}>;

export function AiDisclaimerBanner({ message }: AiDisclaimerBannerProps) {
  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
      {message}
    </div>
  );
}
