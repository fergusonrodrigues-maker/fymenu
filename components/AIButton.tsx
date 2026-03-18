'use client'

import { useState } from 'react'

interface AIButtonProps {
  onClick: () => void
  isLoading?: boolean
  children?: React.ReactNode
  variant?: 'default' | 'secondary'
}

export default function AIButton({
  onClick,
  isLoading = false,
  children = 'Gerar com IA',
  variant = 'default'
}: AIButtonProps) {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = () => {
    if (isLoading) return
    setIsClicked(true)
    onClick()
    setTimeout(() => setIsClicked(false), 600)
  }

  const label = (children?.toString() ?? 'Gerar com IA').trim()

  return (
    <div className="btn-wrapper">
      <button
        className={`btn ${isClicked ? 'active' : ''} ${variant === 'secondary' ? 'secondary' : ''}`}
        onClick={handleClick}
        disabled={isLoading}
        type="button"
      >
        <svg
          className="btn-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2" />
        </svg>
        <span className="txt-wrapper">
          <span className="txt-1">
            {Array.from(label).map((char, i) => (
              <span key={i} className="btn-letter">
                {char}
              </span>
            ))}
          </span>
          <span className="txt-2">
            {Array.from(label).map((char, i) => (
              <span key={i} className="btn-letter">
                {char}
              </span>
            ))}
          </span>
        </span>
      </button>
    </div>
  )
}
