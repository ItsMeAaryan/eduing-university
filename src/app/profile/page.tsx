'use client'

import React, { useState, useEffect } from 'react'
import { auth, storage } from '@/lib/firebase/config'
import type { FirestoreRecord, FirestoreWriteData } from '@/lib/firebase/types'
import { subscribeToUniversity, updateUniversityProfile } from '@/lib/firebase/university'
import { 
  Camera, 
  MapPin, 
  Globe, 
  Phone, 
  X, 
  Edit3, 
  Layout, 
  Users, 
  Trophy,
  Upload,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToast } from '@/components/Toast'

const FACILITIES_LIST = [
  'Library', 'Hostel', 'Sports Complex', 'Labs',
  'Cafeteria', 'Medical', 'WiFi', 'Gym',
  'Auditorium', 'Placement Cell', 'Research Center'
]

export default function ProfilePage() {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [university, setUniversity] = useState<FirestoreRecord | null>(null)
  const [formData, setFormData] = useState<FirestoreWriteData>({})

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsub = subscribeToUniversity(user.uid, (data) => {
          setUniversity(data)
          setFormData(data)
          setLoading(false)
        })
        return () => unsub()
      }
    })
    return () => unsubscribeAuth()
  }, [])

  const handleFileUpload = async (file: File, path: string, type: 'logo' | 'banner' | 'gallery') => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    toast.info(`Uploading ${type}...`)
    try {
      const storageRef = ref(storage, `universities/${uid}/${path}/${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)

      if (type === 'logo') {
        await updateUniversityProfile(uid, { logoURL: url })
      } else if (type === 'banner') {
        await updateUniversityProfile(uid, { bannerURL: url })
      } else if (type === 'gallery') {
        const currentGallery = university?.gallery || []
        await updateUniversityProfile(uid, { gallery: [...currentGallery, url].slice(0, 10) })
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated!`)
    } catch (error) {
      console.error(error)
      toast.error('Upload failed')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUniversityProfile(auth.currentUser!.uid, formData)
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const toggleFacility = (facility: string) => {
    const current = formData.facilities || []
    const updated = current.includes(facility)
      ? current.filter((f: string) => f !== facility)
      : [...current, facility]
    setFormData({ ...formData, facilities: updated })
  }

  if (loading) return null

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Banner & Logo Section */}
      <div className="relative">
        <div className="h-[240px] w-full rounded-2xl overflow-hidden bg-linear-to-br from-brand-primary/20 to-purple-600/20 border border-brand-border group relative">
          {university?.bannerURL ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic Firebase Storage URL; see next.config.ts remotePatterns note before switching to next/image
            <img src={university.bannerURL as string} alt="University banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <Layout size={48} className="opacity-20" />
            </div>
          )}
          
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner', 'banner')}
            />
            <div className="flex items-center gap-2 bg-white text-brand-bg px-4 py-2 rounded-lg font-bold text-sm">
              <Camera size={16} /> Change Banner
            </div>
          </label>
        </div>

        {/* Logo overlapping banner */}
        <div className="absolute -bottom-10 left-10">
          <div className="w-32 h-32 rounded-3xl bg-brand-surface border-4 border-brand-bg shadow-2xl overflow-hidden group relative">
            {university?.logoURL ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic Firebase Storage URL; see next.config.ts remotePatterns note before switching to next/image
              <img src={university.logoURL as string} alt="University logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-brand-primary to-purple-600 text-white font-bold text-4xl">
                {university?.name?.charAt(0) || 'U'}
              </div>
            )}
            
            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo', 'logo')}
              />
              <Camera size={24} className="text-white" />
            </label>
          </div>
        </div>

        <div className="absolute top-6 right-6">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-xl transition-all ${
              isEditing ? 'bg-brand-success text-brand-bg hover:bg-brand-success/90' : 'bg-white text-brand-bg hover:bg-white/90'
            }`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : isEditing ? <CheckCircle2 size={18} /> : <Edit3 size={18} />}
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* General Info Form */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 space-y-6">
            <h3 className="section-label">General Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold uppercase text-text-muted mb-2">University Name</label>
                {isEditing ? (
                  <input 
                    id="profile-name"
                    className="input-dark text-lg font-bold" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                ) : (
                  <p className="text-2xl font-bold text-white">{university?.name || 'Untitled University'}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-tagline" className="block text-xs font-semibold uppercase text-text-muted mb-2">Tagline / Motto</label>
                {isEditing ? (
                  <input 
                    id="profile-tagline"
                    className="input-dark" 
                    placeholder="Empowering future leaders..."
                    value={formData.tagline || ''} 
                    onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                  />
                ) : (
                  <p className="text-text-secondary italic">{university?.tagline || 'No tagline added'}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-about" className="block text-xs font-semibold uppercase text-text-muted mb-2">About Institution</label>
                {isEditing ? (
                  <textarea 
                    id="profile-about"
                    className="input-dark min-h-[120px] resize-none" 
                    value={formData.about || ''} 
                    onChange={(e) => setFormData({...formData, about: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-text-secondary leading-relaxed">{university?.about || 'No description provided'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="profile-foundedYear" className="block text-xs font-semibold uppercase text-text-muted mb-2">Founded Year</label>
                  {isEditing ? (
                    <input id="profile-foundedYear" className="input-dark" value={formData.foundedYear || ''} onChange={(e) => setFormData({...formData, foundedYear: e.target.value})} />
                  ) : (
                    <p className="text-sm text-white font-medium">{university?.foundedYear || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="profile-type" className="block text-xs font-semibold uppercase text-text-muted mb-2">Institution Type</label>
                  {isEditing ? (
                    <select id="profile-type" className="input-dark" value={formData.type || ''} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                      <option value="Private">Private</option>
                      <option value="Public">Public / Government</option>
                      <option value="Deemed">Deemed</option>
                    </select>
                  ) : (
                    <p className="text-sm text-white font-medium">{university?.type || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-8">
            <h3 className="section-label mb-6">Campus Facilities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FACILITIES_LIST.map((f) => {
                const isSelected = (formData.facilities || []).includes(f)
                return (
                  <button
                    key={f}
                    disabled={!isEditing}
                    onClick={() => toggleFacility(f)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                        : 'bg-white/2 border-white/5 text-text-secondary hover:border-white/10'
                    } ${!isEditing && 'cursor-default opacity-80'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-primary' : 'bg-text-muted'}`} />
                    <span className="text-xs font-semibold">{f}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Photo Gallery */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="section-label">Photo Gallery</h3>
              <label className="bg-white/5 border border-brand-border px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer hover:bg-white/10">
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach(f => handleFileUpload(f, 'gallery', 'gallery'))
                  }}
                />
                + Add Photos
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {university?.gallery?.map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Firebase Storage URL; see next.config.ts remotePatterns note before switching to next/image */}
                  <img src={url} alt="University gallery" className="w-full h-full object-cover" />
                  <button 
                    onClick={async () => {
                      const updated = university.gallery.filter((u: string) => u !== url)
                      await updateUniversityProfile(auth.currentUser!.uid, { gallery: updated })
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-brand-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {(!university?.gallery || university.gallery.length === 0) && (
                <div className="col-span-3 py-12 text-center border border-dashed border-brand-border rounded-xl">
                  <Upload className="mx-auto text-text-muted mb-2 opacity-20" size={24} />
                  <p className="text-xs text-text-muted italic">No photos in gallery</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Stats Edit */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
            <h3 className="section-label">Placement & Stats</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-avgSalary" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Avg Salary (LPA)</label>
                <div className="relative">
                  <input 
                    id="profile-avgSalary"
                    type="number"
                    disabled={!isEditing}
                    className="input-dark pl-8"
                    value={formData.avgSalary || ''}
                    onChange={(e) => setFormData({...formData, avgSalary: e.target.value})}
                  />
                  <Trophy size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold" />
                </div>
              </div>
              <div>
                <label htmlFor="profile-highestPackage" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Highest Package (LPA)</label>
                <div className="relative">
                  <input 
                    id="profile-highestPackage"
                    type="number"
                    disabled={!isEditing}
                    className="input-dark pl-8"
                    value={formData.highestPackage || ''}
                    onChange={(e) => setFormData({...formData, highestPackage: e.target.value})}
                  />
                  <Trophy size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold" />
                </div>
              </div>
              <div>
                <label htmlFor="profile-totalStudents" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Total Students</label>
                <div className="relative">
                  <input 
                    id="profile-totalStudents"
                    type="number"
                    disabled={!isEditing}
                    className="input-dark pl-8"
                    value={formData.totalStudents || ''}
                    onChange={(e) => setFormData({...formData, totalStudents: e.target.value})}
                  />
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
            <h3 className="section-label">Contact Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-text-secondary">
                <Globe size={18} className="shrink-0" />
                {isEditing ? (
                  <input className="input-dark h-8 text-xs" value={formData.website || ''} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="Website URL" />
                ) : (
                  <span className="text-sm truncate">{university?.website || 'No website'}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-text-secondary">
                <Phone size={18} className="shrink-0" />
                {isEditing ? (
                  <input className="input-dark h-8 text-xs" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Phone number" />
                ) : (
                  <span className="text-sm">{university?.phone || 'No phone'}</span>
                )}
              </div>
              <div className="flex items-start gap-3 text-text-secondary">
                <MapPin size={18} className="shrink-0 mt-1" />
                {isEditing ? (
                  <textarea className="input-dark text-xs h-20 resize-none" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address..." />
                ) : (
                  <span className="text-sm">{university?.address || 'No address provided'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
