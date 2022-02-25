#!/usr/bin/env node

import { Command } from "commander";
import Mail from "nodemailer/lib/mailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { AddressObject, HeaderLines, ParsedMail } from "mailparser";
import simpleGit, { SimpleGit } from "simple-git";
// import { eMail, testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
import { testSmtpServer, testSmtpServerOptions } from "test-smtp-server";
import * as fs from "fs";
import { setInterval } from "timers/promises";

interface mailOptions {
  git: SimpleGit;
  file: string;
  repoDir: string;
  seenMail: number;
  repliedMail: number;
  // smtpserver: testSmtpServer<mailOptions> | undefined;
  smtpserver: testSmtpServer | undefined;
}
const commander = new Command();

commander
  .version(process.env.npm_package_version || "1.0.0")
  .usage("[options]")
  .description(`Run tests for ${process.env.npm_package_name}`)
  .option("--debug", "Trace extra scum messages")
  .option("--port <number>", "port to use for SMTP server.", undefined)
  .option("--host <host>", "SMTP server host name or IP address.", "localhost")
  .option("--timeout <number>", "mail queue scan interval to reply.", "10")
  .requiredOption("--mail <dir>", "location of mail repo.")
  .parse(process.argv);

interface commanderOptions {
  debug: boolean | undefined;
  port: number | undefined;
  mail: string;
  timeout: string;
}

const commandOptions = commander.opts<commanderOptions>();

const git: SimpleGit = simpleGit(commandOptions.mail);
const mailOpts: mailOptions = {
  git: git,
  file: `1`,
  repoDir: `${commandOptions.mail}`,
  seenMail: 0,
  repliedMail: 0,
  smtpserver: undefined,
};

(async (): Promise<void> => {
  const serverOptions: testSmtpServerOptions= { // <mailOptions> = {
    // emailHandler: processMail,
    // userObject: mailOpts,
    debug: commandOptions.debug ? console.log : undefined,
  };

  const smtpserver = new testSmtpServer(serverOptions);
  smtpserver.startServer(); // start listening
  console.log(`Listening on port ${smtpserver.getPort()}`);

  mailOpts.smtpserver = smtpserver;
  let terminating = false;

  ["SIGTERM", "SIGINT"].forEach((sig) =>
    process.on(sig, () => {
      console.log("Shutting down...");
      smtpserver.stopServer(); // terminate server
      terminating = true;
    })
  );

  const timeoutMS: number = parseInt(commandOptions.timeout);

  try {
    for await (const opts of setInterval(timeoutMS * 1000, mailOpts)) {
      await timeout(opts);
      if (terminating) {
        throw new Error("Terminating by request");
      }
    }
  } catch (error) {
    if (!terminating) {
      throw error;
    }
  }
})().catch((reason: Error) => {
  console.log(`Caught error ${reason}:\n${reason.stack}\n`);
  process.exit(1);
});

async function timeout(options: mailOptions): Promise<void> {
  const mails = options.smtpserver?.getEmails();

  if (mails && mails.length) {
    for (const email of mails.slice(options.repliedMail)) {
      await gitUpdate(options, email.buffer!, "New email");
      options.seenMail++;
    }

    for (const mail of mails.slice(options.repliedMail, options.seenMail)) {
      console.log(`Checking mail entry <${options.repliedMail}>`);
      console.log(mail.envelope);
      const parsed = await mail.getParsed();
      console.log(JSON.stringify(parsed, null, 2));

      const builder = new MailComposer(buildReply(parsed));
      const buff = await builder.compile().build();
      await gitUpdate(options, buff, ["Update", "Reply"]);
      options.repliedMail++;
    }
  } else {
    console.log(Date());
  }
}

/*
function processMail(options: mailOptions, email: eMail): boolean {
  gitUpdate(options, email.buffer!, "New email");
  options.seenMail++;

  return true;
}
*/

/**
 * Add email to the repo.
 *
 * @param options mailOptions
 * @param buff Buffer containing email
 * @param message git commit message
 */
async function gitUpdate(options: mailOptions, buff: Buffer, message: string | string[]): Promise<void> {
  const fd = fs.openSync(`${options.repoDir}/${options.file}`, "w");
  const email = buff.toString('utf-8');

  fs.writeSync(fd, email.replace(/\r\n/g, "\n"));
  fs.closeSync(fd);

  await options.git.add(options.file);
  await options.git.commit(message);
}

/**
 * Build a reply email from an original email.
 * @param parsed parsed email
 * @returns simple reply
 */
function buildReply(parsed: ParsedMail): Mail.Options {
  const options: Mail.Options = {};

  options.from = "Code Bot<bot@example.com>";
  options.sender = "Code Bot<bot@example.com>";
  options.to = `<${(<AddressObject>parsed.to!).value[0].address}>`;
  options.replyTo = `<${(<AddressObject>parsed.to!).value[0].address}>`;
  options.inReplyTo = getHeader(parsed.headerLines, "message-id");
  options.subject = parsed.subject;
  options.text = `This email is being reviewed.\n\n   ${parsed.text!.replace(
    /\n/g,
    "\n   "
  )}`;

  return options;
}

/**
 * Get a header key value.
 * @param headers array from parsed email
 * @param key name of key value
 * @returns header line value
 */
function getHeader(headers: HeaderLines, key: string): string {
  for (const entry of headers) {
    if (entry.key === key) {
      const value = entry.line.match(/: (.*)/);
      if (!value) {
         throw new Error(`Unexpected line: ${entry.line}`);
      }

      return value[1];
    }
  }

  throw new Error(`Requested key "${key}" not found`);
}
