# Appointment Management Backend

Backend API for appointment booking system built with TypeScript, Prisma, and PostgreSQL.

## Features

- **User Management**: Admin, Provider, and Customer roles
- **Services**: Define available services with duration and pricing
- **Availability**: Recurring provider schedules with optional breaks
- **Unavailable Dates**: Block specific dates from availability
- **Appointments**: Book and manage appointments with full lifecycle

## Tech Stack

- **Language**: TypeScript 5.7
- **Runtime**: Node.js
- **ORM**: Prisma 6.19
- **Database**: PostgreSQL
- **Testing**: Vitest
- **Password Hashing**: bcryptjs

## Database Schema

### Models

#### User
- `id`: UUID (primary key)
- `email`: String (unique)
- `password`: String (hashed)
- `role`: Enum (ADMIN, PROVIDER, CUSTOMER)
- `created_at`: DateTime

#### Service
- `id`: UUID (primary key)
- `name`: String
- `description`: String (optional)
- `duration_minutes`: SmallInt
- `price`: Decimal(10, 2)
- `created_at`: DateTime

#### Availability
- `id`: UUID (primary key)
- `provider_id`: UUID (foreign key → User)
- `day_of_week`: Int (0-6, Sunday-Saturday)
- `start_time`: DateTime (time-only, date component unused)
- `end_time`: DateTime (time-only, date component unused)
- `break_start`: DateTime (optional)
- `break_end`: DateTime (optional)
- `created_at`: DateTime

#### UnavailableDate
- `id`: UUID (primary key)
- `availability_id`: UUID (foreign key → Availability)
- `date`: DateTime (date-only, time component unused)
- `reason`: String (optional)
- `created_at`: DateTime

#### Appointment
- `id`: UUID (primary key)
- `customer_id`: UUID (foreign key → User)
- `provider_id`: UUID (foreign key → User)
- `service_id`: UUID (foreign key → Service)
- `start_time`: DateTime
- `end_time`: DateTime
- `status`: Enum (PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW)
- `created_at`: DateTime
- `updated_at`: DateTime

### Indexes

- Users: `email`
- Availabilities: `provider_id`, `[provider_id, day_of_week]`
- UnavailableDates: `availability_id`, `[availability_id, date]`
- Appointments: `customer_id`, `provider_id`, `service_id`, `status`, `[provider_id, start_time, status]`

### Constraints

- **Unique**: User.email
- **Foreign Keys**: All relationships with CASCADE or RESTRICT delete rules
- **NOT NULL**: All required fields enforced
- **Enum**: Role and AppointmentStatus limited to valid values

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ved-systango/test-appointment-management-BE.git
cd test-appointment-management-BE
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```
DATABASE_URL="postgresql://user:password@localhost:5432/appointment_db?schema=public"
```

4. Run migrations:
```bash
npm run prisma:migrate:deploy
```

5. Generate Prisma Client:
```bash
npm run prisma:generate
```

6. (Optional) Seed database with sample data:
```bash
npm run prisma:seed
```

## Development

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Create a migration
```bash
npm run prisma:migrate -- --name your_migration_name
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

### Format Prisma schema
```bash
npm run prisma:format
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests once
```bash
npm run test:run
```

### Test Environment
Create `.env.test` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/appointment_db_test?schema=public"
NODE_ENV="test"
```

### Test Coverage
- **Unit tests**: Schema constraints, FK validation, enum membership, NOT NULL fields
- **Integration tests**: CRUD operations, relationship traversal, transactions

## Database Client

Import and use the Prisma Client singleton:

```typescript
import { prisma } from './src/lib/db';

// Query users
const users = await prisma.user.findMany();

// Create an appointment
const appointment = await prisma.appointment.create({
  data: {
    customer_id: customerId,
    provider_id: providerId,
    service_id: serviceId,
    start_time: new Date(),
    end_time: new Date(),
    status: 'PENDING',
  },
  include: {
    customer: true,
    provider: true,
    service: true,
  },
});
```

## Seed Data

The seed script creates:
- 5 users (1 admin, 2 providers, 2 customers)
- 3 services (haircut, massage, consultation)
- 6 recurring availability schedules
- 2 unavailable dates
- 5 appointments across all status types

Run with:
```bash
npm run prisma:seed
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment (development/production) | development |

## Indexes for Performance

Indexes are created on:
- All foreign key columns
- User email (for authentication queries)
- Appointment status (for filtering)
- Composite index on provider + start_time + status (for availability checks)

## License

ISC
