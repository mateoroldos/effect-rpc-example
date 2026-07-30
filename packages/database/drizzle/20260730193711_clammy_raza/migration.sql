CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY,
	"name" varchar(200) NOT NULL,
	CONSTRAINT "agents_name_not_blank" CHECK (length(btrim("name")) > 0)
);
