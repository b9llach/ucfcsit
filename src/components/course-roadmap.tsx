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
    // Filter to required courses only
    const requiredCourses = courses.filter(c =>
      !c.isElective && (!c.category || !c.category.toLowerCase().includes('elective'))
    )

    // Build course map for lookups
    const courseMap = new Map<string, Course>()
    courses.forEach(c => courseMap.set(c.id, c))

    // Calculate prerequisite depth for each course (tree level)
    const courseDepth = new Map<string, number>()

    const calculateDepth = (course: Course, visited = new Set<string>()): number => {
      if (courseDepth.has(course.id)) return courseDepth.get(course.id)!
      if (visited.has(course.id)) return 0

      visited.add(course.id)

      if (!course.prerequisites || course.prerequisites.length === 0) {
        courseDepth.set(course.id, 0)
        return 0
      }

      let maxDepth = 0
      course.prerequisites.forEach(p => {
        const prereq = courseMap.get(p.prerequisite.id)
        if (prereq && prereq.id !== course.id) {
          const depth = calculateDepth(prereq, new Set(visited))
          maxDepth = Math.max(maxDepth, depth + 1)
        }
      })

      courseDepth.set(course.id, maxDepth)
      return maxDepth
    }

    // Calculate depths
    console.log('=== CALCULATING DEPTHS ===')
    console.log('Total required courses:', requiredCourses.length)
    console.log('Sample course with prereqs:', requiredCourses.find(c => c.prerequisites?.length > 0))

    requiredCourses.forEach(course => {
      const depth = calculateDepth(course)
      console.log(`${course.code}: depth ${depth}, prerequisites: ${course.prerequisites?.length || 0}`)
      if (course.prerequisites?.length > 0) {
        course.prerequisites.forEach(p => {
          console.log(`  - ${p.prerequisite.code} (id: ${p.prerequisite.id})`)
        })
      }
    })

    // Group by depth level
    const depthGroups = new Map<number, Course[]>()
    requiredCourses.forEach(course => {
      const depth = courseDepth.get(course.id) || 0
      if (!depthGroups.has(depth)) depthGroups.set(depth, [])
      depthGroups.get(depth)!.push(course)
    })

    console.log('\n=== DEPTH GROUPS ===')
    Array.from(depthGroups.entries()).sort((a, b) => a[0] - b[0]).forEach(([depth, courses]) => {
      console.log(`Depth ${depth}: ${courses.length} courses - ${courses.map(c => c.code).join(', ')}`)
    })

    // Compact tree layout
    const CARD_WIDTH = 180
    const CARD_HEIGHT = 90
    const HORIZONTAL_GAP = 120
    const VERTICAL_GAP = 20
    const START_X = 60
    const START_Y = 80

    const posMap = new Map<string, Position>()
    const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b)

    // Position courses in tree structure
    sortedDepths.forEach((depth, depthIndex) => {
      const coursesAtDepth = depthGroups.get(depth)!
      const x = START_X + depthIndex * (CARD_WIDTH + HORIZONTAL_GAP)

      // Calculate target positions based on prerequisites
      const courseTargets: Array<{ course: Course; targetY: number }> = []

      coursesAtDepth.forEach(course => {
        let targetY = START_Y
        const prereqYs: number[] = []

        if (course.prerequisites && course.prerequisites.length > 0) {
          course.prerequisites.forEach(p => {
            const prereqPos = posMap.get(p.prerequisite.id)
            if (prereqPos) prereqYs.push(prereqPos.y)
          })
        }

        if (prereqYs.length > 0) {
          targetY = prereqYs.reduce((sum, y) => sum + y, 0) / prereqYs.length
        } else {
          // Root nodes - spread vertically
          targetY = START_Y + coursesAtDepth.indexOf(course) * (CARD_HEIGHT + VERTICAL_GAP * 3)
        }

        courseTargets.push({ course, targetY })
      })

      // Sort by target position for natural flow
      courseTargets.sort((a, b) => a.targetY - b.targetY)

      // Position with overlap prevention
      let currentY = START_Y
      courseTargets.forEach(({ course, targetY }) => {
        const y = Math.max(currentY, targetY)
        posMap.set(course.id, { x, y, level: depth })
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

    // Set canvas size
    let maxX = 0
    let maxY = 0
    posMap.forEach(pos => {
      maxX = Math.max(maxX, pos.x + CARD_WIDTH + 100)
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT + 100)
    })

    canvas.width = Math.max(container.scrollWidth, maxX)
    canvas.height = Math.max(container.scrollHeight, maxY)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw prerequisite arrows
    requiredCourses.forEach(course => {
      const coursePos = posMap.get(course.id)
      if (!coursePos || !course.prerequisites) return

      course.prerequisites.forEach(prereq => {
        if (prereq.prerequisite.id === course.id) return // Skip self-references

        const prereqPos = posMap.get(prereq.prerequisite.id)
        if (!prereqPos) return

        const status = getCourseStatus(course)

        // Calculate connection points
        const startX = prereqPos.x + CARD_WIDTH
        const startY = prereqPos.y + CARD_HEIGHT / 2
        const endX = coursePos.x
        const endY = coursePos.y + CARD_HEIGHT / 2

        // Draw curved line for better aesthetics
        ctx.beginPath()
        ctx.moveTo(startX, startY)

        const controlX = startX + (endX - startX) / 2
        ctx.bezierCurveTo(controlX, startY, controlX, endY, endX, endY)

        // Color based on status
        if (status === 'completed') {
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = 2.5
        } else if (status === 'available') {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2.5
        } else {
          ctx.strokeStyle = '#9ca3af'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
        }

        ctx.stroke()
        ctx.setLineDash([])

        // Draw arrowhead
        const arrowSize = 8
        const angle = Math.atan2(endY - startY, endX - startX)

        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = ctx.strokeStyle
        ctx.fill()
      })
    })
  }, [courses, userCourses])

  const requiredCourses = courses.filter(c =>
    !c.isElective && (!c.category || !c.category.toLowerCase().includes('elective'))
  )

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-black/10">
      <div ref={containerRef} className="relative w-full h-[800px] overflow-auto">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none z-[5]"
        />

        <div className="relative min-h-full">
          {/* Course cards */}
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
                className={`absolute cursor-pointer transition-all duration-200 ${
                  hoveredCourse === course.id ? 'scale-105 shadow-2xl z-20' : 'shadow-md z-10'
                } ${
                  completed
                    ? 'bg-green-50 border-2 border-green-500'
                    : available
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-gray-300 opacity-70'
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '180px',
                  minHeight: '90px',
                }}
              >
                <div className="p-3 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-bold text-[13px] text-black leading-tight">{course.code}</h4>
                    {completed && (
                      <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-600 line-clamp-2 mb-2 flex-grow">
                    {course.name}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-black/10">
                    <Badge variant="secondary" className="text-[9px] bg-white border-black/20 px-1.5 py-0.5">
                      {course.credits} cr
                    </Badge>
                    {completed && (
                      <span className="text-[9px] font-bold text-green-700">✓</span>
                    )}
                    {available && !completed && (
                      <span className="text-[9px] font-bold text-blue-700">Ready</span>
                    )}
                    {locked && (
                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg p-3 shadow-xl border border-black/10">
        <div className="text-[10px] font-semibold text-black mb-2">Status</div>
        <div className="flex flex-col space-y-1.5 text-[10px]">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-500" />
            <span className="text-black">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-500" />
            <span className="text-black">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-300" />
            <span className="text-black">Locked</span>
          </div>
        </div>
      </div>
    </div>
  )
}
