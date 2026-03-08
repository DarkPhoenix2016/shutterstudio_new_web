import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, category, message } = body;

    // Basic presence validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const safeName     = escapeHtml(name);
    const safeEmail    = escapeHtml(email);
    const safeSubject  = escapeHtml(subject ?? '');
    const safeCategory = escapeHtml(category ?? 'General');
    const safeMessage  = escapeHtml(message).replace(/\n/g, '<br>');

    await resend.emails.send({
      from: 'ShutterStudio Contact <contact@shutterstudio.app>',
      to: ['shutterstudio.dev@gmail.com'],
      subject: `[${safeCategory}] ${safeSubject}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\nCategory: ${category ?? 'General'}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <br />
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
