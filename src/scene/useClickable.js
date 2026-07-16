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

  // Triggering an event disables every target. Clear local hover state at that
  // point so a later reset cannot revive a stale highlight or pulse ring.
  useEffect(() => {
    if (disabled) setHovered(false)
  }, [disabled])

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
      if (disabled) return
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: (e) => {
      if (disabled) return
      e.stopPropagation()
      setHovered(false)
    },
    // OrbitControls listens directly on the canvas, before a click is emitted.
    // Stop the initial press as well as the click so dragging from a live
    // disaster target cannot start a camera orbit.
    onPointerDown: (e) => {
      if (disabled) return
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
    },
    onClick: (e) => {
      if (disabled) return
      e.stopPropagation()
      onClick()
    },
  }

  return { hovered: active, bind }
}
