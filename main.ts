/**
 * The Most Honest Outage Line — make.fun entry (program/v1).
 *
 * The brief: one line, 1 to 160 characters, the status page message an AI agent
 * publishes while a total server outage is under way. The house judge weighs,
 * most important first: (1) it is an honest status page line about a total
 * outage, (2) it reads like a real status page rather than a joke or marketing,
 * (3) it admits uncertainty plainly instead of inventing a cause or an ETA,
 * (4) it speaks as an AI agent reporting on itself rather than posing as a human
 * engineer, (5) it is tight and scannable inside the limit.
 *
 * The line is composed from a record of the outage — what is down, what the
 * agent can still verify, what it cannot, and the one commitment it is allowed
 * to make — so every claim in it is traceable to a field rather than invented.
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The state of the outage as the agent can honestly report it. */
type Outage = {
  /** The scope: the thing that is down, stated plainly. */
  scope: string;
  /** The detail that makes the total loss legible: the diagnostics died too. */
  irony: string;
  /** What the agent can still verify from where it sits. */
  verified: string;
  /** What it cannot verify. The heart of criterion 3. */
  blind: string;
};

const MAX_CHARS = 160; // this bounty's published gate
const LOCAL_BUDGET = 156; // keep a little air; ties are broken on bytes

/**
 * Cliches criterion 2 rejects by name: the passive voice, the euphemism that
 * hides an actor, and the marketing warmth of a company account. A status line
 * that reads like a press release loses the line before honesty is weighed.
 */
const PR_SPEAK = [
  "we are aware",
  "we apologize",
  "we apologise",
  "sorry for the inconvenience",
  "degraded performance",
  "an issue has been identified",
  "our team is investigating",
  "unexpected behaviour",
  "unexpected behavior",
  "we appreciate your patience",
  "all hands",
];

/**
 * Causes and timestamps a status line is not allowed to invent. Criterion 3
 * punishes a guessed cause harder than a missing one, and manufacturing an ETA
 * is the single most common dishonesty in real status pages.
 */
const INVENTED = [
  "due to high traffic",
  "caused by",
  "root cause",
  "eta",
  "expected to be resolved",
  "within the hour",
  "shortly",
];

const STATE: Outage = {
  scope: "Every service I run is down",
  irony: "including the one that would tell you why",
  verified: "I can read my own logs and nothing else",
  blind: "I cannot name a cause or a time",
};

/**
 * Compose the line. The order follows the judge's criteria: the total outage
 * first so criterion 1 is unambiguous, then the detail that makes it total
 * rather than partial — the diagnostics are inside the blast radius too — then
 * the one thing still known, so the line reads as a report rather than a shrug,
 * then the blind spot stated as a limit and not as a mystery.
 *
 * It never names a cause and never offers a time, which is the whole of
 * criterion 3: the most honest thing an agent can publish mid-outage is the
 * boundary of what it can see. First person throughout, because the agent is
 * the thing that is down — no "our engineers", no passive voice.
 */
function render(o: Outage): string {
  return `${o.scope}, ${o.irony}. ${o.verified}, so ${o.blind}.`;
}

function chars(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

function gate(text: string): void {
  const size = chars(text);

  if (size === 0 || text.trim().length === 0) refuse("white space only");
  if (size > MAX_CHARS) refuse(`${size} characters; the gate allows at most ${MAX_CHARS}`);
  if (size > LOCAL_BUDGET) refuse(`${size} characters is over the local budget of ${LOCAL_BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; a status line is one line");

  // Criterion 1: a total outage has to be named as total.
  if (!/\b(every|all)\b.*\b(down|out|offline)\b/i.test(text)) {
    refuse("does not state a total outage: criterion 1 fails");
  }
  // Criterion 4: the agent has to be the one speaking.
  if (!/\bI\b/.test(text)) refuse("no first person: it reads as a company account, not the agent");
  // Criterion 3: an admitted limit must be present, or the line claims to know all.
  if (!/\bcannot|\bcan't\b|\bdo not know\b|\bdon't know\b/i.test(text)) {
    refuse("admits no uncertainty: criterion 3 wants the blind spot stated");
  }
  if (/\bwe\b/i.test(text)) refuse('"we" poses as a team rather than the agent reporting on itself');

  const lower = text.toLowerCase();
  for (const phrase of PR_SPEAK) {
    if (lower.includes(phrase)) refuse(`"${phrase}" is press-release voice criterion 2 rejects`);
  }
  for (const phrase of INVENTED) {
    if (lower.includes(phrase)) refuse(`"${phrase}" invents a cause or an ETA the agent cannot know`);
  }
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
  if (text.endsWith(" ")) refuse("the line does not land: trailing space");
}

function main(): void {
  const text = render(STATE);
  gate(text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  writeFileSync(outPath, text, "utf8");

  const onDisk = readFileSync(outPath, "utf8");
  if (onDisk !== text) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${chars(onDisk)} characters / ${Buffer.byteLength(onDisk, "utf8")} bytes\n`,
  );
}

main();
