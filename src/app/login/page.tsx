"use client"

import { signIn, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
      router.refresh()
    }
  }, [session, status, router])

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true
      })
      if (result?.error) {
        console.error("Sign in error:", result.error)
        setIsSigningIn(false)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      setIsSigningIn(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.08) 0%, transparent 60%)'
        }}
      />

      {/* Back to Home */}
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-all-smooth group">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-all-smooth" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-[15px]">Back to Home</span>
        </Link>
      </div>

      <div className="relative z-10 py-12 px-6 lg:px-8">
        {/* Logo and Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-10 animate-fade-in-up">
          <h1 className="text-center text-5xl sm:text-6xl font-semibold text-black tracking-tight mb-4">
            Welcome back
          </h1>
          <p className="text-center text-[19px] text-muted-foreground max-w-sm mx-auto leading-[1.47]">
            Sign in to continue planning your degree journey
          </p>
        </div>

        {/* Sign In Card */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md animate-scale-in animation-delay-150">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-black/10 p-10">
            <div className="space-y-6">
              {/* Google Sign In Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 justify-center h-14 text-[17px] font-semibold rounded-full transition-all-smooth hover:scale-[1.02] hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-muted-foreground font-medium">
                    Quick and secure
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Sign in with your Google account
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Your data is encrypted and never shared
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Start planning your degree in seconds
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              DegreeMe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
