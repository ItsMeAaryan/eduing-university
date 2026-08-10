'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { auth, storage } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import type { FirestoreRecord, FirestoreWriteData } from '@/lib/firebase/types'
import { getUniversity, updateUniversityProfile } from '@/lib/firebase/university'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { 
  Camera, 
  MapPin, 
  Globe, 
  Phone, 
  Mail,
  X, 
  Edit3, 
  Layout, 
  Users, 
  Trophy,
  Upload,
  Loader2,
  CheckCircle2,
  Eye,
  Award,
  ShieldCheck,
  GraduationCap,
  Building2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Percent,
  IndianRupee,
  Ruler,
  ExternalLink,
  Sparkles,
  BookOpen,
  Plus,
  HelpCircle,
  Share2
} from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToast } from '@/components/Toast'

// Custom SVG Icons for Social Platforms
const LinkedinIcon = ({ className = "w-3.5 h-3.5 text-blue-500" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z"/>
  </svg>
)

const TwitterIcon = ({ className = "w-3.5 h-3.5 text-sky-400" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramIcon = ({ className = "w-3.5 h-3.5 text-pink-500" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const FacebookIcon = ({ className = "w-3.5 h-3.5 text-blue-600" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const FACILITIES_LIST = [
  'Library', 'Hostel', 'Sports Complex', 'Labs',
  'Cafeteria', 'Medical', 'WiFi', 'Gym',
  'Auditorium', 'Placement Cell', 'Research Center',
  'Transport', 'ATM / Bank', 'Smart Classrooms'
]

const APPROVALS_LIST = ['UGC', 'AICTE', 'BCI', 'MCI', 'INC', 'PCI', 'COA', 'NMC']

const NAAC_GRADES = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'Not Accredited']

const UNI_TYPES = ['Private', 'Government', 'Deemed', 'Autonomous']

export default function ProfilePage() {
  const { user, userData } = useAuth()
  const { toast } = useToast()
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isPreviewStudent, setIsPreviewStudent] = useState(false)
  const [university, setUniversity] = useState<FirestoreRecord | null>(null)
  const [formData, setFormData] = useState<FirestoreWriteData>({})
  const [programCount, setProgramCount] = useState<number>(0)
  
  // Track active inline edit field name
  const [inlineEditField, setInlineEditField] = useState<string | null>(null)

  // Target University ID (handles both Uni Admin user.uid and Uni Staff userData.universityId)
  const universityId = userData?.universityId || user?.uid || auth.currentUser?.uid

  useEffect(() => {
    let unsubscribePrograms: (() => void) | undefined

    const loadData = async () => {
      if (!universityId) {
        setLoading(false)
        return
      }

      try {
        const data = await getUniversity(universityId)
        if (data) {
          setUniversity(data)
          setFormData(data)
        }

        unsubscribePrograms = subscribeToPrograms(universityId, (programs) => {
          setProgramCount(programs.length)
        })
      } catch (err) {
        console.error('Error loading university profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    return () => {
      if (unsubscribePrograms) unsubscribePrograms()
    }
  }, [universityId])

  // Save changes to Firestore
  const persistChanges = async (dataToSave: FirestoreWriteData) => {
    if (!universityId) return
    setSaving(true)
    try {
      await updateUniversityProfile(universityId, dataToSave)
      setUniversity((prev) => ({ ...prev, ...dataToSave } as FirestoreRecord))
      setFormData((prev) => ({ ...prev, ...dataToSave }))
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
      setInlineEditField(null)
    }
  }

  const handleGlobalSave = async () => {
    await persistChanges(formData)
    setIsEditing(false)
  }

  // Handle Cover / Logo / Gallery File Uploads
  const handleFileUpload = async (file: File, path: string, type: 'logo' | 'banner' | 'gallery') => {
    if (!universityId) return

    toast.info(`Uploading ${type}...`)
    try {
      const storageRef = ref(storage, `universities/${universityId}/${path}/${Date.now()}_${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)

      if (type === 'logo') {
        await persistChanges({ logoURL: url })
      } else if (type === 'banner') {
        await persistChanges({ bannerURL: url })
      } else if (type === 'gallery') {
        const currentGallery = formData.gallery || []
        if (currentGallery.length >= 10) {
          toast.error('Maximum limit of 10 photos reached in gallery')
          return
        }
        const updatedGallery = [...currentGallery, url].slice(0, 10)
        await persistChanges({ gallery: updatedGallery })
      }
    } catch (error) {
      console.error(error)
      toast.error('File upload failed')
    }
  }

  // Gallery Photo Reordering
  const moveGalleryImage = async (index: number, direction: 'left' | 'right') => {
    const current = [...(formData.gallery || [])]
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= current.length) return

    const temp = current[index]
    current[index] = current[targetIndex]
    current[targetIndex] = temp

    await persistChanges({ gallery: current })
  }

  const deleteGalleryImage = async (urlToDelete: string) => {
    const current = formData.gallery || []
    const updated = current.filter((u: string) => u !== urlToDelete)
    await persistChanges({ gallery: updated })
  }

  // Toggle Facility Chips
  const toggleFacility = async (facility: string) => {
    const current: string[] = formData.facilities || []
    const updated = current.includes(facility)
      ? current.filter((f) => f !== facility)
      : [...current, facility]
    
    setFormData((prev) => ({ ...prev, facilities: updated }))
    await persistChanges({ facilities: updated })
  }

  // Toggle Approval Chips
  const toggleApproval = async (approval: string) => {
    const current: string[] = formData.approvedBy || []
    const updated = current.includes(approval)
      ? current.filter((a) => a !== approval)
      : [...current, approval]

    setFormData((prev) => ({ ...prev, approvedBy: updated }))
    await persistChanges({ approvedBy: updated })
  }

  // Profile Completion Computation
  const profileCompletion = useMemo(() => {
    const fields = [
      { key: 'name', label: 'University Name', filled: !!formData.name },
      { key: 'tagline', label: 'Tagline', filled: !!formData.tagline },
      { key: 'about', label: 'About Description', filled: !!formData.about },
      { key: 'logoURL', label: 'Logo', filled: !!formData.logoURL },
      { key: 'bannerURL', label: 'Banner Cover', filled: !!formData.bannerURL },
      { key: 'foundedYear', label: 'Founded Year', filled: !!formData.foundedYear },
      { key: 'naacGrade', label: 'NAAC Grade', filled: !!formData.naacGrade },
      { key: 'nirfRank', label: 'NIRF Ranking', filled: !!formData.nirfRank },
      { key: 'type', label: 'University Type', filled: !!formData.type },
      { key: 'approvedBy', label: 'Regulatory Approvals', filled: Array.isArray(formData.approvedBy) && formData.approvedBy.length > 0 },
      { key: 'city', label: 'City & State', filled: !!(formData.city && formData.state) },
      { key: 'email', label: 'Official Email', filled: !!formData.email },
      { key: 'phone', label: 'Phone Number', filled: !!formData.phone },
      { key: 'website', label: 'Website URL', filled: !!formData.website },
      { key: 'applicationFee', label: 'Application Fee', filled: !!formData.applicationFee },
      { key: 'campusArea', label: 'Campus Area', filled: !!formData.campusArea },
      { key: 'facilities', label: 'Facilities', filled: Array.isArray(formData.facilities) && formData.facilities.length > 0 },
      { key: 'gallery', label: 'Photo Gallery', filled: Array.isArray(formData.gallery) && formData.gallery.length > 0 },
    ]

    const filledCount = fields.filter((f) => f.filled).length
    const percentage = Math.round((filledCount / fields.length) * 100)
    const missingFields = fields.filter((f) => !f.filled).map((f) => f.label)

    return { percentage, filledCount, total: fields.length, missingFields }
  }, [formData])

  // Get NAAC Badge Colors
  const getNaacBadgeStyle = (grade?: string) => {
    switch (grade) {
      case 'A++':
      case 'A+':
      case 'A':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      case 'B++':
      case 'B+':
      case 'B':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'C':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  // Inline edit field helper
  const renderInlineField = (
    fieldKey: string,
    label: string,
    value: string | number | undefined,
    inputType: 'text' | 'number' | 'select' | 'textarea' = 'text',
    options?: string[],
    placeholder: string = 'Click to edit...'
  ) => {
    const isEditingThis = inlineEditField === fieldKey || isEditing

    const handleSaveInline = () => {
      persistChanges({ [fieldKey]: formData[fieldKey] })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputType !== 'textarea') {
        handleSaveInline()
      }
      if (e.key === 'Escape') {
        setFormData((prev) => ({ ...prev, [fieldKey]: university?.[fieldKey] }))
        setInlineEditField(null)
      }
    }

    if (isEditingThis) {
      if (inputType === 'textarea') {
        return (
          <div className="space-y-2">
            <textarea
              className="input-dark min-h-[100px] resize-none text-sm w-full p-2.5 rounded-lg border border-brand-accent/50 bg-brand-surface text-text-primary focus:outline-hidden"
              value={formData[fieldKey] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus
            />
            {!isEditing && (
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setInlineEditField(null)}
                  className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveInline}
                  className="px-3 py-1 bg-brand-accent text-white text-xs font-semibold rounded-md flex items-center gap-1 hover:bg-brand-accent/90"
                >
                  <Check size={12} /> Save
                </button>
              </div>
            )}
          </div>
        )
      }

      if (inputType === 'select' && options) {
        return (
          <div className="flex items-center gap-2">
            <select
              className="input-dark text-sm p-2 rounded-lg border border-brand-accent/50 bg-brand-surface text-text-primary focus:outline-hidden"
              value={formData[fieldKey] || options[0]}
              onChange={(e) => {
                setFormData({ ...formData, [fieldKey]: e.target.value })
                if (!isEditing) {
                  persistChanges({ [fieldKey]: e.target.value })
                }
              }}
              autoFocus
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setInlineEditField(null)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <input
            type={inputType}
            className="input-dark text-sm p-2 rounded-lg border border-brand-accent/50 bg-brand-surface text-text-primary w-full focus:outline-hidden"
            value={formData[fieldKey] || ''}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
          />
          {!isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleSaveInline}
                className="p-1.5 bg-brand-accent text-white rounded-md hover:bg-brand-accent/90"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setInlineEditField(null)}
                className="p-1.5 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        onClick={() => setInlineEditField(fieldKey)}
        className="group relative cursor-pointer rounded-lg p-1 -m-1 hover:bg-white/5 transition-colors flex items-center justify-between"
        title="Click to edit"
      >
        <span className={value ? 'text-text-primary font-medium' : 'text-text-muted italic'}>
          {value || placeholder}
        </span>
        <Edit3 size={13} className="opacity-0 group-hover:opacity-100 text-brand-accent transition-opacity ml-2 shrink-0" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-3 text-text-muted">
        <Loader2 size={32} className="animate-spin text-brand-accent" />
        <p className="text-sm font-medium">Loading university profile...</p>
      </div>
    )
  }

  const uniNameInitial = (formData.name || university?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface/60 border border-brand-border p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Building2 size={22} className="text-brand-accent" />
            University Profile
          </h1>
          <p className="text-xs text-text-muted">
            Manage public institutional profile details, accreditation badges, and campus facilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewStudent(true)}
            className="btn-secondary text-xs font-semibold px-4 py-2 flex items-center gap-2 rounded-xl border border-brand-border hover:border-brand-accent hover:text-brand-accent transition-all"
          >
            <Eye size={15} />
            Preview as Student
          </button>

          <button
            onClick={() => (isEditing ? handleGlobalSave() : setIsEditing(true))}
            disabled={saving}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isEditing
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-brand-accent text-white hover:bg-brand-accent/90'
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              <CheckCircle2 size={16} />
            ) : (
              <Edit3 size={16} />
            )}
            {isEditing ? 'Save All Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Cover & Avatar Header Section */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-[240px] sm:h-[280px] w-full rounded-3xl overflow-hidden bg-linear-to-br from-brand-accent/30 via-indigo-900/20 to-purple-900/30 border border-brand-border group relative shadow-md">
          {formData.bannerURL || university?.bannerURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(formData.bannerURL || university?.bannerURL) as string}
              alt="University banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted/40">
              <Layout size={64} />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Edit Cover Overlay - Hover Only */}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner', 'banner')}
            />
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-900 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xl hover:bg-white transition-all transform hover:scale-105">
              <Camera size={16} /> Edit Cover Photo
            </div>
          </label>

          {/* Header Badges over Cover */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {formData.naacGrade && (
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border backdrop-blur-md ${getNaacBadgeStyle(formData.naacGrade as string)}`}>
                NAAC {formData.naacGrade}
              </span>
            )}
            {formData.nirfRank && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                <Trophy size={12} /> NIRF #{formData.nirfRank}
              </span>
            )}
          </div>
        </div>

        {/* Logo Avatar Overlapping Banner */}
        <div className="absolute -bottom-12 left-6 sm:left-10 z-10">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-brand-surface border-4 border-brand-bg shadow-2xl overflow-hidden group relative flex items-center justify-center">
            {formData.logoURL || university?.logoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(formData.logoURL || university?.logoURL) as string}
                alt="University logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-accent via-indigo-600 to-purple-700 text-white font-extrabold text-5xl shadow-inner">
                {uniNameInitial}
              </div>
            )}

            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo', 'logo')}
              />
              <div className="flex flex-col items-center gap-1 text-white text-[10px] font-bold">
                <Camera size={20} />
                <span>Change Logo</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Profile Completion Bar (LinkedIn Style) */}
      <div className="pt-10">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Profile Completion
              </h2>
            </div>
            <span className="text-xs font-extrabold text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20">
              {profileCompletion.percentage}% Completed ({profileCompletion.filledCount}/{profileCompletion.total} fields)
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-white/10 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-accent via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion.percentage}%` }}
            />
          </div>

          {/* Missing Nudge */}
          {profileCompletion.missingFields.length > 0 && (
            <p className="text-xs text-text-muted flex items-center gap-1.5 pt-1">
              <HelpCircle size={14} className="text-amber-500 shrink-0" />
              <span>
                Complete your profile by adding:{' '}
                <strong className="text-text-secondary font-semibold">
                  {profileCompletion.missingFields.slice(0, 3).join(', ')}
                </strong>
                {profileCompletion.missingFields.length > 3 && ` and ${profileCompletion.missingFields.length - 3} more`}.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information Card */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <h3 className="section-label flex items-center gap-2 text-text-primary font-bold">
                <GraduationCap size={16} className="text-brand-accent" />
                General Information
              </h3>
              <span className="text-[11px] text-text-muted italic">Click any field to edit</span>
            </div>

            <div className="space-y-5">
              {/* University Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  University Name
                </label>
                {renderInlineField('name', 'University Name', formData.name || university?.name, 'text', undefined, 'e.g. Stanford University')}
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Tagline / Motto
                </label>
                {renderInlineField('tagline', 'Tagline', formData.tagline || university?.tagline, 'text', undefined, 'e.g. Empowering Next-Gen Innovators')}
              </div>

              {/* About Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  About Institution
                </label>
                {renderInlineField('about', 'About', formData.about || university?.about, 'textarea', undefined, 'Provide a rich overview of your institution...')}
              </div>

              {/* 2-Column Grid for Accreditation & Types */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    NAAC Accreditation Grade
                  </label>
                  {renderInlineField('naacGrade', 'NAAC Grade', formData.naacGrade || university?.naacGrade, 'select', NAAC_GRADES)}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    NIRF Ranking
                  </label>
                  {renderInlineField('nirfRank', 'NIRF Rank', formData.nirfRank || university?.nirfRank, 'text', undefined, 'e.g. 15')}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    University Type
                  </label>
                  {renderInlineField('type', 'University Type', formData.type || university?.type, 'select', UNI_TYPES)}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    Founded Year
                  </label>
                  {renderInlineField('foundedYear', 'Founded Year', formData.foundedYear || university?.foundedYear, 'text', undefined, 'e.g. 1985')}
                </div>
              </div>

              {/* Affiliation Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    Affiliation Status
                  </label>
                  {renderInlineField('affiliationType', 'Affiliation Status', formData.affiliationType || university?.affiliationType || 'Autonomous', 'select', ['Autonomous', 'Affiliated'])}
                </div>

                {(formData.affiliationType === 'Affiliated' || university?.affiliationType === 'Affiliated') && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                      Parent University Name
                    </label>
                    {renderInlineField('parentUniversity', 'Parent University', formData.parentUniversity || university?.parentUniversity, 'text', undefined, 'e.g. Anna University')}
                  </div>
                )}
              </div>

              {/* Regulatory Approvals (Multi-select Chips) */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Approved By (Regulatory Bodies)
                </label>
                <div className="flex flex-wrap gap-2">
                  {APPROVALS_LIST.map((appr) => {
                    const isSelected = (formData.approvedBy || []).includes(appr)
                    return (
                      <button
                        type="button"
                        key={appr}
                        onClick={() => toggleApproval(appr)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {appr}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Courses Offered Section */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Courses & Programs Offered</h3>
                  <p className="text-xs text-text-muted">
                    Total active academic programs listed on Eduing platform
                  </p>
                </div>
              </div>

              <Link
                href="/programs"
                className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <span>Manage Programs</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-brand-bg/50 border border-brand-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-brand-accent">{programCount}</span>
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Academic Programs Active
                </span>
              </div>

              <Link
                href="/programs"
                className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
              >
                View all in Programs tab <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Campus Facilities (Toggleable Chips) */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-accent" />
                  Campus Facilities
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Click chips to toggle facility availability on student profile
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FACILITIES_LIST.map((fac) => {
                const isSelected = (formData.facilities || []).includes(fac)
                return (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => toggleFacility(fac)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-accent/15 border-brand-accent text-brand-accent font-semibold shadow-xs'
                        : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs">{fac}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-brand-accent text-white' : 'border border-text-muted/40'
                      }`}
                    >
                      {isSelected && <Check size={10} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Photo Gallery Section */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
                  <Camera size={16} className="text-brand-accent" />
                  Campus Photo Gallery
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Reorder images or add up to 10 photos of your campus
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-muted bg-white/5 border border-brand-border px-3 py-1 rounded-full">
                  {(formData.gallery || []).length} / 10 Photos
                </span>

                {(formData.gallery || []).length < 10 && (
                  <label className="bg-brand-accent text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-brand-accent/90 transition-all flex items-center gap-1.5 shadow-xs">
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        files.forEach((f) => handleFileUpload(f, 'gallery', 'gallery'))
                      }}
                    />
                    <Plus size={14} /> Add Photos
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(formData.gallery || []).map((url: string, index: number) => (
                <div
                  key={index}
                  className="aspect-square rounded-2xl overflow-hidden border border-brand-border relative group bg-brand-bg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Campus photo ${index + 1}`} className="w-full h-full object-cover" />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-md">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteGalleryImage(url)}
                        className="p-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Delete photo"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Reordering Controls */}
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveGalleryImage(index, 'left')}
                        className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move left"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={index === (formData.gallery || []).length - 1}
                        onClick={() => moveGalleryImage(index, 'right')}
                        className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move right"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!formData.gallery || formData.gallery.length === 0) && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-brand-border rounded-2xl bg-white/2">
                  <Upload className="mx-auto text-text-muted mb-2 opacity-30" size={32} />
                  <p className="text-xs font-semibold text-text-secondary">No photos uploaded yet</p>
                  <p className="text-[11px] text-text-muted mt-1">Upload campus photos to showcase your facilities to students</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 Sidebar Stats & Contact) */}
        <div className="space-y-8">
          {/* Key Admissions & Financial Stats */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
            <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Key Admissions Stats
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Application Fee (INR)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-text-muted text-xs font-bold">₹</span>
                  {renderInlineField('applicationFee', 'Application Fee', formData.applicationFee || university?.applicationFee, 'number', undefined, 'e.g. 1000')}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Acceptance Rate (%)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-text-muted text-xs font-bold">%</span>
                  {renderInlineField('acceptanceRate', 'Acceptance Rate', formData.acceptanceRate || university?.acceptanceRate, 'number', undefined, 'e.g. 25')}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Campus Area (Acres)
                </label>
                <div className="relative flex items-center">
                  <Ruler size={14} className="absolute left-3 text-text-muted" />
                  {renderInlineField('campusArea', 'Campus Area', formData.campusArea || university?.campusArea, 'number', undefined, 'e.g. 120')}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Average Salary Package (LPA)
                </label>
                {renderInlineField('avgSalary', 'Avg Salary', formData.avgSalary || university?.avgSalary, 'number', undefined, 'e.g. 8.5')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Highest Salary Package (LPA)
                </label>
                {renderInlineField('highestPackage', 'Highest Package', formData.highestPackage || university?.highestPackage, 'number', undefined, 'e.g. 45')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Total Enrolled Students
                </label>
                {renderInlineField('totalStudents', 'Total Students', formData.totalStudents || university?.totalStudents, 'number', undefined, 'e.g. 12000')}
              </div>
            </div>
          </div>

          {/* Contact Details & Location */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
            <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
              <MapPin size={16} className="text-brand-accent" />
              Contact & Location
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  City
                </label>
                {renderInlineField('city', 'City', formData.city || university?.city, 'text', undefined, 'e.g. Bengaluru')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  State
                </label>
                {renderInlineField('state', 'State', formData.state || university?.state, 'text', undefined, 'e.g. Karnataka')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                  <Mail size={12} /> Official Email
                </label>
                {renderInlineField('email', 'Email', formData.email || university?.email, 'text', undefined, 'admissions@university.edu.in')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                  <Phone size={12} /> Contact Phone
                </label>
                {renderInlineField('phone', 'Phone', formData.phone || university?.phone, 'text', undefined, '+91 9876543210')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                  <Globe size={12} /> Official Website
                </label>
                {renderInlineField('website', 'Website', formData.website || university?.website, 'text', undefined, 'https://university.edu.in')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Full Campus Address
                </label>
                {renderInlineField('address', 'Address', formData.address || university?.address, 'textarea', undefined, '123 University Campus, Main Road...')}
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
              <Share2 size={16} className="text-brand-accent" />
              Social Media Handles
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
                  <LinkedinIcon /> LinkedIn URL
                </label>
                {renderInlineField('linkedinUrl', 'LinkedIn', formData.linkedinUrl || university?.linkedinUrl, 'text', undefined, 'https://linkedin.com/school/...')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
                  <TwitterIcon /> Twitter / X URL
                </label>
                {renderInlineField('twitterUrl', 'Twitter', formData.twitterUrl || university?.twitterUrl, 'text', undefined, 'https://x.com/...')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
                  <InstagramIcon /> Instagram URL
                </label>
                {renderInlineField('instagramUrl', 'Instagram', formData.instagramUrl || university?.instagramUrl, 'text', undefined, 'https://instagram.com/...')}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
                  <FacebookIcon /> Facebook URL
                </label>
                {renderInlineField('facebookUrl', 'Facebook', formData.facebookUrl || university?.facebookUrl, 'text', undefined, 'https://facebook.com/...')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT PREVIEW MODAL / OVERLAY */}
      {isPreviewStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8">
          <div className="max-w-4xl mx-auto bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl space-y-6 pb-8 my-8 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Student Preview Top Floating Bar */}
            <div className="sticky top-0 z-20 bg-brand-bg/90 backdrop-blur-md px-6 py-3 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-accent">
                <Eye size={16} />
                <span>STUDENT PREVIEW MODE (Read-only view as seen by prospective students)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewStudent(false)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <X size={14} /> Exit Preview
              </button>
            </div>

            {/* Banner Cover in Student View */}
            <div className="h-56 sm:h-72 w-full relative bg-gradient-to-r from-slate-900 to-indigo-950">
              {formData.bannerURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.bannerURL as string} alt="Banner" className="w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-brand-surface/40 to-transparent" />
            </div>

            {/* Main Header inside Preview */}
            <div className="px-6 sm:px-10 relative -mt-20 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="flex items-end gap-5">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-brand-surface border-4 border-brand-bg shadow-2xl overflow-hidden flex items-center justify-center shrink-0">
                    {formData.logoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.logoURL as string} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-accent to-purple-600 text-white font-extrabold text-4xl flex items-center justify-center">
                        {uniNameInitial}
                      </div>
                    )}
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                      {formData.name || 'University Name'}
                    </h1>
                    <p className="text-sm text-text-secondary italic mt-0.5">
                      {formData.tagline || 'No tagline added'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-2 flex-wrap">
                      {(formData.city || formData.state) && (
                        <span className="flex items-center gap-1 text-text-secondary font-medium">
                          <MapPin size={13} className="text-brand-accent" />
                          {[formData.city, formData.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {formData.foundedYear && <span>Estd. {formData.foundedYear}</span>}
                      {formData.type && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-brand-border font-semibold">
                          {formData.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accreditations */}
                <div className="flex items-center gap-2 self-start sm:self-end">
                  {formData.naacGrade && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getNaacBadgeStyle(formData.naacGrade as string)}`}>
                      NAAC {formData.naacGrade}
                    </span>
                  )}
                  {formData.nirfRank && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      NIRF #{formData.nirfRank}
                    </span>
                  )}
                </div>
              </div>

              {/* Regulatory Approvals */}
              {Array.isArray(formData.approvedBy) && formData.approvedBy.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Approved By:</span>
                  {formData.approvedBy.map((appr: string) => (
                    <span key={appr} className="px-2.5 py-0.5 rounded-md bg-brand-accent/10 text-brand-accent font-semibold border border-brand-accent/20">
                      {appr}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Stats Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-white/5 border border-brand-border p-4 rounded-2xl text-center">
                  <span className="text-xs text-text-muted font-medium block mb-1">Programs</span>
                  <span className="text-xl font-extrabold text-brand-accent">{programCount}</span>
                </div>

                <div className="bg-white/5 border border-brand-border p-4 rounded-2xl text-center">
                  <span className="text-xs text-text-muted font-medium block mb-1">Avg Salary</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {formData.avgSalary ? `₹ ${formData.avgSalary} LPA` : 'N/A'}
                  </span>
                </div>

                <div className="bg-white/5 border border-brand-border p-4 rounded-2xl text-center">
                  <span className="text-xs text-text-muted font-medium block mb-1">Application Fee</span>
                  <span className="text-xl font-extrabold text-text-primary">
                    {formData.applicationFee ? `₹ ${formData.applicationFee}` : 'Free'}
                  </span>
                </div>

                <div className="bg-white/5 border border-brand-border p-4 rounded-2xl text-center">
                  <span className="text-xs text-text-muted font-medium block mb-1">Campus Area</span>
                  <span className="text-xl font-extrabold text-text-primary">
                    {formData.campusArea ? `${formData.campusArea} Acres` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* About Section */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">About the Institution</h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {formData.about || 'No detailed description provided.'}
                </p>
              </div>

              {/* Facilities */}
              {Array.isArray(formData.facilities) && formData.facilities.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Campus Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.facilities.map((fac: string) => (
                      <span key={fac} className="px-3 py-1.5 rounded-xl bg-white/5 border border-brand-border text-xs text-text-secondary font-medium flex items-center gap-1.5">
                        <Check size={12} className="text-brand-accent" />
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              {Array.isArray(formData.gallery) && formData.gallery.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Campus Life & Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.gallery.map((img: string, i: number) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-brand-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Campus photo" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info Footer in Student Preview */}
              <div className="bg-white/5 border border-brand-border rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Contact & Admissions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-secondary">
                  {formData.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-brand-accent" />
                      <span>{formData.email}</span>
                    </div>
                  )}
                  {formData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-brand-accent" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-brand-accent" />
                      <a href={formData.website} target="_blank" rel="noreferrer" className="underline hover:text-brand-accent">
                        {formData.website}
                      </a>
                    </div>
                  )}
                  {formData.address && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin size={14} className="text-brand-accent mt-0.5" />
                      <span>{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
