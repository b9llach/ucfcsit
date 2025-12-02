"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
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

export default function ProgressPage() {
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
  const totalCredits = completedCourses.reduce((sum, uc) => sum + uc.course.credits, 0) + 21
  const remainingCredits = 120 - totalCredits

  const requiredCourses = courses.filter(course =>
    !course.category || !course.category.toLowerCase().includes('elective')
  )
  const electiveCourses = courses.filter(course =>
    course.category && course.category.toLowerCase().includes('elective')
  )

  const completedRequired = requiredCourses.filter(c =>
    userCourses.some(uc => uc.courseId === c.id && uc.completed)
  ).length
  const completedElectives = electiveCourses.filter(c =>
    userCourses.some(uc => uc.courseId === c.id && uc.completed)
  ).length

  // Three different metrics:
  // 1. Degree Completion - based on credit hours (actual graduation requirement)
  const degreeProgress = Math.round((totalCredits / 120) * 100)

  // 2. Core Requirements - required courses only
  const coreProgress = requiredCourses.length > 0
    ? Math.round((completedRequired / requiredCourses.length) * 100)
    : 0

  // 3. Elective Progress - elective courses completed (need at least 2 for CS/IT)
  const minElectives = 2
  const electiveProgress = Math.min(Math.round((completedElectives / minElectives) * 100), 100)

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
                <Link href="/dashboard" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Overview
                </Link>
                <Link href="/dashboard/courses" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Courses
                </Link>
                <Link href="/dashboard/roadmap" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Roadmap
                </Link>
                <Link href="/dashboard/progress" className="text-black transition-all-smooth border-b-2 border-black pb-1">
                  Progress
                </Link>
                <Link href="/schedule" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Schedule
                </Link>
                <Link href="/feedback" className="text-black/70 hover:text-black transition-all-smooth pb-1">
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
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-black mb-3 tracking-tight">
              Progress
            </h1>
            <p className="text-[19px] text-muted-foreground">
              Track your degree completion and milestones
            </p>
          </div>

          {/* Circular Progress Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* 1. Degree Completion (Credit-based) */}
            <Card className="border-black/10 bg-white">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 mb-4">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#e5e5e5"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#0071e3"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - degreeProgress / 100)}`}
                        strokeLinecap="round"
                        className="transition-all-smooth"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-semibold text-black">{degreeProgress}%</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-1">Degree Completion</h3>
                  <p className="text-[13px] text-muted-foreground">
                    {totalCredits} of 120 credit hours
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Core Requirements */}
            <Card className="border-black/10 bg-white">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 mb-4">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#e5e5e5"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#10b981"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - coreProgress / 100)}`}
                        strokeLinecap="round"
                        className="transition-all-smooth"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-semibold text-black">{coreProgress}%</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-1">Core Requirements</h3>
                  <p className="text-[13px] text-muted-foreground">
                    {completedRequired} of {requiredCourses.length} required courses
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Electives Progress */}
            <Card className="border-black/10 bg-white">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 mb-4">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#e5e5e5"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="#8b5cf6"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - electiveProgress / 100)}`}
                        strokeLinecap="round"
                        className="transition-all-smooth"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-semibold text-black">{electiveProgress}%</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-1">Electives</h3>
                  <p className="text-[13px] text-muted-foreground">
                    {completedElectives} of {minElectives} elective courses
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-black/10 bg-white">
              <CardHeader>
                <CardTitle className="text-xl text-black">Course Breakdown</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Detailed statistics about your courses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Total Courses</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {courses.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Completed</span>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    {completedCourses.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Remaining</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {courses.length - completedCourses.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Required Courses</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {completedRequired}/{requiredCourses.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-black">Electives Completed</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {completedElectives}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/10 bg-white">
              <CardHeader>
                <CardTitle className="text-xl text-black">Credit Hours</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your credit hour progress breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Total Required</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    120 credits
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Completed</span>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    {totalCredits} credits
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Remaining</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {remainingCredits} credits
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-black/10">
                  <span className="text-[15px] text-black">Average per Course</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {completedCourses.length > 0
                      ? (totalCredits / completedCourses.length).toFixed(1)
                      : '0'} credits
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-black">Semesters to Completion</span>
                  <Badge variant="secondary" className="bg-white text-black">
                    {Math.ceil(remainingCredits / 15)} semesters
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
