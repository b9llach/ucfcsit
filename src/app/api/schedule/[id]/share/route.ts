import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scheduleId = params.id

    // Verify user owns this schedule
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: user.id
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Generate share token if doesn't exist
    let shareToken = schedule.shareToken
    if (!shareToken) {
      shareToken = randomBytes(32).toString('hex')
      
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          shareToken,
          isPublic: true
        }
      })
    }

    return NextResponse.json({ shareToken })
  } catch (error) {
    console.error("Error sharing schedule:", error)
    return NextResponse.json(
      { error: "Failed to share schedule", details: error.message },
      { status: 500 }
    )
  }
}