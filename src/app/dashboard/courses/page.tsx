"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
}

export default function CourseCatalog() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")

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

  const isCompleted = (courseId: string) => {
    return userCourses.some(uc => uc.courseId === courseId && uc.completed)
  }

  const filterCourses = (courseList: Course[]) => {
    let filtered = courseList

    // Filter by category
    if (filterCategory !== "all") {
      if (filterCategory === "required") {
        filtered = filtered.filter(c => !c.isElective)
      } else if (filterCategory === "elective") {
        filtered = filtered.filter(c => c.isElective)
      } else if (filterCategory === "gep") {
        filtered = filtered.filter(c => c.gepRequirement)
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    return filtered
  }

  const filteredCourses = filterCourses(courses)

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
                <Link href="/dashboard/courses" className="text-black transition-all-smooth border-b-2 border-black pb-1">
                  Courses
                </Link>
                <Link href="/dashboard/roadmap" className="text-black/70 hover:text-black transition-all-smooth pb-1">
                  Roadmap
                </Link>
                <Link href="/dashboard/progress" className="text-black/70 hover:text-black transition-all-smooth pb-1">
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
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-semibold text-black mb-3 tracking-tight">
              Course Catalog
            </h1>
            <p className="text-[19px] text-muted-foreground">
              Explore the UCF CS/IT curriculum and learn about each course
            </p>
          </div>

          {/* Search and Filter */}
          <Card className="border-black/10 bg-white mb-8 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search courses by code, name, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 text-[14px] bg-white border-black/20 focus:border-black/30"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFilterCategory("all")}
                    className={`rounded-full text-[13px] border-2 hover:bg-gray-50 transition-all-smooth ${
                      filterCategory === "all"
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white text-black border-black/20 hover:text-black"
                    }`}
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFilterCategory("required")}
                    className={`rounded-full text-[13px] border-2 hover:bg-gray-50 transition-all-smooth ${
                      filterCategory === "required"
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white text-black border-black/20 hover:text-black"
                    }`}
                  >
                    Required
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFilterCategory("elective")}
                    className={`rounded-full text-[13px] border-2 hover:bg-gray-50 transition-all-smooth ${
                      filterCategory === "elective"
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white text-black border-black/20 hover:text-black"
                    }`}
                  >
                    Electives
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFilterCategory("gep")}
                    className={`rounded-full text-[13px] border-2 hover:bg-gray-50 transition-all-smooth ${
                      filterCategory === "gep"
                        ? "bg-black text-white hover:bg-black/90 border-black"
                        : "bg-white text-black border-black/20 hover:text-black"
                    }`}
                  >
                    GEP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course List */}
          <div className="space-y-4">
            {filteredCourses.map(course => (
              <Card key={course.id} className="border-black/10 bg-white hover:shadow-lg transition-all-smooth shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl text-black">{course.code}</CardTitle>
                        <Badge variant="secondary" className="text-xs font-semibold bg-gray-100 text-gray-700 border-gray-200">
                          {course.credits} credits
                        </Badge>
                        {isCompleted(course.id) && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            Completed
                          </Badge>
                        )}
                        {course.gepRequirement && (
                          <Badge variant="outline" className="text-xs border-black/20 text-black">GEP</Badge>
                        )}
                        {course.isElective && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                            Elective
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-[15px] font-medium text-black">
                        {course.name}
                      </CardDescription>
                    </div>
                    <Link href={`/dashboard/roadmap?course=${course.code}`}>
                      <Button variant="outline" size="sm" className="ml-4 rounded-full text-[12px] bg-white border-black/20 hover:bg-gray-50 text-black hover:text-black transition-all-smooth" title="View in roadmap">
                        View in Roadmap
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {course.description && (
                    <p className="text-[14px] text-muted-foreground mb-4 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[13px] font-semibold text-black mr-2">Prerequisites:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {course.prerequisites.map((prereq, index) => (
                          <Badge key={index} variant="outline" className="text-[12px] border-black/20 text-black">
                            {prereq.prerequisite.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {course.note && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-[13px] text-blue-800">
                        <span className="font-semibold">Note:</span> {course.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <Card className="border-black/10 bg-white">
              <CardContent className="py-16 text-center">
                <svg className="w-16 h-16 mx-auto text-black/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-black mb-2">No courses found</h3>
                <p className="text-[14px] text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? `No courses match "${searchQuery}". Try adjusting your search.`
                    : "No courses available in this category."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
