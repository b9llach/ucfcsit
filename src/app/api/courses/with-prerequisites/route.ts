import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log("API: Fetching courses with prerequisites...")
    
    const courses = await prisma.course.findMany({
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
        },
        alternatives: {
          include: {
            alternative: true
          }
        }
      },
      orderBy: [
        { code: 'asc' }
      ]
    })
    
    console.log(`API: Successfully fetched ${courses.length} courses with prerequisites`)
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching courses with prerequisites:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses with prerequisites", details: error.message },
      { status: 500 }
    )
  }
}