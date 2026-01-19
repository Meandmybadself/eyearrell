/**
 * Environment variable validation
 * Checks for required environment variables at startup
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
}

const envVars: EnvVar[] = [
  // Required - Core
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { name: 'SESSION_SECRET', required: true, description: 'Secret for session encryption' },
  { name: 'CLIENT_URL', required: true, description: 'Frontend URL for CORS' },

  // Required - Email
  { name: 'MAILERSEND_API_TOKEN', required: true, description: 'MailerSend API token for sending emails' },
  { name: 'MAILERSEND_FROM_EMAIL', required: true, description: 'From email address for MailerSend' },
  { name: 'MAILERSEND_FROM_NAME', required: true, description: 'From name for MailerSend' },

  // Required - Cloudinary
  { name: 'CLOUDINARY_CLOUD_NAME', required: true, description: 'Cloudinary cloud name' },
  { name: 'CLOUDINARY_API_KEY', required: true, description: 'Cloudinary API key' },
  { name: 'CLOUDINARY_API_SECRET', required: true, description: 'Cloudinary API secret' },

  // Optional
  { name: 'SERVICE_PORT', required: false, description: 'Port for the service (default: 3001)' },
  { name: 'NODE_ENV', required: false, description: 'Environment mode (development/production/test)' },
]

export function checkEnvironment(): void {
  const missing: string[] = []

  for (const envVar of envVars) {
    const value = process.env[envVar.name]

    if (!value && envVar.required) {
      missing.push(`  - ${envVar.name}: ${envVar.description}`)
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:')
    missing.forEach(m => console.error(m))
    console.error('\nPlease set these variables and restart the service.\n')
    process.exit(1)
  }
}
