CREATE TABLE "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"clerk_invitation_id" varchar(255),
	"email" text NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "project_invitations_clerk_invitation_id_unique" UNIQUE("clerk_invitation_id")
);
--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "fk_project_members_project_team";
--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "fk_project_members_responsibility_team";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_clerk_organization_id_unique";
--> statement-breakpoint
DROP INDEX "projects_team_id_idx";
--> statement-breakpoint
DROP INDEX "projects_team_id_id_unique";
--> statement-breakpoint
DROP INDEX "teams_created_by_id_idx";
--> statement-breakpoint
DROP INDEX "projects_active_idx";
--> statement-breakpoint
DROP INDEX "teams_active_idx";
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "access_role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "access_role" SET DATA TYPE text USING "access_role"::text;
--> statement-breakpoint
UPDATE "project_members" SET "access_role" = 'owner' WHERE "access_role" = 'manager';
--> statement-breakpoint
DROP TYPE "public"."project_access_role";
--> statement-breakpoint
CREATE TYPE "public"."project_access_role" AS ENUM('owner', 'member');
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "access_role" SET DATA TYPE "public"."project_access_role" USING "access_role"::"public"."project_access_role";
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "access_role" SET DEFAULT 'member'::"public"."project_access_role";
--> statement-breakpoint
INSERT INTO "project_members" (
	"project_id",
	"user_id",
	"access_role",
	"team_id",
	"responsibility_id",
	"added_by_id",
	"created_at",
	"updated_at"
)
SELECT
	"projects"."id",
	"projects"."created_by_id",
	'owner'::"public"."project_access_role",
	"projects"."team_id",
	NULL,
	"projects"."created_by_id",
	"projects"."created_at",
	"projects"."updated_at"
FROM "projects"
ON CONFLICT ("project_id", "user_id") DO UPDATE
SET "access_role" = 'owner'::"public"."project_access_role",
	"updated_at" = now();
--> statement-breakpoint
UPDATE "project_members" AS "membership"
SET "access_role" = 'member'::"public"."project_access_role",
	"updated_at" = now()
FROM "projects" AS "project"
WHERE "membership"."project_id" = "project"."id"
	AND "membership"."user_id" <> "project"."created_by_id"
	AND "membership"."access_role" = 'owner'::"public"."project_access_role";
--> statement-breakpoint
INSERT INTO "project_members" (
	"project_id",
	"user_id",
	"access_role",
	"team_id",
	"responsibility_id",
	"added_by_id",
	"created_at",
	"updated_at"
)
SELECT
	"project"."id",
	"team_member"."user_id",
	CASE
		WHEN "team_member"."user_id" = "project"."created_by_id"
			THEN 'owner'::"public"."project_access_role"
		ELSE 'member'::"public"."project_access_role"
	END,
	"project"."team_id",
	NULL,
	"project"."created_by_id",
	"team_member"."joined_at",
	now()
FROM "projects" AS "project"
INNER JOIN "team_members" AS "team_member"
	ON "team_member"."team_id" = "project"."team_id"
WHERE "team_member"."status" = 'active'
ON CONFLICT ("project_id", "user_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "project_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
	CREATE TEMPORARY TABLE "_project_team_map" (
		"project_id" uuid PRIMARY KEY,
		"old_team_id" uuid,
		"new_team_id" uuid NOT NULL UNIQUE,
		"member_count" integer NOT NULL
	) ON COMMIT DROP;

	INSERT INTO "_project_team_map" (
		"project_id",
		"old_team_id",
		"new_team_id",
		"member_count"
	)
	WITH "project_counts" AS (
		SELECT
			"project"."id" AS "project_id",
			"project"."team_id" AS "old_team_id",
			count("membership"."user_id")::integer AS "member_count",
			row_number() OVER (
				PARTITION BY "project"."team_id"
				ORDER BY "project"."created_at", "project"."id"
			) AS "old_team_rank"
		FROM "projects" AS "project"
		LEFT JOIN "project_members" AS "membership"
			ON "membership"."project_id" = "project"."id"
		GROUP BY "project"."id", "project"."team_id", "project"."created_at"
	)
	SELECT
		"project_id",
		"old_team_id",
		CASE
			WHEN "old_team_id" IS NOT NULL AND "old_team_rank" = 1
				THEN "old_team_id"
			ELSE gen_random_uuid()
		END,
		"member_count"
	FROM "project_counts"
	WHERE "old_team_id" IS NOT NULL OR "member_count" >= 2;

	UPDATE "teams" AS "team"
	SET
		"project_id" = "mapping"."project_id",
		"status" = CASE
			WHEN "mapping"."member_count" >= 2
				AND "project"."archived_at" IS NULL
				AND "project"."deleted_at" IS NULL
				THEN 'active'::"public"."team_status"
			ELSE 'archived'::"public"."team_status"
		END,
		"archived_at" = CASE
			WHEN "mapping"."member_count" >= 2
				AND "project"."archived_at" IS NULL
				AND "project"."deleted_at" IS NULL
				THEN NULL
			ELSE coalesce("project"."archived_at", "team"."archived_at", now())
		END,
		"deleted_at" = "project"."deleted_at",
		"updated_at" = now()
	FROM "_project_team_map" AS "mapping"
	INNER JOIN "projects" AS "project"
		ON "project"."id" = "mapping"."project_id"
	WHERE "mapping"."old_team_id" = "mapping"."new_team_id"
		AND "team"."id" = "mapping"."new_team_id";

	INSERT INTO "teams" (
		"id",
		"clerk_organization_id",
		"name",
		"description",
		"created_by_id",
		"status",
		"created_at",
		"updated_at",
		"archived_at",
		"deleted_at",
		"project_id"
	)
	SELECT
		"mapping"."new_team_id",
		NULL,
		"project"."name",
		"project"."description",
		"project"."created_by_id",
		CASE
			WHEN "mapping"."member_count" >= 2
				AND "project"."archived_at" IS NULL
				AND "project"."deleted_at" IS NULL
				THEN 'active'::"public"."team_status"
			ELSE 'archived'::"public"."team_status"
		END,
		coalesce("old_team"."created_at", "project"."created_at"),
		now(),
		CASE
			WHEN "mapping"."member_count" >= 2
				AND "project"."archived_at" IS NULL
				AND "project"."deleted_at" IS NULL
				THEN NULL
			ELSE coalesce("project"."archived_at", "old_team"."archived_at", now())
		END,
		"project"."deleted_at",
		"mapping"."project_id"
	FROM "_project_team_map" AS "mapping"
	INNER JOIN "projects" AS "project"
		ON "project"."id" = "mapping"."project_id"
	LEFT JOIN "teams" AS "old_team"
		ON "old_team"."id" = "mapping"."old_team_id"
	WHERE "mapping"."old_team_id" IS NULL
		OR "mapping"."new_team_id" <> "mapping"."old_team_id";

	CREATE TEMPORARY TABLE "_responsibility_map" (
		"project_id" uuid NOT NULL,
		"old_responsibility_id" uuid NOT NULL,
		"new_responsibility_id" uuid NOT NULL UNIQUE,
		PRIMARY KEY ("project_id", "old_responsibility_id")
	) ON COMMIT DROP;

	INSERT INTO "_responsibility_map" (
		"project_id",
		"old_responsibility_id",
		"new_responsibility_id"
	)
	SELECT
		"mapping"."project_id",
		"responsibility"."id",
		gen_random_uuid()
	FROM "_project_team_map" AS "mapping"
	INNER JOIN "team_responsibilities" AS "responsibility"
		ON "responsibility"."team_id" = "mapping"."old_team_id"
	WHERE "mapping"."old_team_id" IS NOT NULL
		AND "mapping"."new_team_id" <> "mapping"."old_team_id";

	INSERT INTO "team_responsibilities" (
		"id",
		"team_id",
		"name",
		"created_by_id",
		"created_at",
		"updated_at"
	)
	SELECT
		"responsibility_mapping"."new_responsibility_id",
		"team_mapping"."new_team_id",
		"responsibility"."name",
		"responsibility"."created_by_id",
		"responsibility"."created_at",
		now()
	FROM "_responsibility_map" AS "responsibility_mapping"
	INNER JOIN "_project_team_map" AS "team_mapping"
		ON "team_mapping"."project_id" = "responsibility_mapping"."project_id"
	INNER JOIN "team_responsibilities" AS "responsibility"
		ON "responsibility"."id" = "responsibility_mapping"."old_responsibility_id";

	UPDATE "project_members" AS "membership"
	SET "responsibility_id" = "responsibility_mapping"."new_responsibility_id"
	FROM "_responsibility_map" AS "responsibility_mapping"
	WHERE "membership"."project_id" = "responsibility_mapping"."project_id"
		AND "membership"."responsibility_id" = "responsibility_mapping"."old_responsibility_id";

	DELETE FROM "teams" AS "team"
	WHERE NOT EXISTS (
		SELECT 1
		FROM "_project_team_map" AS "mapping"
		WHERE "mapping"."new_team_id" = "team"."id"
	);
END $$;
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "permissions" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "role_permissions" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_invitations" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_members" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_roles" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "permissions" CASCADE;
--> statement-breakpoint
DROP TABLE "role_permissions" CASCADE;
--> statement-breakpoint
DROP TABLE "team_invitations" CASCADE;
--> statement-breakpoint
DROP TABLE "team_members" CASCADE;
--> statement-breakpoint
DROP TABLE "team_roles" CASCADE;
--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "project_invitations_project_id_idx" ON "project_invitations" USING btree ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_pending_email_unique" ON "project_invitations" USING btree ("project_id", lower("email")) WHERE "project_invitations"."status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_one_owner_unique" ON "project_members" USING btree ("project_id") WHERE "project_members"."access_role" = 'owner';
--> statement-breakpoint
CREATE UNIQUE INDEX "teams_project_id_unique" ON "teams" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "projects_active_idx" ON "projects" USING btree ("created_by_id") WHERE "projects"."deleted_at" is null and "projects"."archived_at" is null;
--> statement-breakpoint
CREATE INDEX "teams_active_idx" ON "teams" USING btree ("project_id") WHERE "teams"."deleted_at" is null and "teams"."archived_at" is null;
--> statement-breakpoint
ALTER TABLE "project_members" DROP COLUMN "team_id";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "team_id";
--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "clerk_organization_id";
--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "name";
--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "created_by_id";
--> statement-breakpoint
DROP TYPE "public"."membership_status";
