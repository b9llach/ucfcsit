import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log("API: Fetching courses for roadmap...")

    // Fetch all courses with their REQUIREMENTS (not what they're prerequisites for)
    const courses = await prisma.course.findMany({
      include: {
        // requiredBy = the prerequisites that THIS course requires
        requiredBy: {
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
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    // Transform to match expected structure
    const transformedCourses = courses.map(course => ({
      ...course,
      prerequisites: course.requiredBy.map(req => ({
        prerequisite: req.prerequisite
      }))
    }))

    console.log(`API: Successfully fetched ${transformedCourses.length} courses`)
    console.log(`API: Sample course:`, transformedCourses.find(c => c.prerequisites.length > 0))

    return NextResponse.json(transformedCourses)
  } catch (error) {
    console.error("Error fetching courses for roadmap:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses", details: error.message },
      { status: 500 }
    )
  }
}
