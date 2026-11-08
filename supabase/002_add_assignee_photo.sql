BEGIN;

-- 只新增缺少的欄位。既有紀錄的新欄位可以是 NULL，無須回填。
ALTER TABLE public.repair_requests
    ADD COLUMN IF NOT EXISTS assignee text,
    ADD COLUMN IF NOT EXISTS photo_url text;

-- 既有的資料表讀取權限與 RLS 政策繼續適用。
GRANT INSERT (assignee, photo_url) ON TABLE public.repair_requests TO anon;

COMMIT;
