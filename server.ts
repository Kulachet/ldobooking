import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";

dotenv.config({ override: true });

const logFile = path.join(process.cwd(), "server.log");
function writeLog(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (e) {
    console.error("Failed to write to log file", e);
  }
}

function requestGasEmail(gasUrl: string, payload: any): Promise<{ success: boolean; status: number; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(gasUrl);
      const data = JSON.stringify(payload);
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location;
          https.get(redirectUrl, (redirectRes) => {
            let body = "";
            redirectRes.on("data", (chunk) => {
              body += chunk;
            });
            redirectRes.on("end", () => {
              resolve({
                success: redirectRes.statusCode === 200,
                status: redirectRes.statusCode || 200,
                text: body,
              });
            });
          }).on("error", (e) => {
            reject(new Error(`Failed to follow redirect: ${e.message}`));
          });
        } else {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            resolve({
              success: res.statusCode === 200,
              status: res.statusCode || 200,
              text: body,
            });
          });
        }
      });

      req.on("error", (e) => {
        reject(e);
      });

      req.write(data);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending email (supporting Google Apps Script and Gmail SMTP)
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;
    writeLog(`Received /api/send-email request to: ${to}, subject: ${subject}`);

    const gasUrl = process.env.VITE_GAS_EMAIL_URL;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gasUrl) {
      writeLog(`Attempting to send email via GAS to ${to} using URL: "${gasUrl}"...`);
      try {
        const result = await requestGasEmail(gasUrl, { to, subject, html: html || text });
        writeLog(`GAS request completed. Status: ${result.status}, Success: ${result.success}`);
        writeLog(`GAS response text: ${result.text}`);
        return res.json({ success: result.success, method: "gas" });
      } catch (error) {
        writeLog(`Failed to send email via GAS: ${error instanceof Error ? error.message : String(error)}`);
        if (!gmailUser || !gmailPass) {
          return res.status(500).json({ 
            error: "Failed to send email via GAS", 
            details: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    }

    if (gmailUser && gmailPass) {
      writeLog(`Sending email to ${to} via Gmail SMTP...`);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const mailOptions = {
        from: gmailUser,
        to,
        subject,
        text,
        html,
      };

      try {
        await transporter.sendMail(mailOptions);
        writeLog(`Email sent successfully to ${to} via Gmail SMTP`);
        return res.json({ success: true, method: "smtp" });
      } catch (error) {
        writeLog(`Error sending email via Gmail: ${error instanceof Error ? error.message : String(error)}`);
        return res.status(500).json({ 
          error: "Failed to send email.",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }

    writeLog(`Error: No email service configuration could be satisfied for target: ${to}`);
    return res.status(500).json({ 
      error: "Server email configuration missing.",
      details: "Please configure VITE_GAS_EMAIL_URL or GMAIL credentials."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
