"use strict";

const REPAIR_TABLE = "repair_requests";
const form = document.querySelector("#repair-form");
const fields = document.querySelector("#repair-fields");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");
const listMessage = document.querySelector("#list-message");
const requestList = document.querySelector("#request-list");
const dateFormat = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
});

function showMessage(element, text, kind = "") {
  element.textContent = text;
  element.dataset.kind = kind;
}

function parsePhotoUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function renderRequest(request) {
  const item = document.createElement("li");
  item.className = "request";

  const heading = document.createElement("h3");
  heading.textContent = `${request.category} · ${request.location}`;

  const details = document.createElement("p");
  details.className = "request-meta";
  details.textContent = `${request.reporter_name} · 緊急程度：${request.urgency} · ${request.status} · ${dateFormat.format(new Date(request.created_at))}`;

  const description = document.createElement("p");
  description.className = "request-description";
  description.textContent = request.description;

  const assignment = document.createElement("p");
  assignment.className = "request-meta";
  assignment.textContent = `負責人：${request.assignee?.trim() || "未填寫"}`;

  const photo = document.createElement("p");
  photo.className = "request-meta";
  photo.textContent = "照片網址：";
  const photoUrl = parsePhotoUrl(request.photo_url);
  if (photoUrl) {
    const link = document.createElement("a");
    link.href = photoUrl.href;
    link.textContent = request.photo_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    photo.append(link);
  } else {
    photo.textContent += request.photo_url?.trim() || "未提供";
  }

  item.append(heading, details, description, assignment, photo);
  return item;
}

async function loadRequests(client) {
  showMessage(listMessage, "正在載入報修紀錄…");

  try {
    const { data, error } = await client
      .from(REPAIR_TABLE)
      .select("reporter_name, location, category, description, assignee, photo_url, urgency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    requestList.replaceChildren(...data.map(renderRequest));
    showMessage(listMessage, data.length ? "" : "目前還沒有報修紀錄。");
  } catch {
    showMessage(listMessage, "無法載入報修紀錄，請重新整理頁面後再試。", "error");
  }
}

function bindForm(client) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;

    const values = new FormData(form);
    const photoValue = values.get("photo_url").trim();
    const request = {
      reporter_name: values.get("reporter_name").trim(),
      location: values.get("location").trim(),
      category: values.get("category"),
      description: values.get("description").trim(),
      assignee: values.get("assignee").trim(),
      photo_url: photoValue || null,
      urgency: values.get("urgency"),
    };

    if (!request.reporter_name || !request.location || !request.description || !request.assignee) {
      showMessage(formMessage, "請填寫報修人、地點或部門、問題說明與負責人。", "error");
      return;
    }

    if (photoValue && !parsePhotoUrl(photoValue)) {
      showMessage(formMessage, "照片網址請使用 http:// 或 https:// 開頭的完整網址。", "error");
      return;
    }

    fields.disabled = true;
    submitButton.disabled = true;
    showMessage(formMessage, "正在送出報修…");

    try {
      const { error } = await client.from(REPAIR_TABLE).insert(request);
      if (error) throw error;

      form.reset();
      showMessage(formMessage, "報修已送出。", "success");
      await loadRequests(client);
    } catch {
      showMessage(formMessage, "送出失敗，請稍後再試。", "error");
    } finally {
      fields.disabled = false;
      submitButton.disabled = false;
    }
  });
}

async function initialize() {
  const { supabaseUrl, supabasePublishableKey } = window.REPAIR_CONFIG ?? {};

  if (!supabaseUrl || supabaseUrl === "YOUR_SUPABASE_URL" ||
      !supabasePublishableKey || supabasePublishableKey === "YOUR_SUPABASE_PUBLISHABLE_KEY") {
    showMessage(formMessage, "請先在 config.js 填入 Supabase 網址和 Publishable Key。", "error");
    return;
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    showMessage(formMessage, "請在 config.js 使用以 sb_publishable_ 開頭的 Publishable Key。", "error");
    return;
  }

  if (!window.supabase?.createClient) {
    showMessage(formMessage, "無法載入 Supabase，請確認網路連線後重新整理頁面。", "error");
    return;
  }

  let client;
  try {
    client = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    showMessage(formMessage, "Supabase 網址設定有誤，請檢查 config.js。", "error");
    return;
  }

  bindForm(client);
  await loadRequests(client);
  fields.disabled = false;
}

initialize();
