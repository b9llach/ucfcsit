import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking database contents...')
  
  const allCourses = await prisma.course.findMany({
    select: {
      code: true,
      name: true,
      isElective: true,
      electiveLevel: true,
    },
    orderBy: { code: 'asc' }
  })
  
  console.log(`Total courses: ${allCourses.length}`)
  
  const required = allCourses.filter(c => !c.isElective)
  const electives4000 = allCourses.filter(c => c.isElective && c.electiveLevel === '4000_level')
  const electives5000 = allCourses.filter(c => c.isElective && c.electiveLevel === '5000_level')
  
  console.log(`Required courses: ${required.length}`)
  console.log(`4000-level electives: ${electives4000.length}`)
  console.log(`5000-level electives: ${electives5000.length}`)
  
  console.log('\nFirst few 4000-level electives:')
  electives4000.slice(0, 5).forEach(course => {
    console.log(`- ${course.code}: ${course.name}`)
  })
  
  console.log('\nFirst few 5000-level electives:')
  electives5000.slice(0, 5).forEach(course => {
    console.log(`- ${course.code}: ${course.name}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })