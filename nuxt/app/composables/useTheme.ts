export const useTheme = () => {
  const isDarkMode = useState<boolean>('isDarkMode', () => false)

  const applyTheme = (): void => {
    if (process.client) {
      document.documentElement.classList.toggle('dark', isDarkMode.value)
      // 兼容期：保留 legacy class，真实主题源仅为 `.dark`
      document.documentElement.classList.toggle('dark-theme', isDarkMode.value)
      document.documentElement.classList.toggle('light-theme', !isDarkMode.value)
      document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
      document.documentElement.style.colorScheme = isDarkMode.value ? 'dark' : 'light'
    }
  }

  const initTheme = (): void => {
    if (process.client) {
      const savedTheme = localStorage.getItem('darkMode')
      if (savedTheme !== null) {
        isDarkMode.value = savedTheme === 'true'
      } else {
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      applyTheme()
    }
  }

  const toggleTheme = (): void => {
    isDarkMode.value = !isDarkMode.value
    if (process.client) {
      localStorage.setItem('darkMode', isDarkMode.value.toString())
      applyTheme()
    }
  }

  return {
    isDarkMode,
    initTheme,
    toggleTheme
  }
}
