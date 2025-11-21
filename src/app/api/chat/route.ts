import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { GoogleGenerativeAI } from "@google/generative-ai"

const prisma = new PrismaClient()

// Cache for course catalog (refreshes every 5 minutes)
let courseCatalogCache: {
  data: string | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limiting: Track last request time per user
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 2000 // 2 seconds between requests

// Helper function to get or build course catalog
async function getCourseCatalog(): Promise<string> {
  const now = Date.now()

  // Return cached data if still valid
  if (courseCatalogCache.data && now - courseCatalogCache.timestamp < CACHE_TTL) {
    return courseCatalogCache.data
  }

  // Fetch and build course catalog
  const allCourses = await prisma.course.findMany({
    include: {
      prerequisites: {
        include: {
          prerequisite: {
            include: {
              alternatives: {
                include: {
                  alternative: true
                }
              }
            }
          }
        }
      },
      corequisites: {
        include: {
          corequisite: true
        }
      }
    }
  })

  const courseDetails = allCourses.map(course => {
    const prereqs = course.prerequisites.map(p => {
      if (p.prerequisite.alternatives && p.prerequisite.alternatives.length > 0) {
        const alts = p.prerequisite.alternatives.map(a => a.alternative.code).join(' OR ')
        return `${p.prerequisite.code} (alternatives: ${alts})`
      }
      return p.prerequisite.code
    })

    const coreqs = course.corequisites.map(c => c.corequisite.code)

    let courseInfo = `${course.code}: ${course.name} (${course.credits} credits)`
    if (prereqs.length > 0) courseInfo += ` | Prerequisites: ${prereqs.join(', ')}`
    if (coreqs.length > 0) courseInfo += ` | Corequisites: ${coreqs.join(', ')}`
    if (course.isElective) courseInfo += ` | ELECTIVE`

    return courseInfo
  }).join('\n')

  // Update cache
  courseCatalogCache.data = courseDetails
  courseCatalogCache.timestamp = now

  return courseDetails
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Chat API] Request received at:", new Date().toISOString())

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Chat API] User:", session.user.email)

    // Rate limiting check
    const userEmail = session.user.email
    const now = Date.now()
    const lastRequestTime = rateLimitMap.get(userEmail)

    if (lastRequestTime && now - lastRequestTime < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastRequestTime)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${waitTime} seconds before sending another message.` },
        { status: 429 }
      )
    }

    rateLimitMap.set(userEmail, now)

    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch user's completed courses
    const userCourses = await prisma.userCourse.findMany({
      where: { userId: user.id },
      include: {
        course: true
      }
    })

    const completedCourses = userCourses.filter(uc => uc.completed)

    // Fetch user's schedules (limit to most recent one)
    const schedules = await prisma.schedule.findMany({
      where: { userId: user.id },
      take: 1,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
                credits: true
              }
            }
          }
        }
      }
    })

    // Fetch basic course info for progress calculation (no deep includes)
    const allCourses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        credits: true,
        isElective: true,
        electiveLevel: true
      }
    })

    // Calculate degree progress
    const completedCourseIds = new Set(completedCourses.map(uc => uc.courseId))
    const requiredCourses = allCourses.filter(c => !c.isElective)
    const electiveCourses = allCourses.filter(c => c.isElective)

    const completedRequired = requiredCourses.filter(c => completedCourseIds.has(c.id))
    const remainingRequired = requiredCourses.filter(c => !completedCourseIds.has(c.id))

    const completedElectives = electiveCourses.filter(c => completedCourseIds.has(c.id))
    const totalCreditsCompleted = completedCourses.reduce((sum, uc) => sum + uc.course.credits, 0)
    const creditsRemaining = 120 - totalCreditsCompleted

    // Categorize electives
    const elective4000 = electiveCourses.filter(c => c.electiveLevel === '4000_level')
    const completed4000Electives = elective4000.filter(c => completedCourseIds.has(c.id))

    // Calculate electives needed (UCF IT degree requires 2 electives per flowchart)
    const electivesNeeded = 2
    const electivesRemaining = Math.max(0, electivesNeeded - completedElectives.length)

    // Build comprehensive context for AI - single API call approach prevents 429 errors
    const context = `You are an academic advisor for DegreeMe, a UCF CS/IT degree planning application.

STUDENT PROGRESS SUMMARY:
- Total Credits: ${totalCreditsCompleted}/120 (${creditsRemaining} remaining)
- Required Courses: ${completedRequired.length}/${requiredCourses.length} completed (${remainingRequired.length} remaining)
- Electives: ${completedElectives.length}/${electivesNeeded} completed (${electivesRemaining} remaining)
- 4000-level Electives: ${completed4000Electives.length} completed

COMPLETED COURSES (${completedCourses.length} total):
${completedCourses.map(uc => `- ${uc.course.code}: ${uc.course.name} (${uc.course.credits} credits)`).join('\n')}

REMAINING REQUIRED COURSES (${remainingRequired.length} courses):
${remainingRequired.map(c => `- ${c.code}: ${c.name} (${c.credits} credits)`).join('\n')}

${schedules.length > 0 ? `CURRENT SCHEDULE:
${schedules[0].items.map(item =>
  `${item.semester} ${item.year}: ${item.course.code} - ${item.course.name} (${item.course.credits} credits)`
).join('\n')}` : 'No schedule generated yet.'}

DEGREE REQUIREMENTS:
- Total Credits: 120
- Required Core Courses: ${requiredCourses.length} courses
- Electives: 2 CS/IT 3/4xxx restricted electives
- Minimum Grade: C (2.0) in all major courses

Respond in plain text only. Be concise, friendly, and helpful.`

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

    // Build conversation history (limit to last 5 messages to reduce size)
    const chatHistory = conversationHistory || []
    const recentHistory = chatHistory.slice(-5)
    const historyText = recentHistory.length > 0
      ? "\n\nRECENT CONVERSATION:\n" + recentHistory.map((msg: { role: string; content: string }) =>
          `${msg.role === "user" ? "Student" : "Advisor"}: ${msg.content}`
        ).join("\n")
      : ""

    // SINGLE API CALL - combine everything into one request to avoid rapid-fire 429 errors
    const prompt = `${context}${historyText}\n\nStudent: ${message}\nAdvisor:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ response })
  } catch (error: unknown) {
    console.error("Error in chat API:", error)

    // Handle Gemini API rate limiting
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("429") || errorMessage.includes("Resource exhausted")) {
      return NextResponse.json(
        { error: "The AI service is currently experiencing high demand. Please try again in a moment." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Failed to get response from AI. Please try again." },
      { status: 500 }
    )
  }
}
