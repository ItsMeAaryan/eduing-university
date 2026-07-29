'use client'

import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Lock, Building2, User, MapPin, Phone, Globe, Info, GraduationCap, Building } from 'lucide-react'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminName: '',
    universityName: '',
    state: '',
    city: '',
    phone: '',
    website: '',
    type: 'Private',
    accreditation: '',
    description: '',
    established: '2000',
    totalStudents: '0',
    campusSize: '',
    alumniCount: '0',
    facilities: '',
    placementRate: '',
    averageSalary: '',
    highestSalary: '',
    topRecruiters: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Create user document with uni_admin role
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.adminName,
        email: formData.email,
        universityName: formData.universityName,
        role: 'uni_admin',
        // login/page.tsx reads this exact field from this exact
        // collection to decide whether to show the pending-approval
        // screen — it was previously only ever written to the
        // `universities/{uid}` doc, so the check there could never
        // actually see a 'pending' value.
        approvalStatus: 'pending',
        createdAt: serverTimestamp(),
      })

      // Create university document with full details
      await setDoc(doc(db, 'universities', user.uid), {
        uid: user.uid,
        name: formData.universityName,
        email: formData.email,
        state: formData.state,
        city: formData.city,
        phone: formData.phone,
        website: formData.website,
        type: formData.type || 'Private',
        accreditation: formData.accreditation || '',
        description: formData.description || '',
        established: Number(formData.established) || 2000,
        totalStudents: Number(formData.totalStudents) || 0,
        campusSize: formData.campusSize || '',
        alumniCount: Number(formData.alumniCount) || 0,
        facilities: formData.facilities.split(',').map(f => f.trim()).filter(f => f !== ''),
        placementData: {
          placementRate: formData.placementRate || '',
          averageSalary: formData.averageSalary || '',
          highestSalary: formData.highestSalary || '',
          topRecruiters: formData.topRecruiters.split(',').map(r => r.trim()).filter(r => r !== ''),
        },
        programs: [],
        // Registrations now require manual approval before dashboard
        // access is granted (see login/page.tsx's pendingApproval check,
        // and scripts/approve_university.js for how an EDUING team member
        // grants approval). Previously this was hardcoded to 'approved',
        // meaning every signup got instant full access with no review step.
        approvalStatus: 'pending',
        isVerified: false,
        isFeatured: false,
        rating: 4.0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success('University account created! Pending approval — you\'ll be notified once verified.')
      // createUserWithEmailAndPassword auto-signs the user in. Without
      // explicitly signing out here, a pending/unapproved user would stay
      // authenticated and could simply navigate straight to /dashboard —
      // that page only checks "is someone signed in", not approval status,
      // so this sign-out is what actually closes that bypass.
      await auth.signOut()
      router.push('/auth/login')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-bg dark:bg-brand-dark py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="bg-white dark:bg-[#16161E] rounded-3xl shadow-soft p-8 md:p-12 border border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-brand-dark dark:text-white font-outfit tracking-tight">University Registration</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-lg font-medium">Join the EDUING platform to reach thousands of students</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-10">
            {/* Account Credentials */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-brand-gold flex items-center gap-2">
                <Lock className="w-5 h-5" /> Account Credentials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-email" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-email" name="email" type="email" required value={formData.email} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="admin@university.edu" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-password" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-password" name="password" type="password" required value={formData.password} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="••••••••" />
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-brand-gold flex items-center gap-2">
                <Info className="w-5 h-5" /> Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-adminName" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Admin Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-adminName" name="adminName" type="text" required value={formData.adminName} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="John Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-universityName" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">University Name</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-universityName" name="universityName" type="text" required value={formData.universityName} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="Example State University" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-state" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">State</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-state" name="state" type="text" required value={formData.state} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="Maharashtra" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-city" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">City</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-city" name="city" type="text" required value={formData.city} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="Mumbai" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-phone" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-website" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Website</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input id="reg-website" name="website" type="url" required value={formData.website} onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                      placeholder="https://university.edu" />
                  </div>
                </div>
              </div>
            </div>

            {/* Institutional Details */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-brand-gold flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Institutional Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-type" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Type</label>
                  <select id="reg-type" name="type" value={formData.type} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white">
                    <option value="Private">Private</option>
                    <option value="Public">Public</option>
                    <option value="Deemed">Deemed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-established" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Established</label>
                  <input id="reg-established" name="established" type="number" value={formData.established} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="2000" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-accreditation" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Accreditation</label>
                  <input id="reg-accreditation" name="accreditation" type="text" value={formData.accreditation} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="NAAC A+" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-description" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Description</label>
                <textarea id="reg-description" name="description" rows={3} value={formData.description} onChange={handleChange}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                  placeholder="About your university..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-totalStudents" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Total Students</label>
                  <input id="reg-totalStudents" name="totalStudents" type="number" value={formData.totalStudents} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-campusSize" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Campus Size</label>
                  <input id="reg-campusSize" name="campusSize" type="text" value={formData.campusSize} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="100 Acres" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-alumniCount" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Alumni Count</label>
                  <input id="reg-alumniCount" name="alumniCount" type="number" value={formData.alumniCount} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-facilities" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Facilities (Comma separated)</label>
                <input id="reg-facilities" name="facilities" type="text" value={formData.facilities} onChange={handleChange}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                  placeholder="Library, WiFi, Labs, Sports..." />
              </div>
            </div>

            {/* Placement Data */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-brand-gold flex items-center gap-2">
                <Building className="w-5 h-5" /> Placement Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-placementRate" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Placement Rate (%)</label>
                  <input id="reg-placementRate" name="placementRate" type="text" value={formData.placementRate} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="95%" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-averageSalary" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Avg Salary</label>
                  <input id="reg-averageSalary" name="averageSalary" type="text" value={formData.averageSalary} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="6.5 LPA" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-highestSalary" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Highest Salary</label>
                  <input id="reg-highestSalary" name="highestSalary" type="text" value={formData.highestSalary} onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                    placeholder="45 LPA" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-topRecruiters" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Top Recruiters (Comma separated)</label>
                <input id="reg-topRecruiters" name="topRecruiters" type="text" value={formData.topRecruiters} onChange={handleChange}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-gold outline-none dark:text-white"
                  placeholder="Google, Microsoft, Amazon..." />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-amber-600 text-white font-bold py-5 mt-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/25 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span className="text-xl">Create University Profile</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 text-center border-t border-zinc-100 dark:border-zinc-800 pt-10">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
              Already registered?{' '}
              <Link href="/auth/login" className="text-brand-gold font-bold hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
