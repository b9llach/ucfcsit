"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"

interface Message {
  role: "user" | "assistant"
  content: string
}

const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm your DegreeMe advisor. I can help you with course planning, prerequisites, degree requirements, and scheduling questions. What would you like to know?"
}

export function ChatButton() {
  const { status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ONLY load messages when chat is opened for the first time
  useEffect(() => {
    if (isOpen && !isInitialized) {
      const stored = localStorage.getItem("degreeme-chat-history")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setMessages(parsed)
        } catch (e) {
          setMessages([DEFAULT_MESSAGE])
        }
      }
      setIsInitialized(true)
    }
  }, [isOpen, isInitialized])

  // Save messages to localStorage whenever they change (only after initialization)
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      localStorage.setItem("degreeme-chat-history", JSON.stringify(messages))
    }
  }, [messages, isInitialized])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")

    // CRITICAL: Only call API when user explicitly submits a message
    // Prevent any automatic API calls on mount or page load
    if (!userMessage) return

    console.log("[ChatButton] Making API call with message:", userMessage)

    // Add user message to chat
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show the error message from the API
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.error || "Sorry, I encountered an error. Please try again."
        }])
        setIsLoading(false)
        return
      }

      // Add assistant message to chat
      setMessages(prev => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again in a moment."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Only show chat for authenticated users
  if (status !== "authenticated") {
    return null
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#0071e3]/30"
        aria-label="Open chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] animate-in fade-in zoom-in duration-200">
          <Card className="h-full bg-white border border-gray-200 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">Degree Advisor</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-[#0071e3] text-white"
                        : "bg-gray-100 text-black"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap text-inherit">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent text-sm text-black placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-[#0071e3] text-white rounded-lg hover:bg-[#0071e3]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Send
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
