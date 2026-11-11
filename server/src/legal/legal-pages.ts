// Static English HTML for the public App Store Support and Privacy pages.
// No DB, no user data — plain readable markup with minimal inline CSS.

const STYLE = `<style>
  body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.6;
    max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 1.5rem; } h2 { font-size: 1.1rem; margin-top: 1.5rem; }
  a { color: #0366d6; } footer { margin-top: 2rem; color: #666; font-size: .9rem; }
</style>`;

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${STYLE}
</head>
<body>
${body}
</body>
</html>`;
}

export const SUPPORT_PAGE = page('BlackStore ERP — Support', `
<h1>BlackStore ERP — Support</h1>
<p>BlackStore ERP is an inventory and sales management system for phone and
electronics stores.</p>
<p>Accounts are created by your store administrator. If you need access or have
lost your password, please contact your store administrator.</p>
<h2>Contact</h2>
<p>For any other questions, email
<a href="mailto:support@abdulboriy.dev">support@abdulboriy.dev</a>.</p>
`);

export const PRIVACY_PAGE = page('BlackStore ERP — Privacy Policy', `
<h1>BlackStore ERP — Privacy Policy</h1>
<p>This policy explains what BlackStore ERP stores and why.</p>
<h2>Data we store</h2>
<ul>
  <li>Staff accounts: name, phone number and role.</li>
  <li>Store customers' name and phone number, entered by staff.</li>
  <li>Sales and stock records.</li>
</ul>
<h2>How we use it</h2>
<p>This data is used only to run the store. We do not track you, show ads,
sell data, or use any third-party analytics.</p>
<h2>Camera</h2>
<p>The camera is used only to scan barcodes and IMEI numbers. Images are not
stored.</p>
<h2>Where it is stored</h2>
<p>The data is hosted on the store's own server.</p>
<h2>Deletion</h2>
<p>To have your data deleted, ask your store administrator or email
<a href="mailto:support@abdulboriy.dev">support@abdulboriy.dev</a>.</p>
<footer>Effective date: 2026-11-11</footer>
`);
