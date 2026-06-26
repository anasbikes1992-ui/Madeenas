import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ reviews: [], total: 0 })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Finance Review model was removed' }, { status: 404 })
}
