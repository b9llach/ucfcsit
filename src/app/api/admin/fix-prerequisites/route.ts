import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST() {
  try {
    console.log('🔧 Fixing prerequisite data...')

    // Delete all existing prerequisites
    await prisma.prerequisite.deleteMany()
    console.log('✅ Cleared existing prerequisites')

    // Define correct prerequisites
    const prerequisiteData = [
      // Math foundations
      { course: 'MAC1114C', prerequisites: ['MAC1105C', 'MAC1140'] }, // Options: either MAC1105C or MAC1140
      { course: 'STA2023', prerequisites: ['MAC1105C', 'MAC1140'] }, // Options: either MAC1105C or MAC1140

      // Physics
      { course: 'PHY2053', prerequisites: ['MAC1114C'] },
      { course: 'PHY2053L', prerequisites: ['MAC1114C'] },
      { course: 'PHY2054', prerequisites: ['PHY2053', 'PHY2053L'] },
      { course: 'PHY2054L', prerequisites: ['PHY2053', 'PHY2053L'] },

      // Programming progression
      { course: 'COP3223C', prerequisites: ['COP2500C'] },
      { course: 'CIS3990', prerequisites: ['COP3223C'] },
      { course: 'CNT3004', prerequisites: ['COP3223C'] },
      { course: 'CGS2545C', prerequisites: ['COP3223C'] },
      { course: 'CGS3269', prerequisites: ['COP3223C'] },
      { course: 'CGS3763', prerequisites: ['COP3223C'] },
      { course: 'CIS3921', prerequisites: ['COP3223C'] },
      { course: 'COP3502C', prerequisites: ['COP3223C'] },
      { course: 'MAD2104', prerequisites: ['MAC1105C', 'MAC1140'] },
    ]

    let created = 0
    let skipped = 0

    for (const data of prerequisiteData) {
      // Find the course
      const course = await prisma.course.findUnique({
        where: { code: data.course }
      })

      if (!course) {
        console.log(`⚠️  Course not found: ${data.course}`)
        skipped++
        continue
      }

      // Add each prerequisite
      for (const prereqCode of data.prerequisites) {
        const prerequisite = await prisma.course.findUnique({
          where: { code: prereqCode }
        })

        if (!prerequisite) {
          console.log(`⚠️  Prerequisite not found: ${prereqCode}`)
          skipped++
          continue
        }

        // Create the prerequisite relationship
        await prisma.prerequisite.create({
          data: {
            courseId: course.id,
            prerequisiteId: prerequisite.id
          }
        })

        created++
        console.log(`✅ ${prereqCode} → ${data.course}`)
      }
    }

    console.log(`\n✅ Created ${created} prerequisite relationships`)
    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} missing courses`)
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Fixed prerequisites: created ${created} relationships, skipped ${skipped}`
    })
  } catch (error) {
    console.error("Error fixing prerequisites:", error)
    return NextResponse.json(
      { error: "Failed to fix prerequisites", details: error.message },
      { status: 500 }
    )
  }
}
