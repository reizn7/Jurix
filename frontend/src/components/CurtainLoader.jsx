import { useEffect, useState } from 'react'
import '../styles/Curtain.css'

function CurtainLoader({ onComplete }) {
  const [isOpening, setIsOpening] = useState(false)

  useEffect(() => {
    // Start opening animation after a brief delay
    const openTimer = setTimeout(() => {
      setIsOpening(true)
    }, 1500) 

    // Call onComplete after animation finishes
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, 2800) 

    return () => {
      clearTimeout(openTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div className={`curtain-container ${isOpening ? 'opening' : 'active'}`}>
      {/* Left Curtain */}
      <div className="curtain curtain-left">
        <div className="curtain-decoration"></div>
      </div>

      {/* Right Curtain */}
      <div className="curtain curtain-right">
        <div className="curtain-decoration"></div>
      </div>

      {/* Center Logo */}
      <div className="curtain-logo">
        <div className="curtain-logo-icon">⚖️</div>
        <h1 className="curtain-logo-text">JURIX</h1>
        <p className="curtain-logo-tagline">Legal Assistant</p>
        <div className="curtain-loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}

export default CurtainLoader
