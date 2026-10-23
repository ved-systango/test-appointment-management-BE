import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in correct order due to FK constraints)
  console.log('🧹 Cleaning existing data...');
  await prisma.unavailableDate.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Users
  console.log('👤 Creating users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const provider1 = await prisma.user.create({
    data: {
      email: 'provider1@example.com',
      password: passwordHash,
      role: Role.PROVIDER,
    },
  });

  const provider2 = await prisma.user.create({
    data: {
      email: 'provider2@example.com',
      password: passwordHash,
      role: Role.PROVIDER,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@example.com',
      password: passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@example.com',
      password: passwordHash,
      role: Role.CUSTOMER,
    },
  });

  console.log('✅ Created 5 users');

  // Create Services
  console.log('💼 Creating services...');
  const haircut = await prisma.service.create({
    data: {
      name: 'Haircut',
      description: 'Professional haircut service',
      duration_minutes: 30,
      price: 25.00,
    },
  });

  const massage = await prisma.service.create({
    data: {
      name: 'Massage',
      description: 'Full body massage',
      duration_minutes: 60,
      price: 80.00,
    },
  });

  const consultation = await prisma.service.create({
    data: {
      name: 'Consultation',
      description: 'Initial consultation session',
      duration_minutes: 45,
      price: 50.00,
    },
  });

  console.log('✅ Created 3 services');

  // Create Availabilities (using 2024-01-01 as base date for time-only storage)
  console.log('📅 Creating availabilities...');
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  // Provider 1: Mon-Fri 9-5, break 12-1
  const avail1_Mon = await prisma.availability.create({
    data: {
      provider_id: provider1.id,
      day_of_week: 1, // Monday
      start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
      break_start: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      break_end: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000),
    },
  });

  const avail1_Tue = await prisma.availability.create({
    data: {
      provider_id: provider1.id,
      day_of_week: 2, // Tuesday
      start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
      break_start: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      break_end: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000),
    },
  });

  const avail1_Wed = await prisma.availability.create({
    data: {
      provider_id: provider1.id,
      day_of_week: 3, // Wednesday
      start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
      break_start: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      break_end: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000),
    },
  });

  // Provider 2: Mon-Wed 10-4, no break
  const avail2_Mon = await prisma.availability.create({
    data: {
      provider_id: provider2.id,
      day_of_week: 1, // Monday
      start_time: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 16 * 60 * 60 * 1000),
    },
  });

  const avail2_Tue = await prisma.availability.create({
    data: {
      provider_id: provider2.id,
      day_of_week: 2, // Tuesday
      start_time: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 16 * 60 * 60 * 1000),
    },
  });

  const avail2_Wed = await prisma.availability.create({
    data: {
      provider_id: provider2.id,
      day_of_week: 3, // Wednesday
      start_time: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      end_time: new Date(baseDate.getTime() + 16 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created 6 availabilities');

  // Create Unavailable Dates
  console.log('🚫 Creating unavailable dates...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unavailable1 = await prisma.unavailableDate.create({
    data: {
      availability_id: avail1_Mon.id,
      date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Next Monday
      reason: 'Personal vacation',
    },
  });

  const unavailable2 = await prisma.unavailableDate.create({
    data: {
      availability_id: avail2_Tue.id,
      date: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000), // Next Tuesday
      reason: 'Training session',
    },
  });

  console.log('✅ Created 2 unavailable dates');

  // Create Appointments with different statuses
  console.log('📋 Creating appointments...');
  const now = new Date();

  const appointment1 = await prisma.appointment.create({
    data: {
      customer_id: customer1.id,
      provider_id: provider1.id,
      service_id: haircut.id,
      start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      status: AppointmentStatus.PENDING,
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      customer_id: customer1.id,
      provider_id: provider1.id,
      service_id: massage.id,
      start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      end_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  const appointment3 = await prisma.appointment.create({
    data: {
      customer_id: customer2.id,
      provider_id: provider2.id,
      service_id: consultation.id,
      start_time: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      end_time: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      status: AppointmentStatus.COMPLETED,
    },
  });

  const appointment4 = await prisma.appointment.create({
    data: {
      customer_id: customer2.id,
      provider_id: provider1.id,
      service_id: haircut.id,
      start_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      end_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      status: AppointmentStatus.CANCELLED,
    },
  });

  const appointment5 = await prisma.appointment.create({
    data: {
      customer_id: customer1.id,
      provider_id: provider2.id,
      service_id: massage.id,
      start_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      end_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: AppointmentStatus.NO_SHOW,
    },
  });

  console.log('✅ Created 5 appointments');

  console.log('\n📊 Seed summary:');
  console.log(`   Users: 5 (1 admin, 2 providers, 2 customers)`);
  console.log(`   Services: 3`);
  console.log(`   Availabilities: 6`);
  console.log(`   Unavailable Dates: 2`);
  console.log(`   Appointments: 5 (1 pending, 1 confirmed, 1 completed, 1 cancelled, 1 no-show)`);
  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
