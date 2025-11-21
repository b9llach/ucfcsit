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
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Get course catalog from cache (this is the expensive query)
    const courseDetails = await getCourseCatalog()

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

    // Build context for AI
    const context = `You are an academic advisor assistant working for DegreeMe, a UCF CS/IT degree planning application. You have access to the following information about the student:

DEGREE PROGRESS SUMMARY:
- Total Credits: ${totalCreditsCompleted}/120 (${creditsRemaining} remaining)
- Required Courses: ${completedRequired.length}/${requiredCourses.length} completed (${remainingRequired.length} remaining)
- Electives: ${completedElectives.length}/${electivesNeeded} completed (${electivesRemaining} remaining)
- 4000-level Electives Completed: ${completed4000Electives.length}

COMPLETED COURSES (${completedCourses.length} total):
${completedCourses.map(uc => `- ${uc.course.code}: ${uc.course.name} (${uc.course.credits} credits)`).join('\n')}

REMAINING REQUIRED COURSES (${remainingRequired.length} courses):
${remainingRequired.map(c => `- ${c.code}: ${c.name} (${c.credits} credits)`).join('\n')}

CURRENT SCHEDULE:
${schedules.length > 0 ? schedules[0].items.map(item =>
  `${item.semester} ${item.year}: ${item.course.code} - ${item.course.name} (${item.course.credits} credits)`
).join('\n') : 'No schedule generated yet'}

DEGREE REQUIREMENTS:
- Total Credits Required: 120
- Required Courses: ${requiredCourses.length} courses (core curriculum)
- Electives Needed: Students need 2 electives total (CS/IT 3/4xxx Restricted Electives)
- Minimum Grade: C (2.0) in all major courses

COMPLETE COURSE CATALOG WITH PREREQUISITES AND DETAILS:
${courseDetails}

You should help the student with:
- Understanding their progress toward degree completion
- Answering questions about prerequisites and course planning
- Providing advice on course selection
- Explaining course requirements
- Helping plan future semesters

IMPORTANT: Respond in plain text only. Do NOT use markdown formatting like **, *, #, or other markdown syntax. Keep your responses conversational and easy to read in plain text format.

Be friendly, concise, and helpful. If you don't know something specific about a course, be honest about it.

Keep your responses short and to the point. Use simple language and avoid using too many words.
Keep your responses conversational and easy to read in plain text format.`

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

    // Build conversation history for context (limit to last 10 messages to reduce context size)
    const chatHistory = conversationHistory || []
    const recentHistory = chatHistory.slice(-10)

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: context }]
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'm your DegreeMe advisor and I'm ready to help you with your UCF CS/IT degree planning. What would you like to know?" }]
        },
        ...recentHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }))
      ]
    })

    // Get response from Gemini
    const result = await chat.sendMessage(message)
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
