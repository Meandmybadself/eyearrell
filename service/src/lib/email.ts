import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { prisma } from './prisma.js'

let transporter: Transporter | null = null

const getTransporter = () => {
  if (transporter) {
    return transporter
  }

  const host = process.env.AWS_SES_SMTP_HOST
  const port = parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10)
  const user = process.env.AWS_SES_SMTP_USER
  const pass = process.env.AWS_SES_SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })
  return transporter
}

const resolveFromAddress = () => {
  return process.env.AWS_SES_FROM_EMAIL ?? null
}

const resolveFromName = () => {
  return process.env.AWS_SES_FROM_NAME
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
  const transport = getTransporter()
  const fromAddress = resolveFromAddress()

  if (!transport || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('AWS SES SMTP not configured - skipping verification email dispatch.')
    }
    return
  }

  const verificationLink = buildVerificationLink(token, type)
  const fromName = resolveFromName()
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress

  const isEmailChange = type === 'verify-email-change'
  const subject = isEmailChange ? 'Verify your new email address' : 'Verify your IRL account email'
  const message = isEmailChange
    ? 'Please confirm your new email address to complete the change.'
    : 'Please confirm your email address to complete your IRL account setup.'

  const textContent = [
    'Hi there!',
    message,
    `Verification link: ${verificationLink}`,
    `If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.`
  ].join('\n\n')

  const htmlContent = `
    <p>Hi there!</p>
    <p>${message}</p>
    <p><a href="${verificationLink}">Verify your email address</a></p>
    <p>If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.</p>
  `

  const result = await transport.sendMail({
    from,
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  })

  return result
}

export const buildInvitationLink = (email: string) => {
  const url = new URL('/register', resolveVerificationBaseUrl())
  url.searchParams.set('email', email)
  return url.toString()
}

export const sendInvitationEmail = async (email: string, inviterEmail: string) => {
  const transport = getTransporter()
  const fromAddress = resolveFromAddress()

  if (!transport || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('AWS SES SMTP not configured - skipping invitation email dispatch.')
    }
    return
  }

  // Fetch system name if available
  const system = await prisma.system.findFirst({
    where: { deleted: false },
    select: { name: true }
  })
  const systemName = system?.name

  const invitationLink = buildInvitationLink(email)
  const fromName = resolveFromName()
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress

  const subject = systemName
    ? `You're invited to join ${systemName}!`
    : "You're invited to join IRL!"

  const inviteText = systemName
    ? `${inviterEmail} has invited you to join ${systemName}.`
    : `${inviterEmail} has invited you to join our community directory.`

  const textContent = [
    'Hi there!',
    inviteText,
    'Click the link below to create your account and get started.',
    `Registration link: ${invitationLink}`,
    'Looking forward to seeing you in the community!'
  ].join('\n\n')

  const htmlContent = `
    <p>Hi there!</p>
    <p><strong>${inviterEmail}</strong> has invited you to join ${systemName ? `<strong>${systemName}</strong>` : 'our community directory'}.</p>
    <p>Click the link below to create your account and get started.</p>
    <p><a href="${invitationLink}">Create your account</a></p>
    <p>Looking forward to seeing you in the community!</p>
  `

  const result = await transport.sendMail({
    from,
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  })

  return result
}
