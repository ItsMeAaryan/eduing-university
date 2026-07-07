/**
 * scripts/create_admin.js
 *
 * One-time script to create (or promote) an EDUING platform admin account.
 * Run this once to bootstrap the first admin, then use the Firebase console
 * or this script again for any subsequent admins.
 *
 * Prerequisites:
 *   - node scripts/create_admin.js
 *   - scripts/serviceAccount.json must exist (download from Firebase console
 *     → Project settings → Service accounts → Generate new private key)
 *   - firebase-admin must be installed (it's a devDependency)
 *
 * Usage:
 *   node scripts/create_admin.js --email admin@eduing.in --password "SecurePass123!"
 *   node scripts/create_admin.js --promote --uid "existingUserId"
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccount.json')
const args = process.argv.slice(2)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const authAdmin = admin.auth()

function parseArgs() {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      result[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
    }
  }
  return result
}

async function createAdmin({ email, password }) {
  if (!email || !password) {
    console.error('Usage: node scripts/create_admin.js --email <email> --password <password>')
    process.exit(1)
  }

  console.log(`Creating admin account for ${email}…`)

  let uid
  try {
    const user = await authAdmin.createUser({ email, password })
    uid = user.uid
    console.log(`✓ Firebase Auth user created: ${uid}`)
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await authAdmin.getUserByEmail(email)
      uid = user.uid
      console.log(`ℹ User already exists: ${uid} — promoting to eduing_admin`)
    } else {
      throw err
    }
  }

  await db.collection('users').doc(uid).set({
    uid,
    email,
    role: 'eduing_admin',
    approvalStatus: 'approved',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  console.log(`✓ Firestore users/${uid} written with role: eduing_admin`)
  console.log(`\nAdmin account ready. Sign in at https://university.eduing.in/admin/login`)
  process.exit(0)
}

async function promoteExisting({ uid }) {
  if (!uid) {
    console.error('Usage: node scripts/create_admin.js --promote --uid <userId>')
    process.exit(1)
  }

  console.log(`Promoting user ${uid} to eduing_admin…`)

  await db.collection('users').doc(uid).update({
    role: 'eduing_admin',
    approvalStatus: 'approved',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  console.log(`✓ User ${uid} promoted to eduing_admin`)
  process.exit(0)
}

const parsed = parseArgs()
if (parsed.promote) {
  promoteExisting(parsed).catch(err => { console.error(err); process.exit(1) })
} else {
  createAdmin(parsed).catch(err => { console.error(err); process.exit(1) })
}
