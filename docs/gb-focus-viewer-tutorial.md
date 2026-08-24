# GB Focus CSV ビューアを作る — チュートリアル

GB Focus（GOODBRAIN の計測アプリ）が書き出した CSV を、ブラウザで読み込んでグラフにする Web アプリを作ります。

**このドキュメントの読者**: React を少し触ったことがある人。脳波の知識は不要です。
**所要時間の目安**: Step 1〜3 で半日、Step 4 まで含めて2〜3日。

> **先に読まなくてよいもの**: 脳波そのものやデバイスの詳しい仕様は [gb-focus-brainwave.md](gb-focus-brainwave.md) にまとまっています。
> このチュートリアルは**作るのに必要な分だけ**をここに書いてあるので、まずはこれだけで進めて構いません。

---

## 0. 何を作るのか

ローカルの CSV をドラッグ&ドロップすると、指標が時系列グラフで見られるアプリ。

```
┌────────────────────────────────────────────────┐
│  [CSVをここにドロップ]        デバイス: OxyZen  │
├────────────────────────────────────────────────┤
│  表示する指標: [✓集中度] [✓リラックス度] [ ]β波 │
├────────────────────────────────────────────────┤
│  100 ┤        ╭─╮                              │
│      │   ╭────╯ ╰──╮      ╭───╮                │
│   50 ┤───╯          ╰──────╯   ╰──             │
│      │                                          │
│    0 └─────────────────────────────────────────│
│      0        60       120      180      240 秒 │
├────────────────────────────────────────────────┤
│  集中度  平均 50.8 / 最小 12.3 / 最大 88.1      │
└────────────────────────────────────────────────┘
```

### 段階

**一気に全部作らないでください。** 各 Step が終わったら必ず動かして見せてください。

| Step | やること | 終わったら見えるもの |
|---|---|---|
| **1** | Vite で React を立ち上げ、CSV をファイル選択で読み込んでテキスト表示 | 「読めた」 |
| **2** | CSV をパースして、指標ごとの点数をコンソールに出す | 「中身が分かった」 |
| **3** | 集中度を折れ線グラフにする | **ここが最初のゴール** |
| **4** | 指標の切り替え、複数ファイルの比較、統計値 | 実用 |

---

## 1. ⚠️ 最初に知るべきこと — この CSV は「1行1レコード」ではない

**ここを誤解すると全部おかしくなります。他の何より先に読んでください。**

普通の CSV はこうだと思いますよね:

```csv
時刻,集中度,リラックス度
0.0,70.6,42.4
1.0,68.2,45.1     ← 1行に全部入っている
```

**GB Focus の CSV は違います。** 指標ごとに**記録される速さが違う**ので、
**それぞれ別の行に、バラバラに書かれています。** 実データの先頭はこうです:

```csv
TimeStamps,Elapsed Time,alpha,beta,delta,theta,gamma,attention,eeg,pulse rate,spo2,drowsiness,meditation,awareness,
2026-06-09 16:01:59.942,00:00:00.000,,,,,,70.6,,,,,,,          ← attention だけ
2026-06-09 16:01:59.943,00:00:00.000,12.9,33.0,71.6,...,,-3.2;-3.7;...,67.0,96.6,,,,   ← バンド+eeg+脈拍+SpO2
2026-06-09 16:02:00.180,00:00:00.238,,,,,,,,,,3.0,,,           ← drowsiness だけ
```

**空欄だらけなのが正常です。壊れていません。**

実際に数えるとこうなっています（4分の計測1本、全3170行）:

| 指標 | 値が入っている行数 | だいたいの速さ |
|---|---|---|
| `attention`（集中度） | **261** | 約1秒に1回 |
| `meditation`（リラックス度） | **261** | 約1秒に1回 |
| `awareness`（おちつき度） | 261 | 約1秒に1回 |
| `drowsiness`（眠気度） | 417 | 約2秒に3回 |
| `alpha` `beta` `delta` `theta` `gamma`（バンド） | **2086** | 約1秒に8〜9回 |
| `pulse rate` `spo2` | 266 | 約1秒に1回 |
| `eeg`（生波形） | 2086行 × 各30個 = **62,580点** | 約300Hz |

### だからコードはこう書く

**「N行目のデータ」を取ろうとしない。「その列の、値が入っている行だけ」を取る。**

```js
// ❌ こうすると空欄だらけの配列になる
const attention = rows.map((r) => r[7])

// ✅ 列を名前で引いて、数値にならないもの（空欄）を捨てる
const i = header.indexOf('attention')
const attention = rows.map((r) => parseFloat(r[i])).filter(Number.isFinite)
```

### あと2つ、地味にハマるところ

**① 列の順番は保証されていません。** デバイスや書き出し時期で変わります。
**必ず列名で引いてください**（`r[7]` のような位置指定は禁止）。

**② ヘッダの末尾にカンマがあります。**

```
...,meditation,awareness,     ← 最後のカンマ
```

このせいで「名前のない空の列」が1つ増えます。無視してください。

---

## 2. セットアップ

```bash
npm create vite@latest gb-focus-viewer -- --template react
cd gb-focus-viewer
npm install
npm run dev
```

`http://localhost:5173` が開けば OK です。

### グラフのライブラリを選ぶ

**結論から: まずは `recharts` を使ってください。**

```bash
npm install recharts
```

**なぜ d3 ではないか。** d3 は「グラフを描くライブラリ」ではなく「グラフを描くための部品集」で、
軸も線も自分で組み立てます。強力ですが、**最初のグラフが出るまでが遠い**。
recharts は React のコンポーネントとして書けるので、**Step 3 が今日中に終わります。**

ただし**選択には条件があります**。上の表を見返してください:

| 描きたいもの | 点の数 | 向いているもの |
|---|---|---|
| 集中度・リラックス度 | 約260点 | **recharts で十分** |
| バンド（α波・β波…） | 約2,000点 | recharts で描けるが少し重い |
| **生波形（`eeg`）** | **約62,000点** | **recharts では固まる** → 後述 |

recharts は SVG で描くので、点の数だけ DOM 要素が増えます。数万点になると**ブラウザが固まります**。
生波形を描くのは Step 4 以降の課題にして、**まずは集中度から始めてください**（§7 で対処法を書きます）。

> d3 を使いたい気持ちがあるなら止めません。ただし**Step 3 を recharts で1回終わらせてから**にしてください。
> 「動くもの」があると、作り直すときに比較できます。

---

## 3. Step 1 — CSV を読み込む

まずファイルを読んで、中身をそのまま画面に出すところまで。

```jsx
// src/App.jsx
import { useState } from 'react'

export default function App() {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setText(await file.text())   // File API。これだけで中身が読めます
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>GB Focus ビューア</h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {fileName && <p>読み込み: {fileName}（{text.length.toLocaleString()} 文字）</p>}
      <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto', background: '#f5f5f5' }}>
        {text.slice(0, 2000)}
      </pre>
    </div>
  )
}
```

**ここで確認すること**: 空欄だらけの行が見えるはずです。§1 で読んだとおりの形になっていますか？

> **ドラッグ&ドロップにしたい場合**は、`<div>` に `onDragOver={(e) => e.preventDefault()}` と
> `onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}` を付けます。
> **`onDragOver` で `preventDefault()` を呼ばないと `onDrop` が発火しません**（よくハマります）。

---

## 4. Step 2 — パーサを書く

`src/parseGbFocusCsv.js` を作ります。**このコードは実データで動作確認済みです。**

```js
// src/parseGbFocusCsv.js

/**
 * GB Focus の CSV をパースする。
 * 行は疎（指標ごとに別の行）なので、指標ごとに「値が入っている行」だけを集める。
 */
export function parseGbFocusCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(',').map((s) => s.trim())
  const rows = lines.slice(1).map((line) => line.split(','))

  const timeIdx = header.indexOf('Elapsed Time')

  // "00:04:04.123" → 244.123（秒）
  const toSeconds = (hms) => {
    if (!hms) return NaN
    const [h, m, s] = hms.split(':')
    return Number(h) * 3600 + Number(m) * 60 + Number(s)
  }

  /** 指標名を渡すと [{ t: 秒, value: 値 }, ...] を返す */
  const series = (name) => {
    const i = header.indexOf(name)      // ← 位置ではなく名前で引く
    if (i === -1) return []
    const out = []
    for (const r of rows) {
      const v = parseFloat(r[i])
      if (!Number.isFinite(v)) continue // ← 空欄はここで落ちる
      out.push({ t: toSeconds(r[timeIdx]), value: v })
    }
    return out
  }

  // 生波形は1セルに「;」区切りで約30個入っている。約300Hz として時刻を振る。
  const eegIdx = header.indexOf('eeg')
  const eeg = []
  if (eegIdx !== -1) {
    for (const r of rows) {
      const cell = r[eegIdx]
      if (!cell) continue
      const t0 = toSeconds(r[timeIdx])
      const vals = cell.split(';').map(parseFloat).filter(Number.isFinite)
      vals.forEach((v, k) => eeg.push({ t: t0 + k / 300, value: v }))
    }
  }

  const has = (name) => series(name).length > 0
  // OxyZen だけが脈拍・SpO2・おちつき度を持つ
  const device = has('pulse rate') || has('spo2') || has('awareness') ? 'OxyZen' : 'FocusCalm'

  const available = header.filter(
    (h) => h && h !== 'TimeStamps' && h !== 'Elapsed Time' && (h === 'eeg' ? eeg.length > 0 : has(h))
  )

  return { header, device, available, series, eeg }
}
```

App.jsx から呼んで、コンソールで確認します:

```jsx
const parsed = parseGbFocusCsv(await file.text())
console.log('デバイス:', parsed.device)
console.log('使える指標:', parsed.available)
console.log('集中度:', parsed.series('attention').length, '点')
```

**期待される出力**（`sample-data/study/*.csv` の場合）:

```
デバイス: OxyZen
使える指標: ['alpha','beta','delta','theta','gamma','attention','eeg','pulse rate','spo2','drowsiness','meditation','awareness']
集中度: 261 点
```

**261 点になりましたか？** 3170 点になっていたら空欄を捨てられていません。§1 に戻ってください。

### なぜ CSV ライブラリを使わないのか

この CSV は**引用符もセル内カンマも無い**ので、`split(',')` で正しく割れます（生波形は `;` 区切りなのでカンマを含みません）。
ライブラリを足す理由が今はありません。**将来フォーマットが変わって困ったら** `papaparse` に置き換えてください。

---

## 5. Step 3 — グラフを描く（最初のゴール）

```jsx
// src/App.jsx
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseGbFocusCsv } from './parseGbFocusCsv'

export default function App() {
  const [data, setData] = useState(null)

  async function handleFile(file) {
    if (!file) return
    setData(parseGbFocusCsv(await file.text()))
  }

  const attention = data?.series('attention') ?? []

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>GB Focus ビューア</h1>
      <input type="file" accept=".csv" onChange={(e) => handleFile(e.target.files[0])} />

      {data && (
        <>
          <p>デバイス: {data.device} / 集中度 {attention.length} 点</p>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={attention}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, 'dataMax']}
                  tickFormatter={(t) => `${Math.round(t)}s`}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(t) => `${t.toFixed(1)} 秒`}
                  formatter={(v) => [v.toFixed(1), '集中度']}
                />
                {/* dot={false} は必須。260点ぶんの丸を描くと重いし見づらい */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
```

### ここで必ず引っかかるポイント

**X軸が「0,1,2,3…」の連番になってしまう場合**、`XAxis` の指定が足りていません。
`dataKey="t"` **と** `type="number"` の**両方**が必要です。
これが無いと recharts は t を「ラベル文字列」として扱い、**時間の間隔が無視されます**。
指標によって記録の間隔が違う（集中度は1秒おき、バンドは0.12秒おき）ので、ここを間違えると波形の形が変わります。

**縦軸の範囲**: 集中度・リラックス度は 0〜100 なので `domain={[0, 100]}` を固定したほうが読みやすいです。
一方**バンド（α波・β波）は μV² で上限が決まっていない**ので、こちらは `domain={['auto', 'auto']}` にしてください。

---

## 6. Step 4 — 実用にする

ここからは好きな順でどうぞ。

### 4-1. 指標を切り替える

`data.available` にその CSV で使える指標名が入っています。チェックボックスを並べて、
選ばれた指標だけ `<Line>` を追加します。**表示名は日本語にしてください**（利用者は英語の列名を知りません）:

```js
const LABELS = {
  attention: '集中度',
  meditation: 'リラックス度',
  awareness: 'おちつき度',
  drowsiness: '眠気度',
  alpha: 'α波', beta: 'β波', delta: 'δ波', theta: 'θ波', gamma: 'γ波',
  'pulse rate': '脈拍', spo2: '血中酸素'
}
```

**注意**: 単位が違う指標を同じ縦軸に重ねないでください。
0〜100 の指標と μV² のバンドを1つのグラフに描くと、**片方が潰れて見えなくなります**。
グラフを分けるか、recharts の `<YAxis yAxisId="right" orientation="right" />` で軸を2本にします。

### 4-2. 統計値を出す

平均・最小・最大くらいから。余裕があれば:

- **傾き** — 時間に対する一次回帰の係数。「だんだん集中が落ちた」が数字で言えます
- **立ち上がり** — 最後30秒の平均 − 最初30秒の平均

### 4-3. 2つの計測を比べる

`sample-data/` には**勉強中（study）とゲーム中（game）が2本ずつ**入っています。
2ファイル読み込んで重ねて描けると、一気に「使えるツール」になります。

```
desktop/sample-vault/sample-data/study/*.csv   ← 勉強中
desktop/sample-vault/sample-data/game/*.csv    ← ゲーム中
```

**時間の長さが違う点に注意。** 計測時間が揃っていないので、単純に並べると横軸が合いません。
「経過時間で重ねる」のか「割合（0〜100%）に正規化する」のかを決めてから実装してください。

---

## 7. 生波形（`eeg`）を描きたくなったら

**約62,000点あります。recharts にそのまま渡すとタブが固まります。** どちらかを選んでください。

**A. 間引いて描く（簡単）** — 1秒あたり数十点で十分見えます。

```js
const step = Math.ceil(eeg.length / 4000)          // 4000点くらいに落とす
const thinned = eeg.filter((_, i) => i % step === 0)
```

ただし**単純な間引きは、鋭いピークを見落とします**。波形の山を潰したくないなら
「区間ごとの最小と最大を両方残す」方式（min-max downsampling）にしてください。

**B. Canvas で描くライブラリに替える（本格的）** — [`uplot`](https://github.com/leeoniya/uPlot) が定番です。
数万〜数十万点でもぬるぬる動きます。**生波形を主役にするならこちら。**

> ちなみに、生波形は「見て面白い」わりに**そこから何かを判断するのは難しい**データです。
> 研究として何かを言いたいなら、まず集中度やバンドを見るほうが近道です。

---

## 8. つまずきポイントまとめ

| 症状 | 原因 | 対処 |
|---|---|---|
| グラフがスカスカ／点が飛ぶ | 空欄を捨てていない | §1・§4 の `filter(Number.isFinite)` |
| 数値が全部 `NaN` | 列を位置で取っている | `header.indexOf('名前')` で引く |
| X軸が 0,1,2,3… の連番になる | `XAxis` に `type="number"` が無い | §5 |
| 線が横一直線になる | 単位の違う指標を同じ軸に重ねた | 軸を分ける（§4-1） |
| ブラウザが固まる | `eeg` をそのまま描いた | 間引く or uplot（§7） |
| D&D でファイルが取れない | `onDragOver` で `preventDefault()` していない | §3 |
| 列が1つ多い | ヘッダ末尾のカンマ | 無視してよい |
| FocusCalm の CSV で脈拍が出ない | FocusCalm にその列は無い | `data.available` を見て UI を出し分ける |

---

## 9. 完成チェックリスト

Step 3 まで:

- [ ] CSV を選ぶとグラフが出る
- [ ] 集中度が **261点前後**（3170点ではない）
- [ ] 横軸が秒で、目盛りの間隔が正しい
- [ ] デバイス名（OxyZen / FocusCalm）が表示される

Step 4 まで:

- [ ] 指標を切り替えられ、**日本語で表示**される
- [ ] 単位の違う指標が同じ軸に潰れていない
- [ ] 平均・最小・最大が出る
- [ ] `sample-data/study` と `sample-data/game` を**両方**読んでも壊れない
- [ ] FocusCalm の CSV（OxyZen 用の列が無い）でも壊れない

---

## 10. 分からなくなったら

- **データの形の話** → まずこのドキュメントの §1
- **脳波そのもの・デバイスの仕様** → [gb-focus-brainwave.md](gb-focus-brainwave.md)
- **実データ** → `desktop/sample-vault/sample-data/`（git に入っているので必ずあります）
- **既存の実装例** → `desktop/src/main/eeg.js`（同じ CSV を JavaScript でパースしています）

**動かないコードを1人で30分以上抱えないでください。** 詰まった内容と、試したことを持ってきてください。
