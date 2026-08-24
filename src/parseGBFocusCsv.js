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
    const parts = hms.split(':').map(Number)
    if (parts.some((part) => !Number.isFinite(part))) return NaN

    if (parts.length === 3) {
      const [h, m, s] = parts
      return h * 3600 + m * 60 + s
    }

    if (parts.length === 2) {
      const [m, s] = parts
      return m * 60 + s
    }

    return NaN
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