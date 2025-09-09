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

  // Use required courses directly (alternatives handling removed due to missing property)
  const finalRequiredCourses = requiredCourses

  console.log(`Using ${finalRequiredCourses.length} required courses for scheduling`)

  // COMPLETELY REWRITTEN ALGORITHM FOR BETTER BALANCE AND CLARITY
  console.log("Starting new balanced prerequisite-aware scheduling...")
  
  // Step 1: Prepare all courses to be scheduled (required + electives)
  const allCoursesToSchedule = [...finalRequiredCourses]
  const maxElectives = Math.min(2, electives.length)
  for (let i = 0; i < maxElectives; i++) {
    allCoursesToSchedule.push(electives[i])
  }
  console.log(`Total courses to schedule: ${allCoursesToSchedule.length}`)
  
  // Step 2: Create prerequisite mapping
  const prerequisiteMap = new Map<string, string[]>()
  allCoursesToSchedule.forEach(course => {
    if (course.prerequisites && course.prerequisites.length > 0) {
      prerequisiteMap.set(course.id, course.prerequisites.map(p => p.prerequisite.id))
    }
  })
  
  // Step 3: Generate semester timeline (Fall 2025, Spring 2026, Fall 2026, etc.)
  const currentYear = new Date().getFullYear()
  const semesterOrder = ['Fall', 'Spring']  // Simplified to Fall/Spring only
  const maxSemesters = 8 // Plan for 4 years maximum
  const semesterPlan: Array<{semester: string, year: number}> = []
  
  for (let i = 0; i < maxSemesters; i++) {
    const semester = semesterOrder[i % 2]
    const year = currentYear + Math.floor(i / 2)
    semesterPlan.push({ semester, year })
  }
  
  console.log(`Semester plan:`, semesterPlan.map(s => `${s.semester} ${s.year}`))
  
  // Step 4: Schedule courses using balanced distribution
  const scheduledCourses: Array<{courseId: string, semester: string, year: number}> = []
  const scheduledCourseIds = new Set<string>([...completedCourseIds])
  const coursesPerSemesterTarget = 4 // Target 4 courses per semester for balance
  
  for (const semesterInfo of semesterPlan) {
    const { semester, year } = semesterInfo
    console.log(`\n=== Planning ${semester} ${year} ===`)
    
    // Find all courses available for this semester (prerequisites met)
    const availableCourses = allCoursesToSchedule.filter(course => {
      if (scheduledCourseIds.has(course.id)) return false // Already scheduled
      
      const prereqs = prerequisiteMap.get(course.id) || []
      const prereqsMet = prereqs.every(prereqId => scheduledCourseIds.has(prereqId))
      
      if (!prereqsMet) {
        const missingPrereqs = prereqs.filter(prereqId => !scheduledCourseIds.has(prereqId))
        console.log(`${course.code} blocked by prerequisites:`, missingPrereqs)
      }
      
      return prereqsMet
    })
    
    console.log(`Available courses: ${availableCourses.map(c => c.code).join(', ')}`)
    
    if (availableCourses.length === 0) {
      console.log(`No courses available for ${semester} ${year}, continuing...`)
      continue
    }
    
    // Prioritize 3-credit courses for balance, then others
    const threeCreditCourses = availableCourses.filter(c => c.credits === 3)
    const otherCourses = availableCourses.filter(c => c.credits !== 3)
    
    let coursesToScheduleThisSemester: Course[] = []
    
    // Add up to 4 three-credit courses first
    const threeCreditTarget = Math.min(4, threeCreditCourses.length)
    coursesToScheduleThisSemester.push(...threeCreditCourses.slice(0, threeCreditTarget))
    
    // Fill remaining slots with other courses (0-credit, 1-credit, etc.)
    const remainingSlots = coursesPerSemesterTarget - coursesToScheduleThisSemester.length
    coursesToScheduleThisSemester.push(...otherCourses.slice(0, remainingSlots))
    
    // Schedule the selected courses for this semester
    for (const course of coursesToScheduleThisSemester) {
      scheduledCourses.push({
        courseId: course.id,
        semester,
        year
      })
      scheduledCourseIds.add(course.id)
      console.log(`✓ Scheduled ${course.code} (${course.credits} credits)`)
    }
    
    const totalCredits = coursesToScheduleThisSemester.reduce((sum, c) => sum + c.credits, 0)
    console.log(`${semester} ${year}: ${coursesToScheduleThisSemester.length} courses, ${totalCredits} credits`)
    
    // Stop if we've scheduled all courses
    if (scheduledCourseIds.size - completedCourseIds.size >= allCoursesToSchedule.length) {
      console.log("All courses scheduled!")
      break
    }
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