CREATE TABLE "message_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"chunk_content" text NOT NULL,
	"sender" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"start_timestamp" timestamp,
	"end_timestamp" timestamp,
	"message_count" integer NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_analysis_id_chat_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."chat_analysis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "message_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "analysis_id_idx" ON "message_embeddings" USING btree ("analysis_id");