"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export default function FeedbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "general">("general")
  const [submitted, setSubmitted] = useState(false)

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate submission (doesn't actually go anywhere per requirements)
    console.log("Feedback submitted:", { type: feedbackType, message: feedback })

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFeedback("")
      setFeedbackType("general")
    }, 3000)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-black/10">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex justify-between items-center h-11">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-60">
              <span className="font-semibold text-[17px] text-black tracking-tight">DegreeMe</span>
            </Link>

            <div className="flex items-center space-x-8">
              <div className="hidden md:flex items-center space-x-8 text-[12px]">
                <Link href="/dashboard" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Overview
                </Link>
                <Link href="/dashboard/courses" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Courses
                </Link>
                <Link href="/dashboard/roadmap" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Roadmap
                </Link>
                <Link href="/dashboard/progress" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Progress
                </Link>
                <Link href="/schedule" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Schedule
                </Link>
                <Link href="/feedback" className="text-black transition-all-smooth border-b-2 border-black pb-1">
                  Feedback
                </Link>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center hover:opacity-80 transition-all-smooth rounded-full focus:outline-none">
                    <Avatar className="h-7 w-7 ring-1 ring-black/10">
                      <AvatarImage src={session?.user?.image || ""} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                        {session?.user?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-black/10">
                  <DropdownMenuLabel className="text-xs">
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium text-black">{session?.user?.name}</p>
                      <p className="text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/10" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="text-black">Overview</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/schedule" className="text-black">Schedule</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-black/10" />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-16 px-6">
        <div className="max-w-[800px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-black mb-3 tracking-tight">
              Send Feedback
            </h1>
            <p className="text-[19px] text-muted-foreground">
              Help us improve DegreeMe! Share your thoughts, report bugs, or suggest features.
            </p>
          </div>

          {/* Feedback Form */}
          <Card className="border-black/10 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-black">Your Feedback</CardTitle>
              <CardDescription className="text-muted-foreground">
                We value your input and read every submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Feedback Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFeedbackType("bug")}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          feedbackType === "bug"
                            ? "bg-red-100 text-red-700 border-2 border-red-500"
                            : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                        }`}
                      >
                        Bug Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackType("feature")}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          feedbackType === "feature"
                            ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                            : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                        }`}
                      >
                        Feature Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackType("general")}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          feedbackType === "general"
                            ? "bg-green-100 text-green-700 border-2 border-green-500"
                            : "bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300"
                        }`}
                      >
                        General Feedback
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  <div>
                    <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Message
                    </label>
                    <textarea
                      id="feedback-message"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={8}
                      required
                      placeholder="Tell us what you think..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none text-sm text-black placeholder:text-gray-400"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!feedback.trim()}
                      className="flex-1 px-6 py-3 bg-[#0071e3] text-white rounded-lg hover:bg-[#0071e3]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-base text-gray-600">
                    Your feedback helps us make DegreeMe better for everyone.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="border-black/10 bg-gray-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-sm text-black mb-1">Bug Reports</h4>
                  <p className="text-xs text-gray-600">Found something broken? Let us know!</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-gray-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-sm text-black mb-1">Feature Requests</h4>
                  <p className="text-xs text-gray-600">Have an idea? We'd love to hear it!</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-gray-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-sm text-black mb-1">General Feedback</h4>
                  <p className="text-xs text-gray-600">Share your thoughts and suggestions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
