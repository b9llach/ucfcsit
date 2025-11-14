"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function Home() {
  const { data: session, status } = useSession()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
              {session ? (
                <>
                  <div className="hidden md:flex items-center space-x-8 text-[12px]">
                    <Link href="/dashboard" className="text-black/70 hover:text-black transition-all-smooth">
                      Overview
                    </Link>
                    <Link href="/dashboard/courses" className="text-black/70 hover:text-black transition-all-smooth">
                      Courses
                    </Link>
                    <Link href="/dashboard/roadmap" className="text-black/70 hover:text-black transition-all-smooth">
                      Roadmap
                    </Link>
                    <Link href="/dashboard/progress" className="text-black/70 hover:text-black transition-all-smooth">
                      Progress
                    </Link>
                    <Link href="/schedule" className="text-black/70 hover:text-black transition-all-smooth">
                      Schedule
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
                </>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-[12px] rounded-full px-4 h-7 transition-all-smooth shadow-sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            background: 'radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.08) 0%, transparent 60%)'
          }}
        />

        <div className="relative max-w-[980px] mx-auto text-center pt-12">
          <h1 className="text-6xl sm:text-7xl md:text-[80px] font-semibold tracking-tight text-black leading-[1.05] mb-5 animate-fade-in-up">
            Plan smarter.
            <br />
            <span className="gradient-text inline-block">Graduate faster.</span>
          </h1>

          <p className="mt-5 text-[21px] text-muted-foreground max-w-2xl mx-auto leading-[1.38] animate-fade-in-up animation-delay-150">
            The intelligent course planner that helps you visualize your degree path,
            track progress, and optimize your schedule.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
            {session ? (
              <>
                <Link href="/dashboard">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 h-12 text-[17px] rounded-full transition-all-smooth shadow-lg hover:shadow-xl hover:scale-[1.02]">
                    Open Dashboard
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button variant="outline" className="px-8 h-12 text-[17px] rounded-full transition-all-smooth border-2 bg-white hover:bg-gray-50 hover:scale-[1.02] text-black hover:text-black">
                    View Schedule
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 h-12 text-[17px] rounded-full transition-all-smooth shadow-lg hover:shadow-xl hover:scale-[1.02]">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Visual Roadmap Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-[2.5rem] p-8 relative overflow-hidden transition-all-smooth hover:scale-[1.02] hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                <div className="relative h-full flex items-center justify-center">
                  <div className="w-full h-full bg-white/60 backdrop-blur-sm rounded-[1.5rem] p-6 shadow-xl border border-white/50">
                    <div className="grid grid-cols-3 gap-3 h-full">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl transition-all-smooth hover:scale-105"
                          style={{
                            opacity: 0.15 + (i * 0.09),
                            transitionDelay: `${i * 0.05}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-5">
              <h2 className="text-5xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.08]">
                See your path.
                <br />
                <span className="text-black/60">All at once.</span>
              </h2>
              <p className="text-[19px] text-muted-foreground leading-[1.47]">
                Interactive course roadmap shows prerequisites, dependencies, and your progress.
                Know exactly what to take next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Scheduling Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-5">
              <h2 className="text-5xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.08]">
                Intelligent
                <br />
                <span className="gradient-text bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent inline-block">
                  scheduling.
                </span>
              </h2>
              <p className="text-[19px] text-muted-foreground leading-[1.47]">
                Automatically generates optimal semester plans that respect prerequisites,
                balance credit loads, and get you to graduation faster.
              </p>
            </div>

            <div>
              <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 rounded-[2.5rem] p-8 relative overflow-hidden transition-all-smooth hover:scale-[1.02] hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/5 to-transparent" />
                <div className="relative h-full flex flex-col justify-between space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[22%] bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 transition-all-smooth hover:bg-white/90"
                      style={{ transitionDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Tracking Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-square bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 rounded-[2.5rem] p-12 relative overflow-hidden transition-all-smooth hover:scale-[1.02] hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
                <div className="relative h-full flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-[10px] border-green-500/20 flex items-center justify-center transition-all-smooth hover:border-green-500/40">
                    <span className="text-6xl font-semibold text-black">78%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-5">
              <h2 className="text-5xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.08]">
                Track progress.
                <br />
                <span className="text-black/60">Stay motivated.</span>
              </h2>
              <p className="text-[19px] text-muted-foreground leading-[1.47]">
                Beautiful visualizations show exactly how far you've come and
                how close you are to graduation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!session && (
        <section className="py-24 px-6 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="max-w-[980px] mx-auto text-center">
            <h2 className="text-5xl sm:text-6xl md:text-[64px] font-semibold text-black mb-5 leading-[1.08] tracking-tight">
              Ready to take control
              <br />
              of your degree?
            </h2>
            <p className="text-[21px] text-muted-foreground mb-8 max-w-2xl mx-auto leading-[1.38]">
              Join students planning smarter academic journeys with DegreeMe.
            </p>
            <Link href="/login">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 h-14 text-[17px] rounded-full transition-all-smooth shadow-xl hover:shadow-2xl hover:scale-[1.02]">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-black/10 bg-white">
        <div className="max-w-[980px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <span className="text-[12px] text-muted-foreground">DegreeMe</span>
            <div className="flex items-center space-x-6 text-[12px] text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-all-smooth">
                Dashboard
              </Link>
              <Link href="/schedule" className="hover:text-foreground transition-all-smooth">
                Schedule
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-[10px] text-muted-foreground">
            <p>Copyright 2024 DegreeMe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
