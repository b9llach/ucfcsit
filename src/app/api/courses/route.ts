import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

// Create a new Prisma client instance
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

export async function GET() {
  try {
    console.log("API: Starting to fetch courses...")
    
    const courses = await prisma.course.findMany({
      orderBy: [
        { code: 'asc' }
      ]
    })
    
    console.log(`API: Successfully fetched ${courses.length} courses`)
    
    if (courses.length > 0) {
      console.log(`API: Sample course structure:`, {
        code: courses[0].code,
        name: courses[0].name,
        isElective: courses[0].isElective,
        electiveLevel: courses[0].electiveLevel
      })
      
      const required = courses.filter(c => !c.isElective)
      const electives4000 = courses.filter(c => c.isElective && c.electiveLevel === '4000_level')
      const electives5000 = courses.filter(c => c.isElective && c.electiveLevel === '5000_level')
      
      console.log(`API: Required courses: ${required.length}`)
      console.log(`API: 4000-level electives: ${electives4000.length}`)
      console.log(`API: 5000-level electives: ${electives5000.length}`)
    }
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: "Failed to fetch courses", details: error.message },
      { status: 500 }
    )
  }
}