import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  checkOrigin,
  readJson,
  validateCloudSave,
  parseCloudWorkspace,
} from "../lib/cloud-contract.ts";
import { workspaceRequest } from "../lib/cloud-service.ts";
import { authInput } from "../lib/auth-contract.ts";

test("shared-project Auth cannot create users, reset passwords or modify the original accounts", () => {
  for (const action of [
    "signup",
    "reset",
    "password",
    "updateUser",
    "invite",
  ]) {
    assert.throws(
      () =>
        authInput({
          action,
          email: "test@example.invalid",
          password: "synthetic-password",
        }),
      { status: 403 },
    );
  }
  assert.deepEqual(authInput({ action: "signout", scope: "global" }), {
    action: "signout",
  });
  assert.throws(
    () => authInput({ action: "signin", email: "bad", password: "x" }),
    { status: 422 },
  );
});

test("CSRF accepts the browser destination behind Next's internal hostname but rejects other origins", () => {
  const proxy = (origin) =>
    new Request("http://localhost:3000/api/auth", {
      method: "POST",
      headers: {
        host: "preview.example",
        "x-forwarded-proto": "https",
        origin,
      },
    });
  assert.doesNotThrow(() => checkOrigin(proxy("https://preview.example")));
  assert.throws(() => checkOrigin(proxy("https://untrusted.example")), {
    status: 403,
  });
  assert.throws(() => checkOrigin(proxy("http://preview.example")), {
    status: 403,
  });
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://preview.example/api/auth", { method: "POST" }),
      ),
    { status: 403 },
  );
});

const id = "10000000-0000-4000-8000-000000000001";
const stranger = "10000000-0000-4000-8000-000000000002";
const editor = "10000000-0000-4000-8000-000000000003";
const viewer = "10000000-0000-4000-8000-000000000004";
const document = {
  proposals: [],
  customers: [],
  company: {
    name: "Synthetic workspace",
    address: "",
    phone: "",
    email: "",
    taxId: "",
  },
};
const request = (value, method = "PUT", origin = "https://test.example") =>
  new Request("https://test.example/api/workspace", {
    method,
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(value),
  });

test("cloud requests reject cross-origin mutations and oversized chunked bodies", async () => {
  assert.throws(
    () => checkOrigin(request({}, "POST", "https://untrusted.example")),
    { status: 403 },
  );
  await assert.rejects(readJson(request({ x: "0123456789" }), 8), {
    status: 413,
  });
  await assert.rejects(
    readJson(
      new Request("https://test.example", { method: "POST", body: "{}" }),
    ),
    { status: 415 },
  );
  assert.throws(() => validateCloudSave({ id, revision: 0, document }), {
    status: 400,
  });
  assert.throws(
    () =>
      validateCloudSave({
        id,
        revision: 1,
        document: { ...document, proposals: [{}] },
      }),
    { status: 422 },
  );
  assert.throws(
    () =>
      parseCloudWorkspace({ id, revision: 1, document, role: "superadmin" }),
    { status: 502 },
  );
});

test("workspace service never trusts a client actor/role and rejects anonymous, unconfirmed and viewer writes", async () => {
  let savedBy;
  const operations = {
    identity: async () => ({
      id,
      email: "synthetic@example.invalid",
      confirmed: true,
    }),
    access: async () => ({ id, role: "editor" }),
    save: async (actor) => {
      savedBy = actor.id;
      return { revision: 2 };
    },
  };
  await workspaceRequest(
    request({ id, revision: 1, document, actor: stranger, role: "owner" }),
    operations,
  );
  assert.equal(savedBy, id);
  await assert.rejects(
    workspaceRequest(request({ id, revision: 1, document }), {
      ...operations,
      access: async () => ({ id, role: "viewer" }),
    }),
    { status: 403 },
  );
  await assert.rejects(
    workspaceRequest(request({ id, revision: 1, document }), {
      ...operations,
      identity: async () => {
        throw Object.assign(new Error("not signed in"), { status: 401 });
      },
    }),
    { status: 401 },
  );
  await assert.rejects(
    workspaceRequest(request({ id, revision: 1, document }), {
      ...operations,
      identity: async () => ({ id, confirmed: false }),
    }),
    { status: 403 },
  );
  await assert.rejects(
    workspaceRequest(
      request(
        { id, action: "invite", email: "a@example.invalid", role: "owner" },
        "POST",
      ),
      { ...operations, access: async () => ({ id, role: "owner" }) },
    ),
    { status: 422 },
  );
});

test("cloud onboarding starts empty and never silently uploads local/demo records", async () => {
  let created;
  await workspaceRequest(
    request(
      {
        action: "create",
        name: "New team",
        document: { secret: "must not be used" },
      },
      "POST",
    ),
    {
      identity: async () => ({ id, confirmed: true }),
      create: async (actor, name, data) => {
        created = { actor, name, data };
      },
    },
  );
  assert.deepEqual(created.data.proposals, []);
  assert.deepEqual(created.data.customers, []);
  assert.equal(created.data.company.name, "New team");
  assert.equal(created.data.secret, undefined);
});

test("Postgres enforces workspace isolation, write permissions, revisions, invite use and immutable audits", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`);
    for (const user of [id, stranger, editor, viewer])
      await db.query("insert into auth.users values($1)", [user]);
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(directory))
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(new URL(file, directory), "utf8"));
    }
    await db.exec("set role service_role");
    const created = await db.query(
      "select public.sd_v2_create_workspace($1,$2,$3) as id",
      [id, "Synthetic team", document],
    );
    const workspace = created.rows[0].id;
    const asUser = async (user) => {
      await db.exec("reset role; set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
    };
    const asWriter = async () => {
      await db.exec("reset role; set role service_role");
    };
    await t.test(
      "RLS hides other organizations and anonymous users cannot select",
      async () => {
        await asUser(stranger);
        assert.equal(
          (await db.query("select * from public.sd_v2_workspaces")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.sd_v2_audit")).rows.length,
          0,
        );
        await asUser(id);
        assert.equal(
          (await db.query("select * from public.sd_v2_workspaces")).rows.length,
          1,
        );
        await db.exec("reset role; set role anon");
        await assert.rejects(
          db.query("select * from public.sd_v2_workspaces"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "signed-in users cannot bypass validated server writes through Data API or RPC",
      async () => {
        await asUser(id);
        await assert.rejects(
          db.query("update public.sd_v2_workspaces set revision=42"),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,1,$3)", [
            id,
            workspace,
            document,
          ]),
          /permission denied/,
        );
        await assert.rejects(
          db.query(
            "insert into public.sd_v2_members values($1,$2,'owner',true,now())",
            [workspace, stranger],
          ),
          /permission denied/,
        );
        await assert.rejects(
          db.query("delete from public.sd_v2_audit"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "database rechecks roles, advances one revision and rejects stale/null revisions without extra audit entries",
      async () => {
        await asWriter();
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,1,$3)", [
            stranger,
            workspace,
            document,
          ]),
          /not permitted/,
        );
        const saved = await db.query(
          "select public.sd_v2_save_workspace($1,$2,1,$3) as revision",
          [id, workspace, document],
        );
        assert.equal(saved.rows[0].revision, 2);
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,1,$3)", [
            id,
            workspace,
            document,
          ]),
          /revision conflict/,
        );
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,null,$3)", [
            id,
            workspace,
            document,
          ]),
          /revision conflict/,
        );
        assert.equal(
          (
            await db.query(
              "select * from public.sd_v2_audit where event='saved'",
            )
          ).rows.length,
          1,
        );
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,2,$3)", [
            id,
            workspace,
            {},
          ]),
          /check constraint/,
        );
        assert.equal(
          (await db.query("select revision from public.sd_v2_workspaces"))
            .rows[0].revision,
          2,
        );
      },
    );
    await t.test(
      "invites are email-bound, single-use and cannot grant ownership; viewers cannot save",
      async () => {
        await asWriter();
        const tokenHash = "1".repeat(64);
        await assert.rejects(
          db.query("select public.sd_v2_invite($1,$2,$3,'owner',$4)", [
            id,
            workspace,
            "viewer@example.invalid",
            tokenHash,
          ]),
          /invalid invite/,
        );
        await db.query("select public.sd_v2_invite($1,$2,$3,'viewer',$4)", [
          id,
          workspace,
          "viewer@example.invalid",
          tokenHash,
        ]);
        await assert.rejects(
          db.query("select public.sd_v2_accept_invite($1,$2,$3)", [
            stranger,
            "other@example.invalid",
            tokenHash,
          ]),
          /invalid invite/,
        );
        await db.query("select public.sd_v2_accept_invite($1,$2,$3)", [
          viewer,
          "viewer@example.invalid",
          tokenHash,
        ]);
        await assert.rejects(
          db.query("select public.sd_v2_accept_invite($1,$2,$3)", [
            viewer,
            "viewer@example.invalid",
            tokenHash,
          ]),
          /invalid invite/,
        );
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,2,$3)", [
            viewer,
            workspace,
            document,
          ]),
          /not permitted/,
        );
        await asUser(viewer);
        assert.equal(
          (await db.query("select * from public.sd_v2_workspaces")).rows.length,
          1,
        );
        await assert.rejects(
          db.query("select * from public.sd_v2_invites"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "owner can promote or revoke members and database permissions change immediately",
      async () => {
        await asWriter();
        await assert.rejects(
          db.query("select public.sd_v2_set_role($1,$2,$3,'editor',true)", [
            viewer,
            workspace,
            viewer,
          ]),
          /not permitted/,
        );
        await db.query("select public.sd_v2_set_role($1,$2,$3,'editor',true)", [
          id,
          workspace,
          viewer,
        ]);
        await db.query("select public.sd_v2_save_workspace($1,$2,2,$3)", [
          viewer,
          workspace,
          document,
        ]);
        await db.query(
          "select public.sd_v2_set_role($1,$2,$3,'viewer',false)",
          [id, workspace, viewer],
        );
        await assert.rejects(
          db.query("select public.sd_v2_save_workspace($1,$2,3,$3)", [
            viewer,
            workspace,
            document,
          ]),
          /not permitted/,
        );
        await asUser(viewer);
        assert.equal(
          (await db.query("select * from public.sd_v2_workspaces")).rows.length,
          0,
        );
        await asWriter();
        await assert.rejects(
          db.query("select public.sd_v2_set_role($1,$2,$3,'viewer',false)", [
            id,
            workspace,
            id,
          ]),
          /not permitted/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
