import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { properties } from "@/db/schema";

const details = {
  name: "צימר הגליל",
  address: "רחוב הזית 3, ראש פינה",
  phone: "+972501234567",
};

// Postgres reports a broken rule as an error whose cause holds the SQL state
// code: 23502 = a required value is missing, 23514 = a check failed,
// 22P02 = a value the column type doesn't accept (such as an unknown enum value).
async function postgresErrorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
  throw new Error("Expected the database to reject this, but it was saved");
}

beforeEach(async () => {
  await db.execute(sql`truncate table properties cascade`);
});

describe("properties table", () => {
  it("saves a property with only the onboarding details, filling in the rest", async () => {
    const [saved] = await db.insert(properties).values(details).returning();

    expect(saved.name).toBe(details.name);
    expect(saved.address).toBe(details.address);
    expect(saved.phone).toBe(details.phone);
    // Usual zimmer times, so the owner can skip this step
    expect(saved.checkInTime).toBe("15:00:00");
    expect(saved.checkOutTime).toBe("11:00:00");
    // Filled in later from Settings
    expect(saved.businessType).toBeNull();
    expect(saved.logoKey).toBeNull();
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeInstanceOf(Date);
  });

  it("gives each property a random, unguessable id", async () => {
    const [first] = await db.insert(properties).values(details).returning();
    const [second] = await db.insert(properties).values(details).returning();

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(first.id).toMatch(uuid);
    expect(second.id).toMatch(uuid);
    expect(first.id).not.toBe(second.id);
  });

  it("accepts both business types", async () => {
    const saved = await db
      .insert(properties)
      .values([
        { ...details, businessType: "osek_patur" },
        { ...details, businessType: "osek_murshe" },
      ])
      .returning();

    expect(saved.map((p) => p.businessType)).toEqual([
      "osek_patur",
      "osek_murshe",
    ]);
  });

  it("rejects any other business type", async () => {
    // Raw SQL, because TypeScript already refuses this value in normal code
    const code = await postgresErrorCode(
      db.execute(sql`
        insert into properties (name, address, phone, business_type)
        values ('x', 'x', 'x', 'company')
      `),
    );
    expect(code).toBe("22P02");
  });

  it.each(["name", "address", "phone"] as const)(
    "requires a %s",
    async (field) => {
      const code = await postgresErrorCode(
        db
          .insert(properties)
          .values({ ...details, [field]: null as unknown as string }),
      );
      expect(code).toBe("23502");
    },
  );

  it.each(["name", "address", "phone"] as const)(
    "rejects a %s that is empty or only spaces",
    async (field) => {
      for (const blank of ["", "   "]) {
        const code = await postgresErrorCode(
          db.insert(properties).values({ ...details, [field]: blank }),
        );
        expect(code).toBe("23514");
      }
    },
  );

  it("updates updatedAt when a property changes, but not createdAt", async () => {
    // Start from an old date, so "later" can't be mistaken for the same moment
    const longAgo = new Date("2020-01-01T00:00:00Z");
    const [saved] = await db
      .insert(properties)
      .values({ ...details, createdAt: longAgo, updatedAt: longAgo })
      .returning();

    const [changed] = await db
      .update(properties)
      .set({ name: "צימר הכרמל" })
      .where(sql`${properties.id} = ${saved.id}`)
      .returning();

    expect(changed.createdAt).toEqual(longAgo);
    expect(changed.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });
});
