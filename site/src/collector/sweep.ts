// The status check: opt-outs of people already published, without collecting their country again.
// A country's own collection reads every candidate's status; a country that keeps failing never does, so the
// people it still shows are checked here at the start of every run.
import { z } from "zod";
import type { CountryData } from "./country-data.ts";
import { type GitHubGraphQL, RATE_LIMIT } from "./github.ts";
import { decide } from "./optout.ts";

export type Published = { readonly id: number; readonly login: string };

/** Logins per request, like the status lookups during collection. */
const BATCH = 50;
/** People checked per run at most: about 100 requests, a few minutes, so a long outage cannot eat the run. */
export const MAX_CHECKED = 5000;

/**
 * Everyone published in these countries (oldest country first), once each, at most `max`. Fictional fixture
 * rows (id ≤ 0) and people already on the opt-out list are left out.
 */
export function publishedPeople(
  countries: readonly CountryData[],
  skip: (id: number) => boolean,
  max = MAX_CHECKED,
): Published[] {
  const seen = new Map<number, Published>();
  for (const country of countries) {
    for (const row of Object.values(country.tabs).flat()) {
      if (seen.size >= max) return [...seen.values()];
      if (row.id > 0 && !seen.has(row.id) && !skip(row.id)) seen.set(row.id, { id: row.id, login: row.login });
    }
  }
  return [...seen.values()];
}

const userSchema = z.object({
  databaseId: z.number().int(),
  status: z.object({ message: z.string().nullable() }).nullable(),
});

/**
 * IDs of the people whose status now opts out. Looked up by login, the only handle the published data keeps; a
 * login that now belongs to someone else (renamed, then taken) does not match the ID and is ignored, as is a
 * login that no longer exists. Their country's next collection reads them by ID anyway.
 */
export async function optedOutByStatus(
  client: GitHubGraphQL,
  people: readonly Published[],
  phrases: { readonly optout: string; readonly optin: string },
): Promise<number[]> {
  const optedOut: number[] = [];
  for (let i = 0; i < people.length; i += BATCH) {
    const batch = people.slice(i, i + BATCH);
    // Logins go in as variables, never into the query text.
    const query = `query(${batch.map((_, j) => `$l${j}: String!`).join(", ")}) {
      ${batch.map((_, j) => `u${j}: user(login: $l${j}) { databaseId status { message } }`).join("\n      ")}
      ${RATE_LIMIT}
    }`;
    const variables = Object.fromEntries(batch.map((p, j) => [`l${j}`, p.login]));
    // Unknown logins come back as null with a NOT_FOUND error: expected, not a failure.
    const { data } = await client.query<Record<string, unknown>>(query, variables);
    for (const [j, person] of batch.entries()) {
      const user = userSchema.safeParse(data?.[`u${j}`]);
      if (!user.success || user.data.databaseId !== person.id) continue;
      if (decide(user.data.status?.message, phrases.optout, phrases.optin) === "opt-out") optedOut.push(person.id);
    }
  }
  return optedOut;
}
