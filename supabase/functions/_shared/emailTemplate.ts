// Shared branded HTML wrapper for every transactional email this project
// sends (send-order-email, send-partner-email, grant-portal-access) - see
// CLAUDE.md §10 ("dark/gold, logo header"), not actually implemented until
// now (every email here used to be a bare, unstyled `<p>...</p>` string).
//
// Table-based layout with inline styles only, no external CSS/webfonts/SVG
// - the usual email-client constraints (Outlook's Word rendering engine
// has no flexbox/grid support, many clients strip <style> blocks or block
// remote images by default). The header is a plain-text wordmark rather
// than a hosted logo image for the same reason: no image to be blocked,
// works identically with images off, and needs no publicly-hosted asset
// URL to keep in sync with the real logo.
//
// `_shared/` is a Supabase CLI convention - never deployed as its own
// function, only importable by the others (see _shared/cors.ts).

const COLORS = {
  black: '#0D0D0D',
  charcoal: '#2A2A2A',
  gold: '#D4AF37',
  cream: '#F2E9DB',
  white: '#FFFFFF',
};

export function renderInfoBox(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:${COLORS.cream};opacity:0.65;">${r.label}</td>
          <td style="padding:5px 0;font-size:13px;color:${COLORS.white};font-weight:600;text-align:right;">${r.value}</td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:${COLORS.black};border-left:3px solid ${COLORS.gold};border-radius:2px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
        </td>
      </tr>
    </table>`;
}

export function renderBrandedEmail(opts: {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const year = new Date().getFullYear();
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
        <tr>
          <td style="border-radius:2px;background-color:${COLORS.gold};">
            <a href="${opts.ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial, Helvetica, sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;color:${COLORS.black};text-decoration:none;text-transform:uppercase;">${opts.ctaLabel}</a>
          </td>
        </tr>
      </table>`
      : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background-color:${COLORS.black};font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="background-color:${COLORS.charcoal};border:1px solid rgba(212,175,55,0.25);border-radius:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:32px 32px 0;text-align:center;">
                <div style="font-family:Arial, Helvetica, sans-serif;font-size:22px;font-weight:700;letter-spacing:2px;color:${COLORS.white};">
                  LEAN <span style="color:${COLORS.gold};">&amp;</span> FIT
                </div>
                <div style="margin-top:4px;font-family:Arial, Helvetica, sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.cream};opacity:0.55;text-transform:uppercase;">
                  Protein Coffee
                </div>
                <div style="height:2px;width:48px;background-color:${COLORS.gold};margin:20px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;">
                <div style="font-family:Arial, Helvetica, sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:${COLORS.gold};text-transform:uppercase;margin-bottom:14px;">
                  ${opts.heading}
                </div>
                <div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:1.6;color:${COLORS.cream};">
                  ${opts.bodyHtml}
                </div>
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <div style="height:1px;background-color:rgba(255,255,255,0.1);margin-bottom:20px;"></div>
                <div style="font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.7;color:${COLORS.cream};opacity:0.5;text-align:center;">
                  We don't just make coffee. We fuel your discipline and power your transformation.<br/>
                  @leanfitcoffee<br/>
                  &copy; ${year} Lean &amp; Fit Protein Coffee. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
