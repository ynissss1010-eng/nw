async function refresh() {
  if (!db || !S?.ready) return;
  // 選照片返回頁面時，不能重畫設定表單，
  // 否則瀏覽器會清空剛選好的檔案。
  if (document.querySelector("#profileForm")) return;
  // 使用者正在操作視窗時也不重新繪製。
  if (
    document.querySelector("#modal")?.open ||
    document.querySelector("#viewer")?.open
  ) {
    return;
  }
  try {
    const data = await readState();
    if (data && valid(data)) {
      S = data;
      render();
    }
  } catch (error) {
    console.error("Refresh failed:", error);
  }
}