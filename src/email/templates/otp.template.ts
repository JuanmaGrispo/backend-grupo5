// Simple string template (sin dependencias). Si querés, podés migrarlo a Handlebars/EJS luego.
export function otpEmailTemplate({
  code,
  ttlMinutes,
  product = 'Tu App',
  supportEmail = 'soporte@tuapp.com',
  logoUrl,
}: {
  code: string;
  ttlMinutes: number;
  product?: string;
  supportEmail?: string;
  logoUrl?: string;
}) {
  // separa el código 6 dígitos visualmente: 123 456
  const prettyCode = code.length === 6 ? `${code.slice(0,3)} ${code.slice(3)}` : code;

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <title>${product} • Código OTP</title>
    <style>
      /* Estilos mínimos inline-friendly para clientes de correo */
      @media (prefers-color-scheme: dark) {
        body { background: #0b0b0b !important; color: #e7e7e7 !important; }
        .card { background: #121212 !important; border-color: #222 !important; }
        .muted { color: #b5b5b5 !important; }
        .code { background: #1c1c1c !important; color: #fff !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:94%;background:transparent;">
            <tr>
              <td align="left" style="padding:8px 0 16px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${product}" height="28" style="display:block;border:0;outline:none;">` : `<strong style="font-size:18px;">${product}</strong>`}
              </td>
            </tr>
            <tr>
              <td class="card" style="background:#ffffff;border:1px solid #eee;border-radius:10px;padding:24px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Tu código de acceso</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
                  Usá este código para continuar con tu inicio de sesión en <strong>${product}</strong>.
                </p>

                <div class="code" style="letter-spacing:2px;font-size:28px;font-weight:700;text-align:center;border-radius:12px;border:1px solid #e7e7e7;background:#f0f2f7;padding:14px 0;margin:10px 0 6px;">
                  ${prettyCode}
                </div>

                <p class="muted" style="margin:0 0 16px;color:#666;font-size:12px;line-height:1.5;">
                  Este código vence en <strong>${ttlMinutes} minutos</strong>. Si no fuiste vos, podés ignorar este correo.
                </p>

                <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">

                <p style="margin:0 0 6px;font-size:12px;color:#444;">
                  ¿Problemas con el código? Revisá la carpeta de spam o solicitá uno nuevo desde la app.
                </p>
                <p class="muted" style="margin:0;font-size:12px;color:#777;">
                  Soporte: <a href="mailto:${supportEmail}" style="color:#4a6cf7;text-decoration:none;">${supportEmail}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 0;">
                <p class="muted" style="margin:0;font-size:12px;color:#9aa0a6;">© ${new Date().getFullYear()} ${product}. Todos los derechos reservados.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
