import { Resend } from 'resend';

// ============================================================================
// EMAIL SERVICE — All transactional emails sent via Resend
// from: noreply@analyzemyproperty.com
// ============================================================================

const FROM = 'Analyze My Property <noreply@analyzemyproperty.com>';
const APP_URL = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'https://analyzemyproperty.com';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — email sending is disabled');
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('[Email] Send error:', error);
      return false;
    }
    console.log(`[Email] ✅ Sent "${subject}" to ${to}`);
    return true;
  } catch (err: any) {
    console.error('[Email] Unexpected error:', err.message || err);
    return false;
  }
}

// ── Shared layout ────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyze My Property</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
                ANALYZE MY <span style="color:#4CAF50;">PROPERTY</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You're receiving this email because you have an account at
                <a href="${APP_URL}" style="color:#4CAF50;text-decoration:none;">analyzemyproperty.com</a>.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Analyze My Property. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string, color = '#4CAF50'): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${color};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ── Welcome email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : 'Welcome aboard,';
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a;">Welcome to Analyze My Property</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      You now have access to AI-powered real estate underwriting. Your free trial includes
      <strong>3 property analyses per day</strong> for 7 days — enough to explore the tool and
      evaluate real deals.
    </p>
    <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 8px;">Here's how to get started:</p>
    <ol style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#475569;line-height:1.8;">
      <li>Enter a property address in the search bar</li>
      <li>Click <strong>Underwrite</strong> to run your first analysis</li>
      <li>Switch between <strong>STR / MTR / LTR</strong> to compare rental strategies</li>
      <li>Save properties to your <strong>Portfolio</strong> tab for future reference</li>
    </ol>
    ${btn('Run Your First Analysis', APP_URL)}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Have questions? Open the <strong>Help &amp; Guide</strong> from your profile menu — it covers
      calculations, strategies, and FAQs.
    </p>
  `);

  return send(email, 'Welcome to Analyze My Property', html);
}

// ── Trial expiring email ──────────────────────────────────────────────────────

export async function sendTrialExpiryEmail(email: string, daysLeft: number): Promise<boolean> {
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a;">
      Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">
      Hi there,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Your 7-day free trial is almost up. After it ends, you'll be limited to
      the free plan's analysis limit.
    </p>
    <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 8px;">Upgrade to Pro to unlock:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#475569;line-height:1.8;">
      <li>50 property analyses per day</li>
      <li>Full access to advanced underwriting tools</li>
      <li>Sensitivity analysis and Amenity ROI panels</li>
      <li>Professional lender packet exports</li>
    </ul>
    ${btn('Upgrade to Pro', `${APP_URL}?upgrade=true`, '#f43f5e')}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      You can continue using the free plan after your trial — no action needed if you'd like to stay on free.
    </p>
  `);

  return send(email, `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, html);
}

// ── Trial expired email ───────────────────────────────────────────────────────

export async function sendTrialExpiredEmail(email: string): Promise<boolean> {
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a;">Your free trial has ended</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Hi there,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Your 7-day free trial has ended. You can still use Analyze My Property on the
      free plan with 3 analyses per day.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Upgrade to Pro for unlimited analyses and full access to all underwriting tools.
    </p>
    ${btn('Upgrade to Pro', `${APP_URL}?upgrade=true`, '#f43f5e')}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Thanks for trying Analyze My Property. We hope it helped with your investment research.
    </p>
  `);

  return send(email, 'Your free trial has ended', html);
}

// ── Upgrade confirmation email ────────────────────────────────────────────────

export async function sendUpgradeConfirmationEmail(email: string, name?: string): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a;">You're now on Pro</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Your Pro subscription is now active. Here's what you've unlocked:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${[
        ['50 analyses per day', 'Up from 3/day on free'],
        ['Sensitivity Analysis', 'See how changes in ADR and occupancy affect returns'],
        ['Amenity ROI Panel', 'AI-calculated payback periods for each amenity'],
        ['Professional Lender Packets', 'Export polished PDF reports for lenders'],
        ['Path to Yes', 'AI-generated scenarios to make any deal work'],
      ].map(([feature, desc]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:14px;font-weight:700;color:#0f172a;">✓ ${feature}</span><br>
          <span style="font-size:13px;color:#64748b;">${desc}</span>
        </td>
      </tr>`).join('')}
    </table>
    ${btn('Go to Dashboard', APP_URL)}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      You can manage your subscription at any time from the profile menu → Manage Subscription.
    </p>
  `);

  return send(email, "You're now on Pro — Analyze My Property", html);
}
