interface Account {
  name?: string; // `@username` (取得できない場合は undefined)
  twid: string;  // X(Twitter)の内部ユーザーID
  cookies: chrome.cookies.Cookie[];
}

// twid から @username を取得する関数
async function getUsernameFromTwid(twid: string): Promise<string | undefined> {
  console.log(`[DEBUG] Popup Script: @username 取得リクエスト送信 (twid=${twid})`);

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.error("[ERROR] Popup Script: タブ ID を取得できませんでした。");
        resolve(undefined);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: "fetch_username", twid }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[ERROR] Popup Script: メッセージ送信失敗:", chrome.runtime.lastError);
          resolve(undefined);
          return;
        }

        console.log("[DEBUG] Popup Script: Content Script からのレスポンス:", response);

        if (response?.success && response.username) {
          console.log(`[DEBUG] Popup Script: 取得成功: ${response.username}`);
          resolve(response.username);
        } else {
          console.warn(`[WARN] Popup Script: @username 取得失敗 (twid=${twid})`);
          resolve(undefined);
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const accountList = document.getElementById("account-list") as HTMLDivElement;

  // ストレージからアカウントリスト取得
  const data = await chrome.storage.local.get(["accounts"]);
  const accounts: Account[] = data.accounts ?? [];

  console.log("[DEBUG] 読み込まれたアカウントリスト:", accounts);

  // 🔹 現在アクティブな X タブからログインアカウントを自動登録
  try {
    const cookies = await chrome.cookies.getAll({ domain: ".x.com" });
    const twidCookie = cookies.find(c => c.name === "twid");

    if (twidCookie) {
      const twid = decodeURIComponent(twidCookie.value).replace(/^u%3D/, "");
      console.log(`[DEBUG] アクティブタブから取得した twid: ${twid}`);

      const alreadyExists = accounts.some(acc => acc.twid === twid);
      if (!alreadyExists) {
        const username = await getUsernameFromTwid(twid);
        const newAccount: Account = {
          name: username ?? twid,
          twid,
          cookies
        };
        accounts.push(newAccount);
        await chrome.storage.local.set({ accounts });
        console.log("[DEBUG] 新しいアカウントを自動追加:", newAccount);
      } else {
        console.log("[DEBUG] 既に保存済みのアカウントのためスキップ");
      }
    } else {
      console.warn("[WARN] アクティブタブに `twid` クッキーが見つかりませんでした");
    }
  } catch (e) {
    console.error("[ERROR] アクティブタブのアカウント取得に失敗:", e);
  }

  // アカウント一覧を再描画
  for (const account of accounts) {
    const button = document.createElement("button");
    button.textContent = account.name ?? account.twid;
    button.classList.add("account-button");
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "load_session", index: accounts.indexOf(account) });
    });
    accountList.appendChild(button);
  }
});
