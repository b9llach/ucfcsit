"use client"

import { useEffect, useState } from "react"

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  className?: string
  showPercentage?: boolean
  label?: string
  color?: string
}

export function CircularProgress({
  value,
  max,
  size = 180,
  strokeWidth = 12,
  className = "",
  showPercentage = true,
  label = "",
  color = "#0071e3"
}: CircularProgressProps) {
  const [progress, setProgress] = useState(0)
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: "drop-shadow(0 0 8px rgba(0, 113, 227, 0.3))"
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <div className="text-4xl font-bold text-foreground">
            {progress}%
          </div>
        )}
        {label && (
          <div className="text-sm text-muted-foreground font-medium mt-1">
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
