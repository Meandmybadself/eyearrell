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
  // Required
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { name: 'SESSION_SECRET', required: true, description: 'Secret for session encryption' },
  { name: 'CLIENT_URL', required: true, description: 'Frontend URL for CORS' },

  // Optional but recommended
  { name: 'SERVICE_PORT', required: false, description: 'Port for the service (default: 3001)' },
  { name: 'NODE_ENV', required: false, description: 'Environment mode (development/production/test)' },

  // Email (optional - service works without email functionality)
  { name: 'MAILERSEND_API_TOKEN', required: false, description: 'MailerSend API token for sending emails' },
  { name: 'MAILERSEND_FROM_EMAIL', required: false, description: 'From email address for MailerSend' },
  { name: 'MAILERSEND_FROM_NAME', required: false, description: 'From name for MailerSend' },

  // Cloudinary (optional - service works without image uploads)
  { name: 'CLOUDINARY_CLOUD_NAME', required: false, description: 'Cloudinary cloud name' },
  { name: 'CLOUDINARY_API_KEY', required: false, description: 'Cloudinary API key' },
  { name: 'CLOUDINARY_API_SECRET', required: false, description: 'Cloudinary API secret' },
]

export function checkEnvironment(): void {
  const missing: string[] = []
  const warnings: string[] = []

  for (const envVar of envVars) {
    const value = process.env[envVar.name]

    if (!value) {
      if (envVar.required) {
        missing.push(`  - ${envVar.name}: ${envVar.description}`)
      }
    }
  }

  // Check for related optional vars (if one is set, others should be too)
  const mailersendVars = ['MAILERSEND_API_TOKEN', 'MAILERSEND_FROM_EMAIL']
  const hasAnyMailersend = mailersendVars.some(v => process.env[v])
  const hasMissingMailersend = mailersendVars.filter(v => !process.env[v])
  if (hasAnyMailersend && hasMissingMailersend.length > 0) {
    warnings.push(`  - MailerSend partially configured. Missing: ${hasMissingMailersend.join(', ')}`)
  }

  const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  const hasAnyCloudinary = cloudinaryVars.some(v => process.env[v])
  const hasMissingCloudinary = cloudinaryVars.filter(v => !process.env[v])
  if (hasAnyCloudinary && hasMissingCloudinary.length > 0) {
    warnings.push(`  - Cloudinary partially configured. Missing: ${hasMissingCloudinary.join(', ')}`)
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment configuration warnings:')
    warnings.forEach(w => console.warn(w))
    console.warn('')
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:')
    missing.forEach(m => console.error(m))
    console.error('\nPlease set these variables and restart the service.\n')
    process.exit(1)
  }
}
