import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function Portal({ children }) {
  const mount = document.body
  const el = document.createElement('div')
  
  // Check if this portal is for the cursor
  const isCursor = children?.props?.className?.includes('custom-cursor')
  el.className = isCursor ? 'cursor-container' : 'portal-container'

  useEffect(() => {
    mount.appendChild(el)
    if (!isCursor) {
      document.body.classList.add('modal-open')
    }
    
    return () => {
      mount.removeChild(el)
      if (!isCursor) {
        document.body.classList.remove('modal-open')
      }
    }
  }, [el, mount, isCursor])

  return createPortal(children, el)
}

export default Portal 