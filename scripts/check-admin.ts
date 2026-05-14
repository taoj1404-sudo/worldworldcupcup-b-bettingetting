import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  const admin = await db.select().from(users).where(eq(users.email, 'admin@worldcup.bet'))
  if (admin.length > 0) {
    console.log('Admin found:', {
      id: admin[0].id,
      email: admin[0].email,
      role: admin[0].role,
      passwordHash: admin[0].passwordHash?.substring(0, 20) + '...'
    })
  } else {
    console.log('Admin not found!')
  }
}

main().catch(console.error)
