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

    // Separate required and elective courses (4000 level and below only)
    const allRequiredCourses = allCourses.filter((course: Course) => !course.isElective)
    const fourThousandLevelElectives = allCourses.filter((course: Course) =>
      course.isElective && course.electiveLevel === '4000_level'
    )

    // Generate 3 different schedule variations with different elective combinations
    const scheduleVariations: Array<{
      name: string
      scheduledCourses: Array<{courseId: string, semester: string, year: number}>
      electiveIds: string[]
    }> = []

    // Variation 1: First 3 4000-level electives
    if (fourThousandLevelElectives.length >= 3) {
      const electives = fourThousandLevelElectives.slice(0, 3)
      const scheduled = generatePrerequisiteAwareSchedule(allCourses, completedCourses, electives)
      scheduleVariations.push({
        name: "Recommended Path",
        scheduledCourses: scheduled,
        electiveIds: electives.map(e => e.id)
      })
    }

    // Variation 2: Different 4000-level electives (options 4-6)
    if (fourThousandLevelElectives.length >= 6) {
      const electives = fourThousandLevelElectives.slice(3, 6)
      const scheduled = generatePrerequisiteAwareSchedule(allCourses, completedCourses, electives)
      scheduleVariations.push({
        name: "Alternative Path 1",
        scheduledCourses: scheduled,
        electiveIds: electives.map(e => e.id)
      })
    }

    // Variation 3: Mix of different 4000-level electives
    if (fourThousandLevelElectives.length >= 9) {
      const electives = [
        fourThousandLevelElectives[0],
        fourThousandLevelElectives[6],
        fourThousandLevelElectives[8]
      ]
      const scheduled = generatePrerequisiteAwareSchedule(allCourses, completedCourses, electives)
      scheduleVariations.push({
        name: "Alternative Path 2",
        scheduledCourses: scheduled,
        electiveIds: electives.map(e => e.id)
      })
    }

    // If no variations were generated (not enough electives), generate a default schedule
    if (scheduleVariations.length === 0) {
      const electives = fourThousandLevelElectives.slice(0, Math.min(3, fourThousandLevelElectives.length))
      const scheduled = generatePrerequisiteAwareSchedule(allCourses, completedCourses, electives)
      scheduleVariations.push({
        name: "My Schedule",
        scheduledCourses: scheduled,
        electiveIds: electives.map(e => e.id)
      })
    }

    console.log(`Generated ${scheduleVariations.length} schedule variations`)

    // Delete all existing schedules for this user
    await prisma.schedule.deleteMany({
      where: { userId: user.id }
    })

    // Create all schedule variations
    const createdSchedules = []
    for (const variation of scheduleVariations) {
      const schedule = await prisma.schedule.create({
        data: {
          userId: user.id,
          name: variation.name,
          items: {
            create: variation.scheduledCourses.map(item => ({
              courseId: item.courseId,
              semester: item.semester,
              year: item.year
            }))
          }
        },
        include: {
          items: {
            include: {
              course: {
                include: {
                  prerequisites: {
                    include: {
                      prerequisite: true
                    }
                  },
                  corequisites: {
                    include: {
                      corequisite: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      createdSchedules.push(schedule)
      console.log(`Created schedule "${variation.name}" with ${schedule.items.length} courses`)
    }

    // Return the first schedule as the primary one (for backwards compatibility)
    const primarySchedule = createdSchedules[0]
    console.log(`Successfully generated ${createdSchedules.length} schedules`)
    clearTimeout(timeout)

    return NextResponse.json({
      schedule: primarySchedule,
      schedules: createdSchedules
    })
  } catch (error) {
    console.error("Error generating schedule:", error)
    clearTimeout(timeout)
    return NextResponse.json(
      { error: "Failed to generate schedule", details: error.message },
      { status: 500 }
    )
  }
}

function generatePrerequisiteAwareSchedule(
  allCourses: Course[],
  completedCourses: UserCourse[],
  selectedElectives: Course[]
) {
  console.log("Starting NEW prerequisite-aware schedule generation...")

  const completedCourseIds = new Set(
    completedCourses.filter(uc => uc.completed).map(uc => uc.courseId)
  )

  // Step 1: Separate required courses using isElective field
  const allRequiredCourses = allCourses.filter(course => !course.isElective && !completedCourseIds.has(course.id))

  console.log("Course breakdown:")
  console.log("- Completed:", completedCourseIds.size)
  console.log("- Required remaining:", allRequiredCourses.length)
  console.log("- Selected electives:", selectedElectives.length, selectedElectives.map(e => e.code).join(', '))

  // Step 2: Handle alternatives - only include ONE course from each alternatives group
  // Build alternatives graph using the JSON data
  const alternativesGraph = new Map<string, Set<string>>()
  allCourses.forEach(course => {
    // In our data structure, alternatives would need to be loaded from the database
    // For now, we'll handle common cases manually
    const knownAlternatives = [
      ['MAC1105C', 'MAC1140'],  // College Algebra alternatives
      ['ENC3241', 'ENC3250'],   // Technical Writing alternatives
    ]

    for (const altGroup of knownAlternatives) {
      if (altGroup.includes(course.code)) {
        const group = new Set(altGroup.map(code => {
          const c = allCourses.find(ac => ac.code === code)
          return c?.id || ''
        }).filter(id => id !== ''))
        alternativesGraph.set(course.id, group)
      }
    }
  })

  // Filter out alternatives that are already completed or scheduled
  const requiredCoursesFiltered: Course[] = []
  const processedAlternatives = new Set<string>()

  for (const course of allRequiredCourses) {
    const alternatives = alternativesGraph.get(course.id)

    if (alternatives) {
      // Check if any alternative was already processed or completed
      const anyCompleted = Array.from(alternatives).some(altId =>
        completedCourseIds.has(altId) || processedAlternatives.has(altId)
      )

      if (!anyCompleted) {
        // Include the first course from the alternatives group
        requiredCoursesFiltered.push(course)
        alternatives.forEach(altId => processedAlternatives.add(altId))
      }
    } else {
      // Not part of alternatives group, include it
      requiredCoursesFiltered.push(course)
    }
  }

  console.log(`After alternatives filtering: ${requiredCoursesFiltered.length} required courses`)

  // Step 3: Combine all courses to schedule (required + selected electives)
  const allCoursesToSchedule = [
    ...requiredCoursesFiltered,
    ...selectedElectives.filter(e => !completedCourseIds.has(e.id))
  ]

  console.log(`Total courses to schedule: ${allCoursesToSchedule.length}`)

  // Step 4: Create prerequisite and corequisite mappings
  const prerequisiteMap = new Map<string, string[]>()
  const corequisiteMap = new Map<string, string[]>()

  allCoursesToSchedule.forEach(course => {
    if (course.prerequisites && course.prerequisites.length > 0) {
      prerequisiteMap.set(course.id, course.prerequisites.map(p => p.prerequisite.id))
    }
    if (course.corequisites && course.corequisites.length > 0) {
      corequisiteMap.set(course.id, course.corequisites.map(c => c.corequisite.id))
    }
  })

  // Step 5: Generate semester timeline
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  // Determine starting semester (Fall if before July, Spring if July or later)
  const startSemester = currentMonth < 7 ? 'Fall' : 'Spring'
  const startYear = currentMonth < 7 ? currentYear : currentYear + 1

  const semesterOrder = ['Fall', 'Spring', 'Summer']
  const maxSemesters = 12 // Plan for up to 4 years (3 semesters per year)
  const semesterPlan: Array<{semester: string, year: number}> = []

  let semIndex = semesterOrder.indexOf(startSemester)
  let yearOffset = 0

  for (let i = 0; i < maxSemesters; i++) {
    const semester = semesterOrder[semIndex]
    const year = startYear + yearOffset

    // Skip summer semesters (most students don't take summer courses)
    if (semester !== 'Summer') {
      semesterPlan.push({ semester, year })
    }

    semIndex = (semIndex + 1) % semesterOrder.length
    if (semIndex === 0) yearOffset++
  }

  console.log(`Semester plan: ${semesterPlan.map(s => `${s.semester} ${s.year}`).join(', ')}`)

  // Step 6: Schedule courses with prerequisite and corequisite awareness
  const scheduledCourses: Array<{courseId: string, semester: string, year: number}> = []
  const scheduledCourseIds = new Set<string>([...completedCourseIds])

  for (let i = 0; i < semesterPlan.length; i++) {
    const semesterInfo = semesterPlan[i]
    const { semester, year } = semesterInfo
    console.log(`\n=== Planning ${semester} ${year} ===`)

    // Find available courses (prerequisites met, not yet scheduled)
    const availableCourses = allCoursesToSchedule.filter(course => {
      if (scheduledCourseIds.has(course.id)) return false

      const prereqs = prerequisiteMap.get(course.id) || []
      const prereqsMet = prereqs.every(prereqId => scheduledCourseIds.has(prereqId))

      return prereqsMet
    })

    // Calculate if we should consolidate BEFORE checking available courses
    const remainingCoursesCheck = allCoursesToSchedule.length - (scheduledCourseIds.size - completedCourseIds.size)
    const remainingSemestersCheck = semesterPlan.length - i
    const shouldConsolidateCheck = remainingCoursesCheck <= 8 && remainingCoursesCheck > 0
    const actualSemestersNeededCheck = Math.ceil(remainingCoursesCheck / 3)

    // Skip this semester if we're consolidating and don't need this many semesters
    if (shouldConsolidateCheck && i > actualSemestersNeededCheck - 1) {
      console.log(`Skipping ${semester} ${year} (consolidating ${remainingCoursesCheck} courses into ${actualSemestersNeededCheck} semesters)`)
      continue
    }

    if (availableCourses.length === 0) {
      console.log(`No courses available for ${semester} ${year}`)
      continue
    }

    console.log(`Available: ${availableCourses.map(c => c.code).join(', ')}`)

    // Separate required and elective courses
    const availableRequired = availableCourses.filter(c => !c.isElective)
    const availableElectives = availableCourses.filter(c => c.isElective)

    // Calculate remaining courses and semesters for better balancing
    const remainingCourses = allCoursesToSchedule.length - (scheduledCourseIds.size - completedCourseIds.size)
    const remainingSemesters = semesterPlan.length - i

    // If we have few courses left, pack them into fewer semesters (3+ courses each)
    const minCoursesPerSemester = 3
    const actualSemestersNeeded = Math.ceil(remainingCourses / minCoursesPerSemester)
    const shouldConsolidate = remainingCourses <= 8 && remainingCourses > 0

    let avgCoursesPerSemester: number
    if (shouldConsolidate) {
      // Pack remaining courses into fewer semesters to avoid sparse scheduling
      avgCoursesPerSemester = Math.ceil(remainingCourses / actualSemestersNeeded)
    } else {
      avgCoursesPerSemester = Math.max(4, Math.ceil(remainingCourses / remainingSemesters))
    }

    console.log(`Remaining: ${remainingCourses} courses over ${remainingSemesters} semesters (target: ${avgCoursesPerSemester} per semester, consolidate: ${shouldConsolidate})`)

    // Calculate how many electives and required courses we should aim for
    const totalElectivesRemaining = selectedElectives.filter(e => !scheduledCourseIds.has(e.id)).length
    const totalRequiredRemaining = allCoursesToSchedule.filter(c => !c.isElective && !scheduledCourseIds.has(c.id)).length

    const electivesPerSemester = Math.ceil(totalElectivesRemaining / Math.max(remainingSemesters, 1))
    const requiredPerSemester = Math.ceil(totalRequiredRemaining / Math.max(remainingSemesters, 1))

    console.log(`Target: ${requiredPerSemester} required + ${electivesPerSemester} electives = ${requiredPerSemester + electivesPerSemester} total`)

    // Group courses by corequisites
    const coursesToSchedule: Course[] = []
    const processedCoreqs = new Set<string>()
    let currentCredits = 0
    let requiredAdded = 0
    let electivesAdded = 0

    const minCredits = 9     // Minimum to stay enrolled
    const maxCredits = 18    // Maximum 18 credits per semester
    const targetCourses = Math.min(Math.max(avgCoursesPerSemester, 3), 6) // Aim for 3-6 courses per semester, minimum 3

    // Interleave required and elective courses for better distribution
    const interleavedCourses: Course[] = []
    let reqIndex = 0
    let electIndex = 0

    // Build interleaved list: prioritize required, but mix in electives
    while (reqIndex < availableRequired.length || electIndex < availableElectives.length) {
      // Add 2-3 required courses
      for (let i = 0; i < 2 && reqIndex < availableRequired.length; i++) {
        interleavedCourses.push(availableRequired[reqIndex++])
      }
      // Add 1 elective
      if (electIndex < availableElectives.length) {
        interleavedCourses.push(availableElectives[electIndex++])
      }
    }

    // Now schedule courses from the interleaved list
    for (const course of interleavedCourses) {
      if (processedCoreqs.has(course.id)) continue
      if (scheduledCourseIds.has(course.id)) continue

      // Check if we've scheduled enough courses for this semester
      if (coursesToSchedule.length >= targetCourses) break

      // Check if adding this course would exceed max credits
      const potentialCredits = currentCredits + course.credits

      // Get corequisites for this course
      const coreqs = corequisiteMap.get(course.id) || []
      const coreqCourses = coreqs
        .map(coreqId => allCoursesToSchedule.find(c => c.id === coreqId))
        .filter(c => c && !scheduledCourseIds.has(c.id) && !processedCoreqs.has(c.id)) as Course[]

      // Calculate total credits including corequisites
      const totalWithCoreqs = potentialCredits + coreqCourses.reduce((sum, c) => sum + c.credits, 0)

      // Only add if it doesn't exceed max credits
      if (totalWithCoreqs <= maxCredits) {
        coursesToSchedule.push(course)
        currentCredits += course.credits
        processedCoreqs.add(course.id)

        if (course.isElective) {
          electivesAdded++
        } else {
          requiredAdded++
        }

        // Add corequisites
        for (const coreqCourse of coreqCourses) {
          coursesToSchedule.push(coreqCourse)
          currentCredits += coreqCourse.credits
          processedCoreqs.add(coreqCourse.id)

          if (coreqCourse.isElective) {
            electivesAdded++
          } else {
            requiredAdded++
          }
        }
      }
    }

    // Schedule the selected courses
    for (const course of coursesToSchedule) {
      scheduledCourses.push({
        courseId: course.id,
        semester,
        year
      })
      scheduledCourseIds.add(course.id)
      console.log(`✓ ${course.code} (${course.credits} cr)`)
    }

    console.log(`${semester} ${year}: ${coursesToSchedule.length} courses (${requiredAdded} required + ${electivesAdded} electives), ${currentCredits} credits`)

    // Stop if all courses are scheduled
    if (scheduledCourseIds.size - completedCourseIds.size >= allCoursesToSchedule.length) {
      console.log("All courses scheduled!")
      break
    }
  }

  console.log(`\nGenerated schedule with ${scheduledCourses.length} courses`)

  // Deduplicate: keep only the last occurrence of each course (latest semester)
  const deduplicatedMap = new Map<string, {courseId: string, semester: string, year: number}>()
  for (const item of scheduledCourses) {
    deduplicatedMap.set(item.courseId, item)
  }
  const deduplicatedSchedule = Array.from(deduplicatedMap.values())

  if (deduplicatedSchedule.length !== scheduledCourses.length) {
    console.log(`⚠️  Removed ${scheduledCourses.length - deduplicatedSchedule.length} duplicate courses`)
  }

  return deduplicatedSchedule
}