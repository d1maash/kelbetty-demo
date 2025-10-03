import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Document Conversion', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/import')
    })

    test('should display import page correctly', async ({ page }) => {
        // Проверяем заголовок страницы
        await expect(page.locator('h1')).toContainText('Импорт документов')

        // Проверяем наличие элементов интерфейса
        await expect(page.locator('input[type="file"]')).toBeVisible()
        await expect(page.locator('button:has-text("Конвертировать документ")')).toBeVisible()

        // Проверяем настройки
        await expect(page.locator('input[type="checkbox"]')).toHaveCount(2)
    })

    test('should handle file selection', async ({ page }) => {
        // Создаем тестовый DOCX файл (заглушка)
        const testFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')

        // Проверяем, что кнопка конвертации изначально отключена
        await expect(page.locator('button:has-text("Конвертировать документ")')).toBeDisabled()

        // Симулируем выбор файла
        await page.setInputFiles('input[type="file"]', testFilePath)

        // Проверяем, что файл выбран
        await expect(page.locator('.bg-blue-50')).toBeVisible()

        // Проверяем, что кнопка конвертации стала активной
        await expect(page.locator('button:has-text("Конвертировать документ")')).toBeEnabled()
    })

    test('should handle conversion process', async ({ page }) => {
        // Мокаем API ответ
        await page.route('/api/convert', async route => {
            const mockResponse = {
                success: true,
                html: `
          <div style="font-size: 14pt; margin-left: 20pt; line-height: 1.5;">
            <h1 style="font-size: 24pt; margin-bottom: 12pt;">Test Document</h1>
            <p style="text-indent: 18pt; margin-bottom: 6pt;">This is a test paragraph with specific formatting.</p>
            <ul style="margin-left: 24pt;">
              <li style="margin-bottom: 4pt;">First item</li>
              <li style="margin-bottom: 4pt;">Second item</li>
            </ul>
            <table style="border-collapse: collapse; width: 100%; margin: 12pt 0;">
              <tr>
                <td style="border: 1pt solid #000; padding: 4pt;">Cell 1</td>
                <td style="border: 1pt solid #000; padding: 4pt;">Cell 2</td>
              </tr>
            </table>
          </div>
        `,
                assets: [],
                fonts: [],
                method: 'libreoffice'
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockResponse)
            })
        })

        // Выбираем файл
        const testFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')
        await page.setInputFiles('input[type="file"]', testFilePath)

        // Запускаем конвертацию
        await page.click('button:has-text("Конвертировать документ")')

        // Ждем завершения конвертации
        await expect(page.locator('.bg-green-50')).toBeVisible({ timeout: 10000 })

        // Проверяем, что DocumentViewer появился
        await expect(page.locator('iframe')).toBeVisible()
    })

    test('should preserve formatting in iframe', async ({ page }) => {
        // Мокаем API с конкретными стилями
        await page.route('/api/convert', async route => {
            const mockResponse = {
                success: true,
                html: `
          <div style="font-size: 14pt; margin-left: 20pt; line-height: 1.5;">
            <h1 style="font-size: 24pt; margin-bottom: 12pt;">Test Document</h1>
            <p style="text-indent: 18pt; margin-bottom: 6pt;">This is a test paragraph with specific formatting.</p>
            <ul style="margin-left: 24pt;">
              <li style="margin-bottom: 4pt;">First item</li>
              <li style="margin-bottom: 4pt;">Second item</li>
            </ul>
            <table style="border-collapse: collapse; width: 100%; margin: 12pt 0;">
              <tr>
                <td style="border: 1pt solid #000; padding: 4pt;">Cell 1</td>
                <td style="border: 1pt solid #000; padding: 4pt;">Cell 2</td>
              </tr>
            </table>
          </div>
        `,
                assets: [],
                fonts: [],
                method: 'libreoffice'
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockResponse)
            })
        })

        // Выбираем файл и конвертируем
        const testFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')
        await page.setInputFiles('input[type="file"]', testFilePath)
        await page.click('button:has-text("Конвертировать документ")')

        // Ждем появления iframe
        await expect(page.locator('iframe')).toBeVisible({ timeout: 10000 })

        // Получаем iframe и проверяем стили внутри
        const iframe = page.frameLocator('iframe')

        // Проверяем, что iframe загружен
        await expect(iframe.locator('body')).toBeVisible()

        // Проверяем computed styles элементов
        const h1 = iframe.locator('h1')
        await expect(h1).toBeVisible()

        // Проверяем стили заголовка
        const h1Styles = await h1.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
                fontSize: computed.fontSize,
                marginBottom: computed.marginBottom,
                fontWeight: computed.fontWeight
            }
        })

        expect(h1Styles.fontSize).toBe('24pt')
        expect(h1Styles.marginBottom).toBe('12pt')
        expect(h1Styles.fontWeight).toBe('bold')

        // Проверяем стили параграфа
        const paragraph = iframe.locator('p')
        await expect(paragraph).toBeVisible()

        const paragraphStyles = await paragraph.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
                textIndent: computed.textIndent,
                marginBottom: computed.marginBottom,
                fontSize: computed.fontSize
            }
        })

        expect(paragraphStyles.textIndent).toBe('18pt')
        expect(paragraphStyles.marginBottom).toBe('6pt')
        expect(paragraphStyles.fontSize).toBe('14pt')

        // Проверяем стили списка
        const list = iframe.locator('ul')
        await expect(list).toBeVisible()

        const listStyles = await list.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
                marginLeft: computed.marginLeft,
                paddingLeft: computed.paddingLeft
            }
        })

        expect(listStyles.marginLeft).toBe('24pt')

        // Проверяем стили таблицы
        const table = iframe.locator('table')
        await expect(table).toBeVisible()

        const tableStyles = await table.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
                borderCollapse: computed.borderCollapse,
                width: computed.width,
                margin: computed.margin
            }
        })

        expect(tableStyles.borderCollapse).toBe('collapse')
        expect(tableStyles.width).toBe('100%')
        expect(tableStyles.margin).toContain('12pt')

        // Проверяем стили ячеек таблицы
        const cell = iframe.locator('td').first()
        await expect(cell).toBeVisible()

        const cellStyles = await cell.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
                border: computed.border,
                padding: computed.padding
            }
        })

        expect(cellStyles.border).toContain('1pt solid')
        expect(cellStyles.padding).toContain('4pt')
    })

    test('should handle conversion errors gracefully', async ({ page }) => {
        // Мокаем ошибку API
        await page.route('/api/convert', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'LibreOffice недоступен'
                })
            })
        })

        // Выбираем файл и пытаемся конвертировать
        const testFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')
        await page.setInputFiles('input[type="file"]', testFilePath)
        await page.click('button:has-text("Конвертировать документ")')

        // Проверяем, что ошибка отображается
        await expect(page.locator('.bg-red-50')).toBeVisible()
        await expect(page.locator('.bg-red-50')).toContainText('LibreOffice недоступен')
    })

    test('should handle different file types', async ({ page }) => {
        // Тестируем DOCX файл
        const docxFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')
        await page.setInputFiles('input[type="file"]', docxFilePath)
        await expect(page.locator('.bg-blue-50')).toBeVisible()

        // Сбрасываем выбор
        await page.click('button[aria-label="Reset"]')
        await expect(page.locator('.bg-blue-50')).not.toBeVisible()

        // Тестируем RTF файл
        const rtfFilePath = path.join(__dirname, 'fixtures', 'test-document.rtf')
        await page.setInputFiles('input[type="file"]', rtfFilePath)
        await expect(page.locator('.bg-blue-50')).toBeVisible()
    })

    test('should validate file size', async ({ page }) => {
        // Создаем большой файл (заглушка)
        const largeFilePath = path.join(__dirname, 'fixtures', 'large-document.docx')

        // Мокаем файл размером больше 50MB
        await page.route('/api/convert', async route => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Размер файла не должен превышать 50MB'
                })
            })
        })

        await page.setInputFiles('input[type="file"]', largeFilePath)
        await page.click('button:has-text("Конвертировать документ")')

        // Проверяем, что ошибка размера файла отображается
        await expect(page.locator('.bg-red-50')).toBeVisible()
    })

    test('should handle download functionality', async ({ page }) => {
        // Мокаем успешную конвертацию
        await page.route('/api/convert', async route => {
            const mockResponse = {
                success: true,
                html: '<h1>Test Document</h1><p>Test content</p>',
                assets: [],
                fonts: [],
                method: 'libreoffice'
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockResponse)
            })
        })

        // Выбираем файл и конвертируем
        const testFilePath = path.join(__dirname, 'fixtures', 'test-document.docx')
        await page.setInputFiles('input[type="file"]', testFilePath)
        await page.click('button:has-text("Конвертировать документ")')

        // Ждем завершения конвертации
        await expect(page.locator('.bg-green-50')).toBeVisible()

        // Проверяем, что кнопка скачивания появилась
        await expect(page.locator('button:has-text("Скачать HTML")')).toBeVisible()

        // Тестируем скачивание (мокаем download)
        const downloadPromise = page.waitForEvent('download')
        await page.click('button:has-text("Скачать HTML")')
        const download = await downloadPromise

        expect(download.suggestedFilename()).toContain('.html')
    })
})
