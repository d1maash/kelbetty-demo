'use client'

import { useEffect, useState } from 'react'
import { Download, Table, Loader2, Plus, Minus } from 'lucide-react'

interface CellData {
  value: string | number
  style?: {
    fontWeight?: 'bold' | 'normal'
    textAlign?: 'left' | 'center' | 'right'
    backgroundColor?: string
    color?: string
  }
}

interface SheetData {
  name: string
  data: CellData[][]
}

interface XlsxEditorProps {
  file: File
}

export default function XlsxEditor({ file }: XlsxEditorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    if (!file) return

    const loadXlsx = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Для демо создаем фиктивные данные таблицы
        const demoData: CellData[][] = [
          [
            { value: 'Продукт', style: { fontWeight: 'bold', backgroundColor: '#e2e8f0' } },
            { value: 'Цена', style: { fontWeight: 'bold', backgroundColor: '#e2e8f0' } },
            { value: 'Количество', style: { fontWeight: 'bold', backgroundColor: '#e2e8f0' } },
            { value: 'Сумма', style: { fontWeight: 'bold', backgroundColor: '#e2e8f0' } }
          ],
          [
            { value: 'Kelbetty Pro' },
            { value: 1990 },
            { value: 100 },
            { value: 199000, style: { fontWeight: 'bold' } }
          ],
          [
            { value: 'Kelbetty Enterprise' },
            { value: 5990 },
            { value: 50 },
            { value: 299500, style: { fontWeight: 'bold' } }
          ],
          [
            { value: 'Консультации' },
            { value: 2500 },
            { value: 20 },
            { value: 50000, style: { fontWeight: 'bold' } }
          ],
          [
            { value: 'ИТОГО', style: { fontWeight: 'bold', backgroundColor: '#dbeafe' } },
            { value: '', style: { backgroundColor: '#dbeafe' } },
            { value: 170, style: { fontWeight: 'bold', backgroundColor: '#dbeafe' } },
            { value: 548500, style: { fontWeight: 'bold', backgroundColor: '#dbeafe', color: '#1d4ed8' } }
          ]
        ]

        const demoSheets: SheetData[] = [
          { name: 'Продажи', data: demoData },
          { name: 'Аналитика', data: [
            [{ value: 'Метрика', style: { fontWeight: 'bold' } }, { value: 'Значение', style: { fontWeight: 'bold' } }],
            [{ value: 'Общий доход' }, { value: 548500 }],
            [{ value: 'Средний чек' }, { value: 3226 }],
            [{ value: 'Конверсия' }, { value: '15.2%' }]
          ]}
        ]

        // Симуляция загрузки
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setSheets(demoSheets)
        setIsLoading(false)
      } catch (err) {
        console.error('Ошибка при загрузке XLSX:', err)
        setError('Не удалось загрузить таблицу. Проверьте, что файл не поврежден.')
        setIsLoading(false)
      }
    }

    loadXlsx()
  }, [file])

  const handleCellEdit = (sheetIndex: number, row: number, col: number, value: string | number) => {
    setSheets(prev => prev.map((sheet, i) => 
      i === sheetIndex 
        ? {
            ...sheet,
            data: sheet.data.map((rowData, r) => 
              r === row 
                ? rowData.map((cell, c) => 
                    c === col ? { ...cell, value } : cell
                  )
                : rowData
            )
          }
        : sheet
    ))
  }

  const addRow = () => {
    const currentSheet = sheets[activeSheet]
    if (!currentSheet) return

    const newRow: CellData[] = new Array(currentSheet.data[0]?.length || 4).fill(null).map(() => ({ value: '' }))
    
    setSheets(prev => prev.map((sheet, i) => 
      i === activeSheet 
        ? { ...sheet, data: [...sheet.data, newRow] }
        : sheet
    ))
  }

  const addColumn = () => {
    setSheets(prev => prev.map((sheet, i) => 
      i === activeSheet 
        ? {
            ...sheet,
            data: sheet.data.map(row => [...row, { value: '' }])
          }
        : sheet
    ))
  }

  const handleExport = async () => {
    try {
      // В реальном приложении здесь был бы экспорт через библиотеку xlsx
      const demoContent = JSON.stringify(sheets, null, 2)
      const blob = new Blob([demoContent], { type: 'application/json' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.[^/.]+$/, '') + '_edited.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('В реальной версии здесь будет создан настоящий XLSX файл')
    } catch (error) {
      console.error('Ошибка при экспорте:', error)
      alert('Не удалось экспортировать таблицу')
    }
  }

  const getColumnName = (index: number): string => {
    let name = ''
    while (index >= 0) {
      name = String.fromCharCode(65 + (index % 26)) + name
      index = Math.floor(index / 26) - 1
    }
    return name
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Загружаем таблицу...</p>
          <p className="text-sm text-slate-500 mt-1">Сохраняем форматирование и формулы</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <Table className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  const currentSheet = sheets[activeSheet]

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Table className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-slate-900">{file.name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={addRow}
                className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Строка
              </button>
              <button
                onClick={addColumn}
                className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Столбец
              </button>
            </div>
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Скачать XLSX
          </button>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="flex">
          {sheets.map((sheet, index) => (
            <button
              key={index}
              onClick={() => setActiveSheet(index)}
              className={`px-4 py-2 text-sm font-medium border-r border-slate-200 transition-colors ${
                activeSheet === index
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        {currentSheet && (
          <div className="xlsx-grid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-12 h-8 bg-slate-100 border border-slate-300 text-xs text-slate-600"></th>
                  {currentSheet.data[0]?.map((_, colIndex) => (
                    <th
                      key={colIndex}
                      className="min-w-24 h-8 bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-600"
                    >
                      {getColumnName(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentSheet.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="w-12 h-8 bg-slate-100 border border-slate-300 text-center text-xs text-slate-600 font-semibold">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className={`xlsx-cell min-w-24 h-8 cursor-text ${
                          selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                        style={{
                          backgroundColor: cell.style?.backgroundColor,
                          color: cell.style?.color,
                          fontWeight: cell.style?.fontWeight,
                          textAlign: cell.style?.textAlign
                        }}
                        onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                      >
                        <input
                          type="text"
                          value={cell.value}
                          onChange={(e) => handleCellEdit(activeSheet, rowIndex, colIndex, e.target.value)}
                          className="w-full h-full bg-transparent border-none outline-none px-2 text-sm"
                          onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                          onBlur={() => setSelectedCell(null)}
                          style={{
                            fontWeight: cell.style?.fontWeight,
                            textAlign: cell.style?.textAlign,
                            color: cell.style?.color
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 p-3 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          💡 Кликните на ячейку для редактирования. В реальной версии поддерживаются формулы и сложное форматирование.
        </p>
      </div>
    </div>
  )
}