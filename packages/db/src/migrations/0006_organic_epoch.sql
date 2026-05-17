ALTER TABLE "user_collection_items" DROP CONSTRAINT "check_user_collection_items_target_type";--> statement-breakpoint
ALTER TABLE "user_collections" ADD COLUMN "item_type" text;--> statement-breakpoint
ALTER TABLE "user_collection_items" ADD CONSTRAINT "check_user_collection_items_target_type" CHECK ("target_type" IN ('circle','release','track','artist'));--> statement-breakpoint
ALTER TABLE "user_collections" ADD CONSTRAINT "check_user_collections_item_type" CHECK ("item_type" IS NULL OR "item_type" IN ('track','release','circle','artist'));--> statement-breakpoint
-- 既存コレクションの itemType を最初のアイテムの targetType から推論
UPDATE user_collections uc
SET item_type = sub.target_type
FROM (
  SELECT DISTINCT ON (collection_id) collection_id, target_type
  FROM user_collection_items
  ORDER BY collection_id, added_at ASC
) sub
WHERE uc.id = sub.collection_id AND uc.is_default_liked = false;