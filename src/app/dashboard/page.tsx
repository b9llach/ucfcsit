"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
  const [activeTab, setActiveTab] = useState<'required' | 'electives'>('required')
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
      
      if (!coursesRes.ok) {
        throw new Error(`Courses API failed: ${coursesRes.status}`)
      }
      
      if (!userCoursesRes.ok) {
        throw new Error(`User courses API failed: ${userCoursesRes.status}`)
      }
      
      const coursesData = await coursesRes.json()
      const userCoursesData = await userCoursesRes.json()
      
      console.log("Fetched courses data:", coursesData)
      console.log("Is courses array?", Array.isArray(coursesData))
      
      // Ensure coursesData is an array
      if (Array.isArray(coursesData)) {
        setCourses(coursesData)
      } else {
        console.error("Courses data is not an array:", coursesData)
        setCourses([])
      }
      
      // Ensure userCoursesData is an array
      if (Array.isArray(userCoursesData)) {
        setUserCourses(userCoursesData)
      } else {
        console.error("User courses data is not an array:", userCoursesData)
        setUserCourses([])
      }
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
        fetchData() // Refresh data
        toast.success(
          completed 
            ? `✅ Marked ${courseName} as completed!` 
            : `↩️ Unmarked ${courseName}`
        )
      } else {
        toast.error("Failed to update course. Please try again.")
      }
    } catch (error) {
      console.error("Error updating course:", error)
      toast.error("An error occurred. Please try again.")
    }
  }

  const isCompleted = (courseId: string) => {
    return userCourses.some(uc => uc.courseId === courseId && uc.completed)
  }

  const completedCourses = userCourses.filter(uc => uc.completed)
  const totalCredits = completedCourses.reduce((sum, uc) => sum + uc.course.credits, 0)
  const remainingCredits = 120 - totalCredits

  // Separate required courses and electives (with safety checks)
  const allRequiredCourses = Array.isArray(courses) ? courses.filter(course => 
    !course.category || !course.category.toLowerCase().includes('elective')
  ) : []
  const allElectives4000 = Array.isArray(courses) ? courses.filter(course => 
    course.category && course.category.toLowerCase().includes('4000-level elective')
  ) : []
  const allElectives5000 = Array.isArray(courses) ? courses.filter(course => 
    course.category && course.category.toLowerCase().includes('5000-level elective')
  ) : []

  // Filter courses based on search query
  const filterCourses = (courseList: Course[]) => {
    if (!searchQuery) return courseList
    return courseList.filter(course =>
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const requiredCourses = filterCourses(allRequiredCourses)
  const electives4000 = filterCourses(allElectives4000)
  const electives5000 = filterCourses(allElectives5000)

  // Debug logging
  console.log('Total courses:', Array.isArray(courses) ? courses.length : 'NOT AN ARRAY')
  console.log('Courses type:', typeof courses)
  console.log('Required courses:', requiredCourses.length)
  console.log('4000-level electives:', electives4000.length)
  console.log('5000-level electives:', electives5000.length)
  if (Array.isArray(courses) && courses.length > 0) {
    console.log('Sample course:', courses[0])
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 font-medium">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* UCF-style Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center justify-between w-full">
              <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md" aria-label="UCF Course Planner home">
                <span className="hidden sm:inline">UCF CS/IT Course Planner</span>
                <span className="sm:hidden">UCF Planner</span>
              </Link>
              <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1" role="tablist" aria-label="Page navigation">
                <button className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-white text-primary shadow-sm" role="tab" aria-selected="true">
                  Classes
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/schedule')}
                  className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  role="tab"
                  aria-selected="false"
                >
                  Schedule
                </Button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {/* Page Title */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Degree Progress Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Track your completed courses and plan your path to graduation
              </p>
            </div>
            <div>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 text-sm font-medium cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto"
                onClick={() => router.push('/schedule')}
                aria-label="Generate course schedule for degree plan"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Generate Schedule
                </span>
              </Button>
            </div>
          </div>
        </section>

        {/* Progress Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8" aria-label="Progress summary">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-default group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary/90 transition-colors">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                  {completedCourses.length}/{courses.length}
                </div>
                <p className="text-sm text-gray-600">Courses Completed</p>
                {completedCourses.length > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(completedCourses.length / courses.length) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-default group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {totalCredits}/120
                </div>
                <p className="text-sm text-gray-600">Credit Hours</p>
                {totalCredits > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totalCredits / 120) * 100, 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-default group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  remainingCredits <= 0 
                    ? 'bg-green-500 group-hover:bg-green-600' 
                    : 'bg-red-500 group-hover:bg-red-600'
                }`}>
                  {remainingCredits <= 0 ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <div className={`text-2xl font-bold transition-colors ${
                  remainingCredits <= 0 
                    ? 'text-gray-900 group-hover:text-green-600' 
                    : 'text-gray-900 group-hover:text-red-600'
                }`}>
                  {remainingCredits <= 0 ? '🎓 Done!' : remainingCredits}
                </div>
                <p className="text-sm text-gray-600">
                  {remainingCredits <= 0 ? 'Ready to Graduate!' : 'Credit Hours Remaining'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="mb-6">
          <div className="relative max-w-md">
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
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              Showing results for &quot;<span className="font-medium">{searchQuery}</span>&quot;
              {requiredCourses.length + electives4000.length + electives5000.length === 0 && (
                <span className="text-orange-600"> - No courses found</span>
              )}
            </p>
          )}
        </section>

        {/* Tab Navigation */}
        <section className="bg-white rounded-lg shadow border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto" role="tablist" aria-label="Course categories">
              <button
                onClick={() => setActiveTab('required')}
                className={`py-4 px-4 sm:px-6 text-sm font-medium border-b-2 transition-all duration-300 cursor-pointer hover:bg-gray-50 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap ${
                  activeTab === 'required'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === 'required'}
                aria-controls="required-panel"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Required Courses ({requiredCourses.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('electives')}
                className={`py-4 px-4 sm:px-6 text-sm font-medium border-b-2 transition-all duration-300 cursor-pointer hover:bg-gray-50 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap ${
                  activeTab === 'electives'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === 'electives'}
                aria-controls="electives-panel"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Electives ({electives4000.length + electives5000.length})
                </span>
              </button>
            </nav>
          </div>

          {/* Required Courses Tab */}
          {activeTab === 'required' && (
            <div role="tabpanel" id="required-panel" aria-labelledby="required-tab">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Required Courses</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Core courses required for the UCF CS/IT degree. All of these must be completed.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {requiredCourses.map((course) => {
                    const completed = isCompleted(course.id)
                    return (
                      <div 
                        key={course.id} 
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-95 ${
                          completed 
                            ? 'bg-primary/10 border-primary/30 shadow-sm hover:bg-primary/15 hover:border-primary/40' 
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:scale-[1.02]'
                        }`}
                        onClick={() => handleCourseToggle(course.id, !completed)}
                      >
                        <Checkbox 
                          checked={completed}
                          onCheckedChange={(checked) => 
                            handleCourseToggle(course.id, checked as boolean)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900">
                                {course.code}
                              </h4>
                              <p className={`text-sm mt-1 ${
                                completed ? 'text-gray-700' : 'text-gray-600'
                              }`}>
                                {course.name}
                              </p>
                              {course.category && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${
                                  completed 
                                    ? 'bg-blue-200 text-blue-900' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {course.category}
                                </span>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <span className="text-sm font-medium text-gray-900">
                                {course.credits} credit{course.credits !== 1 ? 's' : ''}
                              </span>
                              {course.gepRequirement && (
                                <div className="mt-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    completed 
                                      ? 'bg-primary/80 text-black' 
                                      : 'bg-primary text-black'
                                  }`}>
                                    GEP
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Electives Tab */}
          {activeTab === 'electives' && (
            <div role="tabpanel" id="electives-panel" aria-labelledby="electives-tab">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Elective Courses</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Choose from 4000-level and 5000-level electives to fulfill degree requirements.
                </p>
              </div>
              <div className="p-6 space-y-8">
                {/* 4000-Level Electives Section */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">4000-Level Electives</h4>
                    <p className="text-sm text-gray-600">
                      Choose 2 courses from undergraduate-level CS/IT electives (4000-4899 level)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {electives4000.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        No 4000-level electives found. Debug info: {JSON.stringify({
                          totalCourses: courses.length,
                          electivesFound: courses.filter(c => c.isElective).length,
                          level4000Found: courses.filter(c => c.electiveLevel === '4000_level').length
                        })}
                      </div>
                    )}
                    {electives4000.map((course) => {
                      const completed = isCompleted(course.id)
                      return (
                        <div 
                          key={course.id} 
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-95 ${
                            completed 
                              ? 'bg-green-50 border-green-200 shadow-sm hover:bg-green-100 hover:border-green-300' 
                              : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:scale-[1.01]'
                          }`}
                          onClick={() => handleCourseToggle(course.id, !completed)}
                        >
                          <Checkbox 
                            checked={completed}
                            onCheckedChange={(checked) => 
                              handleCourseToggle(course.id, checked as boolean)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">
                                  {course.code}
                                </h4>
                                <p className={`text-sm mt-1 ${
                                  completed ? 'text-gray-700' : 'text-gray-600'
                                }`}>
                                  {course.name}
                                </p>
                                {course.description && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {course.description}
                                  </p>
                                )}
                                {course.note && (
                                  <p className="text-xs text-orange-600 mt-1 font-medium">
                                    {course.note}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <span className="text-sm font-medium text-gray-900">
                                  {course.credits} credit{course.credits !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 5000-Level Electives Section */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">5000-Level Graduate Electives</h4>
                    <p className="text-sm text-gray-600">
                      Advanced graduate-level courses (requires 3.0+ GPA and CS Foundation Exam)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {electives5000.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        No 5000-level electives found. Debug info: {JSON.stringify({
                          totalCourses: courses.length,
                          electivesFound: courses.filter(c => c.isElective).length,
                          level5000Found: courses.filter(c => c.electiveLevel === '5000_level').length
                        })}
                      </div>
                    )}
                    {electives5000.map((course) => {
                      const completed = isCompleted(course.id)
                      return (
                        <div 
                          key={course.id} 
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-95 ${
                            completed 
                              ? 'bg-purple-50 border-purple-200 shadow-sm hover:bg-purple-100 hover:border-purple-300' 
                              : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:scale-[1.01]'
                          }`}
                          onClick={() => handleCourseToggle(course.id, !completed)}
                        >
                          <Checkbox 
                            checked={completed}
                            onCheckedChange={(checked) => 
                              handleCourseToggle(course.id, checked as boolean)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">
                                  {course.code}
                                </h4>
                                <p className={`text-sm mt-1 ${
                                  completed ? 'text-gray-700' : 'text-gray-600'
                                }`}>
                                  {course.name}
                                </p>
                                {course.description && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {course.description}
                                  </p>
                                )}
                                {course.note && (
                                  <p className="text-xs text-orange-600 mt-1 font-medium">
                                    {course.note}
                                  </p>
                                )}
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                                  Graduate Level
                                </span>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <span className="text-sm font-medium text-gray-900">
                                  {course.credits} credit{course.credits !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>


      </main>
    </div>
  )
}