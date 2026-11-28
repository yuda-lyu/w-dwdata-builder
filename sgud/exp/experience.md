# w-dwdata-builder 經驗

## 1. wsemi 列舉函數第 2 參數改為 opt(2026-11-26)

- 舊寫法(第 2 參數為數字層數)、省略第 2 參數(舊預設 1 層)都須改:數字者新版拋錯(易見),**省略者靜默變窮舉全部層級**(不報錯、無從攔截)。盤點時 `git grep` 須同時列出「有數字」與「省略」兩種形狀。
- 修前紅之取法:把改前之 `src/` 與 `test/` 複製到 `./tmp/` 下之鏡像根,以鏡像根為工作目錄(`quiet-run --cwd`)用 mocha 跑,錯誤訊息為 `invalid opt: must be an object`。測試於 cwd 寫 `_*` 夾具資料夾,鏡像根須自成一處,不污染本庫根。
- 本庫之範例與測試是使用端回呼(`funGetCurrent`)之寫法,不是 `src` 之行為;範例修改後 README、JSDoc、`g*.mjs` 須一併同步,避免使用端抄到舊寫法。

## 2. `fdDwCurrent` 只收成功項(2026-11-28)

- 本輪結果只有 `success`／`failed`,沒有「比對出幾項」:排程器之主階段若在未設 `msgCancel` 下中途中止(例如逐項取主鍵拋錯、取消路徑之 `console.log` 拋錯),結果會是「`msgCancel` 空、`failed` 空、`success` 不全」。只看 `failed` 為空即完全同步會把未處理之項一併同步、永不重試;須以比對完成事件之項數核對成功項數(變異「改以 `failed` 為空判斷」由中途中止案抓到)。
- 取比對事件須監聽排程器回傳之事件物件:`await WDataScheduler(...)` 後立即 `on('change')` 即可,排程器開始偵測前先延遲脫勾。
- 逐項搬移之檔名取自下載數據之主鍵值,主鍵值帶路徑分隔字元時直接組路徑會讀寫、刪除資料夾外之檔案,故以 `path.basename` 檢查;`path.basename` 於 Windows 亦把反斜線與單一字母加冒號視為路徑。
- 測試要讓複製失敗:`fs.copyFileSync` 之目標為資料夾即失敗(Windows 為 `EPERM`);但 `wsemi` `fsSyncFolder` 遇「目標是空資料夾、來源是同名檔」會成功,測完全同步失敗須改以替身讓 `fs.createWriteStream` 拋錯。
- 以另一組依賴實跑下游測試而不寫下游 repo:把下游之 `src`、`test`、`package.json` 複製到本庫暫存夾,以 `module.registerHooks` 把裸名匯入指回下游原套件解析、只把被驗之套件改指本庫;分「現裝」「只升依賴」「依賴＋本庫修後」三組合跑,才分得出紅案是誰造成。
- 修前紅:以 `git show HEAD:src/WDwdataBuilder.mjs` 取改前原始碼放鏡像根,測試檔用現行版。變異之鏡像根同法(只複製檔案)。
