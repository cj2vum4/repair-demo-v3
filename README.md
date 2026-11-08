# 報修登記

表單新增「負責人」與「照片網址」。負責人必填，照片網址選填，接受 HTTP 或 HTTPS 網址。最近 20 筆清單會顯示這兩個欄位。舊紀錄若沒有填值，會顯示「未填寫」或「未提供」。報修狀態仍由資料庫設定。

## 更新已上線的 Supabase

1. 在 Supabase Dashboard 開啟正確的專案。先到 **SQL Editor** 執行下方的唯讀查詢，保留筆數和比對值。比對期間請暫停新增或編輯報修。
2. 按 **New query**，貼上 [`supabase/002_add_assignee_photo.sql`](supabase/002_add_assignee_photo.sql) 的全部內容，再按 **Run**。這份檔案只補缺少的欄位及訪客新增這兩欄所需的權限。已存在的欄位會保留，既有紀錄也不用回填。
3. 再執行同一份唯讀查詢。兩次的筆數和比對值應相同。接著到 **Table Editor → repair_requests** 確認有 `assignee` 和 `photo_url`。如果這次才新增欄位，舊紀錄在新欄位會顯示 `NULL`。
4. 重新整理報修網頁，確認舊紀錄仍可查看，再測試填寫負責人、留空照片網址並送出一筆測試報修。

已上線的資料表只需要執行 `002_add_assignee_photo.sql`。`schema.sql` 是給全新資料庫使用的建表檔。

## 比對原有資料

這份查詢只讀取原有欄位。它依報修編號排序並計算比對值，方便檢查套用前後的舊欄位內容是否一致。

```sql
SELECT
    count(*) AS row_count,
    md5(coalesce(string_agg(
        jsonb_build_array(
            id, created_at AT TIME ZONE 'UTC', reporter_name, location,
            category, description, urgency, status
        )::text,
        E'\n' ORDER BY id
    ), '')) AS original_data_checksum
FROM public.repair_requests;
```
