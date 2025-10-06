import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateUnitNames() {
  try {
    console.log('Starting unit name update...')
    
    // Get all units with their associated vehicles
    const units = await prisma.unit.findMany({
      include: {
        vehicle: true
      }
    })
    
    console.log(`Found ${units.length} units to process`)
    
    for (const unit of units) {
      // Update unit name to use unitNumber if it exists, otherwise use "Unit {licensePlate}"
      const newName = unit.unitNumber || `Unit ${unit.vehicle.licensePlate}`
      
      if (unit.name !== newName) {
        await prisma.unit.update({
          where: { id: unit.id },
          data: { name: newName }
        })
        
        console.log(`Updated unit ${unit.id}: "${unit.name}" -> "${newName}"`)
      } else {
        console.log(`Unit ${unit.id} already has correct name: "${unit.name}"`)
      }
    }
    
    console.log('Unit name update completed successfully!')
  } catch (error) {
    console.error('Error updating unit names:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUnitNames()
