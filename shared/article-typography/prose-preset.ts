export const articleProsePreset = {
  h1: {
    slots: {
      base: 'scroll-mt-20 mb-6 text-3xl font-bold leading-tight text-[color:var(--article-prose-heading)] md:text-4xl'
    }
  },
  h2: {
    slots: {
      base: 'article-prose-heading article-prose-heading--h2 scroll-mt-20 mt-10 mb-4 text-[1.5rem] font-bold leading-snug text-[color:var(--article-prose-heading)]',
      link: 'group inline-flex items-center gap-2 text-inherit no-underline',
      leading: 'opacity-0 transition-opacity group-hover:opacity-100',
      leadingIcon: 'size-4 text-[color:var(--article-prose-muted)]'
    }
  },
  h3: {
    slots: {
      base: 'article-prose-heading article-prose-heading--h3 scroll-mt-20 mt-8 mb-3 text-[1.25rem] font-semibold leading-snug text-[color:var(--article-prose-heading)]',
      link: 'group inline-flex items-center gap-2 text-inherit no-underline',
      leading: 'opacity-0 transition-opacity group-hover:opacity-100',
      leadingIcon: 'size-4 text-[color:var(--article-prose-muted)]'
    }
  },
  h4: { slots: { base: 'scroll-mt-20 mt-7 mb-3 text-[1.1rem] font-semibold leading-snug text-[color:var(--article-prose-heading)]' } },
  p: { base: 'my-[0.95rem] text-[1rem] leading-[1.78] text-[color:var(--article-prose-text)]' },
  a: { base: 'font-medium text-[color:var(--article-prose-link)] underline decoration-[color:var(--article-prose-border)] underline-offset-4 transition-colors hover:text-[color:var(--article-prose-accent)] hover:decoration-[color:var(--article-prose-accent)]' },
  ul: { base: 'my-[0.95rem] list-disc space-y-1.5 ps-6 text-[color:var(--article-prose-text)] marker:text-[color:var(--article-prose-muted)]' },
  ol: { base: 'my-[0.95rem] list-decimal space-y-1.5 ps-6 text-[color:var(--article-prose-text)] marker:text-[color:var(--article-prose-muted)]' },
  li: { base: 'ps-1 leading-[1.78]' },
  blockquote: { base: 'my-6 border-s-[3px] border-[color:var(--article-prose-border)] ps-4 text-[color:var(--article-prose-text)] [&_p]:my-0' },
  table: { slots: { root: 'my-7 w-full overflow-x-auto', base: 'w-full min-w-full border-collapse text-sm' } },
  thead: { base: 'border-b border-[color:var(--article-prose-border)]' },
  th: { base: 'border-b border-[color:var(--article-prose-border)] px-3 py-2 text-start font-semibold text-[color:var(--article-prose-heading)]' },
  td: { base: 'border-b border-[color:var(--article-prose-border)] px-3 py-2 align-top text-[color:var(--article-prose-text)]' },
  code: { base: 'rounded-sm bg-[color:var(--article-prose-surface)] px-1 py-0.5 font-mono text-[0.875em] font-medium text-[color:var(--article-prose-heading)]' },
  pre: { slots: { root: 'article-code-block relative my-6', base: 'overflow-x-auto rounded-md bg-zinc-950 px-4 py-4 text-sm leading-7 text-zinc-200', copy: 'absolute end-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100', header: 'flex items-center gap-2 rounded-t-md border border-b-0 border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300', filename: 'font-medium text-zinc-100', icon: 'size-4 text-zinc-400' } },
  img: { slots: { base: 'my-7 mx-auto rounded-md border border-[color:var(--article-prose-border)]', overlay: 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm', content: 'fixed inset-0 z-50 flex items-center justify-center p-4', zoomedImage: 'max-h-[90vh] max-w-[90vw] rounded-md' } },
  hr: { base: 'my-8 border-0 border-t border-[color:var(--article-prose-border)]' }
} as const
