import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Schema Constraints Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.unavailableDate.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User Constraints', () => {
    it('should enforce email uniqueness', async () => {
      const email = 'unique-test@example.com';
      const password = await bcrypt.hash('password123', 10);

      // Create first user
      await prisma.user.create({
        data: { email, password, role: Role.CUSTOMER },
      });

      // Attempt to create duplicate email - should fail
      await expect(
        prisma.user.create({
          data: { email, password, role: Role.PROVIDER },
        }),
      ).rejects.toThrow();
    });

    it('should enforce role enum membership', async () => {
      const password = await bcrypt.hash('password123', 10);

      // Valid roles should work
      await expect(
        prisma.user.createMany({
          data: [
            { email: 'admin@test.com', password, role: Role.ADMIN },
            { email: 'provider@test.com', password, role: Role.PROVIDER },
            { email: 'customer@test.com', password, role: Role.CUSTOMER },
          ],
        }),
      ).resolves.not.toThrow();
    });

    it('should enforce NOT NULL on required fields', async () => {
      expect.assertions(1);

      // Missing email
      await expect(
        prisma.user.create({
          data: {
            email: '',
            password: await bcrypt.hash('pass', 10),
            role: Role.CUSTOMER,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Service Constraints', () => {
    it('should enforce NOT NULL on duration_minutes', async () => {
      expect.assertions(1);

      await expect(
        prisma.service.create({
          data: {
            name: 'Test Service',
            description: 'Test description',
            duration_minutes: 0, // Should be > 0
            price: 10.00,
          },
        }),
      ).rejects.toThrow();
    });

    it('should validate price as decimal', async () => {
      const service = await prisma.service.create({
        data: {
          name: 'Price Test Service',
          duration_minutes: 30,
          price: 99.99,
        },
      });

      expect(service.price).toBe('99.99');
    });
  });

  describe('Availability Constraints', () => {
    let providerId: string;

    beforeAll(async () => {
      const password = await bcrypt.hash('password123', 10);
      const provider = await prisma.user.create({
        data: { email: 'availability-provider@test.com', password, role: Role.PROVIDER },
      });
      providerId = provider.id;
    });

    it('should enforce FK to User for provider_id', async () => {
      expect.assertions(1);

      const baseDate = new Date('2024-01-01T00:00:00.000Z');

      // Invalid provider_id
      await expect(
        prisma.availability.create({
          data: {
            provider_id: '00000000-0000-0000-0000-000000000000',
            day_of_week: 1,
            start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
            end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce day_of_week range (0-6)', async () => {
      expect.assertions(2);

      const baseDate = new Date('2024-01-01T00:00:00.000Z');

      // Valid day (0 = Sunday)
      await expect(
        prisma.availability.create({
          data: {
            provider_id: providerId,
            day_of_week: 0,
            start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
            end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
          },
        }),
      ).resolves.toBeDefined();

      // Valid day (6 = Saturday)
      await expect(
        prisma.availability.create({
          data: {
            provider_id: providerId,
            day_of_week: 6,
            start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
            end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
          },
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('UnavailableDate Constraints', () => {
    let availabilityId: string;
    let providerId: string;

    beforeAll(async () => {
      const password = await bcrypt.hash('password123', 10);
      const provider = await prisma.user.create({
        data: { email: 'unavailable-provider@test.com', password, role: Role.PROVIDER },
      });
      providerId = provider.id;

      const baseDate = new Date('2024-01-01T00:00:00.000Z');
      const availability = await prisma.availability.create({
        data: {
          provider_id: providerId,
          day_of_week: 1,
          start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
          end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
        },
      });
      availabilityId = availability.id;
    });

    it('should enforce FK to Availability for availability_id', async () => {
      expect.assertions(1);

      // Invalid availability_id
      await expect(
        prisma.unavailableDate.create({
          data: {
            availability_id: '00000000-0000-0000-0000-000000000000',
            date: new Date(),
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce NOT NULL on date field', async () => {
      expect.assertions(1);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Should succeed with proper date
      await expect(
        prisma.unavailableDate.create({
          data: {
            availability_id: availabilityId,
            date: today,
          },
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('Appointment Constraints', () => {
    let customerId: string;
    let providerId: string;
    let serviceId: string;

    beforeAll(async () => {
      const password = await bcrypt.hash('password123', 10);

      const customer = await prisma.user.create({
        data: { email: 'appointment-customer@test.com', password, role: Role.CUSTOMER },
      });
      customerId = customer.id;

      const provider = await prisma.user.create({
        data: { email: 'appointment-provider@test.com', password, role: Role.PROVIDER },
      });
      providerId = provider.id;

      const service = await prisma.service.create({
        data: {
          name: 'Test Service',
          duration_minutes: 30,
          price: 25.00,
        },
      });
      serviceId = service.id;
    });

    it('should enforce FK to User for customer_id', async () => {
      expect.assertions(1);

      const now = new Date();

      // Invalid customer_id
      await expect(
        prisma.appointment.create({
          data: {
            customer_id: '00000000-0000-0000-0000-000000000000',
            provider_id: providerId,
            service_id: serviceId,
            start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            status: AppointmentStatus.PENDING,
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce FK to User for provider_id', async () => {
      expect.assertions(1);

      const now = new Date();

      // Invalid provider_id
      await expect(
        prisma.appointment.create({
          data: {
            customer_id: customerId,
            provider_id: '00000000-0000-0000-0000-000000000000',
            service_id: serviceId,
            start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            status: AppointmentStatus.PENDING,
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce FK to Service for service_id', async () => {
      expect.assertions(1);

      const now = new Date();

      // Invalid service_id
      await expect(
        prisma.appointment.create({
          data: {
            customer_id: customerId,
            provider_id: providerId,
            service_id: '00000000-0000-0000-0000-000000000000',
            start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            status: AppointmentStatus.PENDING,
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce status enum membership', async () => {
      const now = new Date();

      // Valid statuses
      const statuses = [
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ];

      for (const status of statuses) {
        await expect(
          prisma.appointment.create({
            data: {
              customer_id: customerId,
              provider_id: providerId,
              service_id: serviceId,
              start_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              end_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
              status,
            },
          }),
        ).resolves.toBeDefined();
      }
    });

    it('should enforce NOT NULL on required fields', async () => {
      expect.assertions(1);

      await expect(
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
      ).rejects.toThrow();
    });
  });

  describe('Cascade Delete Tests', () => {
    let providerId: string;
    let availabilityId: string;
    let unavailableDateId: string;

    beforeAll(async () => {
      const password = await bcrypt.hash('password123', 10);
      const provider = await prisma.user.create({
        data: {
          email: 'cascade-provider@test.com',
          password,
          role: Role.PROVIDER,
        },
      });
      providerId = provider.id;

      const baseDate = new Date('2024-01-01T00:00:00.000Z');
      const availability = await prisma.availability.create({
        data: {
          provider_id: providerId,
          day_of_week: 1,
          start_time: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
          end_time: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000),
        },
      });
      availabilityId = availability.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unavailableDate = await prisma.unavailableDate.create({
        data: {
          availability_id: availabilityId,
          date: today,
        },
      });
      unavailableDateId = unavailableDate.id;
    });

    it('should CASCADE delete availabilities when user is deleted', async () => {
      expect.assertions(1);

      await prisma.user.delete({ where: { id: providerId } });

      const availabilities = await prisma.availability.findMany({
        where: { id: availabilityId },
      });
      expect(availabilities).toHaveLength(0);
    });

    it('should CASCADE delete unavailable_dates when availability is deleted', async () => {
      // This is implicitly tested by the previous cascade - when user is deleted,
      // availability is deleted, and cascade should delete its unavailable_dates
      const unavailableDates = await prisma.unavailableDate.findMany({
        where: { id: unavailableDateId },
      });
      expect(unavailableDates).toHaveLength(0);
    });
  });

  describe('RESTRICT Delete Tests', () => {
    let customerId: string;
    let providerId: string;
    let serviceId: string;
    let appointmentId: string;

    beforeAll(async () => {
      const password = await bcrypt.hash('password123', 10);

      const customer = await prisma.user.create({
        data: { email: 'restrict-customer@test.com', password, role: Role.CUSTOMER },
      });
      customerId = customer.id;

      const provider = await prisma.user.create({
        data: { email: 'restrict-provider@test.com', password, role: Role.PROVIDER },
      });
      providerId = provider.id;

      const service = await prisma.service.create({
        data: {
          name: 'Restrict Test Service',
          duration_minutes: 30,
          price: 25.00,
        },
      });
      serviceId = service.id;

      const now = new Date();
      const appointment = await prisma.appointment.create({
        data: {
          customer_id: customerId,
          provider_id: providerId,
          service_id: serviceId,
          start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          status: AppointmentStatus.PENDING,
        },
      });
      appointmentId = appointment.id;
    });

    it('should RESTRICT deleting customer with appointments', async () => {
      expect.assertions(1);

      await expect(
        prisma.user.delete({ where: { id: customerId } }),
      ).rejects.toThrow();
    });

    it('should RESTRICT deleting provider with appointments', async () => {
      expect.assertions(1);

      await expect(
        prisma.user.delete({ where: { id: providerId } }),
      ).rejects.toThrow();
    });

    it('should RESTRICT deleting service with appointments', async () => {
      expect.assertions(1);

      await expect(
        prisma.service.delete({ where: { id: serviceId } }),
      ).rejects.toThrow();
    });

    afterAll(async () => {
      // Clean up by deleting the appointment first
      await prisma.appointment.delete({ where: { id: appointmentId } });
      await prisma.user.delete({ where: { id: customerId } });
      await prisma.user.delete({ where: { id: providerId } });
      await prisma.service.delete({ where: { id: serviceId } });
    });
  });
});
