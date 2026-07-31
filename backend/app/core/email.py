import os
import smtplib
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

def send_reset_password_email(to_email: str, reset_token: str):
    print(f"Starting to send email to {to_email}...")

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if not sender_email or not sender_password:
        print("ERROR: SENDER_EMAIL or SENDER_PASSWORD is missing in .env file!")
        print(f"Path checked: {env_path}")
        return

    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    subject = "Compte bloqué : Réinitialisation de votre mot de passe"

    text_body = f"""Bonjour,

Votre compte ({to_email}) a été bloqué suite à 3 tentatives de connexion incorrectes.
Pour débloquer votre accès et choisir un nouveau mot de passe, utilisez le lien suivant :
{reset_link}

Ce lien est valable pendant 30 minutes.

© TrackIT - Équipe Support"""

    html_body = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation du mot de passe</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <tr>
          <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">TrackIT</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #0f172a;">Compte temporairement bloqué</h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 24px; color: #475569;">
              Bonjour,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 24px; color: #475569;">
              Votre compte (<strong>{to_email}</strong>) a été bloqué suite à 3 tentatives de connexion incorrectes. Pour débloquer votre accès et choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :
            </p>

            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
              <tr>
                <td align="center">
                  <a href="{reset_link}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px; text-align: center;">
                    Débloquer mon compte
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-align: center;">
              ⏳ Ce lien est valable pendant <strong>30 minutes</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 18px;">
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 500; color: #64748b;">
              © TrackIT - Équipe Support
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            print(f"EMAIL SUCCESSFULLY SENT TO {to_email}")
    except Exception as e:
        print(f"ERROR SENDING EMAIL: {e}")