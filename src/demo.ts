export const DEMO_DIFF = `diff --git a/src/auth/session.ts b/src/auth/session.ts
index 17cc418..72636ad 100644
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -8,9 +8,15 @@ export async function createSession(userId: string) {
-  const token = crypto.randomUUID();
+  const token = Math.random().toString(36);
+  console.log("creating session", userId, token);
   await db.sessions.create({ userId, token });
   return token;
 }
+
+export async function findUser(email: string) {
+  return db.query("SELECT * FROM users WHERE email = '" + email + "'");
+}
diff --git a/src/api/export.ts b/src/api/export.ts
index bdb0281..542b1f3 100644
--- a/src/api/export.ts
+++ b/src/api/export.ts
@@ -12,6 +12,12 @@ export async function exportReport(req: Request) {
   const payload = await req.json();
+  const apiKey = "sk-example-hardcoded-key-123456789";
+  try {
+    const output = eval(payload.transform);
+    return Response.json({ output });
+  } catch (error) {}
+
   return Response.json({ status: "queued" });
 }`;
