/**
 * PDF 本地工具 - 纯前端实现
 *
 * 使用 pdf-lib.js 在浏览器中直接处理 PDF：
 * - 提取指定连续页码范围
 * - 合并两个 PDF 文件
 *
 * 所有操作均在用户本地完成，文件不会上传到服务器。
 */

const { PDFDocument, PageSizes, PDFName, PDFDict } = PDFLib;

// A4 尺寸（单位：PDF 点，1 点 = 1/72 英寸）
const A4_WIDTH = PageSizes.A4[0];   // 595.276
const A4_HEIGHT = PageSizes.A4[1];  // 841.89
const A4_TOLERANCE = 1.0;           // 允许的尺寸误差

function showMessage(element, text, type = 'success') {
    element.textContent = text;
    element.className = 'message ' + type;
}

function clearMessage(element) {
    element.textContent = '';
    element.className = 'message';
}

async function checkType3(file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(arrayBuffer);
    return collectType3Pages(doc);
}

async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsArrayBuffer(file);
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function extractPages(file, startPage, endPage) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    if (startPage < 1 || endPage > totalPages || startPage > endPage) {
        throw new Error(`页码范围无效。该 PDF 共 ${totalPages} 页，可提取范围：1-${totalPages}`);
    }

    const newDoc = await PDFDocument.create();
    // pdf-lib 使用 0 基索引，endPage 不包含
    const pageIndices = [];
    for (let i = startPage - 1; i < endPage; i++) {
        pageIndices.push(i);
    }

    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}

function isA4(size) {
    return (
        Math.abs(size.width - A4_WIDTH) <= A4_TOLERANCE &&
        Math.abs(size.height - A4_HEIGHT) <= A4_TOLERANCE
    );
}

function collectType3Pages(doc) {
    /**
     * 检测 PDF 中包含 Type3 字体的页面，返回 1 基页码数组。
     * Type3 字体的字形由 PDF 图形操作绘制，可能在某些阅读器或打印机上显示异常。
     */
    const type3Pages = [];
    const pages = doc.getPages();

    for (let i = 0; i < pages.length; i++) {
        const resources = pages[i].node.Resources();
        if (!resources) continue;

        const fontDict = resources.lookup(PDFName.of('Font'));
        if (!(fontDict instanceof PDFDict)) continue;

        for (const fontName of fontDict.keys()) {
            const font = fontDict.lookup(fontName);
            if (!(font instanceof PDFDict)) continue;

            const subtype = font.lookup(PDFName.of('Subtype'));
            if (subtype && subtype.asString() === '/Type3') {
                type3Pages.push(i + 1); // 转换为 1 基页码
                break; // 同一页多个 Type3 字体只需记录一次
            }
        }
    }

    return type3Pages;
}

function countNonA4Pages(doc) {
    let count = 0;
    for (const page of doc.getPages()) {
        if (!isA4(page.getSize())) {
            count++;
        }
    }
    return count;
}

async function copyPageAsIs(targetDoc, srcDoc, pageIndex) {
    // 直接复制原页面，最大程度保留可编辑性和元数据
    const [copiedPage] = await targetDoc.copyPages(srcDoc, [pageIndex]);
    targetDoc.addPage(copiedPage);
}

async function addScaledA4Page(targetDoc, sourcePage) {
    const originalSize = sourcePage.getSize();
    const embedded = await targetDoc.embedPage(sourcePage);

    // 等比例缩放，使页面完整放入 A4，居中显示
    const scale = Math.min(A4_WIDTH / originalSize.width, A4_HEIGHT / originalSize.height);
    const newWidth = originalSize.width * scale;
    const newHeight = originalSize.height * scale;
    const x = (A4_WIDTH - newWidth) / 2;
    const y = (A4_HEIGHT - newHeight) / 2;

    const newPage = targetDoc.addPage(PageSizes.A4);
    newPage.drawPage(embedded, {
        x: x,
        y: y,
        width: newWidth,
        height: newHeight,
    });
}

async function appendDocumentPages(targetDoc, srcDoc) {
    const pages = srcDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        if (isA4(pages[i].getSize())) {
            await copyPageAsIs(targetDoc, srcDoc, i);
        } else {
            await addScaledA4Page(targetDoc, pages[i]);
        }
    }
}

async function mergePdfs(firstFile, secondFile, mode = 'copy') {
    const [firstBuffer, secondBuffer] = await Promise.all([
        readFileAsArrayBuffer(firstFile),
        readFileAsArrayBuffer(secondFile),
    ]);

    const firstDoc = await PDFDocument.load(firstBuffer);
    const secondDoc = await PDFDocument.load(secondBuffer);
    const newDoc = await PDFDocument.create();

    if (mode === 'scale') {
        // 检查是否存在非 A4 页面
        const nonA4First = countNonA4Pages(firstDoc);
        const nonA4Second = countNonA4Pages(secondDoc);
        const nonA4Count = nonA4First + nonA4Second;
        if (nonA4Count > 0) {
            const firstInfo = nonA4First > 0 ? `文件1 有 ${nonA4First} 页` : '';
            const secondInfo = nonA4Second > 0 ? `文件2 有 ${nonA4Second} 页` : '';
            const summary = [firstInfo, secondInfo].filter(Boolean).join('，');

            const message =
                `检测到 ${summary} 不是标准 A4 尺寸（${A4_WIDTH.toFixed(2)} x ${A4_HEIGHT.toFixed(2)}）。\n\n` +
                `是否继续？系统会将这些页面等比例缩放至 A4 大小（居中显示，不裁剪内容）。`;
            if (!window.confirm(message)) {
                throw new Error('已取消合并');
            }
        }

        await appendDocumentPages(newDoc, firstDoc);
        await appendDocumentPages(newDoc, secondDoc);
    } else {
        // 直接合并：最大限度保留原始页面特性
        const firstPages = await newDoc.copyPages(firstDoc, firstDoc.getPageIndices());
        firstPages.forEach(page => newDoc.addPage(page));

        const secondPages = await newDoc.copyPages(secondDoc, secondDoc.getPageIndices());
        secondPages.forEach(page => newDoc.addPage(page));
    }

    const pdfBytes = await newDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}

document.getElementById('extractForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('extractMessage');
    clearMessage(msg);

    const fileInput = document.getElementById('extractInput');
    const startPage = parseInt(document.getElementById('startPage').value, 10);
    const endPage = parseInt(document.getElementById('endPage').value, 10);
    const btn = document.getElementById('extractBtn');

    if (!fileInput.files || fileInput.files.length === 0) {
        showMessage(msg, '请选择 PDF 文件', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '处理中...';

    try {
        const blob = await extractPages(fileInput.files[0], startPage, endPage);
        const baseName = fileInput.files[0].name.replace(/\.pdf$/i, '');
        downloadBlob(blob, `extracted_${baseName}.pdf`);
        showMessage(msg, `已提取第 ${startPage}-${endPage} 页，共 ${endPage - startPage + 1} 页`);
    } catch (err) {
        showMessage(msg, err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '提取并下载';
    }
});

document.getElementById('mergeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('mergeMessage');
    clearMessage(msg);

    const firstInput = document.getElementById('firstPdf');
    const secondInput = document.getElementById('secondPdf');
    const btn = document.getElementById('mergeBtn');

    if (!firstInput.files || firstInput.files.length === 0) {
        showMessage(msg, '请选择第一个 PDF 文件', 'error');
        return;
    }
    if (!secondInput.files || secondInput.files.length === 0) {
        showMessage(msg, '请选择第二个 PDF 文件', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '处理中...';

    try {
        const mode = document.querySelector('input[name="mergeMode"]:checked').value;
        const blob = await mergePdfs(firstInput.files[0], secondInput.files[0], mode);
        const baseName = firstInput.files[0].name.replace(/\.pdf$/i, '');
        downloadBlob(blob, `merged_${baseName}.pdf`);
        showMessage(msg, 'PDF 合并完成');
    } catch (err) {
        showMessage(msg, err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '合并并下载';
    }
});


document.getElementById('type3Form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('type3Message');
    clearMessage(msg);

    const fileInput = document.getElementById('type3Input');
    const btn = document.getElementById('type3Btn');

    if (!fileInput.files || fileInput.files.length === 0) {
        showMessage(msg, '请选择 PDF 文件', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '检测中...';

    try {
        const type3Pages = await checkType3(fileInput.files[0]);
        if (type3Pages.length > 0) {
            const maxShown = 10;
            let pagesText;
            if (type3Pages.length <= maxShown) {
                pagesText = type3Pages.join('、');
            } else {
                pagesText = type3Pages.slice(0, maxShown).join('、') + ` 等（共 ${type3Pages.length} 页）`;
            }
            showMessage(msg, `检测结果：该 PDF 在第 ${pagesText} 页包含 Type3 字体，部分阅读器或打印机可能显示异常。`, 'warning');
        } else {
            showMessage(msg, '检测结果：该 PDF 未包含 Type3 字体。');
        }
    } catch (err) {
        showMessage(msg, err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '开始检测';
    }
});
