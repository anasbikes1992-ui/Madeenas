'use client'
import { useState } from 'react'

export default function TestPage() {
  const [message] = useState('Test page loaded successfully')
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{message}</h1>
      <p>If you can see this, the page is working.</p>
    </div>
  )
}
