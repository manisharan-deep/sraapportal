const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3).optional(),
    password: z.string().min(8),
    role: z.enum(['STUDENT', 'STAFF', 'ADMIN'])
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const attendanceCalculatorSchema = z.object({
  body: z.object({
    totalClasses: z.coerce.number().int().positive(),
    presentClasses: z.coerce.number().int().nonnegative()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const announcementSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    message: z.string().min(3),
    scope: z.enum(['GLOBAL', 'BATCH', 'INDIVIDUAL']),
    batch: z.string().optional(),
    studentId: z.string().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const courseRegistrationSchema = z.object({
  body: z.object({
    courseId: z.string().min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const courseEditSchema = z.object({
  body: z.object({
    status: z.enum(['REGISTERED', 'DROPPED'])
  }),
  params: z.object({
    enrollmentId: z.string().min(1)
  }),
  query: z.object({}).optional()
});

const profileUpdateSchema = z.object({
  body: z.object({
    branch: z.string().min(1),
    section: z.string().min(1),
    semester: z.coerce.number().int().min(1).max(12),
    mentor: z.string().min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = {
  loginSchema,
  attendanceCalculatorSchema,
  announcementSchema,
  courseRegistrationSchema,
  courseEditSchema,
  profileUpdateSchema
};
