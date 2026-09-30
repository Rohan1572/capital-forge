/**
 * Recharts exports its `ValueType` only as a `.d.ts` with no runtime module, so
 * importing it directly breaks the bundler.
 */
export type ChartTooltipValue = number | string | ReadonlyArray<number | string>;
