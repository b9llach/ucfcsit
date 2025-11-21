import { PrismaClient } from '@prisma/client'
import coursesData from '../data/courses-updated.json'

const prisma = new PrismaClient()

// Course descriptions based on UCF catalog and standard CS/IT curriculum
const courseDescriptions: Record<string, string> = {
  // Math Courses
  'MAC1105C': 'Topics include linear equations and inequalities, systems of linear equations, polynomial functions and graphs, exponential and logarithmic functions.',
  'MAC1140': 'Study of algebraic and transcendental functions and their graphs including polynomial, rational, exponential, logarithmic functions. Preparation for calculus.',
  'MAC1114C': 'Topics include trigonometric functions, identities, equations, inverse functions, solutions of triangles, and applications.',
  'STA2023': 'Introduction to statistical methods and data analysis. Topics include descriptive statistics, probability, sampling distributions, estimation, and hypothesis testing.',

  // Physics Courses
  'PHY2053': 'First semester of introductory physics. Topics include mechanics, oscillations, waves, and thermodynamics with applications to science and engineering.',
  'PHY2053L': 'Laboratory experiments complement PHY2053 lecture. Hands-on experience with scientific measurement, data analysis, and experimental methods in physics.',
  'PHY2054': 'Second semester of introductory physics covering electricity, magnetism, optics, and modern physics with practical applications.',
  'PHY2054L': 'Laboratory course providing experimental investigations of electrical circuits, magnetism, optics, and modern physics concepts.',

  // CS/IT Foundational Courses
  'COP2500C': 'Introduction to computer programming for students with no prior programming experience. Learn fundamental programming concepts, problem-solving, and algorithm development.',
  'CIS3003': 'Introduction to information technology fundamentals including hardware, software, networking, databases, and IT infrastructure.',
  'COP3223C': 'Introduction to programming in C. Topics include data types, control structures, functions, arrays, pointers, file I/O, and dynamic memory allocation.',

  // Core CS Courses
  'COP3502C': 'Introduction to software development using C. Topics include algorithms, data structures, recursion, and software engineering practices.',
  'COT3100C': 'Introduction to discrete mathematics for computer science. Topics include logic, sets, functions, relations, counting, graph theory, and proof techniques.',
  'COP3330': 'Object-oriented programming using C++. Topics include classes, inheritance, polymorphism, templates, and object-oriented design principles.',
  'COP4020': 'Study of programming language concepts including syntax, semantics, data types, control structures, and paradigms (functional, logic, object-oriented).',
  'COP4331C': 'Software development lifecycle including requirements gathering, design, implementation, testing, and maintenance using object-oriented methodologies.',

  // Networking & Systems
  'CNT3004': 'Fundamentals of computer networks. Topics include network protocols, TCP/IP, network architecture, routing, and current networking technologies.',
  'CNT4703C': 'Hands-on networking laboratory. Design, configuration, and management of computer networks with emphasis on practical implementation.',
  'CNT4714': 'Enterprise-level web application development. Topics include Java EE, servlets, JSP, database connectivity, and multi-tier architectures.',
  'CGS3269': 'Computer architecture and organization. Topics include processor design, memory systems, I/O systems, and assembly language programming.',
  'CDA3103C': 'Computer organization fundamentals including digital logic, computer arithmetic, instruction sets, assembly language, and microprocessor design.',

  // Security
  'CIS3360': 'Computer and network security fundamentals including cryptography, authentication, access control, network security, and security management.',

  // Database & Web
  'CGS2545C': 'Introduction to database concepts, design, and implementation. Topics include relational model, SQL, normalization, and database applications.',
  'CIS4004': 'Web-based information technology including web development, client-server architecture, web services, and internet technologies.',
  'COP4710': 'Database system concepts including data modeling, query languages, transaction processing, concurrency control, and database design.',

  // Software Engineering & HCI
  'CAP3104': 'Human-computer interaction principles and usability. Topics include user interface design, usability testing, and interaction techniques.',
  'COP4600': 'Operating systems concepts including processes, threads, scheduling, memory management, file systems, and synchronization.',
  'CEN3031': 'Software engineering principles and practices. Topics include software lifecycle, requirements analysis, design patterns, and project management.',

  // Discrete Math & Theory
  'MAD2104': 'Discrete mathematics for computing. Topics include sets, logic, proofs, recursion, combinatorics, and graph theory.',

  // Advising & Career
  'CIS3990': 'IT advising for degree progress and career planning. Discussion of IT career paths, industry trends, and academic planning.',
  'CIS3921': 'Career preparation in IT including resume building, interviewing, professional development, and industry expectations.',
  'CIS4991': 'Advanced IT advising and senior year planning. Preparation for graduation and career transition.',

  // Senior Project
  'COP4910': 'Senior design project course. Team-based software development project applying knowledge from previous coursework to real-world problems.',

  // Ethics & Professional Development
  'PHI3626': 'Ethical issues in science and technology. Topics include privacy, intellectual property, professional responsibility, and societal impact of technology.',

  // Additional Required Courses
  'CIS4524': 'Managing information technology integration and implementation in organizations. Topics include IT project management, systems integration, change management, and strategic IT planning.',
  'CGS3763': 'Operating system concepts including process management, memory management, file systems, I/O systems, and concurrent programming with practical applications.',
  'CNT4603': 'System administration and maintenance covering server management, network administration, security policies, backup strategies, and system monitoring.',

  // GEP Requirements
  'PSY2012': 'Introduction to psychology covering fundamental concepts in human behavior, cognition, development, personality, and psychological research methods.',
  'ECO2013': 'Principles of macroeconomics including national income, inflation, unemployment, fiscal and monetary policy, and international trade.',

  // Technical Writing Requirements
  'ENC3241': 'Technical and professional writing for IT and engineering fields. Focus on documentation, reports, proposals, and professional communication in technical contexts.',
  'ENC3250': 'Professional writing for technical and scientific audiences. Topics include technical documentation, proposal writing, and effective communication of complex information.',
  'ENC4XXX': 'Advanced professional writing course selected from approved list. Check degree audit for specific course options and requirements.',

  // Elective Common Courses
  'COP4934': 'Special topics in computer science covering emerging technologies and advanced topics not available in regular curriculum.',
  'CAP4720': 'Computer graphics principles including 2D/3D graphics, geometric transformations, rendering, shading, and graphics programming.',
  'CIS4930': 'Selected topics in information systems including current trends and technologies in IT and computing.',
}

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
        category: ('category' in courseData ? courseData.category : null) || null,
        description: courseDescriptions[code] || null,
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
          description: ('description' in courseData ? courseData.description : null) || courseDescriptions[code] || null,
          note: ('note' in courseData ? courseData.note : null) || null,
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
          // Simple prerequisite: just one required course
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
            console.log(`  ✓ ${prereq} → ${code}`)
          }
        } else if (prereq.options && Array.isArray(prereq.options)) {
          // FIXED: For "options" (OR logic), only add the FIRST option as prerequisite
          // This prevents false chains like "MAC1140 → course" when MAC1105C is the alternative
          // Students need ONE OF these options, not ALL of them
          const firstOption = prereq.options[0]
          const prereqCourse = await prisma.course.findUnique({ where: { code: firstOption } })
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
            console.log(`  ✓ ${firstOption} (or alternatives: ${prereq.options.slice(1).join(', ')}) → ${code}`)
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
    if ('alternatives' in courseData && courseData.alternatives && Array.isArray(courseData.alternatives)) {
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