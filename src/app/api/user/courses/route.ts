import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userCourses = await prisma.userCourse.findMany({
      where: { userId: user.id },
      include: {
        course: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(userCourses)
  } catch (error) {
    console.error("Error fetching user courses:", error)
    return NextResponse.json(
      { error: "Failed to fetch user courses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId, completed } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (completed) {
      // Add or update the course as completed
      await prisma.userCourse.upsert({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: courseId
          }
        },
        update: {
          completed: true
        },
        create: {
          userId: user.id,
          courseId: courseId,
          completed: true
        }
      })
    } else {
      // Remove the course completion
      await prisma.userCourse.deleteMany({
        where: {
          userId: user.id,
          courseId: courseId
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user course:", error)
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
}