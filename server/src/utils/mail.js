function codeBoxes(code) {
  return String(code)
    .split('')
    .map(
      (d) =>
        `<td style="width:42px;height:52px;border:1px solid rgba(0,168,255,0.35);border-radius:10px;background:#0d1420;color:#f4f7fb;font-size:24px;font-weight:700;text-align:center;font-family:Arial,Helvetica,sans-serif;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');
}

export function verificationEmailHtml({ title, subtitle, code, minutes = 15 }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#070b12;color:#f4f7fb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070b12;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:linear-gradient(180deg,#101826,#0a101a);border:1px solid rgba(125,211,252,0.16);border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:800;letter-spacing:0.02em;color:#ffffff;">
                Tecno<span style="color:#00a8ff;">POS</span>
              </div>
              <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;color:#c7ced8;">
                TU NEGOCIO, EN CONTROL
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;text-align:center;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#00a8ff,transparent);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#f4f7fb;">${title}</h1>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#93a4b8;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>${codeBoxes(code)}</tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <p style="margin:0;font-size:13px;color:#93a4b8;">
                Este código expira en <strong style="color:#38bdf8;">${minutes} minutos</strong>.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#6b7c90;">
                Si no solicitaste este código, ignora este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 22px;background:#070b12;border-top:1px solid rgba(125,211,252,0.12);font-family:Arial,Helvetica,sans-serif;text-align:center;font-size:11px;color:#6b7c90;">
              Enviado por TecnoPOS · WWTECNO
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendBrevoEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'tecnopos@wwtecno.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'TecnoPOS';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY no configurada');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Brevo error:', res.status, body);
    throw new Error('No se pudo enviar el correo de verificación');
  }

  return res.json().catch(() => ({}));
}

export async function sendVerificationCodeEmail({ to, code, purpose }) {
  const isRegister = purpose === 'register';
  const title = isRegister ? 'Verifica tu cuenta' : 'Recupera tu acceso';
  const subtitle = isRegister
    ? 'Usa este código para completar tu registro en TecnoPOS.'
    : 'Usa este código para restablecer tu contraseña de TecnoPOS.';
  const subject = isRegister
    ? `TecnoPOS · Código de verificación ${code}`
    : `TecnoPOS · Código para restablecer contraseña ${code}`;

  await sendBrevoEmail({
    to,
    subject,
    html: verificationEmailHtml({ title, subtitle, code, minutes: 15 }),
  });
}
