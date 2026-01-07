import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use the unpooled URL for migrations (direct database access)
    url: env('DATABASE_URL_UNPOOLED'),
  },
})
