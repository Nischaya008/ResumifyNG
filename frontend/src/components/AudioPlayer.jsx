import { useRef, useEffect } from 'react'

function AudioPlayer({ audioUrl, isMuted, onEnded }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause()
      } else if (audioUrl) {
        audioRef.current.src = audioUrl
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err)
        })
      }
    }
  }, [audioUrl, isMuted])

  return (
    <audio
      ref={audioRef}
      onEnded={onEnded}
      style={{ display: 'none' }}
    />
  )
}

export default AudioPlayer
