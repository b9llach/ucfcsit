import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const prerequisiteData = [
  // Programming foundations
  { course: 'COP 3223C', prerequisites: ['MAC 1105'] },
  { course: 'COP 3502C', prerequisites: ['COP 3223C'] },
  { course: 'COP 3503C', prerequisites: ['COP 3502C'] },
  { course: 'COP 3530', prerequisites: ['COP 3502C'] },
  
  // Computer Organization
  { course: 'CDA 3103C', prerequisites: ['COP 3502C'] },
  { course: 'COP 3402', prerequisites: ['CDA 3103C'] },
  
  // Math requirements
  { course: 'COT 3100C', prerequisites: ['MAC 1140'] },
  { course: 'MAC 2311C', prerequisites: ['MAC 1140'] },
  { course: 'MAC 2312', prerequisites: ['MAC 2311C'] },
  { course: 'STA 3032', prerequisites: ['MAC 2311C'] },
  
  // Operating Systems
  { course: 'COP 4600', prerequisites: ['COP 3402', 'COP 3530'] },
  
  // Database Systems
  { course: 'COP 4710', prerequisites: ['COP 3530'] },
  
  // Software Engineering
  { course: 'CEN 4010', prerequisites: ['COP 3503C'] },
  
  // Senior Design
  { course: 'CEN 4914', prerequisites: ['CEN 4010'] },
  { course: 'CEN 4915', prerequisites: ['CEN 4914'] },
  
  // Network Security
  { course: 'CIS 4362', prerequisites: ['COP 4600'] },
  
  // Computer Graphics
  { course: 'CAP 4720', prerequisites: ['COP 3503C', 'MAC 2312'] },
  
  // Algorithms
  { course: 'COT 4400', prerequisites: ['COP 3503C', 'COT 3100C'] },
  
  // Physics requirements
  { course: 'PHY 2049C', prerequisites: ['PHY 2048C', 'MAC 2311C'] },
  { course: 'PHY 2048C', prerequisites: ['MAC 2311C'] }
]

async function seedPrerequisites() {
  console.log('🌱 Seeding prerequisites...')
  
  for (const courseData of prerequisiteData) {
    try {
      // Find the main course
      const course = await prisma.course.findUnique({
        where: { code: courseData.course }
      })
      
      if (!course) {
        console.log(`⚠️  Course ${courseData.course} not found, skipping...`)
        continue
      }
      
      // Process each prerequisite
      for (const prereqCode of courseData.prerequisites) {
        const prerequisite = await prisma.course.findUnique({
          where: { code: prereqCode }
        })
        
        if (!prerequisite) {
          console.log(`⚠️  Prerequisite ${prereqCode} not found for ${courseData.course}, skipping...`)
          continue
        }
        
        // Create prerequisite relationship
        try {
          await prisma.prerequisite.create({
            data: {
              courseId: course.id,
              prerequisiteId: prerequisite.id
            }
          })
          console.log(`✅ Added prerequisite: ${prereqCode} → ${courseData.course}`)
        } catch (error) {
          // Ignore duplicate errors
          if (error.code !== 'P2002') {
            console.error(`❌ Error adding prerequisite ${prereqCode} → ${courseData.course}:`, error.message)
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${courseData.course}:`, error.message)
    }
  }
  
  console.log('✅ Prerequisites seeding completed!')
}

seedPrerequisites()
  .catch((e) => {
    console.error('❌ Error seeding prerequisites:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })