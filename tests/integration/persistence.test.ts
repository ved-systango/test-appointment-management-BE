import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Integration Tests: Persistence and Relationships', () => {
  let adminId: string;
  let providerId: string;
  let customerId: string;
  let serviceId: string;
  let availabilityId: string;
  let appointmentId: string;
  let unavailableDateId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.unavailableDate.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();

    const password = await bcrypt.hash('password123', 10);

    // Create test users
    const admin = await prisma.user.create({
      data: { email: 'integration-admin@test.com', password, role: Role.ADMIN },
    });
    adminId = admin.id;

    const provider = await prisma.user.create({
      data: { email: 'integration-provider@test.com', password, role: Role.PROVIDER },
    });
    providerId = provider.id;

    const customer = await prisma.user.create({
      data: { email: 'integration-customer@test.com', password, role: Role.CUSTOMER },
    });
    customerId = customer.id;

    // Create test service
    const service = await prisma.service.create({
      data: {
        name: 'Integration Test Service',
        description: 'Service for integration testing',
        duration_minutes: 45,
        price: 75.00,
      },
    });
    serviceId = service.id;

    // Create test availability
    const baseDate = new Date('2024-01-01T00:00:00.000Z');
    const availability = await prisma.availability.create({
      data: {
        provider_id: providerId,
        day_of_week: 2, // Tuesday
        start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
        end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
        break_start: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
        break_end: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000),
      },
    });
    availabilityId = availability.id;

    // Create test unavailable date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unavailableDate = await prisma.unavailableDate.create({
      data: {
        availability_id: availabilityId,
        date: today,
        reason: 'Integration test unavailability',
      },
    });
    unavailableDateId = unavailableDate.id;

    // Create test appointment
    const now = new Date();
    const appointment = await prisma.appointment.create({
      data: {
        customer_id: customerId,
        provider_id: providerId,
        service_id: serviceId,
        start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: AppointmentStatus.PENDING,
      },
    });
    appointmentId = appointment.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.unavailableDate.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const password = await bcrypt.hash('newuser123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'newuser@test.com',
          password,
          role: Role.CUSTOMER,
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('newuser@test.com');
      expect(user.role).toBe(Role.CUSTOMER);
      expect(user.created_at).toBeInstanceOf(Date);
    });

    it('should read a user by ID', async () => {
      const user = await prisma.user.findUnique({
        where: { id: customerId },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('integration-customer@test.com');
      expect(user?.role).toBe(Role.CUSTOMER);
    });

    it('should read a user by email', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'integration-provider@test.com' },
      });

      expect(user).toBeDefined();
      expect(user?.id).toBe(providerId);
      expect(user?.role).toBe(Role.PROVIDER);
    });

    it('should update a user', async () => {
      const newPassword = await bcrypt.hash('newpassword456', 10);
      const updatedUser = await prisma.user.update({
        where: { id: customerId },
        data: { password: newPassword },
      });

      expect(updatedUser.password).toBe(newPassword);
    });

    it('should delete a user', async () => {
      const password = await bcrypt.hash('temp123', 10);
      const tempUser = await prisma.user.create({
        data: { email: 'tempuser@test.com', password, role: Role.CUSTOMER },
      });

      await prisma.user.delete({ where: { id: tempUser.id } });

      const deletedUser = await prisma.user.findUnique({
        where: { id: tempUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should list all users', async () => {
      const users = await prisma.user.findMany();

      expect(users.length).toBeGreaterThan(0);
      expect(users.some(u => u.email === 'integration-admin@test.com')).toBe(true);
    });
  });

  describe('Service CRUD Operations', () => {
    it('should create a new service', async () => {
      const service = await prisma.service.create({
        data: {
          name: 'New Service',
          description: 'A brand new service',
          duration_minutes: 60,
          price: 100.00,
        },
      });

      expect(service.id).toBeDefined();
      expect(service.name).toBe('New Service');
      expect(service.price).toBe('100.00');
    });

    it('should read a service by ID', async () => {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      expect(service).toBeDefined();
      expect(service?.name).toBe('Integration Test Service');
      expect(service?.duration_minutes).toBe(45);
    });

    it('should update a service', async () => {
      const updatedService = await prisma.service.update({
        where: { id: serviceId },
        data: { name: 'Updated Service Name' },
      });

      expect(updatedService.name).toBe('Updated Service Name');

      // Restore original name
      await prisma.service.update({
        where: { id: serviceId },
        data: { name: 'Integration Test Service' },
      });
    });

    it('should list all services', async () => {
      const services = await prisma.service.findMany();

      expect(services.length).toBeGreaterThan(0);
      expect(services.some(s => s.name === 'Integration Test Service')).toBe(true);
    });
  });

  describe('Availability CRUD Operations', () => {
    it('should read availability by ID', async () => {
      const availability = await prisma.availability.findUnique({
        where: { id: availabilityId },
      });

      expect(availability).toBeDefined();
      expect(availability?.provider_id).toBe(providerId);
      expect(availability?.day_of_week).toBe(2);
    });

    it('should update availability', async () => {
      const baseDate = new Date('2024-01-01T00:00:00.000Z');

      const updatedAvailability = await prisma.availability.update({
        where: { id: availabilityId },
        data: {
          start_time: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000),
          end_time: new Date(baseDate.getTime() + 16 * 60 * 60 * 1000),
        },
      });

      expect(updatedAvailability.start_time).toEqual(new Date(baseDate.getTime() + 8 * 60 * 60 * 1000));
    });

    it('should list availabilities by provider', async () => {
      const availabilities = await prisma.availability.findMany({
        where: { provider_id: providerId },
      });

      expect(availabilities.length).toBeGreaterThan(0);
      expect(availabilities[0].provider_id).toBe(providerId);
    });
  });

  describe('UnavailableDate CRUD Operations', () => {
    it('should create an unavailable date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const unavailableDate = await prisma.unavailableDate.create({
        data: {
          availability_id: availabilityId,
          date: tomorrow,
          reason: 'Test unavailability',
        },
      });

      expect(unavailableDate.id).toBeDefined();
      expect(unavailableDate.date).toEqual(tomorrow);
    });

    it('should read unavailable date by ID', async () => {
      const unavailableDate = await prisma.unavailableDate.findUnique({
        where: { id: unavailableDateId },
      });

      expect(unavailableDate).toBeDefined();
      expect(unavailableDate?.availability_id).toBe(availabilityId);
      expect(unavailableDate?.reason).toBe('Integration test unavailability');
    });

    it('should list unavailable dates by availability', async () => {
      const unavailableDates = await prisma.unavailableDate.findMany({
        where: { availability_id: availabilityId },
      });

      expect(unavailableDates.length).toBeGreaterThan(0);
      expect(unavailableDates[0].availability_id).toBe(availabilityId);
    });
  });

  describe('Appointment CRUD Operations', () => {
    it('should read an appointment by ID', async () => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      expect(appointment).toBeDefined();
      expect(appointment?.customer_id).toBe(customerId);
      expect(appointment?.provider_id).toBe(providerId);
      expect(appointment?.service_id).toBe(serviceId);
      expect(appointment?.status).toBe(AppointmentStatus.PENDING);
    });

    it('should update appointment status', async () => {
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
      });

      expect(updatedAppointment.status).toBe(AppointmentStatus.CONFIRMED);

      // Restore original status
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.PENDING },
      });
    });

    it('should list appointments by customer', async () => {
      const appointments = await prisma.appointment.findMany({
        where: { customer_id: customerId },
      });

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].customer_id).toBe(customerId);
    });

    it('should list appointments by provider', async () => {
      const appointments = await prisma.appointment.findMany({
        where: { provider_id: providerId },
      });

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].provider_id).toBe(providerId);
    });

    it('should list appointments by status', async () => {
      const appointments = await prisma.appointment.findMany({
        where: { status: AppointmentStatus.PENDING },
      });

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments.every(a => a.status === AppointmentStatus.PENDING)).toBe(true);
    });
  });

  describe('Relationship Traversal', () => {
    it('should traverse from User to their availabilities', async () => {
      const userWithAvailabilities = await prisma.user.findUnique({
        where: { id: providerId },
        include: { availabilities: true },
      });

      expect(userWithAvailabilities?.availabilities).toBeDefined();
      expect(userWithAvailabilities?.availabilities.length).toBeGreaterThan(0);
      expect(userWithAvailabilities?.availabilities[0].provider_id).toBe(providerId);
    });

    it('should traverse from User to provided appointments', async () => {
      const userWithAppointments = await prisma.user.findUnique({
        where: { id: providerId },
        include: { providedAppointments: true },
      });

      expect(userWithAppointments?.providedAppointments).toBeDefined();
      expect(userWithAppointments?.providedAppointments.length).toBeGreaterThan(0);
    });

    it('should traverse from User to booked appointments', async () => {
      const userWithAppointments = await prisma.user.findUnique({
        where: { id: customerId },
        include: { bookedAppointments: true },
      });

      expect(userWithAppointments?.bookedAppointments).toBeDefined();
      expect(userWithAppointments?.bookedAppointments.length).toBeGreaterThan(0);
    });

    it('should traverse from Service to its appointments', async () => {
      const serviceWithAppointments = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { appointments: true },
      });

      expect(serviceWithAppointments?.appointments).toBeDefined();
      expect(serviceWithAppointments?.appointments.length).toBeGreaterThan(0);
    });

    it('should traverse from Availability to its unavailable dates', async () => {
      const availabilityWithDates = await prisma.availability.findUnique({
        where: { id: availabilityId },
        include: { unavailable_dates: true },
      });

      expect(availabilityWithDates?.unavailable_dates).toBeDefined();
      expect(availabilityWithDates?.unavailable_dates.length).toBeGreaterThan(0);
    });

    it('should traverse from Appointment to all related entities', async () => {
      const appointmentWithRelations = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: true,
          provider: true,
          service: true,
        },
      });

      expect(appointmentWithRelations).toBeDefined();
      expect(appointmentWithRelations?.customer.id).toBe(customerId);
      expect(appointmentWithRelations?.provider.id).toBe(providerId);
      expect(appointmentWithRelations?.service.id).toBe(serviceId);
    });

    it('should traverse from Availability to its provider', async () => {
      const availabilityWithProvider = await prisma.availability.findUnique({
        where: { id: availabilityId },
        include: { provider: true },
      });

      expect(availabilityWithProvider?.provider).toBeDefined();
      expect(availabilityWithProvider?.provider.id).toBe(providerId);
    });

    it('should traverse from UnavailableDate to its availability and provider', async () => {
      const unavailableDateWithRelations = await prisma.unavailableDate.findUnique({
        where: { id: unavailableDateId },
        include: {
          availability: {
            include: {
              provider: true,
            },
          },
        },
      });

      expect(unavailableDateWithRelations).toBeDefined();
      expect(unavailableDateWithRelations?.availability.id).toBe(availabilityId);
      expect(unavailableDateWithRelations?.availability.provider.id).toBe(providerId);
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should rollback on user creation failure', async () => {
      const initialUserCount = await prisma.user.count();

      await expect(
        prisma.$transaction([
          prisma.user.create({
            data: {
              email: 'transaction-test-1@test.com',
              password: await bcrypt.hash('password', 10),
              role: Role.CUSTOMER,
            },
          }),
          prisma.user.create({
            data: {
              email: 'transaction-test-2@test.com',
              password: await bcrypt.hash('password', 10),
              role: Role.CUSTOMER,
            },
          }),
          prisma.user.create({
            data: {
              email: '', // Invalid email - should fail
              password: await bcrypt.hash('password', 10),
              role: Role.CUSTOMER,
            },
          }),
        ]),
      ).rejects.toThrow();

      // Verify rollback
      const finalUserCount = await prisma.user.count();
      expect(finalUserCount).toBe(initialUserCount);
    });

    it('should rollback on appointment creation with invalid service', async () => {
      const initialAppointmentCount = await prisma.appointment.count();

      await expect(
        prisma.$transaction([
          prisma.appointment.create({
            data: {
              customer_id: customerId,
              provider_id: providerId,
              service_id: serviceId,
              start_time: new Date(),
              end_time: new Date(),
              status: AppointmentStatus.PENDING,
            },
          }),
          prisma.appointment.create({
            data: {
              customer_id: customerId,
              provider_id: providerId,
              service_id: '00000000-0000-0000-0000-000000000000', // Invalid service
              start_time: new Date(),
              end_time: new Date(),
              status: AppointmentStatus.PENDING,
            },
          }),
        ]),
      ).rejects.toThrow();

      // Verify rollback
      const finalAppointmentCount = await prisma.appointment.count();
      expect(finalAppointmentCount).toBe(initialAppointmentCount);
    });

    it('should commit transaction successfully with valid operations', async () => {
      const initialServiceCount = await prisma.service.count();

      const newServices = await prisma.$transaction([
        prisma.service.create({
          data: {
            name: 'Transaction Service 1',
            duration_minutes: 30,
            price: 25.00,
          },
        }),
        prisma.service.create({
          data: {
            name: 'Transaction Service 2',
            duration_minutes: 45,
            price: 50.00,
          },
        }),
      ]);

      expect(newServices).toHaveLength(2);

      // Verify commit
      const finalServiceCount = await prisma.service.count();
      expect(finalServiceCount).toBe(initialServiceCount + 2);

      // Cleanup
      await prisma.service.deleteMany({
        where: {
          OR: [
            { name: 'Transaction Service 1' },
            { name: 'Transaction Service 2' },
          ],
        },
      });
    });

    it('should handle complex multi-table transaction', async () => {
      const tempProvider = await prisma.user.create({
        data: {
          email: 'temp-provider-transaction@test.com',
          password: await bcrypt.hash('password', 10),
          role: Role.PROVIDER,
        },
      });

      const baseDate = new Date('2024-01-01T00:00:00.000Z');

      const result = await prisma.$transaction(async (tx) => {
        const availability = await tx.availability.create({
          data: {
            provider_id: tempProvider.id,
            day_of_week: 3,
            start_time: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
            end_time: new Date(baseDate.getTime() + 18 * 60 * 60 * 1000),
          },
        });

        const service = await tx.service.create({
          data: {
            name: 'Temp Transaction Service',
            duration_minutes: 30,
            price: 35.00,
          },
        });

        const tempCustomer = await tx.user.create({
          data: {
            email: 'temp-customer-transaction@test.com',
            password: await bcrypt.hash('password', 10),
            role: Role.CUSTOMER,
          },
        });

        const appointment = await tx.appointment.create({
          data: {
            customer_id: tempCustomer.id,
            provider_id: tempProvider.id,
            service_id: service.id,
            start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            status: AppointmentStatus.PENDING,
          },
        });

        return { availability, service, appointment, tempCustomer };
      });

      expect(result.availability).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.appointment).toBeDefined();
      expect(result.tempCustomer).toBeDefined();

      // Verify all records were created
      const appointmentCheck = await prisma.appointment.findUnique({
        where: { id: result.appointment.id },
        include: {
          customer: true,
          provider: true,
          service: true,
        },
      });

      expect(appointmentCheck).toBeDefined();
      expect(appointmentCheck?.customer.email).toBe('temp-customer-transaction@test.com');
      expect(appointmentCheck?.provider.email).toBe('temp-provider-transaction@test.com');
      expect(appointmentCheck?.service.name).toBe('Temp Transaction Service');

      // Cleanup
      await prisma.appointment.delete({ where: { id: result.appointment.id } });
      await prisma.availability.delete({ where: { id: result.availability.id } });
      await prisma.service.delete({ where: { id: result.service.id } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'temp-provider-transaction@test.com',
              'temp-customer-transaction@test.com',
            ],
          },
        },
      });
    });
  });

  describe('Query Optimization Tests', () => {
    it('should efficiently query appointments with provider filtering', async () => {
      const start = Date.now();

      const appointments = await prisma.appointment.findMany({
        where: {
          provider_id: providerId,
          status: AppointmentStatus.PENDING,
        },
        include: {
          customer: { select: { id: true, email: true } },
          service: { select: { id: true, name: true } },
        },
      });

      const end = Date.now();

      expect(appointments).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete quickly with indexes
    });

    it('should efficiently query availabilities by provider and day', async () => {
      const start = Date.now();

      const availabilities = await prisma.availability.findMany({
        where: {
          provider_id: providerId,
          day_of_week: 2,
        },
      });

      const end = Date.now();

      expect(availabilities).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete quickly with composite index
    });

    it('should efficiently query unavailable dates by availability', async () => {
      const start = Date.now();

      const unavailableDates = await prisma.unavailableDate.findMany({
        where: {
          availability_id: availabilityId,
        },
        orderBy: { date: 'asc' },
      });

      const end = Date.now();

      expect(unavailableDates).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete quickly with index
    });
  });
});
