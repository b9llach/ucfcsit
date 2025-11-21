"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  corequisites: { corequisite: Course }[]
}

interface UserCourse {
  id: string
  courseId: string
  completed: boolean
  course: Course
}

interface ScheduleItem {
  id: string
  courseId: string
  semester: string
  year: number
  course: Course
}

interface Schedule {
  id: string
  name: string
  shareToken: string | null
  items: ScheduleItem[]
}

function SchedulePageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shareToken = searchParams.get('share')

  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSharedView, setIsSharedView] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    if (shareToken) {
      fetchSharedSchedule()
    } else if (status === "authenticated") {
      fetchData()
    }
  }, [status, shareToken])

  const fetchSharedSchedule = async () => {
    try {
      const response = await fetch(`/api/schedule/shared/${shareToken}`)
      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule)
        setCourses(data.allCourses)
        setUserCourses(data.completedCourses)
        setIsSharedView(true)
      } else {
        router.push('/404')
      }
    } catch (error) {
      console.error("Error fetching shared schedule:", error)
      router.push('/404')
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      const [coursesRes, userCoursesRes] = await Promise.all([
        fetch("/api/courses/with-prerequisites"),
        fetch("/api/user/courses")
      ])

      if (coursesRes.ok && userCoursesRes.ok) {
        const coursesData = await coursesRes.json()
        const userCoursesData = await userCoursesRes.json()

        setCourses(Array.isArray(coursesData) ? coursesData : [])
        setUserCourses(Array.isArray(userCoursesData) ? userCoursesData : [])

        generateSchedule(coursesData, userCoursesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSchedule = async (allCourses: Course[], completedCourses: UserCourse[]) => {
    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: allCourses, completedCourses })
      })

      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule)
      }
    } catch (error) {
      console.error("Error generating schedule:", error)
    }
  }

  const shareSchedule = async () => {
    if (!schedule) return

    try {
      setIsSharing(true)
      const response = await fetch(`/api/schedule/${schedule.id}/share`, {
        method: "POST"
      })

      if (response.ok) {
        const data = await response.json()
        const url = `${window.location.origin}/schedule?share=${data.shareToken}`
        await navigator.clipboard.writeText(url)
        toast.success("Schedule link copied to clipboard")
      }
    } catch (error) {
      console.error("Error sharing schedule:", error)
      toast.error("Failed to share schedule")
    } finally {
      setIsSharing(false)
    }
  }

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses
    return courses.filter(course =>
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [courses, searchQuery])

  const getCompletedCourseIds = () => {
    return userCourses.filter(uc => uc.completed).map(uc => uc.courseId)
  }

  const groupedSchedule = useMemo(() => {
    if (!schedule?.items) return {}

    const grouped: { [key: string]: ScheduleItem[] } = {}
    schedule.items.forEach(item => {
      const key = `${item.semester} ${item.year}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })

    return grouped
  }, [schedule])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (status === "unauthenticated" && !isSharedView) {
    router.push('/login')
    return null
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
              {!isSharedView && (
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
                  <Link href="/schedule" className="text-black transition-all-smooth">
                    Schedule
                  </Link>
                </div>
              )}

              {session && (
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
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-16 px-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
              <h1 className="text-5xl font-semibold text-black tracking-tight">
                {isSharedView ? "Shared Schedule" : "Schedule"}
              </h1>
              {!isSharedView && schedule && (
                <Button
                  onClick={shareSchedule}
                  disabled={isSharing}
                  variant="outline"
                  className="bg-white text-black hover:bg-gray-50 border-black/20 px-6 h-10 text-[13px] rounded-full transition-all-smooth"
                  title="Generate a shareable link to your schedule"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  {isSharing ? "Sharing..." : "Share"}
                </Button>
              )}
            </div>
            <p className="text-[19px] text-muted-foreground">
              {isSharedView ? "Viewing a shared semester-by-semester plan" : "Your semester-by-semester degree plan"}
            </p>
          </div>

          {Object.keys(groupedSchedule).length === 0 ? (
            <Card className="border-black/10 bg-white">
              <CardContent className="py-20 text-center">
                <div className="max-w-md mx-auto">
                  <svg className="w-20 h-20 mx-auto text-black/20 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-2xl font-semibold text-black mb-3">No Schedule Yet</h3>
                  <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed">
                    {!isSharedView
                      ? "Start building your schedule by marking completed courses. We'll automatically generate a semester-by-semester plan that respects all prerequisites."
                      : "This schedule hasn't been generated yet. The owner needs to mark completed courses to create their plan."}
                  </p>
                  {!isSharedView && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link href="/dashboard/courses">
                        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 h-11 text-[14px] rounded-full transition-all-smooth">
                          Mark Completed Courses
                        </Button>
                      </Link>
                      <Link href="/dashboard/roadmap">
                        <Button variant="outline" className="bg-white text-black hover:bg-gray-50 border-black/20 px-6 h-11 text-[14px] rounded-full transition-all-smooth">
                          View Roadmap
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSchedule)
                .sort(([a], [b]) => {
                  const [semA, yearA] = a.split(' ')
                  const [semB, yearB] = b.split(' ')
                  if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB)
                  const semOrder = { Fall: 1, Spring: 2, Summer: 3 }
                  return semOrder[semA as keyof typeof semOrder] - semOrder[semB as keyof typeof semOrder]
                })
                .map(([semester, items], index) => {
                  const totalCredits = items.reduce((sum, item) => sum + item.course.credits, 0)
                  return (
                    <Card key={semester} className="border-black/10 bg-white">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl text-black">{semester}</CardTitle>
                            <CardDescription className="text-[13px] text-muted-foreground mt-1">
                              {totalCredits} credit hours • {items.length} courses
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[13px]">
                            Semester {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((item) => {
                            const isCompleted = getCompletedCourseIds().includes(item.courseId)
                            return (
                              <div
                                key={item.id}
                                className={`p-4 rounded-xl border transition-all-smooth ${
                                  isCompleted
                                    ? 'bg-green-50/30 border-green-200'
                                    : 'bg-white border-black/10 hover:border-black/20'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-[15px] text-black">{item.course.code}</h4>
                                  <Badge variant="secondary" className="text-[11px] rounded-full bg-white border-black/10">
                                    {item.course.credits} cr
                                  </Badge>
                                </div>
                                <p className="text-[13px] text-muted-foreground line-clamp-2 mb-3">
                                  {item.course.name}
                                </p>
                                {isCompleted && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-[11px]">
                                    Completed
                                  </Badge>
                                )}
                                {item.course.prerequisites && item.course.prerequisites.length > 0 && !isCompleted && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-[11px] text-muted-foreground mr-1">Prereqs:</span>
                                    {item.course.prerequisites.slice(0, 2).map((prereq, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-[10px] bg-gray-100 text-gray-700 border-gray-200"
                                      >
                                        {prereq.prerequisite.code}
                                      </Badge>
                                    ))}
                                    {item.course.prerequisites.length > 2 && (
                                      <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-700 border-gray-200">
                                        +{item.course.prerequisites.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  )
}
