console.log("[DEBUG] Background script loaded");

// 🔄 開発モードで自動リロード（オプション）
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    console.log("[DEBUG] Reloading extension...");
    chrome.runtime?.reload();
  }, 3000);
}

// ✅ 拡張機能のインストール or アップデート時のログ
chrome.runtime?.onInstalled?.addListener(() => {
  console.log("[DEBUG] 拡張機能がインストールまたは更新されました。");
});

// アカウント情報の型定義
interface Account {
  name?: string;
  twid: string;
  cookies: chrome.cookies.Cookie[];
}

// 📩 メッセージ受信リスナー
chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
  console.log("[DEBUG] 受信メッセージ:", message);

  if (message.action === "load_session") {
    loadSession(message.index)
      .then(() => {
        sendResponse({ status: "ok" });
      })
      .catch((error: unknown) => {
        console.error("[ERROR] セッションの復元に失敗:", error);
        const message = error instanceof Error ? error.message : String(error);
        sendResponse({ status: "error", message });
      });

    return true; // sendResponse を非同期で使うため
  }
});

// 🍪 クッキーを全削除（.x.com ドメインに限定）
async function clearAllCookies(): Promise<void> {
  const allCookies = await chrome.cookies.getAll({ domain: ".x.com" });
  for (const cookie of allCookies) {
    await chrome.cookies.remove({
      url: `https${cookie.secure ? "s" : ""}://${cookie.domain}${cookie.path}`,
      name: cookie.name,
    });
  }
  console.log("[DEBUG] すべての .x.com クッキーを削除しました");
}

// 🧠 セッションを復元
async function loadSession(index: number): Promise<void> {
  const data = await chrome.storage.local.get(["accounts"]);
  const accounts: Account[] = data.accounts ?? [];

  if (index < 0 || index >= accounts.length) {
    console.warn("[WARN] 無効なインデックス:", index);
    return;
  }

  const account = accounts[index];
  console.log(`[DEBUG] セッションを復元: ${account.name}`);

  // 🔽 セット前に既存クッキーを削除
  await clearAllCookies();

  for (const cookie of account.cookies) {
    await chrome.cookies.set({
      url: "https://x.com",
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as "no_restriction" | "lax" | "strict",
      expirationDate: cookie.expirationDate
    });
  }

  console.log("[DEBUG] クッキーの復元完了");

  // 🔄 x.com を開いているタブをリロード
  const tabs = await chrome.tabs.query({ url: "*://x.com/*" });
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      await chrome.tabs.reload(tab.id);
      console.log(`[DEBUG] タブをリロード: tabId=${tab.id}`);
    }
  }
}

// 🌐 x.com へのアクセスを検知 → アカウント自動保存
chrome.webNavigation?.onCompleted?.addListener(async (details) => {
  if (!details.url?.includes("x.com")) return;

  console.log("[DEBUG] Xにアクセス検知、自動取得開始...");

  const cookies = await chrome.cookies?.getAll({ domain: ".x.com" }) ?? [];
  if (cookies.length === 0) {
    console.warn("[WARN] 取得できるクッキーがありませんでした。");
    return;
  }

  const twidCookie = cookies.find(cookie => cookie.name === "twid");
  if (!twidCookie) {
    console.warn("[WARN] `twid` クッキーが見つかりませんでした。");
    return;
  }

  const accountName = decodeURIComponent(twidCookie.value).replace(/^u=/, "");
  console.log(`[DEBUG] 取得したアカウント ID: ${accountName}`);

  const data = await chrome.storage.local.get(["accounts"]);
  const accounts: Account[] = data.accounts ?? [];

  if (accounts.some((acc) => acc.twid === accountName)) {
    console.log(`[DEBUG] すでに保存済みのアカウント (${accountName}) のためスキップ`);
    return;
  }

  accounts.push({ name: accountName, twid: accountName, cookies });
  await chrome.storage.local.set({ accounts });

  console.log(`[DEBUG] Xのアカウント情報を ${accountName} として自動保存しました`);
});
