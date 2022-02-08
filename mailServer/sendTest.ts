#!/usr/bin/env node

import { Command } from "commander";
import { createTransport, SendMailOptions } from "nodemailer";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";

interface ISMTPOptions {
  smtpHost: string | undefined;
  smtpOpts?: string | undefined;
  smtpPass: string;
  smtpPort: number | undefined;
  smtpUser: string;
}

const commander = new Command();

commander
  .version(process.env.npm_package_version || "1.0.0")
  .usage("[options]")
  .description(`Run tests for ${process.env.npm_package_name}`)
  .option("--debug", "Trace extra scum messages")
  .option("--port <number>", "port to use for SMTP server.", undefined)
  .option("--host <host>", "SMTP server host name or IP address.", "localhost")
  .option("--count <number>", "number of emails to send.", "2")
  .parse(process.argv);

interface commanderOptions {
  debug: boolean | undefined;
  host: string | undefined;
  port: number | undefined;
  count: string;
}

const commandOptions = commander.opts<commanderOptions>();

(async (): Promise<void> => {
  const smtpOptions: ISMTPOptions = {
    smtpUser: "from@example.com",
    smtpPass: "secrets",
    smtpHost: commandOptions.host,
    smtpPort: commandOptions.port,
  };

  const email: SendMailOptions = {
    from: smtpOptions.smtpUser,
    to: "someone@server.com",
    subject: "first test",
    text: "Check it out!"
  };

  const count = parseInt(commandOptions.count);

  for (let i = 1; i <= count; i++) {
    email.subject = `test #${i}`;
    await sendMail(email, smtpOptions);
  }

})().catch((reason: Error) => {
  console.log(`Caught error ${reason}:\n${reason.stack}\n`);
  process.exit(1);
});

/**
 * Send an email via nodemailer.
 *
 * @param mail document with an email to send
 * @param smtpOptions possible host/port/user info
 * @returns message id
 */
async function sendMail(
  mail: SendMailOptions,
  smtpOptions: ISMTPOptions
): Promise<string> {
  const transportOpts: SMTPTransport.Options = {
    auth: {
      pass: smtpOptions.smtpPass,
      user: smtpOptions.smtpUser,
    },
    port: smtpOptions.smtpPort,
    host: smtpOptions.smtpHost,
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  };

  return new Promise<string>((resolve, reject) => {
    const transporter = createTransport(transportOpts);

    transporter.sendMail(mail, (error, info: { messageId: string }): void => {
      if (error) {
        reject(error);
      } else {
        resolve(info.messageId);
      }
    });
  });
}
