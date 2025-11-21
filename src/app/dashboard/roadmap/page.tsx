"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseRoadmap } from "@/components/course-roadmap"
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
import { X } from "lucide-react"

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
  prerequisites: {
    prerequisite: Course & {
      alternatives?: { alternative: { id: string; code: string } }[]
    }
  }[]
}

interface UserCourse {
  id: string
  courseId: string
  completed: boolean
  course: Course
}

function RoadmapContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const focusedCourseCode = searchParams.get("course")

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (focusedCourseCode && courses.length > 0) {
      const course = courses.find(c => c.code === focusedCourseCode)
      if (course) {
        setSelectedCourse(course)
      }
    }
  }, [focusedCourseCode, courses])

  const fetchData = async () => {
    try {
      const [coursesRes, userCoursesRes] = await Promise.all([
        fetch("/api/courses/roadmap"),
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

  const isLocked = (course: Course) => {
    if (isCompleted(course.id)) return false
    if (!course.prerequisites || course.prerequisites.length === 0) return false

    // Check if all prerequisites are met (considering alternatives)
    return !course.prerequisites.every(p => {
      // Check if the prerequisite itself is completed
      if (isCompleted(p.prerequisite.id)) return true

      // Check if any alternative to this prerequisite is completed
      if (p.prerequisite.alternatives && p.prerequisite.alternatives.length > 0) {
        return p.prerequisite.alternatives.some(alt => isCompleted(alt.alternative.id))
      }

      return false
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      {/* Navigation - Isolated from page content */}
      <nav className="fixed top-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-xl border-b border-black/10 pointer-events-auto" style={{ pointerEvents: 'auto', isolation: 'isolate' }}>
        <div className="max-w-[1400px] mx-auto px-6 pointer-events-auto">
          <div className="flex justify-between items-center h-11 pointer-events-auto">
            <button
              onClick={(e) => { e.preventDefault(); router.push("/"); }}
              className="flex items-center transition-opacity hover:opacity-60 pointer-events-auto cursor-pointer"
              style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            >
              <span className="font-semibold text-[17px] text-black tracking-tight">DegreeMe</span>
            </button>

            <div className="flex items-center space-x-8 pointer-events-auto">
              <div className="hidden md:flex items-center space-x-8 text-[12px] pointer-events-auto">
                <button
                  onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
                  className="text-black/70 hover:text-black transition-all-smooth pb-1 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                >
                  Overview
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); router.push("/dashboard/courses"); }}
                  className="text-black/70 hover:text-black transition-all-smooth pb-1 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                >
                  Courses
                </button>
                <span className="text-black transition-all-smooth border-b-2 border-black pb-1 pointer-events-auto">
                  Roadmap
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); router.push("/dashboard/progress"); }}
                  className="text-black/70 hover:text-black transition-all-smooth pb-1 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                >
                  Progress
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); router.push("/schedule"); }}
                  className="text-black/70 hover:text-black transition-all-smooth pb-1 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                >
                  Schedule
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); router.push("/feedback"); }}
                  className="text-black/70 hover:text-black transition-all-smooth pb-1 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                >
                  Feedback
                </button>
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

      {/* Page Content */}
      <div className="fixed inset-0 top-11 bg-white flex">
        {/* Left Panel - Always Visible */}
        <div className="w-80 border-r border-black/10 bg-white flex flex-col overflow-y-auto">
          <div className="p-6">
            <h1 className="text-3xl font-semibold text-black mb-2 tracking-tight">
              Course Roadmap
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Visual representation of your degree path
            </p>

            {/* Stats */}
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Completed</div>
                <div className="text-2xl font-semibold text-black">
                  {userCourses.filter(uc => uc.completed).length}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Courses</div>
                <div className="text-2xl font-semibold text-black">
                  {courses.length}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-black mb-3">Course Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500" />
                  <span className="text-gray-700">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500" />
                  <span className="text-gray-700">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300" />
                  <span className="text-gray-700">Locked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-600" />
                  <span className="text-gray-700">Elective</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-xs font-semibold text-blue-900 mb-2">Navigation</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Scroll to zoom in/out</li>
                <li>• Drag to pan around</li>
                <li>• Click course for details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Center - Full Roadmap */}
        <div className="flex-1 relative overflow-hidden">
          <CourseRoadmap
            courses={courses}
            userCourses={userCourses.map(uc => ({ courseId: uc.courseId, completed: uc.completed }))}
            onCourseClick={(course) => setSelectedCourse(course)}
            focusedCourseCode={focusedCourseCode}
          />
        </div>

        {/* Right Panel - Course Details (Slides in when course selected) */}
        {selectedCourse && (
          <div className="w-96 border-l border-black/10 bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <Card className="border-0 bg-white h-full rounded-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-2xl text-black">{selectedCourse.code}</CardTitle>
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                            {selectedCourse.credits} credits
                          </Badge>
                        </div>
                        <CardDescription className="text-[16px] font-medium text-black">
                          {selectedCourse.name}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCourse(null)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                        title="Close"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {isCompleted(selectedCourse.id) && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
                      )}
                      {selectedCourse.gepRequirement && (
                        <Badge variant="outline" className="border-black/20 text-black">GEP</Badge>
                      )}
                      {selectedCourse.isElective && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">Elective</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCourse.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2">Description</h3>
                        <p className="text-[14px] text-muted-foreground leading-relaxed">
                          {selectedCourse.description}
                        </p>
                      </div>
                    )}

                    {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2">Prerequisites</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCourse.prerequisites.map((prereq, index) => (
                            <Badge key={index} variant="outline" className="border-black/20 text-black">
                              {prereq.prerequisite.code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCourse.note && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-[13px] text-blue-800">
                          <span className="font-semibold">Note:</span> {selectedCourse.note}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-black/10">
                      {isLocked(selectedCourse) ? (
                        <div className="space-y-2">
                          <Button
                            disabled
                            className="w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                          >
                            Locked
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            Complete prerequisites first
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleCourseToggle(selectedCourse.id, !isCompleted(selectedCourse.id))}
                          className={`w-full ${
                            isCompleted(selectedCourse.id)
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              : "bg-black hover:bg-black/90 text-white"
                          } transition-all-smooth`}
                        >
                          {isCompleted(selectedCourse.id) ? "Mark as Incomplete" : "Mark as Complete"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
          </div>
        )}
      </div>
    </>
  )
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    }>
      <RoadmapContent />
    </Suspense>
  )
}
