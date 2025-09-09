import { PrismaClient } from '@prisma/client'
import coursesData from '../data/courses-updated.json'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')
  
  // Clear existing data
  console.log('🧹 Clearing existing data...')
  await prisma.alternative.deleteMany()
  await prisma.corequisite.deleteMany()
  await prisma.prerequisite.deleteMany()
  await prisma.userCourse.deleteMany()
  await prisma.scheduleItem.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.course.deleteMany()
  
  const courses = coursesData.courses
  const electives = coursesData.available_electives
  
  console.log(`📚 Creating ${Object.keys(courses).length} required courses...`)
  
  // Create required courses
  for (const [code, courseData] of Object.entries(courses)) {
    await prisma.course.create({
      data: {
        code,
        name: courseData.name,
        credits: courseData.credits,
        gepRequirement: courseData.gep_requirement || false,
        category: courseData.category || null,
        isElective: false,
      },
    })
  }
  
  // Create elective courses
  console.log(`📚 Creating elective courses...`)
  
  for (const [electiveLevel, electiveCourses] of Object.entries(electives)) {
    const level = electiveLevel.includes('4000') ? '4000_level' : '5000_level'
    console.log(`  Adding ${Object.keys(electiveCourses).length} ${level} electives...`)
    
    for (const [code, courseData] of Object.entries(electiveCourses)) {
      await prisma.course.create({
        data: {
          code,
          name: courseData.name,
          credits: courseData.credits,
          gepRequirement: false,
          category: `${level.replace('_', '-')} Elective`,
          description: courseData.description || null,
          note: courseData.note || null,
          isElective: true,
          electiveLevel: level,
        },
      })
    }
  }
  
  console.log('🔗 Creating relationships...')
  
  for (const [code, courseData] of Object.entries(courses)) {
    const course = await prisma.course.findUnique({ where: { code } })
    if (!course) continue
    
    // Handle prerequisites
    if (courseData.prerequisites && Array.isArray(courseData.prerequisites)) {
      for (const prereq of courseData.prerequisites) {
        if (typeof prereq === 'string') {
          const prereqCourse = await prisma.course.findUnique({ where: { code: prereq } })
          if (prereqCourse) {
            await prisma.prerequisite.upsert({
              where: {
                courseId_prerequisiteId: {
                  courseId: course.id,
                  prerequisiteId: prereqCourse.id,
                },
              },
              update: {},
              create: {
                courseId: course.id,
                prerequisiteId: prereqCourse.id,
              },
            })
          }
        } else if (prereq.options && Array.isArray(prereq.options)) {
          for (const option of prereq.options) {
            const prereqCourse = await prisma.course.findUnique({ where: { code: option } })
            if (prereqCourse) {
              await prisma.prerequisite.upsert({
                where: {
                  courseId_prerequisiteId: {
                    courseId: course.id,
                    prerequisiteId: prereqCourse.id,
                  },
                },
                update: {},
                create: {
                  courseId: course.id,
                  prerequisiteId: prereqCourse.id,
                },
              })
            }
          }
        }
      }
    }
    
    // Handle corequisites
    if (courseData.corequisites && Array.isArray(courseData.corequisites)) {
      for (const coreqCode of courseData.corequisites) {
        const coreqCourse = await prisma.course.findUnique({ where: { code: coreqCode } })
        if (coreqCourse) {
          await prisma.corequisite.upsert({
            where: {
              courseId_corequisiteId: {
                courseId: course.id,
                corequisiteId: coreqCourse.id,
              },
            },
            update: {},
            create: {
              courseId: course.id,
              corequisiteId: coreqCourse.id,
            },
          })
        }
      }
    }
    
    // Handle alternatives
    if (courseData.alternatives && Array.isArray(courseData.alternatives)) {
      for (const altCode of courseData.alternatives) {
        if (altCode === "CS Placement") continue // Skip non-course alternatives
        const altCourse = await prisma.course.findUnique({ where: { code: altCode } })
        if (altCourse) {
          await prisma.alternative.upsert({
            where: {
              courseId_alternativeId: {
                courseId: course.id,
                alternativeId: altCourse.id,
              },
            },
            update: {},
            create: {
              courseId: course.id,
              alternativeId: altCourse.id,
            },
          })
        }
      }
    }
  }
  
  console.log('✅ Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })