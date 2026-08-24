import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseGbFocusCsv } from './parseGBFocusCsv'

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
      
      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFile(e.target.files[0])}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        />
      
      {attention && (
        <p>{attention.t}</p>
      )}

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
