/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/features/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue'
  ],
  darkMode: 'class', // 支持暗色模式
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            // 基础颜色配置
            '--tw-prose-body': theme('colors.gray.700'),
            '--tw-prose-headings': theme('colors.gray.900'),
            '--tw-prose-lead': theme('colors.gray.600'),
            '--tw-prose-links': theme('colors.pink.600'),
            '--tw-prose-bold': theme('colors.gray.900'),
            '--tw-prose-counters': theme('colors.gray.500'),
            '--tw-prose-bullets': theme('colors.gray.300'),
            '--tw-prose-hr': theme('colors.gray.200'),
            '--tw-prose-quotes': theme('colors.gray.900'),
            '--tw-prose-quote-borders': theme('colors.pink.300'),
            '--tw-prose-captions': theme('colors.gray.500'),
            '--tw-prose-kbd': theme('colors.gray.900'),
            '--tw-prose-kbd-shadows': '17 24 39',
            '--tw-prose-code': theme('colors.pink.600'),
            '--tw-prose-pre-code': theme('colors.gray.200'),
            '--tw-prose-pre-bg': theme('colors.gray.800'),
            '--tw-prose-th-borders': theme('colors.gray.300'),
            '--tw-prose-td-borders': theme('colors.gray.200'),

            // 暗色模式颜色
            '--tw-prose-invert-body': theme('colors.gray.300'),
            '--tw-prose-invert-headings': theme('colors.white'),
            '--tw-prose-invert-lead': theme('colors.gray.400'),
            '--tw-prose-invert-links': theme('colors.pink.400'),
            '--tw-prose-invert-bold': theme('colors.white'),
            '--tw-prose-invert-counters': theme('colors.gray.400'),
            '--tw-prose-invert-bullets': theme('colors.gray.600'),
            '--tw-prose-invert-hr': theme('colors.gray.700'),
            '--tw-prose-invert-quotes': theme('colors.gray.100'),
            '--tw-prose-invert-quote-borders': theme('colors.pink.500'),
            '--tw-prose-invert-captions': theme('colors.gray.400'),
            '--tw-prose-invert-kbd': theme('colors.white'),
            '--tw-prose-invert-kbd-shadows': '255 255 255',
            '--tw-prose-invert-code': theme('colors.pink.400'),
            '--tw-prose-invert-pre-code': theme('colors.gray.300'),
            '--tw-prose-invert-pre-bg': 'rgb(30 30 30)',
            '--tw-prose-invert-th-borders': theme('colors.gray.600'),
            '--tw-prose-invert-td-borders': theme('colors.gray.700'),

            // 自定义样式
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            },
            code: {
              fontWeight: '500',
              backgroundColor: theme('colors.gray.100'),
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem'
            },
            'a:hover': {
              color: theme('colors.pink.500'),
              textDecoration: 'underline'
            },
            // 行内代码暗色模式
            '.dark code': {
              backgroundColor: theme('colors.gray.800')
            },
            // 代码块样式
            pre: {
              borderRadius: '0.5rem',
              padding: '1rem',
              overflowX: 'auto'
            },
            // 引用块样式
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: theme('colors.pink.400'),
              fontStyle: 'normal',
              backgroundColor: theme('colors.gray.50'),
              padding: '1rem',
              borderRadius: '0 0.5rem 0.5rem 0'
            },
            '.dark blockquote': {
              backgroundColor: theme('colors.gray.800')
            },
            // 表格样式
            table: {
              width: '100%',
              borderCollapse: 'collapse'
            },
            'thead th': {
              backgroundColor: theme('colors.gray.100'),
              fontWeight: '600'
            },
            '.dark thead th': {
              backgroundColor: theme('colors.gray.700')
            },
            // 图片样式
            img: {
              borderRadius: '0.5rem',
              margin: '1.5rem auto'
            },
            // 标题锚点
            'h1, h2, h3, h4, h5, h6': {
              position: 'relative'
            }
          }
        },
        // 大尺寸变体
        lg: {
          css: {
            fontSize: '1.125rem',
            lineHeight: '1.75'
          }
        },
        // 博客专用变体
        blog: {
          css: {
            maxWidth: 'none',
            h1: {
              fontSize: '2.25rem',
              marginBottom: '1rem'
            },
            h2: {
              fontSize: '1.75rem',
              marginTop: '2rem',
              marginBottom: '0.75rem'
            },
            h3: {
              fontSize: '1.5rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem'
            },
            p: {
              lineHeight: '1.8',
              marginBottom: '1.25rem'
            }
          }
        }
      })
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}
