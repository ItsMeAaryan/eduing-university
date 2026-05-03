const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccount.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function fixUniversities() {
    console.log('Fixing universities...')

    // Fix all universities - ensure approvalStatus
    const unisSnap = await db
        .collection('universities').get()

    for (const uniDoc of unisSnap.docs) {
        const data = uniDoc.data()

        await uniDoc.ref.update({
            approvalStatus: data.approvalStatus
                || 'approved',
            isVerified: data.isVerified !== undefined
                ? data.isVerified : true,
            isFeatured: data.isFeatured || false,
            rating: data.rating || 4.0,
            updatedAt: admin.firestore.FieldValue
                .serverTimestamp(),
        })

        console.log(`Fixed: ${data.name}`)
    }

    // Fix all programs - ensure status active
    const progsSnap = await db
        .collection('programs').get()

    for (const progDoc of progsSnap.docs) {
        const data = progDoc.data()

        await progDoc.ref.update({
            status: data.status || 'active',
            isActive: true,
            universityId: data.universityId || '',
        })

        console.log(`Fixed program: ${data.name}`)
    }

    console.log('✅ Universities fixed!')
    process.exit(0)
}

fixUniversities().catch(e => {
    console.error(e)
    process.exit(1)
})