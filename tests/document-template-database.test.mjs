import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("private template storage denies direct clients and server writes, verifies digests and preserves old versions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261026044232_solardesk_private_document_templates.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const versions = ["synthetic template v1", "synthetic template v2"].map(
      (text) => ({
        sha: createHash("sha256").update(text).digest("hex"),
        encoded: Buffer.from(text).toString("base64"),
      }),
    );
    for (const version of versions)
      await db.query(
        "insert into public.sd_v2_document_templates(id,sha256,content_base64) values($1,$2,$3)",
        ["approval", version.sha, version.encoded],
      );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from public.sd_v2_document_templates",
        )
      ).rows[0].n,
      2,
    );
    await assert.rejects(
      db.query(
        "insert into public.sd_v2_document_templates(id,sha256,content_base64) values($1,$2,$3)",
        ["corrupt", "0".repeat(64), versions[0].encoded],
      ),
      /digest|check constraint/i,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from public.sd_v2_document_templates"),
        /permission denied/i,
      );
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.equal(
      (
        await db.query(
          "select sha256 from public.sd_v2_document_templates order by sha256",
        )
      ).rows.length,
      2,
    );
    await assert.rejects(
      db.exec("update public.sd_v2_document_templates set id='changed'"),
      /permission denied/i,
    );
    await assert.rejects(
      db.query(
        "insert into public.sd_v2_document_templates(id,sha256,content_base64) values($1,$2,$3)",
        ["new", versions[0].sha, versions[0].encoded],
      ),
      /permission denied/i,
    );
    await db.exec("reset role");
    const flags = (
      await db.query(
        "select relrowsecurity,relforcerowsecurity from pg_class where oid='public.sd_v2_document_templates'::regclass",
      )
    ).rows[0];
    assert.deepEqual(flags, {
      relrowsecurity: true,
      relforcerowsecurity: true,
    });
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from pg_policies where tablename='sd_v2_document_templates'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
