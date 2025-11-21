import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { GoogleGenerativeAI } from "@google/generative-ai"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Fetch user's schedules
    const schedules = await prisma.schedule.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            course: true
          }
        }
      }
    })

    // Fetch all available courses
    const allCourses = await prisma.course.findMany({
      include: {
        requiredBy: {
          include: {
            prerequisite: true
          }
        }
      }
    })

    // Build context for AI
    const context = `You are an academic advisor assistant for UCF CS/IT degree planning. You have access to the following information about the student:

COMPLETED COURSES (${completedCourses.length} courses):
${completedCourses.map(uc => `- ${uc.course.code}: ${uc.course.name} (${uc.course.credits} credits)`).join('\n')}

CURRENT SCHEDULE:
${schedules.length > 0 ? schedules[0].items.map(item =>
  `${item.semester} ${item.year}: ${item.course.code} - ${item.course.name} (${item.course.credits} credits)`
).join('\n') : 'No schedule generated yet'}

TOTAL CREDITS COMPLETED: ${completedCourses.reduce((sum, uc) => sum + uc.course.credits, 0)}
TOTAL CREDITS NEEDED: 120 (typical CS degree requirement)

AVAILABLE COURSES IN PROGRAM:
${allCourses.slice(0, 20).map(c => `- ${c.code}: ${c.name} (${c.credits} credits)`).join('\n')}
... and more

You should help the student with:
- Understanding their progress toward degree completion
- Answering questions about prerequisites and course planning
- Providing advice on course selection
- Explaining course requirements
- Helping plan future semesters

Be friendly, concise, and helpful. If you don't know something specific about a course, be honest about it.`

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Build conversation history for context
    const chatHistory = conversationHistory || []
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: context }]
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'm ready to help you with your UCF CS/IT degree planning. What would you like to know?" }]
        },
        ...chatHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }))
      ]
    })

    // Get response from Gemini
    const result = await chat.sendMessage(message)
    const response = result.response.text()

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      { error: "Failed to get response from AI", details: error.message },
      { status: 500 }
    )
  }
}
