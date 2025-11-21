"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

export function HelpTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTour, setHasSeenTour] = useState(false)

  useEffect(() => {
    // Check if user has seen tour before
    const seen = localStorage.getItem("hasSeenTour")
    if (!seen) {
      // Show tour after 1 second delay on first visit
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
    setHasSeenTour(true)
  }, [])

  const tourSteps = [
    {
      title: "Welcome to DegreeMe! 🎓",
      description: "Your personal CS/IT degree planner. Let's take a quick tour of the features.",
      icon: "🎓"
    },
    {
      title: "Track Your Progress",
      description: "Check courses as you complete them. Your progress is automatically calculated and saved.",
      icon: "✅"
    },
    {
      title: "Interactive Roadmap",
      description: "Visualize your degree path! See prerequisite chains, zoom in/out, and add electives with dropdowns.",
      icon: "🗺️"
    },
    {
      title: "Generate Schedule",
      description: "Get a semester-by-semester schedule that respects all prerequisites. Perfect for planning ahead!",
      icon: "📅"
    },
    {
      title: "Share Your Plan",
      description: "Generate a shareable link to your schedule. Great for advisors or friends!",
      icon: "🔗"
    },
    {
      title: "Need Help?",
      description: "Use the feedback button (bottom right) anytime to report bugs or suggest features!",
      icon: "💬"
    }
  ]

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem("hasSeenTour", "true")
    setHasSeenTour(true)
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!isOpen) {
    // Show help button for returning users
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-white hover:bg-gray-50 text-gray-700 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/20"
        aria-label="Open help"
        title="Need help?"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    )
  }

  const step = tourSteps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-white border border-gray-200 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip tour
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
            <p className="text-gray-600 text-lg leading-relaxed">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentStep
                    ? "bg-primary w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
