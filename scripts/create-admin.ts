import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = 'anasbikes1992@gmail.com'
    const password = '12345678'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log('📧 Email:', email)
      console.log('🔑 Password: 12345678')
      console.log('🎯 Role:', existingUser.role)
      
      // Update password if needed
      await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      console.log('✅ Password and role updated!')
    } else {
      // Create new admin user
      const user = await prisma.user.create({
        data: {
          email,
          name: 'Admin User',
          password: hashedPassword,
          role: 'ADMIN',
        }
      })
      console.log('✅ Admin user created successfully!')
      console.log('📧 Email:', email)
      console.log('🔑 Password: 12345678')
      console.log('👤 Name:', user.name)
      console.log('🎯 Role:', user.role)
    }

    console.log('\n🚀 You can now login at: http://localhost:3000/admin/login')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
