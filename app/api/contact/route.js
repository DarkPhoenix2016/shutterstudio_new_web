import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) { // Removed ": Request"
  try {
    const body = await request.json();
    const { name, email, subject, category, message } = body;

    const data = await resend.emails.send({
      from: 'ShutterStudio Contact <onboarding@resend.dev>',
      to: ['shutterstudio.dev@gmail.com'],
      subject: `[${category || 'General'}] ${subject}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Category:</strong> ${category}</p>
        <br />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}