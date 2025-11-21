"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
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

export default function CoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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

  const handleCourseToggle = async (courseId: string, completed: boolean) => {
    const course = courses.find(c => c.id === courseId)
    const courseName = course?.code || "Course"

    try {
      const response = await fetch("/api/user/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId, completed }),
      })

      if (response.ok) {
        fetchData()
        toast.success(
          completed
            ? `${courseName} marked as completed`
            : `${courseName} unmarked`
        )
      } else {
        toast.error("Failed to update course")
      }
    } catch (error) {
      console.error("Error updating course:", error)
      toast.error("An error occurred")
    }
  }

  const isCompleted = (courseId: string) => {
    return userCourses.some(uc => uc.courseId === courseId && uc.completed)
  }

  const requiredCourses = courses.filter(course =>
    !course.category || !course.category.toLowerCase().includes('elective')
  )
  const electiveCourses = courses.filter(course =>
    course.category && course.category.toLowerCase().includes('elective')
  )

  const filterCourses = (courseList: Course[]) => {
    if (!searchQuery) return courseList
    return courseList.filter(course =>
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredRequired = filterCourses(requiredCourses)
  const filteredElectives = filterCourses(electiveCourses)

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
                <Link href="/dashboard" className="text-black/70 hover:text-black transition-all-smooth">
                  Overview
                </Link>
                <Link href="/dashboard/courses" className="text-black transition-all-smooth">
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
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-black mb-3 tracking-tight">
              Courses
            </h1>
            <p className="text-[19px] text-muted-foreground">
              Manage and track all your courses
            </p>
          </div>

          {/* Search */}
          <div className="mb-8 max-w-xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 rounded-full border-black/20 bg-white"
              />
            </div>
          </div>

          {/* Required Courses */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-black mb-6">Required Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequired.map((course) => {
                const completed = isCompleted(course.id)
                return (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all-smooth border-black/10 hover:shadow-md bg-white ${
                      completed ? 'ring-2 ring-green-500/20 bg-green-50/30' : ''
                    }`}
                    onClick={() => handleCourseToggle(course.id, !completed)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={completed}
                          onCheckedChange={(checked) => handleCourseToggle(course.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-[15px] text-black">{course.code}</h4>
                            <Badge variant="secondary" className="text-[11px] rounded-full bg-white">
                              {course.credits} cr
                            </Badge>
                          </div>
                          <p className="text-[13px] text-muted-foreground line-clamp-2">
                            {course.name}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            {filteredRequired.length === 0 && (
              <Card className="border-black/10 bg-white">
                <CardContent className="py-16 text-center">
                  <svg className="w-16 h-16 mx-auto text-black/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-black mb-2">No courses found</h3>
                  <p className="text-[14px] text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? `No required courses match "${searchQuery}". Try adjusting your search.`
                      : "No required courses available. Please check back later."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Elective Courses */}
          <div>
            <h2 className="text-2xl font-semibold text-black mb-6">Electives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredElectives.map((course) => {
                const completed = isCompleted(course.id)
                return (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all-smooth border-black/10 hover:shadow-md bg-white ${
                      completed ? 'ring-2 ring-green-500/20 bg-green-50/30' : ''
                    }`}
                    onClick={() => handleCourseToggle(course.id, !completed)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={completed}
                          onCheckedChange={(checked) => handleCourseToggle(course.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-[15px] text-black">{course.code}</h4>
                            <Badge variant="secondary" className="text-[11px] rounded-full bg-white">
                              {course.credits} cr
                            </Badge>
                          </div>
                          <p className="text-[13px] text-muted-foreground line-clamp-2">
                            {course.name}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            {filteredElectives.length === 0 && (
              <Card className="border-black/10 bg-white">
                <CardContent className="py-16 text-center">
                  <svg className="w-16 h-16 mx-auto text-black/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-black mb-2">No electives found</h3>
                  <p className="text-[14px] text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? `No elective courses match "${searchQuery}". Try a different search term.`
                      : "Choose electives from the roadmap page to add them to your plan."}
                  </p>
                  {!searchQuery && (
                    <Link href="/dashboard/roadmap" className="inline-block mt-4">
                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 h-10 text-[13px] rounded-full transition-all-smooth">
                        View Roadmap
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
