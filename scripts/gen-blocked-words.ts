/**
 * Writes supabase/blocked-words.sql, the starter list for the AI Team board's block list.
 * The words come from the `cuss` package (MIT, https://github.com/words/cuss), which rates each entry by how
 * sure it is to be profanity. Only the highest rating ("very likely profanity") is used, because the board
 * blocks outright and a wrong guess turns away a real student. Run `npm run block-words` to rebuild it.
 */
import { writeFileSync } from "node:fs";
import { cuss } from "cuss";

const words = Object.entries(cuss)
  .filter(([, sureness]) => sureness === 2)
  .map(([w]) => w.toLowerCase().trim())
  .filter((w) => w.length >= 2 && /^[a-z0-9' -]+$/.test(w))
  .sort();
const unique = [...new Set(words)];

const rows = unique.map((w) => `('${w.replace(/'/g, "''")}')`);
const chunks: string[] = [];
for (let i = 0; i < rows.length; i += 200) chunks.push(`insert into board_blocked_words (word) values\n${rows.slice(i, i + 200).join(",\n")}\non conflict do nothing;`);

writeFileSync(
  new URL("../supabase/blocked-words.sql", import.meta.url),
  `-- Starter block list for the AI Team board: ${unique.length} English words and phrases.
-- Source: the "cuss" package (MIT, https://github.com/words/cuss), entries rated "very likely profanity" only.
-- Run once in the Supabase SQL editor after schema.sql; it is safe to run again. Edit the table afterwards:
-- delete a word that turns away a real name, or add your own. Rebuild with: npm run block-words
-- Words are matched whole (so "class" is fine), after look-alikes like 0 for o and @ for a are swapped back.
-- This is a starting point, not a complete list: it is English only, and people find ways round any list.

${chunks.join("\n\n")}
`,
);
console.log(`Wrote ${unique.length} words.`);
