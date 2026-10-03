export async function sendVerificationCode(email: string, code: string) {
  console.log(`[verify] code for ${email}: ${code}`); // keep as fallback/debug

  if (!process.env.RESEND_API_KEY) return; // local dev without a key still works

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? 'onboarding@resend.dev',
        to: email,
        subject: 'Your verification code',
        text: `Your verification code is ${code}. It expires in 15 minutes.`,
      }),
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}
export async function sendShareNotification(email: string, assetTitle: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? 'onboarding@resend.dev',
        to: email,
        subject: 'A confidential asset was shared with you',
        text: `You've been granted access to "${assetTitle}". Sign in (or create a free account with this exact email) to view it.`,
      }),
    });
  } catch (err) {
    console.error('Share notification failed:', err);
  }
}