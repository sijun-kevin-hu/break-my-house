import { useEffect, useState } from 'react'

/**
 * Shared affordance for scene objects that trigger a disaster on click.
 * Returns `hovered` (so callers can highlight the mesh) and `bind` — spread it
 * onto the trigger's <group>/<mesh> to wire pointer + click handlers.
 *
 * Once `disabled` (the disaster has already fired), the object stops responding
 * and the cursor/hover reset, so it no longer reads as interactive.
 */
export function useClickable(onClick, disabled = false) {
  const [hovered, setHovered] = useState(false)
  const active = hovered && !disabled

  // Show a pointer cursor while hovering a live trigger.
  useEffect(() => {
    if (!active) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [active])

  const bind = {
    onPointerOver: (e) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: (e) => {
      e.stopPropagation()
      setHovered(false)
    },
    onClick: (e) => {
      e.stopPropagation()
      if (!disabled) onClick()
    },
  }

  return { hovered: active, bind }
}
