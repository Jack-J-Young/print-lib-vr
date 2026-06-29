// Single palette for the input layer — tool brand colors plus the shared
// idle/activated beam colors. Referenced by the tools and the controllers.
export const TOOL_COLORS = {
  grab:      0x4488ff,
  interact:  0x44ff44,
  idle:      0x4444aa,
  activated: 0xffffff,
} as const;
