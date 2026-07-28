'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Download, FileText, AlertCircle, Loader2 } from 'lucide-react'

interface DocumentViewerProps {
  url: string
  name: string
}

export default function DocumentViewer({ url, name }: DocumentViewerProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Simple heuristic for PDFs vs Images from Firebase Storage URLs
  // Often they don't have standard extensions if grabbed via token, but usually 'application/pdf' might be hinted
  // We'll assume if it's not clearly an image, it's a PDF.
  const [inferredType, setInferredType] = useState<'image' | 'pdf'>('image')

  useEffect(() => {
    // Reset state on url change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScale(1)
    setRotation(0)
    setLoading(true)
    setError(false)
    
    if (url.toLowerCase().includes('.pdf') || url.includes('pdf')) {
      setInferredType('pdf')
    } else {
      setInferredType('image')
    }
  }, [url])

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 4))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
  const handleRotate = () => setRotation(r => (r + 90) % 360)
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-brand-surface border border-brand-border overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-[200] w-screen h-screen rounded-none' : 'w-full h-full rounded-2xl'
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-elevated border-b border-brand-border shrink-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary-text flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
          <h3 className="text-sm font-bold text-white truncate">{name}</h3>
        </div>
        
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div className="flex items-center gap-1">
          {inferredType === 'image' && (
            <>
              <ToolbarButton icon={<ZoomOut size={16} />} onClick={handleZoomOut} label="Zoom Out" />
              <span className="text-xs font-mono text-text-muted w-10 text-center">{Math.round(scale * 100)}%</span>
              <ToolbarButton icon={<ZoomIn size={16} />} onClick={handleZoomIn} label="Zoom In" />
              <div className="w-px h-4 bg-white/10 mx-1" />
              <ToolbarButton icon={<RotateCw size={16} />} onClick={handleRotate} label="Rotate" />
            </>
          )}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton icon={<Download size={16} />} onClick={() => window.open(url, '_blank')} label="Download" />
          <ToolbarButton 
            icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />} 
            onClick={toggleFullscreen} 
            label="Fullscreen" 
          />
        </div>
      </div>

      {/* Viewer Area */}
      <div className="relative flex-1 bg-black/40 overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface/50 backdrop-blur-sm z-20">
            <Loader2 size={32} className="text-brand-primary-text animate-spin mb-4" />
            <p className="text-sm font-semibold text-text-secondary">Loading document...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface z-20 text-text-muted">
            <AlertCircle size={48} className="text-brand-error/50 mb-4" />
            <p className="text-sm font-semibold text-white">Failed to load document</p>
            <p className="text-xs mt-1">The file might be corrupted or the URL is invalid.</p>
            <button 
              onClick={() => window.open(url, '_blank')}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              Open Externally
            </button>
          </div>
        )}

        {inferredType === 'image' ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <motion.img
              src={url}
              alt={name}
              className="max-w-none origin-center cursor-grab active:cursor-grabbing"
              style={{
                scale,
                rotate: rotation,
              }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true) }}
              drag
              dragConstraints={containerRef}
              dragElastic={0}
              dragMomentum={false}
            />
          </div>
        ) : (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full border-none"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true) }}
          />
        )}
      </div>
    </div>
  )
}

function ToolbarButton({ icon, onClick, label }: { icon: React.ReactNode, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
    >
      {icon}
    </button>
  )
}
