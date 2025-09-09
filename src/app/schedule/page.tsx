"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export default function SchedulePage() {
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
  const [shareUrl, setShareUrl] = useState("")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
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
        
        // Generate schedule automatically
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
        setShareUrl(url)
        setIsShareDialogOpen(true)
      }
    } catch (error) {
      console.error("Error sharing schedule:", error)
    } finally {
      setIsSharing(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("🔗 Schedule link copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast.error("Failed to copy link. Please try again.")
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 font-medium">Loading schedule...</div>
        </div>
      </div>
    )
  }

  if (!session && !isSharedView) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md" aria-label="UCF Course Planner home">
                  <span className="hidden sm:inline">UCF CS/IT Course Planner</span>
                  <span className="sm:hidden">UCF Planner</span>
                </Link>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <h1 className="text-base sm:text-lg font-medium text-gray-700">
                  {isSharedView ? 'Shared Schedule' : 'My Course Schedule'}
                </h1>
              </div>
              {!isSharedView && (
                <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1" role="tablist" aria-label="Page navigation">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    role="tab"
                    aria-selected="false"
                  >
                    Classes
                  </Button>
                  <button className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-white text-primary shadow-sm" role="tab" aria-selected="true">
                    Schedule
                  </button>
                </nav>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {session && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-3 bg-gray-50 rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-label="User menu" aria-expanded="false">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={session?.user?.image || ""} 
                          alt={session?.user?.name || "User"} 
                        />
                        <AvatarFallback className="bg-primary text-black">
                          {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700 hidden sm:block font-medium">
                        {session?.user?.name?.split(' ')[0]}
                      </span>
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/schedule" className="cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Schedule
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {isSharedView && (
                <span className="text-sm text-gray-600">Shared Schedule</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Schedule View */}
          <section className="lg:col-span-2" aria-label="Semester schedule">
            <Card className="bg-white">
              <CardHeader className="bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Semester Schedule</CardTitle>
                  {!isSharedView && schedule && (
                    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={shareSchedule} 
                          variant="outline" 
                          size="sm"
                          disabled={isSharing}
                          className="cursor-pointer hover:scale-105 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {isSharing ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="hidden sm:inline">Sharing...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                              </svg>
                              <span className="hidden sm:inline">Share Schedule</span>
                              <span className="sm:hidden">Share</span>
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">Share Your Schedule</DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Share your course schedule with others using this link.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center space-x-2">
                          <div className="grid flex-1 gap-2">
                            <Input
                              readOnly
                              value={shareUrl}
                              className="bg-gray-50 border-gray-300 text-gray-900"
                            />
                          </div>
                          <Button 
                            type="submit" 
                            size="sm" 
                            onClick={copyToClipboard}
                            className="cursor-pointer hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </Button>
                        </div>
                        <DialogFooter className="sm:justify-start">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Anyone with this link can view your schedule
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="bg-white">
                {Object.keys(groupedSchedule).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Schedule Generated</h3>
                    {!isSharedView ? (
                      <div>
                        <p className="text-gray-500 mb-4">
                          To generate your course schedule, please mark some completed courses in your dashboard first.
                        </p>
                        <Link href="/dashboard" className="inline-flex items-center px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Go to Dashboard
                        </Link>
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        This schedule hasn&apos;t been generated yet.
                      </p>
                    )}
                  </div>
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
                      .map(([semester, items]) => (
                        <div key={semester} className="bg-white border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {semester}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                              >
                                <div className="font-medium text-blue-900">
                                  {item.course.code}
                                </div>
                                <div className="text-sm text-blue-700">
                                  {item.course.name}
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {item.course.credits} credits
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            Total Credits: {items.reduce((sum, item) => sum + item.course.credits, 0)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Course Search Results */}
          <section className="lg:col-span-2" aria-label="Course search">
            <Card className="bg-white">
              <CardHeader className="bg-white">
                <div className="flex flex-col space-y-4">
                  <CardTitle className="text-gray-900">Course Search</CardTitle>
                  {/* Search Bar */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      placeholder="Search courses by code or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-primary focus:border-primary"
                      aria-label="Search courses"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                        aria-label="Clear search"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-gray-600">
                      {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found for &quot;<span className="font-medium">{searchQuery}</span>&quot;
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredCourses.slice(0, 40).map((course) => {
                    const isCompleted = getCompletedCourseIds().includes(course.id)
                    const isScheduled = schedule?.items.some(item => item.courseId === course.id)
                    
                    return (
                      <div
                        key={course.id}
                        className={`p-3 border rounded-lg transition-all duration-200 hover:shadow-md ${
                          isCompleted
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : isScheduled
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {course.code}
                          {isCompleted && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                              Completed
                            </span>
                          )}
                          {isScheduled && !isCompleted && (
                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              Scheduled
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">
                          {course.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {course.credits} credits
                        </div>
                      </div>
                    )
                  })}
                </div>
                {filteredCourses.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-600">No courses found matching &quot;{searchQuery}&quot;</p>
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-primary hover:text-primary/80 text-sm"
                    >
                      Clear search
                    </button>
                  </div>
                )}
                {filteredCourses.length > 40 && (
                  <div className="text-center pt-3 text-sm text-gray-500">
                    Showing first 40 results. Use search to narrow down.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}