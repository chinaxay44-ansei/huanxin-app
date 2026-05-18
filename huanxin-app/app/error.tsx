'use client'
import React from "react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 text-center">
      <p className="text-lg">发生错误，请重试</p>
      <button className="mt-4 px-4 py-2 rounded border" onClick={() => reset()}>重试</button>
    </div>
  )
}