import { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { to, subject, text, html } = JSON.parse(event.body || "{}");

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.error("Gmail credentials missing in environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Server email configuration missing.",
          details: "Please set GMAIL_USER and GMAIL_APP_PASSWORD in Netlify environment variables."
        }),
      };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: user,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Error sending email via Gmail:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to send email.",
        details: error instanceof Error ? error.message : String(error)
      }),
    };
  }
};

export { handler };
