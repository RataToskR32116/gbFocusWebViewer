import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseGbFocusCsv } from './parseGBFocusCsv'

export default function App() {
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('state')
  const [visibleSeries, setVisibleSeries] = useState({
    attention: true,
    meditation: true,
  })

  async function handleFile(file) {
    if (!file) return
    setData(parseGbFocusCsv(await file.text()))
  }

  const attention = data?.series('attention') ?? []
  const meditation = data?.series('meditation') ?? []

  function toggleSeries(name) {
    setVisibleSeries((current) => ({
      ...current,
      [name]: !current[name],
    }))
  }

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

      {data && (
        <>
          <div className="chart-tabs" role="tablist" aria-label="グラフの種類">
            <button
              className="chart-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'frequency'}
              aria-controls="frequency-panel"
              onClick={() => setActiveTab('frequency')}
            >
              周波数
            </button>
            <button
              className="chart-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'state'}
              aria-controls="state-panel"
              onClick={() => setActiveTab('state')}
            >
              状態指数
            </button>
          </div>

          {activeTab === 'frequency' ? (
            <section className="chart-panel" id="frequency-panel" role="tabpanel">
              <p>周波数グラフは準備中です。</p>
            </section>
          ) : (
            <section className="chart-panel" id="state-panel" role="tabpanel">
              <p>デバイス: {data.device} / 集中度 {attention.length} 点 / リラックス度 {meditation.length} 点</p>
              <fieldset className="metric-controls">
                <legend>表示する指標</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleSeries.attention}
                    onChange={() => toggleSeries('attention')}
                  />
                  集中度
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleSeries.meditation}
                    onChange={() => toggleSeries('meditation')}
                  />
                  リラックス度
                </label>
              </fieldset>
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
                      formatter={(v, name) => [v.toFixed(1), name === 'attention' ? '集中度' : 'リラックス度']}
                    />
                    {visibleSeries.attention && (
                      <Line
                        type="monotone"
                        data={attention}
                        dataKey="value"
                        name="attention"
                        stroke="#2563eb"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                    {visibleSeries.meditation && (
                      <Line
                        type="monotone"
                        data={meditation}
                        dataKey="value"
                        name="meditation"
                        stroke="#db2777"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
