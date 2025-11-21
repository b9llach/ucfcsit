"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "general">("general")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate submission (doesn't actually go anywhere per requirements)
    console.log("Feedback submitted:", { type: feedbackType, message: feedback })

    setSubmitted(true)
    setTimeout(() => {
      setIsOpen(false)
      setSubmitted(false)
      setFeedback("")
      setFeedbackType("general")
    }, 2000)
  }

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/30"
        aria-label="Send feedback"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border border-gray-200 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              {!submitted ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-semibold text-gray-900">Send Feedback</h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Help us improve DegreeMe! Share your thoughts, report bugs, or suggest features.
                  </p>

                  <form onSubmit={handleSubmit}>
                    {/* Feedback Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Feedback Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackType("bug")}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            feedbackType === "bug"
                              ? "bg-red-100 text-red-700 border-2 border-red-500"
                              : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                          }`}
                        >
                          🐛 Bug
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackType("feature")}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            feedbackType === "feature"
                              ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                              : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                          }`}
                        >
                          ✨ Feature
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackType("general")}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            feedbackType === "general"
                              ? "bg-green-100 text-green-700 border-2 border-green-500"
                              : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                          }`}
                        >
                          💬 General
                        </button>
                      </div>
                    </div>

                    {/* Feedback Message */}
                    <div className="mb-4">
                      <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Feedback
                      </label>
                      <textarea
                        id="feedback-message"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        required
                        placeholder="Tell us what you think..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!feedback.trim()}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Send Feedback
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h4>
                  <p className="text-sm text-gray-600">
                    Your feedback helps us make DegreeMe better for everyone.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
