"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { HelpTour } from "@/components/help-tour"

interface Course {
  id: string
  code: string
  name: string
  credits: number
  gepRequirement: boolean
  category: string | null
  description: string | null
  note: string | null
  isElective: boolean
  electiveLevel: string | null
  prerequisites: { prerequisite: Course }[]
}

interface UserCourse {
  id: string
  courseId: string
  completed: boolean
  course: Course
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [coursesRes, userCoursesRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/user/courses")
      ])

      if (!coursesRes.ok || !userCoursesRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const coursesData = await coursesRes.json()
      const userCoursesData = await userCoursesRes.json()

      setCourses(Array.isArray(coursesData) ? coursesData : [])
      setUserCourses(Array.isArray(userCoursesData) ? userCoursesData : [])
    } catch (error) {
      console.error("Error fetching data:", error)
      setCourses([])
      setUserCourses([])
    } finally {
      setLoading(false)
    }
  }

  const completedCourses = userCourses.filter(uc => uc.completed)
  const totalCredits = completedCourses.reduce((sum, uc) => sum + uc.course.credits, 0)
  const remainingCredits = 120 - totalCredits

  const requiredCourses = courses.filter(course =>
    !course.category || !course.category.toLowerCase().includes('elective')
  )
  const completedRequired = requiredCourses.filter(c =>
    userCourses.some(uc => uc.courseId === c.id && uc.completed)
  ).length
  const completedElectives = courses.filter(c =>
    c.category && c.category.toLowerCase().includes('elective') &&
    userCourses.some(uc => uc.courseId === c.id && uc.completed)
  ).length

  const overallProgress = requiredCourses.length > 0
    ? Math.round((completedRequired / requiredCourses.length) * 100)
    : 0

  if (status === "loading" || loading) {
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
                <Link href="/dashboard" className="text-black transition-all-smooth">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-semibold text-black mb-3 tracking-tight">
              Welcome back, {session?.user?.name?.split(' ')[0]}
            </h1>
            <p className="text-[19px] text-muted-foreground">
              Here's an overview of your degree progress
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="border-black/10 bg-white">
              <CardHeader className="pb-3">
                <CardDescription className="text-[13px] text-muted-foreground">Overall Progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold text-black mb-2">
                  {overallProgress}%
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {completedRequired} of {requiredCourses.length} required courses
                </p>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-white">
              <CardHeader className="pb-3">
                <CardDescription className="text-[13px] text-muted-foreground">Credit Hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold text-black mb-2">{totalCredits}</div>
                <p className="text-[13px] text-muted-foreground">
                  {remainingCredits} remaining of 120
                </p>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-white">
              <CardHeader className="pb-3">
                <CardDescription className="text-[13px] text-muted-foreground">Required Courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold text-black mb-2">
                  {completedRequired}/{requiredCourses.length}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {requiredCourses.length - completedRequired} remaining
                </p>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-white">
              <CardHeader className="pb-3">
                <CardDescription className="text-[13px] text-muted-foreground">Electives Completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold text-black mb-2">{completedElectives}</div>
                <p className="text-[13px] text-muted-foreground">
                  elective courses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-black/10 bg-white mb-12">
            <CardHeader>
              <CardTitle className="text-xl text-black">Quick Actions</CardTitle>
              <CardDescription className="text-muted-foreground">Navigate to different sections</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => router.push('/dashboard/courses')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white border-black/20 hover:bg-gray-50 text-black hover:text-black"
                title="Mark courses as complete and manage your curriculum"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-medium">Manage Courses</span>
              </Button>

              <Button
                onClick={() => router.push('/dashboard/roadmap')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white border-black/20 hover:bg-gray-50 text-black hover:text-black"
                title="Visualize your degree path with interactive prerequisite chains"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="font-medium">View Roadmap</span>
              </Button>

              <Button
                onClick={() => router.push('/dashboard/progress')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white border-black/20 hover:bg-gray-50 text-black hover:text-black"
                title="See detailed metrics on your degree completion"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">Track Progress</span>
              </Button>

              <Button
                onClick={() => router.push('/schedule')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white border-black/20 hover:bg-gray-50 text-black hover:text-black"
                title="Generate and view your semester-by-semester plan"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">View Schedule</span>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Courses */}
          <Card className="border-black/10 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-black">Recently Completed</CardTitle>
              <CardDescription className="text-muted-foreground">Your latest course completions</CardDescription>
            </CardHeader>
            <CardContent>
              {completedCourses.slice(0, 6).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedCourses.slice(0, 6).map((uc) => (
                    <div key={uc.id} className="p-4 rounded-xl border border-black/10 bg-green-50/30">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-[15px] text-black">{uc.course.code}</h4>
                        <Badge variant="secondary" className="rounded-full text-[11px] bg-white">
                          {uc.course.credits} cr
                        </Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground line-clamp-2">
                        {uc.course.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-[15px]">No completed courses yet</p>
                  <p className="text-[13px] text-muted-foreground mt-2">Start marking courses as complete to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <HelpTour />
    </div>
  )
}
