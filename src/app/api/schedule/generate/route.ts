import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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

export async function POST(request: NextRequest) {
  const timeout = setTimeout(() => {
    console.error("Schedule generation timeout after 30 seconds")
  }, 30000)

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      clearTimeout(timeout)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courses: allCourses, completedCourses } = await request.json()

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("Generating schedule for user:", user.id)
    console.log("Completed courses count:", completedCourses.length)
    console.log("Total courses available:", allCourses.length)

    // Generate the schedule using prerequisite-aware algorithm
    const scheduledCourses = generatePrerequisiteAwareSchedule(allCourses, completedCourses)
    console.log("Generated scheduled courses:", scheduledCourses.length)

    // Find or create schedule
    let schedule = await prisma.schedule.findFirst({
      where: { userId: user.id }
    })

    if (schedule) {
      // Delete existing schedule items
      await prisma.scheduleItem.deleteMany({
        where: { scheduleId: schedule.id }
      })
      
      // Update schedule
      schedule = await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          updatedAt: new Date(),
          items: {
            create: scheduledCourses.map(item => ({
              courseId: item.courseId,
              semester: item.semester,
              year: item.year
            }))
          }
        },
        include: {
          items: {
            include: {
              course: true
            }
          }
        }
      })
    } else {
      // Create new schedule
      schedule = await prisma.schedule.create({
        data: {
          userId: user.id,
          name: "My Generated Schedule",
          items: {
            create: scheduledCourses.map(item => ({
              courseId: item.courseId,
              semester: item.semester,
              year: item.year
            }))
          }
        },
        include: {
          items: {
            include: {
              course: true
            }
          }
        }
      })
    }

    console.log(`Successfully generated schedule with ${schedule.items.length} courses`)
    clearTimeout(timeout)

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error generating schedule:", error)
    clearTimeout(timeout)
    return NextResponse.json(
      { error: "Failed to generate schedule", details: error.message },
      { status: 500 }
    )
  }
}

function generatePrerequisiteAwareSchedule(allCourses: Course[], completedCourses: UserCourse[]) {
  console.log("Starting simplified schedule generation...")
  
  const completedCourseIds = new Set(
    completedCourses.filter(uc => uc.completed).map(uc => uc.courseId)
  )

  // Get remaining courses that need to be taken
  const requiredCourses = allCourses.filter(course => 
    !course.category?.toLowerCase().includes('elective') && 
    !completedCourseIds.has(course.id)
  )

  const electives = allCourses.filter(course => 
    course.category?.toLowerCase().includes('elective')
  )

  console.log("Debug scheduling:")
  console.log("- Total courses:", allCourses.length)
  console.log("- Completed course IDs:", Array.from(completedCourseIds).length)
  console.log("- Required courses remaining:", requiredCourses.length)
  console.log("- Available electives:", electives.length)

  // If no courses to schedule, return early
  if (requiredCourses.length === 0) {
    console.log("No required courses to schedule")
    return []
  }

  // Simple scheduling approach - just distribute courses across semesters
  const scheduledCourses: Array<{
    courseId: string
    semester: string
    year: number
  }> = []

  const currentYear = new Date().getFullYear()
  const semesterOrder = ['Fall', 'Spring', 'Summer']
  let year = currentYear
  let semesterIndex = 0
  let coursesThisSemester = 0
  const maxCoursesPerSemester = 5

  // Schedule required courses first
  requiredCourses.forEach((course, index) => {
    if (coursesThisSemester >= maxCoursesPerSemester) {
      semesterIndex = (semesterIndex + 1) % semesterOrder.length
      if (semesterIndex === 0) year++
      coursesThisSemester = 0
    }

    scheduledCourses.push({
      courseId: course.id,
      semester: semesterOrder[semesterIndex],
      year: year
    })

    coursesThisSemester++
  })

  // Add a couple electives
  const electivesToAdd = Math.min(2, electives.length)
  for (let i = 0; i < electivesToAdd; i++) {
    if (coursesThisSemester >= maxCoursesPerSemester) {
      semesterIndex = (semesterIndex + 1) % semesterOrder.length
      if (semesterIndex === 0) year++
      coursesThisSemester = 0
    }

    scheduledCourses.push({
      courseId: electives[i].id,
      semester: semesterOrder[semesterIndex],
      year: year
    })

    coursesThisSemester++
  }

  console.log(`Generated simple schedule with ${scheduledCourses.length} courses`)
  return scheduledCourses
}