'use client'

interface AILoaderProps {
  isLoading: boolean
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function AILoader({
  isLoading,
  message = 'Processando com IA...',
  size = 'md'
}: AILoaderProps) {
  if (!isLoading) return null

  const sizeClasses = {
    sm: 'scale-50',
    md: 'scale-75',
    lg: 'scale-100'
  }

  return (
    <div className="ai-loader-container">
      <div className={`loader ${sizeClasses[size]}`}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#5c3d99', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            </linearGradient>
          </defs>

          <g id="pegtopone">
            <path d="M50,50 Q45,20 50,10 Q55,20 50,50 Z" fill="url(#gradient)" />
          </g>

          <g id="pegtoptwo">
            <path d="M50,50 Q70,35 77,28 Q72,40 50,50 Z" fill="url(#gradient)" />
          </g>

          <g id="pegtopthree">
            <path d="M50,50 Q30,35 23,28 Q28,40 50,50 Z" fill="url(#gradient)" />
          </g>
        </svg>
      </div>

      {message && (
        <div className="ai-loader-message">
          <p>{message}</p>
          <div className="ai-loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  )
}
