import { NextResponse } from 'next/server'

type ApiSuccess<T> = {
  success: true
  data: T
}

type ApiError = {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status })
}

export function fail(message: string, status = 400, code?: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: { message, code, details },
    },
    { status }
  )
}
