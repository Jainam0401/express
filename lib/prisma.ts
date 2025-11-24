import 'dotenv/config'
import { Prisma, PrismaClient } from '../prisma/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'


export const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter: pool })