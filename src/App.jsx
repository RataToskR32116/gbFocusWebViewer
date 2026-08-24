import { useState } from 'react'
import { parseGbFocusCsv } from './parseGBFocusCsv'

export default function App() {
  const [text, setText] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [parsed, setParsed] = useState(null)
  
  async function handleFile(file) {
    if (!file) return
    const csvText = await file.text()

    setFileName(file.name)
    setText(csvText)
    
    const result = parseGbFocusCsv(csvText)
    setParsed(result)
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

      {fileName && <p>読み込み: {fileName}（{text.length.toLocaleString()} 文字）</p>}
      {parsed && (
        <div>
          <p>デバイス: {parsed.device}</p>
          <p>使える指標: {parsed.available.join(', ')}</p>
          <p>集中度: {parsed.series('attention').length} 点</p>
        </div>
      )}
      <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto', background: '#f5f5f5' }}>
        {text.slice(0, 2000)}
      </pre>
      
    
    </div>
  )
}
