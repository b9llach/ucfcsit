import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token

    console.log("Fetching shared schedule with token:", shareToken)

    // Find schedule by share token
    const schedule = await prisma.schedule.findUnique({
      where: {
        shareToken: shareToken,
        isPublic: true
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
        },
        user: {
          select: {
            name: true
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Get user's completed courses
    const completedCourses = await prisma.userCourse.findMany({
      where: {
        userId: schedule.user?.id || "",
        completed: true
      },
      include: {
        course: true
      }
    })

    // Get all courses for search functionality
    const allCourses = await prisma.course.findMany({
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
      },
      orderBy: [
        { code: 'asc' }
      ]
    })

    console.log(`Found shared schedule with ${schedule.items.length} scheduled courses`)

    return NextResponse.json({
      schedule,
      completedCourses,
      allCourses,
      ownerName: schedule.user?.name
    })
  } catch (error) {
    console.error("Error fetching shared schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared schedule", details: error.message },
      { status: 500 }
    )
  }
}