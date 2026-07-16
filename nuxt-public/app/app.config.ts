export default defineAppConfig({
  icon: {
    // 默认图标尺寸
    size: '1.25rem',
    // 默认 CSS 类
    class: 'nuxt-icon'
  },
  // Nuxt UI v4 运行时主题配置（Phase 0 基础映射，后续阶段补全）
  //
  // 颜色语义映射（迁移自 NaiveUI themeOverrides）：
  //   原 primaryColor: #0d6efd → ui.colors.primary = 'blue'
  //   hover/pressed 由 Nuxt UI 默认色阶自动处理（hover=400，active=600）
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'purple',
      neutral: 'zinc',
      info: 'sky',
      success: 'green',
      warning: 'amber',
      error: 'red'
    },
    prose: {
      h1: {
        slots: {
          base: 'scroll-mt-20 text-4xl md:text-5xl font-extrabold text-highlighted mb-8 leading-none'
        }
      },
      h2: {
        slots: {
          base: 'scroll-mt-20 text-3xl font-bold text-highlighted mt-12 mb-[1.25rem] leading-tight',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      h3: {
        slots: {
          base: 'scroll-mt-20 text-2xl font-bold text-highlighted mt-10 mb-3 leading-snug',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      h4: {
        slots: {
          base: 'scroll-mt-20 text-xl font-bold text-highlighted mt-8 mb-3 leading-snug',
          link: 'group inline-flex items-center gap-2 no-underline text-highlighted hover:text-[var(--accent-primary)]',
          leading: 'opacity-0 group-hover:opacity-100 transition-opacity',
          leadingIcon: 'size-4 text-muted'
        }
      },
      p: {
        base: 'my-[1.25rem] leading-8 text-toned'
      },
      a: {
        base: 'font-semibold text-highlighted underline decoration-muted underline-offset-4 transition-colors hover:text-[var(--accent-primary)] hover:decoration-[var(--accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--accent-primary)_35%,transparent)]'
      },
      ul: {
        base: 'my-[1.25rem] list-disc ps-7 space-y-2 text-toned marker:text-muted'
      },
      ol: {
        base: 'my-[1.25rem] list-decimal ps-7 space-y-2 text-toned marker:text-muted marker:font-normal'
      },
      li: {
        base: 'leading-8 ps-1'
      },
      blockquote: {
        base: 'my-7 border-s-4 border-muted ps-5 text-highlighted italic [&_p]:my-0 [&_strong]:text-highlighted'
      },
      table: {
        slots: {
          root: 'my-8 w-full overflow-x-auto',
          base: 'w-full min-w-full border-collapse text-sm'
        }
      },
      thead: {
        base: 'border-b border-muted'
      },
      th: {
        base: 'border-b border-muted px-3 py-2 text-start font-semibold text-highlighted'
      },
      td: {
        base: 'border-b border-muted px-3 py-2 text-toned align-top'
      },
      code: {
        base: 'rounded px-1.5 py-0.5 font-mono text-[0.875em] font-semibold',
        variants: {
          color: {
            neutral: 'bg-elevated text-highlighted'
          }
        },
        defaultVariants: {
          color: 'neutral'
        }
      },
      pre: {
        slots: {
          root: 'article-code-block relative my-7',
          base: 'overflow-x-auto rounded-lg bg-slate-950 px-4 py-4 text-sm leading-7 text-slate-200',
          copy: 'absolute top-3 end-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          header: 'flex items-center gap-2 rounded-t-lg border-[1px] border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300',
          filename: 'font-semibold text-slate-200',
          icon: 'size-4 text-slate-400'
        }
      },
      img: {
        slots: {
          base: 'my-8 mx-auto rounded-lg border-[1px] border-muted',
          overlay: 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
          content: 'fixed inset-0 z-50 flex items-center justify-center p-4',
          zoomedImage: 'max-h-[90vh] max-w-[90vw] rounded-lg shadow-xl'
        }
      },
      hr: {
        base: 'my-10 border-0 border-t border-muted'
      }
    }
  }
})
