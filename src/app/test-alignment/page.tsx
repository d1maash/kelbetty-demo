'use client'

import { useState } from 'react'

export default function TestAlignmentPage() {
    const [testHtml, setTestHtml] = useState('')

    const createTestDocument = () => {
        const html = `
<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
    <h1 style="text-align: center; color: #333;">Тест выравнивания текста</h1>
    
    <p style="text-align: left; border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <strong>Левое выравнивание (left):</strong><br/>
        Этот текст выровнен по левому краю. Это стандартное выравнивание для большинства текстов.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
    
    <p style="text-align: center; border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <strong>Центрирование (center):</strong><br/>
        Этот текст выровнен по центру. Часто используется для заголовков и важных элементов.
    </p>
    
    <p style="text-align: right; border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <strong>Правое выравнивание (right):</strong><br/>
        Этот текст выровнен по правому краю. Используется для дат, подписей и т.д.
    </p>
    
    <p style="text-align: justify; border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <strong>По ширине (justify):</strong><br/>
        Этот текст выровнен по ширине. Текст занимает всю доступную ширину, создавая ровные края с обеих сторон.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
    </p>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">
        <h2 style="text-align: center; color: #0066cc;">Комбинированные стили</h2>
        
        <p style="text-align: left; font-size: 14pt; color: #333;">
            Параграф с левым выравниванием и размером шрифта 14pt.
        </p>
        
        <p style="text-align: center; font-size: 16pt; color: #d63384; font-weight: bold;">
            Центрированный параграф с жирным шрифтом 16pt и цветом.
        </p>
        
        <p style="text-align: right; font-size: 12pt; color: #0d6efd; font-style: italic;">
            Правое выравнивание с курсивом и размером 12pt.
        </p>
        
        <p style="text-align: justify; margin-left: 30pt; margin-right: 30pt; text-indent: 20pt; line-height: 1.8;">
            Параграф с выравниванием по ширине, отступами слева и справа (30pt), 
            отступом первой строки (20pt) и увеличенным межстрочным интервалом (1.8).
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
        </p>
    </div>
</div>
        `
        setTestHtml(html)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold mb-4">Тест выравнивания текста</h1>
                    <p className="text-gray-600 mb-4">
                        Эта страница проверяет правильность отображения различных типов выравнивания текста
                        в изолированном iframe.
                    </p>

                    <button
                        onClick={createTestDocument}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Создать тестовый документ
                    </button>
                </div>

                {testHtml && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">Результат (в iframe с изоляцией)</h2>

                        <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                            <iframe
                                srcDoc={`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        html, body {
            all: initial;
            box-sizing: border-box;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        /* Все inline стили должны работать */
        *[style] {
            /* Inline стили имеют максимальный приоритет */
        }
    </style>
</head>
<body>
    ${testHtml}
</body>
</html>
                                `}
                                className="w-full h-full border-0"
                                title="Тест выравнивания"
                                sandbox="allow-same-origin"
                            />
                        </div>

                        <div className="mt-4 p-4 bg-gray-100 rounded">
                            <h3 className="font-bold mb-2">Исходный HTML (для проверки):</h3>
                            <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                                {testHtml}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

