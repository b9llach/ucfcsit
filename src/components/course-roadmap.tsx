"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: string
  code: string
  name: string
  credits: number
  gepRequirement: boolean
  category: string | null
  description: string | null
  note: string | null
  isElective: boolean
  electiveLevel?: string | null
  prerequisites: {
    prerequisite: {
      id: string
      code: string
      alternatives?: { alternative: { id: string; code: string } }[]
    }
  }[]
}

interface UserCourse {
  courseId: string
  completed: boolean
}

interface RoadmapProps {
  courses: Course[]
  userCourses: UserCourse[]
  onCourseClick?: (course: Course) => void
  focusedCourseCode?: string | null
}

interface Position {
  x: number
  y: number
  level: number
}

interface GraphNode {
  course: Course
  level: number
  dependents: string[] // Courses that require this as a prerequisite
  prerequisites: string[]
}

export function CourseRoadmap({ courses, userCourses, onCourseClick, focusedCourseCode }: RoadmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<string, Position>>(new Map())
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null)

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Elective slots state (6 elective slots for CS/IT degree)
  const [selectedElectives, setSelectedElectives] = useState<(string | null)[]>([
    null, null, null, null, null, null
  ])

  // Load selected electives from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedElectives')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 6) {
          setSelectedElectives(parsed)
        }
      } catch (e) {
        console.error('Failed to load selected electives:', e)
      }
    }
  }, [])

  // Save selected electives to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('selectedElectives', JSON.stringify(selectedElectives))
  }, [selectedElectives])

  // Separate electives from required courses
  const electiveCourses = courses.filter(c => c.isElective || c.category?.toLowerCase().includes('elective'))
  const requiredCourses = courses.filter(c => !c.isElective && (!c.category || !c.category.toLowerCase().includes('elective')))

  const isCompleted = (courseId: string) => {
    return userCourses.some(uc => uc.courseId === courseId && uc.completed)
  }

  const getCourseStatus = (course: Course) => {
    const completed = isCompleted(course.id)
    if (completed) return 'completed'

    if (!course.prerequisites || course.prerequisites.length === 0) return 'available'

    // Check if all prerequisites are met (considering alternatives)
    const prereqsMet = course.prerequisites.every(p => {
      // Check if the prerequisite itself is completed
      if (isCompleted(p.prerequisite.id)) return true

      // Check if any alternative to this prerequisite is completed
      if (p.prerequisite.alternatives && p.prerequisite.alternatives.length > 0) {
        return p.prerequisite.alternatives.some(alt => isCompleted(alt.alternative.id))
      }

      return false
    })

    if (prereqsMet) return 'available'

    return 'locked'
  }

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.3))
  }

  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)))
  }, [])

  // Add non-passive wheel event listener to prevent page scroll
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).closest('canvas')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle elective selection
  const handleElectiveSelect = (slotIndex: number, courseId: string) => {
    setSelectedElectives(prev => {
      const newElectives = [...prev]
      newElectives[slotIndex] = courseId || null
      return newElectives
    })
  }

  useEffect(() => {

    if (requiredCourses.length === 0) return

    console.log('=== BUILDING COURSE PREREQUISITE GRAPH ===')
    console.log('Total required courses:', requiredCourses.length)

    // Get selected elective courses
    const selectedElectiveCourses = selectedElectives
      .filter(id => id !== null)
      .map(id => courses.find(c => c.id === id))
      .filter(c => c !== undefined) as Course[]

    console.log('Selected electives:', selectedElectiveCourses.map(c => c.code).join(', '))

    // Build course map and graph nodes (required courses + selected electives + all prerequisites)
    const courseMap = new Map<string, Course>()
    const graphNodes = new Map<string, GraphNode>()

    // Helper function to add a course and its prerequisites recursively
    const addCourseToGraph = (course: Course) => {
      // Skip if already added
      if (graphNodes.has(course.id)) return

      // Add to maps
      courseMap.set(course.id, course)
      graphNodes.set(course.id, {
        course: course,
        level: -1,
        dependents: [],
        prerequisites: course.prerequisites?.map(p => p.prerequisite.id) || []
      })

      // Recursively add prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        course.prerequisites.forEach(p => {
          const prereqCourse = courses.find(c => c.id === p.prerequisite.id)
          if (prereqCourse) {
            addCourseToGraph(prereqCourse)
          }
        })
      }
    }

    // Add required courses and their prerequisites
    requiredCourses.forEach(c => addCourseToGraph(c))

    // Add selected electives and their prerequisites
    selectedElectiveCourses.forEach(c => addCourseToGraph(c))

    // Build reverse dependencies (which courses depend on this course)
    const allCoursesToProcess = [...requiredCourses, ...selectedElectiveCourses]
    allCoursesToProcess.forEach(course => {
      if (course.prerequisites) {
        course.prerequisites.forEach(p => {
          const prereqNode = graphNodes.get(p.prerequisite.id)
          if (prereqNode && !prereqNode.dependents.includes(course.id)) {
            prereqNode.dependents.push(course.id)
          }
        })
      }
    })

    // Log prerequisite relationships
    console.log('\n=== PREREQUISITE RELATIONSHIPS ===')
    graphNodes.forEach((node, id) => {
      if (node.dependents.length > 0) {
        console.log(`${node.course.code} is required by:`, node.dependents.map(depId => {
          const depCourse = courseMap.get(depId)
          return depCourse?.code || depId
        }).join(', '))
      }
    })

    // Calculate levels using topological sort with level assignment
    const calculateLevels = () => {
      const visited = new Set<string>()
      const inCalculation = new Set<string>()

      const calcLevel = (courseId: string): number => {
        const node = graphNodes.get(courseId)
        if (!node) return 0

        // Already calculated
        if (node.level >= 0) return node.level

        // Detect cycles
        if (inCalculation.has(courseId)) {
          console.warn(`Cycle detected at ${node.course.code}`)
          return 0
        }

        // No prerequisites = level 0 (foundational courses)
        if (node.prerequisites.length === 0) {
          node.level = 0
          return 0
        }

        inCalculation.add(courseId)

        // Level = max(prerequisite levels) + 1
        let maxPrereqLevel = -1
        for (const prereqId of node.prerequisites) {
          const prereqNode = graphNodes.get(prereqId)
          if (prereqNode) {
            const prereqLevel = calcLevel(prereqId)
            maxPrereqLevel = Math.max(maxPrereqLevel, prereqLevel)
          }
        }

        inCalculation.delete(courseId)
        node.level = maxPrereqLevel + 1
        visited.add(courseId)

        return node.level
      }

      // Calculate all levels
      graphNodes.forEach((node, id) => {
        if (!visited.has(id)) {
          calcLevel(id)
        }
      })
    }

    calculateLevels()

    // Group courses by level
    const levelGroups = new Map<number, GraphNode[]>()
    graphNodes.forEach(node => {
      const level = node.level
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(node)
    })

    console.log('\n=== LEVEL ASSIGNMENTS ===')
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)
    sortedLevels.forEach(level => {
      const nodes = levelGroups.get(level)!
      console.log(`Level ${level}: ${nodes.map(n => n.course.code).join(', ')}`)
    })

    // Layout constants
    const CARD_WIDTH = 200
    const CARD_HEIGHT = 100
    const HORIZONTAL_GAP = 150
    const VERTICAL_GAP = 40
    const START_X = 80
    const START_Y = 60

    const posMap = new Map<string, Position>()

    // Position courses level by level
    sortedLevels.forEach((level, levelIndex) => {
      const nodesAtLevel = levelGroups.get(level)!
      const x = START_X + levelIndex * (CARD_WIDTH + HORIZONTAL_GAP)

      // Sort nodes at this level by their dependencies to minimize crossing
      // Nodes with similar prerequisites should be close together
      const sortedNodes = [...nodesAtLevel].sort((a, b) => {
        // Foundational courses (level 0) - sort alphabetically
        if (level === 0) {
          return a.course.code.localeCompare(b.course.code)
        }

        // For higher levels, calculate average Y position of prerequisites
        const getPrereqAvgY = (node: GraphNode): number => {
          if (node.prerequisites.length === 0) return 0
          const prereqYs = node.prerequisites
            .map(pId => posMap.get(pId)?.y || 0)
            .filter(y => y > 0)
          if (prereqYs.length === 0) return 0
          return prereqYs.reduce((sum, y) => sum + y, 0) / prereqYs.length
        }

        const avgYA = getPrereqAvgY(a)
        const avgYB = getPrereqAvgY(b)

        return avgYA - avgYB
      })

      // Calculate vertical spacing to prevent overlap while maintaining flow
      let currentY = START_Y

      sortedNodes.forEach((node, index) => {
        // For courses with prerequisites, try to align with them
        if (node.prerequisites.length > 0 && level > 0) {
          const prereqYs = node.prerequisites
            .map(pId => posMap.get(pId)?.y)
            .filter((y): y is number => y !== undefined)

          if (prereqYs.length > 0) {
            const targetY = prereqYs.reduce((sum, y) => sum + y, 0) / prereqYs.length
            // Use target Y but ensure no overlap
            currentY = Math.max(currentY, targetY)
          }
        }

        posMap.set(node.course.id, {
          x,
          y: currentY,
          level
        })

        currentY += CARD_HEIGHT + VERTICAL_GAP
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

    // Set canvas size to accommodate all courses
    let maxX = 0
    let maxY = 0
    posMap.forEach(pos => {
      maxX = Math.max(maxX, pos.x + CARD_WIDTH + 150)
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT + 150)
    })

    canvas.width = Math.max(container.clientWidth, maxX)
    canvas.height = Math.max(container.clientHeight, maxY)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    console.log('\n=== DRAWING CONNECTIONS ===')
    let connectionCount = 0

    // Draw all prerequisite connections
    graphNodes.forEach((node, courseId) => {
      const coursePos = posMap.get(courseId)
      if (!coursePos) return

      const status = getCourseStatus(node.course)

      // Draw connections to all prerequisites
      node.prerequisites.forEach(prereqId => {
        const prereqPos = posMap.get(prereqId)
        if (!prereqPos) {
          console.warn(`Position not found for prerequisite ${prereqId}`)
          return
        }

        connectionCount++

        // Calculate connection points
        const startX = prereqPos.x + CARD_WIDTH
        const startY = prereqPos.y + CARD_HEIGHT / 2
        const endX = coursePos.x
        const endY = coursePos.y + CARD_HEIGHT / 2

        // Draw smooth bezier curve
        ctx.beginPath()
        ctx.moveTo(startX, startY)

        // Control points for smooth curve
        const controlX1 = startX + (endX - startX) * 0.4
        const controlX2 = startX + (endX - startX) * 0.6
        ctx.bezierCurveTo(controlX1, startY, controlX2, endY, endX, endY)

        // Color and style based on status
        if (status === 'completed') {
          ctx.strokeStyle = '#10b981' // Green
          ctx.lineWidth = 3
        } else if (status === 'available') {
          ctx.strokeStyle = '#3b82f6' // Blue
          ctx.lineWidth = 2.5
        } else {
          ctx.strokeStyle = '#cbd5e1' // Gray
          ctx.lineWidth = 2
          ctx.setLineDash([8, 4])
        }

        ctx.stroke()
        ctx.setLineDash([])

        // Draw arrowhead
        const arrowSize = 10
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

        // Log the connection
        const prereqCourse = courseMap.get(prereqId)
        if (prereqCourse) {
          console.log(`${prereqCourse.code} → ${node.course.code}`)
        }
      })
    })

    console.log(`Total connections drawn: ${connectionCount}`)
  }, [courses, userCourses, selectedElectives])

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-white rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
      {/* Elective Selection Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-300 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-purple-900">Choose Your Electives (6 Required)</h3>
          <span className="text-xs text-purple-700">
            {selectedElectives.filter(e => e !== null).length}/6 Selected
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {selectedElectives.map((selected, index) => (
            <div key={index} className="flex flex-col">
              <label className="text-xs font-medium text-purple-800 mb-1">Elective {index + 1}</label>
              <select
                value={selected || ''}
                onChange={(e) => handleElectiveSelect(index, e.target.value)}
                className="w-full text-xs bg-white border-2 border-purple-300 rounded-lg px-2 py-1.5 text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                title={`Choose elective ${index + 1}`}
              >
                <option value="">Select...</option>
                <optgroup label="4000-Level">
                  {electiveCourses
                    .filter(c => c.electiveLevel === '4000_level')
                    .filter(c => !selectedElectives.includes(c.id) || selected === c.id)
                    .map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="5000-Level">
                  {electiveCourses
                    .filter(c => c.electiveLevel === '5000_level')
                    .filter(c => !selectedElectives.includes(c.id) || selected === c.id)
                    .map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Header - Info and Legend */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Course Progression Info */}
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg px-3 py-2 border border-primary/20">
            <div className="text-xs font-bold text-gray-900 mb-0.5">Course Progression</div>
            <div className="text-xs text-gray-600">
              Left to Right
            </div>
          </div>
        </div>

        {/* Center - Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            aria-label="Zoom out"
            title="Zoom out (or use mouse wheel)"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <div className="px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-300" title="Current zoom level">
            <span className="text-xs font-semibold text-gray-700">{Math.round(zoom * 100)}%</span>
          </div>

          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            aria-label="Zoom in"
            title="Zoom in (or use mouse wheel)"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-xs font-medium text-gray-700"
            aria-label="Reset zoom"
            title="Reset zoom and pan to default"
          >
            Reset
          </button>

          <div className="ml-2 text-xs text-gray-500 italic">
            {isDragging ? '🖐️ Dragging' : '🖱️ Scroll to zoom, drag to pan'}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="text-xs font-bold text-gray-900 mb-2">Course Status</div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500" />
              <span className="text-gray-700 font-medium">Completed</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500" />
              <span className="text-gray-700 font-medium">Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300" />
              <span className="text-gray-700 font-medium">Locked</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-600" />
              <span className="text-gray-700 font-medium">Elective</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zoomable Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ minHeight: '800px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          className="relative w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
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
                className={`absolute transition-all duration-200 cursor-pointer ${
                  hoveredCourse === course.id ? 'scale-105 shadow-2xl z-20' : 'shadow-lg z-10'
                } ${
                  focusedCourseCode === course.code ? 'ring-4 ring-yellow-400 ring-offset-2 scale-110 z-30' : ''
                } ${
                  completed
                    ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500'
                    : available
                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 opacity-60'
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '200px',
                  minHeight: '100px',
                }}
              >
                <div className="p-3.5 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm text-gray-900 leading-tight">{course.code}</h4>
                    {completed && (
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {locked && (
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <p className="text-xs text-gray-700 line-clamp-2 mb-2 flex-grow">
                    {course.name}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                    <Badge variant="secondary" className="text-xs bg-white/80 hover:bg-white/80 border border-gray-300 px-2 py-0.5 font-semibold text-gray-900 hover:text-gray-900">
                      {course.credits} credits
                    </Badge>
                    {completed && (
                      <span className="text-xs font-bold text-green-700">Completed</span>
                    )}
                    {available && !completed && (
                      <span className="text-xs font-bold text-blue-700">Available</span>
                    )}
                    {locked && (
                      <span className="text-xs font-medium text-gray-500">Locked</span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Selected Elective cards - rendered dynamically based on prerequisites */}
          {selectedElectives
            .filter(id => id !== null)
            .map(courseId => courses.find(c => c.id === courseId))
            .filter(course => course !== undefined)
            .map(course => {
              const pos = positions.get(course!.id)
              if (!pos) return null

              const status = getCourseStatus(course!)
              const completed = status === 'completed'
              const available = status === 'available'
              const locked = status === 'locked'

              return (
                <Card
                  key={course!.id}
                  onClick={() => onCourseClick?.(course!)}
                  onMouseEnter={() => setHoveredCourse(course!.id)}
                  onMouseLeave={() => setHoveredCourse(null)}
                  className={`absolute transition-all duration-200 cursor-pointer ${
                    hoveredCourse === course!.id ? 'scale-105 shadow-2xl z-20' : 'shadow-lg z-10'
                  } ${
                    focusedCourseCode === course!.code ? 'ring-4 ring-yellow-400 ring-offset-2 scale-110 z-30' : ''
                  } ${
                    completed
                      ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-500'
                      : available
                      ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-600'
                      : 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 opacity-60'
                  }`}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '200px',
                    minHeight: '100px',
                  }}
                >
                  <div className="p-3.5 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-sm text-purple-900 leading-tight">{course!.code}</h4>
                        <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      </div>
                      {completed && (
                        <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {locked && (
                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <p className="text-xs text-purple-800 line-clamp-2 mb-2 flex-grow">
                      {course!.name}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-purple-300">
                      <Badge variant="secondary" className="text-xs bg-white/80 hover:bg-white/80 border border-purple-300 px-2 py-0.5 font-semibold text-purple-900 hover:text-purple-900">
                        {course!.credits} credits
                      </Badge>
                      <span className="text-xs font-bold text-purple-700">ELECTIVE</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
