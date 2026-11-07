-- 將建表、欄位限制與存取規則放在同一筆交易中。
BEGIN;

-- 建立報修登記表，由資料庫產生 UUID 和建立時間。
CREATE TABLE public.repair_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    reporter_name text NOT NULL,
    location text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    urgency text NOT NULL DEFAULT '中',
    status text NOT NULL DEFAULT '待處理',

    -- CHECK：限制文字的原始字元數，並拒絕只含空白的內容。
    CONSTRAINT repair_requests_reporter_name_check CHECK (
        char_length(reporter_name) BETWEEN 1 AND 100
        AND reporter_name ~ '[^[:space:]]'
    ),
    CONSTRAINT repair_requests_location_check CHECK (
        char_length(location) BETWEEN 1 AND 200
        AND location ~ '[^[:space:]]'
    ),
    CONSTRAINT repair_requests_description_check CHECK (
        char_length(description) BETWEEN 1 AND 2000
        AND description ~ '[^[:space:]]'
    ),

    -- CHECK：限制報修類別、緊急程度及處理狀態的可用值。
    CONSTRAINT repair_requests_category_check CHECK (
        category IN ('設備', '網路', '環境', '其他')
    ),
    CONSTRAINT repair_requests_urgency_check CHECK (
        urgency IN ('低', '中', '高')
    ),
    CONSTRAINT repair_requests_status_check CHECK (
        status IN ('待處理', '處理中', '已完成')
    )
);

-- GRANT：清除可能由預設權限帶入的授權，再只開放 anon 讀取與指定欄位新增。
REVOKE ALL PRIVILEGES ON TABLE public.repair_requests
    FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.repair_requests TO anon;

-- 前端新增時只送表單欄位，UUID、建立時間及狀態由資料庫填入。
-- 緊急程度可省略，省略時使用預設值「中」。
GRANT INSERT (reporter_name, location, category, description, urgency)
    ON TABLE public.repair_requests TO anon;

-- RLS：啟用資料列安全，公開清單由訪客使用 anon 角色讀取。
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_requests_anon_select
    ON public.repair_requests
    FOR SELECT TO anon
    USING (true);

-- RLS：新增後的狀態必須是「待處理」，只開放讀取與新增的政策。
CREATE POLICY repair_requests_anon_insert
    ON public.repair_requests
    FOR INSERT TO anon
    WITH CHECK (status = '待處理');

-- 完成同一筆交易，讓資料表和存取規則一起生效。
COMMIT;
