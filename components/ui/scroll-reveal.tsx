"use client"

import { motion, useInView, useAnimation, Variant } from "framer-motion"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: React.ReactNode
  width?: "fit-content" | "100%"
  className?: string
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number
}

export function ScrollReveal({
  children,
  width = "fit-content",
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 50,
}: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" }) // Trigger when 50px of element is visible
  const controls = useAnimation()

  // Define directions
  const getDirectionOffset = () => {
    switch (direction) {
      case "up": return { y: distance, x: 0 }
      case "down": return { y: -distance, x: 0 }
      case "left": return { x: distance, y: 0 }
      case "right": return { x: -distance, y: 0 }
      case "none": return { x: 0, y: 0 }
      default: return { y: distance, x: 0 }
    }
  }

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [isInView, controls])

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, ...getDirectionOffset() },
        visible: { 
          opacity: 1, 
          x: 0, 
          y: 0,
          transition: { duration, delay, ease: "easeOut" }
        },
      }}
      initial="hidden"
      animate={controls}
      className={cn(width === "100%" ? "w-full" : "", className)}
    >
      {children}
    </motion.div>
  )
}