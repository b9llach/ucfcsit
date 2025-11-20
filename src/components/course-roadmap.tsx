"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: string
  code: string
  name: string
  credits: number
  category: string | null
  isElective: boolean
  prerequisites: { prerequisite: { id: string; code: string } }[]
}

interface UserCourse {
  courseId: string
  completed: boolean
}

interface RoadmapProps {
  courses: Course[]
  userCourses: UserCourse[]
  onCourseClick?: (course: Course) => void
}

interface Position {
  x: number
  y: number
  level: number
}

export function CourseRoadmap({ courses, userCourses, onCourseClick }: RoadmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<string, Position>>(new Map())
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null)
  const [showElectives, setShowElectives] = useState(false)

  const isCompleted = (courseId: string) => {
    return userCourses.some(uc => uc.courseId === courseId && uc.completed)
  }

  const getCourseStatus = (course: Course) => {
    const completed = isCompleted(course.id)
    if (completed) return 'completed'

    if (!course.prerequisites || course.prerequisites.length === 0) return 'available'

    const prereqsMet = course.prerequisites.every(p => isCompleted(p.prerequisite.id))
    if (prereqsMet) return 'available'

    return 'locked'
  }

  useEffect(() => {
    // Filter to required courses only for the main flowchart
    const requiredCourses = courses.filter(c =>
      !c.isElective && (!c.category || !c.category.toLowerCase().includes('elective'))
    )

    // Build course map using ALL courses (needed for prerequisite lookups)
    const courseMap = new Map<string, Course>()
    courses.forEach(c => courseMap.set(c.id, c))

    // Extract course level from course code (1xxx = 1000, 2xxx = 2000, etc.)
    const getCourseLevel = (courseCode: string): number => {
      const match = courseCode.match(/^[A-Z]+(\d)/)
      if (match) {
        return parseInt(match[1]) * 1000
      }
      return 0
    }

    // Group courses by their course number level (1000, 2000, 3000, 4000)
    const levelGroups = new Map<number, Course[]>()
    requiredCourses.forEach(course => {
      const level = getCourseLevel(course.code)
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(course)
    })

    // Layout parameters
    const CARD_WIDTH = 200
    const CARD_HEIGHT = 110
    const HORIZONTAL_GAP = 160
    const VERTICAL_GAP = 40
    const START_X = 80
    const START_Y = 100

    const posMap = new Map<string, Position>()
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)

    // Position courses level by level, aligning with prerequisites for natural flow
    sortedLevels.forEach((level, levelIndex) => {
      const coursesInLevel = levelGroups.get(level)!
      const x = START_X + levelIndex * (CARD_WIDTH + HORIZONTAL_GAP)

      // For each course, calculate average Y position of its prerequisites
      const courseTargetY = new Map<string, number>()

      coursesInLevel.forEach(course => {
        let targetY = START_Y
        const prereqYs: number[] = []

        if (course.prerequisites && course.prerequisites.length > 0) {
          course.prerequisites.forEach(prereq => {
            const prereqPos = posMap.get(prereq.prerequisite.id)
            if (prereqPos && prereqPos.level < level) {
              prereqYs.push(prereqPos.y)
            }
          })
        }

        // Align with average prerequisite position
        if (prereqYs.length > 0) {
          targetY = prereqYs.reduce((sum, y) => sum + y, 0) / prereqYs.length
        } else {
          // No prerequisites - position at bottom
          targetY = 999999
        }

        courseTargetY.set(course.id, targetY)
      })

      // Sort courses by their target Y position for natural flow
      const sortedCourses = [...coursesInLevel].sort((a, b) => {
        return courseTargetY.get(a.id)! - courseTargetY.get(b.id)!
      })

      // Position courses, avoiding overlaps
      let currentY = START_Y
      sortedCourses.forEach(course => {
        const targetY = courseTargetY.get(course.id)!
        const y = Math.max(currentY, targetY)

        posMap.set(course.id, { x, y, level })
        currentY = y + CARD_HEIGHT + VERTICAL_GAP
      })
    })

    setPositions(posMap)

    // Draw connections
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (!container) return

    // Calculate canvas size
    let maxX = 0
    let maxY = 0
    posMap.forEach(pos => {
      maxX = Math.max(maxX, pos.x + CARD_WIDTH + 100)
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT + 100)
    })

    canvas.width = Math.max(container.scrollWidth, maxX)
    canvas.height = Math.max(container.scrollHeight, maxY)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let linesDrawn = 0
    let linesSkipped = 0

    // Draw prerequisite connections
    requiredCourses.forEach(course => {
      const coursePos = posMap.get(course.id)
      if (!coursePos) return

      if (!course.prerequisites || course.prerequisites.length === 0) return

      course.prerequisites.forEach(prereq => {
        // Skip if prerequisite is the same course (bad data)
        if (prereq.prerequisite.id === course.id) {
          linesSkipped++
          return
        }

        const prereqPos = posMap.get(prereq.prerequisite.id)
        if (!prereqPos) {
          linesSkipped++
          return
        }

        // Extract course levels
        const prereqLevel = getCourseLevel(prereq.prerequisite.code)
        const courseLevel = getCourseLevel(course.code)

        // Skip if prerequisite is same level or higher (only draw left to right)
        if (prereqLevel >= courseLevel) {
          linesSkipped++
          return
        }

        linesDrawn++
        const status = getCourseStatus(course)

        // Connection points
        const startX = prereqPos.x + CARD_WIDTH
        const startY = prereqPos.y + CARD_HEIGHT / 2
        const endX = coursePos.x
        const endY = coursePos.y + CARD_HEIGHT / 2
        const midX = (startX + endX) / 2

        // Draw elbow connector with black color
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(midX, startY)
        ctx.lineTo(midX, endY)
        ctx.lineTo(endX, endY)

        // Use black for all lines to make them visible
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Draw arrowhead
        const arrowSize = 12
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(endX - arrowSize, endY - arrowSize / 2)
        ctx.lineTo(endX - arrowSize, endY + arrowSize / 2)
        ctx.closePath()
        ctx.fillStyle = '#000000'
        ctx.fill()
      })
    })

    console.log(`Total courses: ${requiredCourses.length}`)
    console.log(`Courses with prerequisites: ${requiredCourses.filter(c => c.prerequisites && c.prerequisites.length > 0).length}`)
    console.log(`Lines drawn: ${linesDrawn}, Lines skipped: ${linesSkipped}`)
  }, [courses, userCourses, showElectives])

  // Get required and elective courses
  const requiredCourses = courses.filter(c =>
    !c.isElective && (!c.category || !c.category.toLowerCase().includes('elective'))
  )
  const electiveCourses = courses.filter(c =>
    c.isElective || (c.category && c.category.toLowerCase().includes('elective'))
  )

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-black/10">
      {/* Toggle for electives */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setShowElectives(!showElectives)}
          className="bg-white px-4 py-2 rounded-full border border-black/20 text-[12px] font-semibold text-black hover:bg-gray-50 transition-all-smooth shadow-sm"
        >
          {showElectives ? 'Hide' : 'Show'} Electives ({electiveCourses.length})
        </button>
      </div>

      <div ref={containerRef} className="relative w-full h-[900px] overflow-auto">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none z-[5]"
          style={{ minWidth: '100%', minHeight: '100%' }}
        />

        {/* Level labels */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white via-white to-transparent pointer-events-none z-10">
          {Array.from(new Set(Array.from(positions.values()).map(p => p.level))).sort((a, b) => a - b).map((level) => {
            const levelPos = Array.from(positions.values()).find(p => p.level === level)
            if (!levelPos) return null

            const levelLabel = level === 0 ? 'Foundation' : `${level}-level`

            return (
              <div
                key={level}
                className="absolute top-6"
                style={{ left: `${levelPos.x + 40}px` }}
              >
                <div className="text-[13px] font-bold text-black bg-blue-50 px-4 py-1.5 rounded-full border-2 border-blue-200 shadow-sm">
                  {levelLabel}
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative min-h-full pt-20">
          {/* Required courses */}
          {requiredCourses.map(course => {
            const pos = positions.get(course.id)
            if (!pos) return null

            const status = getCourseStatus(course)
            const completed = status === 'completed'
            const available = status === 'available'
            const locked = status === 'locked'

            return (
              <Card
                key={course.id}
                onClick={() => onCourseClick?.(course)}
                onMouseEnter={() => setHoveredCourse(course.id)}
                onMouseLeave={() => setHoveredCourse(null)}
                className={`absolute cursor-pointer transition-all-smooth ${
                  hoveredCourse === course.id ? 'scale-105 shadow-xl z-10' : 'scale-100 shadow-md'
                } ${
                  completed
                    ? 'bg-green-50 border-green-500 ring-2 ring-green-500/30'
                    : available
                    ? 'bg-white border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-gray-50 border-gray-300 opacity-70'
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '200px',
                  minHeight: '110px',
                }}
              >
                <div className="p-4 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-[15px] text-black leading-tight">{course.code}</h4>
                    {completed && (
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {locked && (
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mb-3 flex-grow">
                    {course.name}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/10">
                    <Badge variant="secondary" className="text-[10px] bg-white border-black/20 px-2 py-0.5">
                      {course.credits} cr
                    </Badge>
                    {completed && (
                      <span className="text-[10px] font-bold text-green-700">✓ Done</span>
                    )}
                    {available && !completed && (
                      <span className="text-[10px] font-bold text-blue-700">Ready</span>
                    )}
                    {locked && (
                      <span className="text-[10px] font-semibold text-gray-500">Locked</span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-white rounded-xl p-4 shadow-xl border border-black/10">
        <div className="text-[11px] font-semibold text-black mb-2">Required Courses</div>
        <div className="flex flex-col space-y-2 text-[11px]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-green-50 border-2 border-green-500" />
            <span className="text-black">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-blue-500" />
            <span className="text-black">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gray-50 border-2 border-gray-300" />
            <span className="text-black">Locked</span>
          </div>
        </div>
      </div>
    </div>
  )
}
