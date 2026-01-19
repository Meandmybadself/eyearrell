import { MailerSend, EmailParams, Recipient, Sender } from 'mailersend'
import { prisma } from './prisma.js'

let mailerSendClient: MailerSend | null = null

const getMailerSendClient = () => {
  if (mailerSendClient) {
    return mailerSendClient
  }

  const apiKey = process.env.MAILERSEND_API_TOKEN
  if (!apiKey) {
    return null
  }

  mailerSendClient = new MailerSend({ apiKey })
  return mailerSendClient
}

const resolveFromAddress = () => {
  return process.env.MAILERSEND_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? null
}

const resolveFromName = () => {
  return process.env.MAILERSEND_FROM_NAME ?? process.env.EMAIL_FROM_NAME ?? undefined
}

const resolveVerificationBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    'http://localhost:3000'
  )
}

export const buildVerificationLink = (token: string, type: 'verify-email' | 'verify-email-change' = 'verify-email') => {
  const verificationPath = type === 'verify-email-change' ? '/verify-email-change' : '/verify-email'
  const url = new URL(verificationPath, resolveVerificationBaseUrl())
  url.searchParams.set('token', token)
  return url.toString()
}

export const sendVerificationEmail = async (email: string, token: string, type: 'verify-email' | 'verify-email-change' = 'verify-email') => {
  const client = getMailerSendClient()
  const fromAddress = resolveFromAddress()

  if (!client || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('MailerSend not configured - skipping verification email dispatch.')
    }
    return
  }

  const verificationLink = buildVerificationLink(token, type)
  const sender = new Sender(fromAddress, resolveFromName())
  const recipients = [new Recipient(email)]

  const isEmailChange = type === 'verify-email-change'
  const subject = isEmailChange ? 'Verify your new email address' : 'Verify your IRL account email'
  const message = isEmailChange
    ? 'Please confirm your new email address to complete the change.'
    : 'Please confirm your email address to complete your IRL account setup.'

  const params = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(subject)
    .setText([
      'Hi there!',
      message,
      `Verification link: ${verificationLink}`,
      `If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.`
    ].join('\n\n'))
    .setHtml(`
      <p>Hi there!</p>
      <p>${message}</p>
      <p><a href="${verificationLink}">Verify your email address</a></p>
      <p>If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.</p>
    `)

  const response = await client.email.send(params)
  return response
}

export const buildInvitationLink = (email: string) => {
  const url = new URL('/register', resolveVerificationBaseUrl())
  url.searchParams.set('email', email)
  return url.toString()
}

export const sendInvitationEmail = async (email: string, inviterEmail: string) => {
  const client = getMailerSendClient()
  const fromAddress = resolveFromAddress()

  if (!client || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('MailerSend not configured - skipping invitation email dispatch.')
    }
    return
  }

  // Fetch system name if available
  const system = await prisma.system.findFirst({
    where: { id: 1, deleted: false },
    select: { name: true }
  })
  const systemName = system?.name

  const invitationLink = buildInvitationLink(email)
  const sender = new Sender(fromAddress, resolveFromName())
  const recipients = [new Recipient(email)]

  const subject = systemName
    ? `You're invited to join ${systemName}!`
    : "You're invited to join IRL!"

  const inviteText = systemName
    ? `${inviterEmail} has invited you to join ${systemName}.`
    : `${inviterEmail} has invited you to join our community directory.`

  const params = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(subject)
    .setText([
      'Hi there!',
      inviteText,
      'Click the link below to create your account and get started.',
      `Registration link: ${invitationLink}`,
      'Looking forward to seeing you in the community!'
    ].join('\n\n'))
    .setHtml(`
      <p>Hi there!</p>
      <p><strong>${inviterEmail}</strong> has invited you to join ${systemName ? `<strong>${systemName}</strong>` : 'our community directory'}.</p>
      <p>Click the link below to create your account and get started.</p>
      <p><a href="${invitationLink}">Create your account</a></p>
      <p>Looking forward to seeing you in the community!</p>
    `)

  const response = await client.email.send(params)
  return response
}
