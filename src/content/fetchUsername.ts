chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetch_username") {
    console.log("[DEBUG] Content Script: @username 取得リクエスト受信:", message.twid);

    const url = `https://x.com/i/user/${message.twid}`;
    console.log(`[DEBUG] Content Script: 取得 URL: ${url}`);

    try {
      fetch(url)
        .then(response => {
          console.log(`[DEBUG] Content Script: Fetch Response Status: ${response.status}`);
          if (!response.ok) {
            console.error(`[ERROR] Content Script: ユーザー取得失敗 (status=${response.status}): ${url}`);
            sendResponse({
              success: false,
              error: `fetch_failed_status_${response.status}`
            });
            return;
          }
          return response.text();
        })
        .then(textData => {
          if (!textData) {
            console.error("[ERROR] Content Script: レスポンスデータが空です。");
            sendResponse({
              success: false,
              error: "empty_response"
            });
            return;
          }

          console.log("[DEBUG] Content Script: Xから取得したデータ (先頭500文字):", textData.slice(0, 500));

          const regex = /"screen_name":"(.*?)"/;
          const match = regex.exec(textData);
          console.log("[DEBUG] Content Script: 正規表現マッチ結果:", match);

          if (match) {
            console.log(`[DEBUG] Content Script: 取得成功: @${match[1]}`);
            sendResponse({
              success: true,
              username: `@${match[1]}`
            });
          } else {
            console.warn("[WARN] Content Script: @username が見つかりませんでした。");
            sendResponse({
              success: false,
              error: "username_not_found"
            });
          }
        })
        .catch(error => {
          const err = error as Error;
          console.error("[ERROR] Content Script: Fetch 失敗:", err);
          sendResponse({
            success: false,
            error: err.message
          });
        });

      return true; // sendResponse を非同期で使うため
    } catch (error) {
      const err = error as Error;
      console.error("[ERROR] Content Script: 予期しないエラー:", err);
      sendResponse({
        success: false,
        error: err.message
      });
      return false;
    }
  }
});
