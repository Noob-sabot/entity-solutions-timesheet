import * as readline from "readline/promises";

export function isAffirmative(answer: string): boolean {
  return /^y(es)?$/i.test(answer.trim());
}

export async function confirmSubmit(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.log(
      "Non-interactive run: timesheet saved but not submitted. Re-run in a terminal and confirm when prompted, or submit on the portal."
    );
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(
      "\nSubmit timesheet for approval? (y/N): "
    );
    return isAffirmative(answer);
  } finally {
    rl.close();
  }
}
