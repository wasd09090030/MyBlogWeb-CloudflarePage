/**
 * 性能监控插件
 *
 * 跟踪关键性能指标：
 * - Worker 任务耗时
 * - 路由导航耗时
 * - Web Vitals (LCP, FID, CLS)
 * - 资源加载耗时
 */

export default defineNuxtPlugin((nuxtApp) => {
  if (!process.client) return

  const router = useRouter()

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  // =========================================================
  // 路由导航性能跟踪
  // =========================================================

  let navigationStart = 0

  router.beforeEach((to, from) => {
    if (from.name) {
      navigationStart = performance.now()
      performance.mark('route-navigation-start')
    }
  })

  router.afterEach((to, from) => {
    if (from.name && navigationStart > 0) {
      const duration = performance.now() - navigationStart

      performance.mark('route-navigation-end')
      try {
        performance.measure(
          `route: ${from.path} → ${to.path}`,
          'route-navigation-start',
          'route-navigation-end'
        )
      } catch (e) {
        // 静默处理重复 mark
      }

      // 仅在开发环境或耗时过长时输出
      if (process.env.NODE_ENV === 'development' || duration > 500) {
        console.log(
          `[Perf] 路由导航 ${from.path} → ${to.path}: ${duration.toFixed(1)}ms`,
          duration > 1000 ? '⚠️ 较慢' : duration > 500 ? '🟡 一般' : '✅'
        )
      }

      navigationStart = 0
    }
  })

  // =========================================================
  // Web Vitals 监控
  // =========================================================

  if (typeof PerformanceObserver !== 'undefined') {
    // LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          console.log(`[Perf] LCP: ${lastEntry.startTime.toFixed(1)}ms`,
            lastEntry.startTime > 2500 ? '⚠️ 需优化' : '✅')
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (e) {
      // LCP observer not supported
    }

    // Long Tasks（>50ms 的任务）
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            console.warn(
              `[Perf] 长任务检测: ${entry.duration.toFixed(1)}ms`,
              entry.name
            )
          }
        }
      })
      longTaskObserver.observe({ type: 'longtask', buffered: true })
    } catch (e) {
      // Long task observer not supported
    }
  }

  // =========================================================
  // 提供性能工具
  // =========================================================

  return {
    provide: {
      perfMonitor: {
        /**
         * 标记性能起点
         * @param {string} label - 标记名称
         */
        mark(label: string) {
          performance.mark(label)
        },

        /**
         * 测量两个标记之间的耗时
         * @param {string} label - 测量名称
         * @param {string} startMark - 起点标记
         * @param {string} endMark - 终点标记（不传则自动创建）
         * @returns {number} 耗时（毫秒）
         */
        measure(label: string, startMark: string, endMark?: string) {
          if (!endMark) {
            endMark = `${startMark}-end`
            performance.mark(endMark)
          }
          try {
            const measure = performance.measure(label, startMark, endMark)
            return measure.duration
          } catch (e) {
            return -1
          }
        },

        /**
         * 包装异步函数并自动计时
         * @param {string} label - 操作名称
         * @param {Function} fn - 异步函数
         * @returns {Promise<*>}
         */
        async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
          const start = performance.now()
          try {
            const result = await fn()
            const duration = performance.now() - start
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Perf] ${label}: ${duration.toFixed(1)}ms`)
            }
            return result
          } catch (e: unknown) {
            const duration = performance.now() - start
            console.error(`[Perf] ${label} 失败 (${duration.toFixed(1)}ms):`, getErrorMessage(e))
            throw e
          }
        }
      }
    }
  }
})
