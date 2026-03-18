'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  defaultTheme?: 'light' | 'dark'
  storageKey?: string
  onThemeChange?: (theme: 'light' | 'dark') => void
}

export default function ThemeToggle({
  defaultTheme = 'dark',
  storageKey = 'fymenu-theme',
  onThemeChange
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const savedTheme = localStorage.getItem(storageKey)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    let theme: 'light' | 'dark' = defaultTheme

    if (savedTheme) {
      theme = savedTheme as 'light' | 'dark'
    } else if (prefersDark) {
      theme = 'dark'
    }

    setIsDark(theme === 'dark')
    applyTheme(theme)
  }, [])

  const applyTheme = (theme: 'light' | 'dark') => {
    const htmlElement = document.documentElement
    htmlElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(storageKey, theme)
    onThemeChange?.(theme)
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    applyTheme(newTheme)
  }

  if (!mounted) {
    return (
      <div className="ui-switch">
        <input type="checkbox" disabled aria-label="Loading theme toggle" />
        <div className="slider">
          <div className="circle"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="ui-switch"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle between light and dark theme"
    >
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        aria-label="Toggle theme"
      />
      <div className="slider">
        <div className="circle"></div>
      </div>
    </div>
  )
}
