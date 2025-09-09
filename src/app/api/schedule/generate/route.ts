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
  console.log("Starting prerequisite-aware schedule generation...")
  
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

  // Handle alternatives - don't schedule both courses if they're alternatives
  const alternativeMap = new Map<string, string[]>()
  allCourses.forEach(course => {
    if (course.alternatives && course.alternatives.length > 0) {
      const alternatives = course.alternatives.map(alt => alt.alternative.id)
      alternativeMap.set(course.id, alternatives)
    }
  })

  // Remove alternatives from required courses if we've already completed one
  const filteredRequiredCourses = requiredCourses.filter(course => {
    // Check if any alternative to this course is already completed
    const alternatives = alternativeMap.get(course.id) || []
    const hasCompletedAlternative = alternatives.some(altId => completedCourseIds.has(altId))
    return !hasCompletedAlternative
  })

  // Also remove courses that are alternatives to already selected courses
  const finalRequiredCourses = []
  const selectedCourseIds = new Set<string>()

  for (const course of filteredRequiredCourses) {
    const alternatives = alternativeMap.get(course.id) || []
    const hasSelectedAlternative = alternatives.some(altId => selectedCourseIds.has(altId))
    
    if (!hasSelectedAlternative) {
      finalRequiredCourses.push(course)
      selectedCourseIds.add(course.id)
      // Mark alternatives as selected to avoid scheduling them
      alternatives.forEach(altId => selectedCourseIds.add(altId))
    }
  }

  console.log(`Filtered ${requiredCourses.length} courses down to ${finalRequiredCourses.length} after handling alternatives`)

  // Create prerequisite map for easier lookup
  const prerequisiteMap = new Map<string, string[]>()
  finalRequiredCourses.forEach(course => {
    if (course.prerequisites && course.prerequisites.length > 0) {
      prerequisiteMap.set(course.id, course.prerequisites.map(p => p.prerequisite.id))
    }
  })

  // Topological sort to respect prerequisites
  const scheduledCourses: Array<{
    courseId: string
    semester: string
    year: number
  }> = []

  const currentYear = new Date().getFullYear()
  const semesterOrder = ['Fall', 'Spring', 'Summer']
  
  // Track what's been scheduled and what's available each semester
  const scheduledCourseIds = new Set<string>([...completedCourseIds])
  
  let year = currentYear
  let semesterIndex = 0
  let coursesScheduled = 0
  const maxCoursesPerSemester = 5
  const maxIterations = 20 // Prevent infinite loops

  for (let iteration = 0; iteration < maxIterations && coursesScheduled < finalRequiredCourses.length; iteration++) {
    const semester = semesterOrder[semesterIndex % semesterOrder.length]
    const semesterYear = currentYear + Math.floor(semesterIndex / semesterOrder.length)
    
    console.log(`Planning ${semester} ${semesterYear} (iteration ${iteration})`)
    
    let coursesThisSemester = 0
    const availableCourses = finalRequiredCourses.filter(course => {
      // Skip if already scheduled
      if (scheduledCourseIds.has(course.id)) return false
      
      // Check if all prerequisites are met
      const prereqs = prerequisiteMap.get(course.id) || []
      const allPrereqsMet = prereqs.every(prereqId => scheduledCourseIds.has(prereqId))
      
      return allPrereqsMet
    })

    console.log(`Available courses for ${semester} ${semesterYear}:`, availableCourses.map(c => c.code))

    // Schedule available courses for this semester
    for (const course of availableCourses) {
      if (coursesThisSemester >= maxCoursesPerSemester) break
      
      scheduledCourses.push({
        courseId: course.id,
        semester: semester,
        year: semesterYear
      })
      
      scheduledCourseIds.add(course.id)
      coursesThisSemester++
      coursesScheduled++
      
      console.log(`Scheduled ${course.code} for ${semester} ${semesterYear}`)
    }
    
    // Move to next semester
    semesterIndex++
  }

  // Add electives to fill remaining slots in existing semesters
  const minElectives = Math.min(3, electives.length) // Reasonable number of electives
  let electivesAdded = 0
  
  // First, try to fill existing semesters that have space
  const semesterGroups = new Map<string, Array<{courseId: string, semester: string, year: number}>>()
  scheduledCourses.forEach(course => {
    const key = `${course.semester}-${course.year}`
    if (!semesterGroups.has(key)) {
      semesterGroups.set(key, [])
    }
    semesterGroups.get(key)!.push(course)
  })
  
  // Fill existing semesters that have space
  for (const [semesterKey, courses] of semesterGroups) {
    if (electivesAdded >= minElectives) break
    
    const spacesAvailable = maxCoursesPerSemester - courses.length
    const electivesToAddHere = Math.min(spacesAvailable, minElectives - electivesAdded)
    
    for (let i = 0; i < electivesToAddHere && electivesAdded < electives.length; i++) {
      scheduledCourses.push({
        courseId: electives[electivesAdded].id,
        semester: courses[0].semester,
        year: courses[0].year
      })
      console.log(`Scheduled elective ${electives[electivesAdded].code} for ${courses[0].semester} ${courses[0].year}`)
      electivesAdded++
    }
  }
  
  // If we still need more electives, create new semesters
  while (electivesAdded < minElectives && electivesAdded < electives.length) {
    const semester = semesterOrder[semesterIndex % semesterOrder.length]
    const semesterYear = currentYear + Math.floor(semesterIndex / semesterOrder.length)
    
    scheduledCourses.push({
      courseId: electives[electivesAdded].id,
      semester: semester,
      year: semesterYear
    })
    console.log(`Scheduled elective ${electives[electivesAdded].code} for ${semester} ${semesterYear}`)
    electivesAdded++
    semesterIndex++
  }

  console.log(`Generated prerequisite-aware schedule with ${scheduledCourses.length} courses`)
  console.log(`Courses by semester:`)
  const bySemester = new Map<string, number>()
  scheduledCourses.forEach(sc => {
    const key = `${sc.semester} ${sc.year}`
    bySemester.set(key, (bySemester.get(key) || 0) + 1)
  })
  bySemester.forEach((count, semester) => {
    console.log(`  ${semester}: ${count} courses`)
  })

  return scheduledCourses
}