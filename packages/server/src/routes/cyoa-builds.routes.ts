import type { FastifyInstance } from "fastify";
import { eq, desc } from "../db/file-query.js";
import { newId, now } from "../utils/id-generator.js";
import { cyoaDocuments, cyoaBuilds } from "../db/schema/index.js";

function parseBuild(row: any) {
  return {
    ...row,
    selectedChoiceIds: JSON.parse(row.selectedChoiceIds || "[]"),
  };
}

export async function cyoaBuildsRoutes(app: FastifyInstance) {
  app.get<{ Params: { docId: string } }>("/:docId/builds", async (req) => {
    const { docId } = req.params;
    const rows = await app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.documentId, docId))
      .orderBy(desc(cyoaBuilds.createdAt));
    return rows.map(parseBuild);
  });

  app.post<{ Params: { docId: string }; Body: { name?: string; description?: string; selectedChoiceIds?: string[]; notes?: string } }>(
    "/:docId/builds",
    async (req, reply) => {
      const { docId } = req.params;
      const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, docId));
      if (!docs[0]) return reply.status(404).send({ error: "Document not found" });

      const timestamp = now();
      const id = newId();
      const selectedChoiceIds = Array.isArray(req.body?.selectedChoiceIds)
        ? JSON.stringify(req.body.selectedChoiceIds)
        : "[]";
      const build = {
        id,
        documentId: docId,
        name: req.body?.name ?? "",
        description: req.body?.description ?? "",
        selectedChoiceIds,
        notes: req.body?.notes ?? "",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await app.db.insert(cyoaBuilds).values(build).run();
      return parseBuild(build);
    },
  );

  app.get<{ Params: { docId: string; buildId: string } }>("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params;
    const rows = await app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId));
    const build = rows[0];
    if (!build || build.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }
    return parseBuild(build);
  });

  app.patch<{
    Params: { docId: string; buildId: string };
    Body: { name?: string; description?: string; selectedChoiceIds?: string[]; notes?: string };
  }>("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params;
    const rows = await app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId));
    const existing = rows[0];
    if (!existing || existing.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }

    const patch: Record<string, string> = { updatedAt: now() };
    if (req.body?.name !== undefined) patch.name = req.body.name;
    if (req.body?.description !== undefined) patch.description = req.body.description;
    if (req.body?.selectedChoiceIds !== undefined) {
      patch.selectedChoiceIds = JSON.stringify(req.body.selectedChoiceIds);
    }
    if (req.body?.notes !== undefined) patch.notes = req.body.notes;

    await app.db.update(cyoaBuilds).set(patch).where(eq(cyoaBuilds.id, buildId)).run();

    const updated = await app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId));
    return parseBuild(updated[0]);
  });

  app.delete<{ Params: { docId: string; buildId: string } }>("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params;
    const rows = await app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId));
    const existing = rows[0];
    if (!existing || existing.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }

    await app.db.delete(cyoaBuilds).where(eq(cyoaBuilds.id, buildId)).run();
    return { success: true };
  });
}
