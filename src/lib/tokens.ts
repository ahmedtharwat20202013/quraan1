/**
 * Unified Design System Tokens for styling consistency
 */
export const tokens = {
  // Consistent Typography sizes
  text: {
    xs: 'text-xs',      // 12px - labels / metadata
    sm: 'text-sm',      // 14px - secondary description / controls
    base: 'text-base',  // 16px - standard body reading text
    lg: 'text-lg',      // 18px - card headings
    xl: 'text-xl',      // 20px - section / page subheadings
    xxl: 'text-2xl',    // 24px - main category headings
    huge: 'text-3xl',   // 30px - large counters / titles
    giant: 'text-4xl',  // 36px - epic screen readouts
  },

  // Padding & gap layout spacing
  spacing: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Borders radius for cards & containers
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    xxl: 'rounded-[2rem]',
  },

  // Unified shadow tokens for borderless depth
  shadow: {
    sm: 'shadow-sm shadow-black/5',
    md: 'shadow-md shadow-black/10',
    lg: 'shadow-lg shadow-black/15',
    xl: 'shadow-xl shadow-black/25',
    inner: 'shadow-inner shadow-black/5',
  }
};
