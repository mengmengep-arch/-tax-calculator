// =============== Global Variables ===============
const CURRENT_YEAR = 2569;
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

let salaryData = {};
let currentEditingMonth = null;
let uploadedImage = null;

// =============== Initialize App ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Salary Slips Manager initialized');
    loadSalaryData();
    renderMonths();
    updateSummary();
    setupDragAndDrop();
    setupOCRSettings();
});

// =============== Data Management ===============
function loadSalaryData() {
    const saved = localStorage.getItem('salarySlips_2569');
    if (saved) {
        try {
            salaryData = JSON.parse(saved);
            console.log('✅ Loaded salary data:', salaryData);
        } catch (e) {
            console.error('❌ Error loading salary data:', e);
            salaryData = {};
        }
    } else {
        salaryData = {};
    }
}

function saveSalaryData() {
    try {
        localStorage.setItem('salarySlips_2569', JSON.stringify(salaryData));
        console.log('✅ Saved salary data');
    } catch (e) {
        console.error('❌ Error saving salary data:', e);
        if (e.name === 'QuotaExceededError') {
            alert('⚠️ พื้นที่เก็บข้อมูลเต็ม! กรุณาลบข้อมูลเก่าหรือภาพที่ไม่ใช้');
        }
    }
}

// =============== Render Months ===============
function renderMonths() {
    const grid = document.getElementById('monthsGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= 12; i++) {
        const monthKey = i.toString().padStart(2, '0');
        const monthData = salaryData[monthKey];
        const hasData = monthData && monthData.salary > 0;

        const card = document.createElement('div');
        card.className = `month-card ${hasData ? 'has-data' : 'no-data'}`;

        let content = `
            <div class="month-header">
                <div class="month-title">🗓️ ${THAI_MONTHS[i-1]} ${CURRENT_YEAR}</div>
                <div class="month-actions">
                    ${hasData ? `
                        <button class="btn-small btn-edit" onclick="editMonth('${monthKey}')">แก้ไข</button>
                        <button class="btn-small btn-delete" onclick="deleteMonth('${monthKey}')">ลบ</button>
                    ` : ''}
                </div>
            </div>
        `;

        if (hasData) {
            const totalIncome = monthData.totalIncome || (monthData.salary || 0);
            const totalDeduct = monthData.totalDeduct || (monthData.socialSecurity || 0);
            const netPay = monthData.netPay || (totalIncome - totalDeduct);

            content += `
                <div class="month-data">
                    <!-- Summary -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                        <p style="margin: 0 0 5px 0; font-size: 0.85rem;">💰 รายได้รวม: <strong>${formatNumber(totalIncome)} บาท</strong></p>
                        <p style="margin: 0 0 5px 0; font-size: 0.85rem;">💸 หักรวม: <strong>${formatNumber(totalDeduct)} บาท</strong></p>
                        <p style="margin: 0; font-size: 1rem; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">✨ <strong>รับสุทธิ: ${formatNumber(netPay)} บาท</strong></p>
                    </div>

                    <!-- Details -->
                    <details style="margin-bottom: 10px;">
                        <summary style="cursor: pointer; font-weight: 600; color: #667eea; margin-bottom: 8px;">📋 ดูรายละเอียด</summary>
                        <div style="padding-left: 15px; font-size: 0.85rem;">
                            <p style="margin: 5px 0;"><strong>INCOME:</strong></p>
                            <p style="margin: 3px 0; color: #666;">• เงินเดือน: ${formatNumber(monthData.salary || 0)} บาท</p>
                            ${monthData.luncheonAllowance ? `<p style="margin: 3px 0; color: #666;">• ค่าอาหาร: ${formatNumber(monthData.luncheonAllowance)} บาท</p>` : ''}
                            ${monthData.otMeal ? `<p style="margin: 3px 0; color: #666;">• ค่าอาหาร OT: ${formatNumber(monthData.otMeal)} บาท</p>` : ''}
                            ${monthData.overtime15x ? `<p style="margin: 3px 0; color: #666;">• OT 1.5X: ${formatNumber(monthData.overtime15x)} บาท</p>` : ''}
                            ${monthData.overtime20x ? `<p style="margin: 3px 0; color: #666;">• OT 2.0X: ${formatNumber(monthData.overtime20x)} บาท</p>` : ''}
                            ${monthData.overtime30x ? `<p style="margin: 3px 0; color: #666;">• OT 3.0X: ${formatNumber(monthData.overtime30x)} บาท</p>` : ''}
                            ${monthData.bonus ? `<p style="margin: 3px 0; color: #666;">• โบนัส: ${formatNumber(monthData.bonus)} บาท</p>` : ''}

                            <p style="margin: 8px 0 5px 0;"><strong>DEDUCT:</strong></p>
                            <p style="margin: 3px 0; color: #666;">• ประกันสังคม: ${formatNumber(monthData.socialSecurity || 0)} บาท</p>
                            ${monthData.providentFund ? `<p style="margin: 3px 0; color: #666;">• กองทุนสำรอง: ${formatNumber(monthData.providentFund)} บาท</p>` : ''}
                            ${monthData.taxWithheld ? `<p style="margin: 3px 0; color: #666;">• ภาษี: ${formatNumber(monthData.taxWithheld)} บาท</p>` : ''}
                            ${monthData.inHouseLoan ? `<p style="margin: 3px 0; color: #666;">• เงินกู้: ${formatNumber(monthData.inHouseLoan)} บาท</p>` : ''}
                            ${monthData.otherDeductions ? `<p style="margin: 3px 0; color: #666;">• รายการหักอื่นๆ: ${formatNumber(monthData.otherDeductions)} บาท</p>` : ''}
                        </div>
                    </details>

                    ${monthData.notes ? `<p style="font-size: 0.85rem; color: #666; margin-top: 10px;"><em>📝 ${monthData.notes}</em></p>` : ''}
                    ${monthData.slip_image ? `
                        <div class="slip-image-thumb" onclick="viewImage('${monthKey}')">
                            📎 มีภาพสลิปแนบ (คลิกเพื่อดู)
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            content += `
                <p style="color: #999; text-align: center; padding: 20px 0;">ยังไม่มีข้อมูล</p>
                <button class="btn-small btn-add" onclick="addMonth('${monthKey}')">+ เพิ่มข้อมูล</button>
            `;
        }

        card.innerHTML = content;
        grid.appendChild(card);
    }
}

// =============== Update Summary ===============
function updateSummary() {
    let totalIncome = 0;
    let monthsCount = 0;

    for (let monthKey in salaryData) {
        const data = salaryData[monthKey];
        if (data && data.salary > 0) {
            // Use totalIncome from saved data if available, otherwise calculate
            const monthIncome = data.totalIncome || (data.salary || 0);
            totalIncome += monthIncome;
            monthsCount++;
        }
    }

    const avgIncome = monthsCount > 0 ? totalIncome / monthsCount : 0;

    document.getElementById('totalYearIncome').textContent = formatNumber(totalIncome) + ' บาท';
    document.getElementById('avgMonthIncome').textContent = formatNumber(avgIncome) + ' บาท';
    document.getElementById('monthsWithData').textContent = monthsCount;
}

// =============== Modal Functions ===============
function addMonth(monthKey) {
    currentEditingMonth = monthKey;
    document.getElementById('modalTitle').textContent = `เพิ่มข้อมูล ${THAI_MONTHS[parseInt(monthKey) - 1]} ${CURRENT_YEAR}`;
    document.getElementById('currentMonth').value = monthKey;

    // Reset form
    document.getElementById('slipForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('ocrStatus').style.display = 'none';
    uploadedImage = null;

    openModal();
}

function editMonth(monthKey) {
    currentEditingMonth = monthKey;
    const data = salaryData[monthKey];

    document.getElementById('modalTitle').textContent = `แก้ไข ${THAI_MONTHS[parseInt(monthKey) - 1]} ${CURRENT_YEAR}`;
    document.getElementById('currentMonth').value = monthKey;

    // Fill form - INCOME
    document.getElementById('salary').value = data.salary || 0;
    document.getElementById('luncheonAllowance').value = data.luncheonAllowance || 0;
    document.getElementById('otMeal').value = data.otMeal || 0;
    document.getElementById('overtime15x').value = data.overtime15x || 0;
    document.getElementById('overtime20x').value = data.overtime20x || 0;
    document.getElementById('overtime30x').value = data.overtime30x || 0;
    document.getElementById('bonus').value = data.bonus || 0;

    // Fill form - DEDUCT
    document.getElementById('socialSecurity').value = data.socialSecurity || 750;
    document.getElementById('providentFund').value = data.providentFund || 0;
    document.getElementById('taxWithheld').value = data.taxWithheld || 0;
    document.getElementById('inHouseLoan').value = data.inHouseLoan || 0;
    document.getElementById('otherDeductions').value = data.otherDeductions || 0;

    document.getElementById('notes').value = data.notes || '';

    // Show existing image if any
    if (data.slip_image) {
        document.getElementById('imagePreview').src = data.slip_image;
        document.getElementById('imagePreview').style.display = 'block';
        uploadedImage = data.slip_image;
    } else {
        document.getElementById('imagePreview').style.display = 'none';
        uploadedImage = null;
    }

    document.getElementById('ocrStatus').style.display = 'none';

    openModal();
}

function deleteMonth(monthKey) {
    if (confirm(`ต้องการลบข้อมูล ${THAI_MONTHS[parseInt(monthKey) - 1]} ${CURRENT_YEAR} หรือไม่?`)) {
        delete salaryData[monthKey];
        saveSalaryData();
        renderMonths();
        updateSummary();
        console.log(`✅ Deleted data for month ${monthKey}`);
    }
}

function openModal() {
    document.getElementById('slipModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('slipModal').style.display = 'none';
    currentEditingMonth = null;
    uploadedImage = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('slipModal');
    if (event.target == modal) {
        closeModal();
    }
}

// =============== Form Submit ===============
document.getElementById('slipForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const monthKey = document.getElementById('currentMonth').value;

    // INCOME
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    const luncheonAllowance = parseFloat(document.getElementById('luncheonAllowance').value) || 0;
    const otMeal = parseFloat(document.getElementById('otMeal').value) || 0;
    const overtime15x = parseFloat(document.getElementById('overtime15x').value) || 0;
    const overtime20x = parseFloat(document.getElementById('overtime20x').value) || 0;
    const overtime30x = parseFloat(document.getElementById('overtime30x').value) || 0;
    const bonus = parseFloat(document.getElementById('bonus').value) || 0;

    // DEDUCT
    const socialSecurity = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const providentFund = parseFloat(document.getElementById('providentFund').value) || 0;
    const taxWithheld = parseFloat(document.getElementById('taxWithheld').value) || 0;
    const inHouseLoan = parseFloat(document.getElementById('inHouseLoan').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;

    const notes = document.getElementById('notes').value.trim();

    // Calculate totals
    const totalIncome = salary + luncheonAllowance + otMeal + overtime15x + overtime20x + overtime30x + bonus;
    const totalDeduct = socialSecurity + providentFund + taxWithheld + inHouseLoan + otherDeductions;
    const netPay = totalIncome - totalDeduct;

    salaryData[monthKey] = {
        // INCOME
        salary: salary,
        luncheonAllowance: luncheonAllowance,
        otMeal: otMeal,
        overtime15x: overtime15x,
        overtime20x: overtime20x,
        overtime30x: overtime30x,
        bonus: bonus,
        totalIncome: totalIncome,

        // DEDUCT
        socialSecurity: socialSecurity,
        providentFund: providentFund,
        taxWithheld: taxWithheld,
        inHouseLoan: inHouseLoan,
        otherDeductions: otherDeductions,
        totalDeduct: totalDeduct,

        // NET
        netPay: netPay,

        notes: notes,
        slip_image: uploadedImage,
        date_added: new Date().toISOString()
    };

    saveSalaryData();
    renderMonths();
    updateSummary();
    closeModal();

    console.log(`✅ Saved data for month ${monthKey}`, salaryData[monthKey]);
    alert(`✅ บันทึกข้อมูล ${THAI_MONTHS[parseInt(monthKey) - 1]} เรียบร้อยแล้ว!`);
});

// =============== File Upload & OCR ===============
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
        alert('⚠️ กรุณาเลือกไฟล์รูปภาพหรือ PDF เท่านั้น');
        return;
    }

    if (isPDF) {
        // Handle PDF file
        await handlePDFFile(file);
    } else {
        // Handle image file
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageDataUrl = e.target.result;
            uploadedImage = imageDataUrl;

            // Show preview
            const preview = document.getElementById('imagePreview');
            preview.src = imageDataUrl;
            preview.style.display = 'block';

            // Start OCR
            performOCR(imageDataUrl);
        };
        reader.readAsDataURL(file);
    }
}

async function handlePDFFile(file) {
    try {
        console.log('📄 Processing PDF file...');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        console.log(`✅ PDF loaded: ${pdf.numPages} page(s)`);

        // Get first page
        const page = await pdf.getPage(1);

        // Set scale for better quality
        const scale = 2.0;
        const viewport = page.getViewport({ scale: scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png');
        uploadedImage = imageDataUrl;

        // Show preview
        const preview = document.getElementById('imagePreview');
        preview.src = imageDataUrl;
        preview.style.display = 'block';

        console.log('✅ PDF converted to image');

        // Start OCR
        performOCR(imageDataUrl);

    } catch (error) {
        console.error('❌ Error processing PDF:', error);
        alert('⚠️ ไม่สามารถอ่านไฟล์ PDF ได้\nกรุณาลองใช้รูปภาพแทน');
    }
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('fileInput').files = files;
            handleFileSelect({ target: { files: files } });
        }
    });
}

async function performOCR(imageDataUrl) {
    // Check OCR settings to determine which engine to use
    const saved = localStorage.getItem('ocrSettings');
    let engine = 'proxy'; // Default to Backend Proxy (ฟรี 10 รูป/วัน)
    let apiKey = null;

    if (saved) {
        try {
            const settings = JSON.parse(saved);
            engine = settings.engine || 'proxy';
            apiKey = settings.apiKey;
        } catch (e) {
            console.error('Error loading OCR settings:', e);
        }
    }

    // Route to appropriate OCR engine
    if (engine === 'openai' && apiKey) {
        // Use Direct OpenAI API with user's API Key
        console.log('🔑 Using Direct OpenAI API (Own Key)');
        await performOCRWithOpenAI(imageDataUrl, apiKey);
    } else if (engine === 'tesseract') {
        // Use Tesseract OCR (free, offline)
        console.log('🆓 Using Tesseract OCR (Free)');
        await performOCRWithTesseract(imageDataUrl);
    } else {
        // Use Backend Proxy (default)
        console.log('🌐 Using Backend Proxy (Free 10/day)');
        await performOCRWithOpenAI(imageDataUrl, null); // null = use proxy
    }
}

async function performOCRWithTesseract(imageDataUrl) {
    const statusDiv = document.getElementById('ocrStatus');
    const messageSpan = document.getElementById('ocrMessage');
    const progressBar = document.getElementById('ocrProgress');

    statusDiv.className = 'ocr-status processing';
    statusDiv.style.display = 'block';
    messageSpan.textContent = 'กำลังอ่านข้อมูลจากสลิป... (Tesseract)';
    progressBar.style.width = '10%';

    try {
        console.log('🔍 Starting Tesseract OCR...');

        const worker = await Tesseract.createWorker('tha+eng', 1, {
            logger: m => {
                console.log(m);
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    progressBar.style.width = progress + '%';
                    messageSpan.textContent = `กำลังอ่านข้อมูล... ${progress}%`;
                }
            }
        });

        const { data: { text } } = await worker.recognize(imageDataUrl);
        await worker.terminate();

        console.log('✅ OCR Result:', text);

        // Extract data from OCR text
        const extractedData = extractSalaryData(text);

        if (extractedData.found) {
            // Auto-fill form
            if (extractedData.salary) document.getElementById('salary').value = extractedData.salary;
            if (extractedData.socialSecurity) document.getElementById('socialSecurity').value = extractedData.socialSecurity;

            statusDiv.className = 'ocr-status success';
            messageSpan.textContent = '✅ อ่านข้อมูลจากสลิปสำเร็จ! (กรุณาตรวจสอบความถูกต้อง)';
            progressBar.style.width = '100%';
        } else {
            statusDiv.className = 'ocr-status error';
            messageSpan.textContent = '⚠️ ไม่พบข้อมูลในสลิป กรุณากรอกด้วยตนเอง';
            progressBar.style.width = '100%';
        }

    } catch (error) {
        console.error('❌ OCR Error:', error);
        statusDiv.className = 'ocr-status error';
        messageSpan.textContent = '❌ เกิดข้อผิดพลาดในการอ่านสลิป กรุณากรอกด้วยตนเอง';
        progressBar.style.width = '100%';
    }
}

async function performOCRWithBackendProxy(imageDataUrl, statusDiv, messageSpan, progressBar) {
    // Backend Proxy URL
    const BACKEND_URL = 'https://tax-calculator-backend.vercel.app/api/ocr';

    try {
        messageSpan.textContent = '🌐 กำลังเชื่อมต่อ Backend Proxy...';
        progressBar.style.width = '20%';

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageDataUrl: imageDataUrl
            })
        });

        progressBar.style.width = '70%';

        if (!response.ok) {
            const errorData = await response.json();

            // Handle rate limit error
            if (errorData.code === 'RATE_LIMIT_EXCEEDED') {
                statusDiv.className = 'ocr-status error';
                messageSpan.textContent = `⚠️ ${errorData.error}`;
                progressBar.style.width = '100%';

                const confirmMessage = `คุณใช้งานครบ ${errorData.limit} รูป/วัน แล้ว\n\nต้องการใช้ API Key ของคุณเองแทนหรือไม่?\n(ไม่จำกัดจำนวน แต่ต้องมี API Key)`;
                if (confirm(confirmMessage)) {
                    // Redirect to settings
                    openSettings();
                }
                return;
            }

            throw new Error(errorData.error || 'Backend error');
        }

        const data = await response.json();
        progressBar.style.width = '90%';

        console.log('✅ Backend Proxy Response:', data);

        // Extract the JSON from the OpenAI response
        const resultText = data.data.choices[0].message.content.trim();
        console.log('📝 Extracted text:', resultText);

        // Parse JSON
        let jsonText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extractedData = JSON.parse(jsonText);

        console.log('📊 Parsed data:', extractedData);

        // Auto-fill form - INCOME
        if (extractedData.salary) document.getElementById('salary').value = extractedData.salary;
        if (extractedData.luncheonAllowance) document.getElementById('luncheonAllowance').value = extractedData.luncheonAllowance;
        if (extractedData.otMeal) document.getElementById('otMeal').value = extractedData.otMeal;
        if (extractedData.overtime15x) document.getElementById('overtime15x').value = extractedData.overtime15x;
        if (extractedData.overtime20x) document.getElementById('overtime20x').value = extractedData.overtime20x;
        if (extractedData.overtime30x) document.getElementById('overtime30x').value = extractedData.overtime30x;
        if (extractedData.bonus) document.getElementById('bonus').value = extractedData.bonus;

        // Auto-fill form - DEDUCT
        if (extractedData.socialSecurity) document.getElementById('socialSecurity').value = extractedData.socialSecurity;
        if (extractedData.providentFund) document.getElementById('providentFund').value = extractedData.providentFund;
        if (extractedData.taxWithheld) document.getElementById('taxWithheld').value = extractedData.taxWithheld;
        if (extractedData.inHouseLoan) document.getElementById('inHouseLoan').value = extractedData.inHouseLoan;
        if (extractedData.otherDeductions) document.getElementById('otherDeductions').value = extractedData.otherDeductions;

        statusDiv.className = 'ocr-status success';
        messageSpan.textContent = `✅ อ่านข้อมูลสำเร็จ! (เหลือ ${data.usage.remaining}/${data.usage.limit} รูป/วัน)`;
        progressBar.style.width = '100%';

    } catch (error) {
        console.error('❌ Backend Proxy Error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        statusDiv.className = 'ocr-status error';

        // Show detailed error message
        let errorMsg = '❌ ไม่สามารถเชื่อมต่อ Backend ได้';
        if (error.message.includes('Failed to fetch')) {
            errorMsg = '❌ ไม่สามารถเชื่อมต่อ Backend ได้ (Network Error)\n\nสาเหตุที่เป็นไปได้:\n- อินเทอร์เน็ตขัดข้อง\n- Backend server ไม่ตอบสนอง\n- Firewall/Antivirus block';
        } else if (error.message.includes('CORS')) {
            errorMsg = '❌ CORS Policy Error - Backend ไม่อนุญาตให้เข้าถึงจากหน้านี้';
        }

        messageSpan.textContent = errorMsg;
        progressBar.style.width = '100%';

        // Offer fallback
        if (confirm('ไม่สามารถเชื่อมต่อ Backend Proxy ได้\n\n' + error.message + '\n\nต้องการใช้ Tesseract OCR (ฟรี) แทนหรือไม่?')) {
            await performOCRWithTesseract(imageDataUrl);
        }
    }
}

async function performOCRWithOpenAI(imageDataUrl, apiKey) {
    const statusDiv = document.getElementById('ocrStatus');
    const messageSpan = document.getElementById('ocrMessage');
    const progressBar = document.getElementById('ocrProgress');

    statusDiv.className = 'ocr-status processing';
    statusDiv.style.display = 'block';
    messageSpan.textContent = '⭐ กำลังอ่านข้อมูลจากสลิป... (OpenAI Vision)';
    progressBar.style.width = '30%';

    try {
        console.log('🔍 Starting OpenAI Vision OCR...');

        // Check if using Backend Proxy or Direct API
        const useProxy = !apiKey || apiKey.trim() === '';

        if (useProxy) {
            // Use Backend Proxy (ฟรี 10 รูป/วัน)
            console.log('📡 Using Backend Proxy (Free 10/day)');
            return await performOCRWithBackendProxy(imageDataUrl, statusDiv, messageSpan, progressBar);
        }

        // Use Direct OpenAI API (ไม่จำกัด แต่ใช้ API Key ของผู้ใช้)
        console.log('🔑 Using Direct OpenAI API (Own Key)');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Extract ALL salary information from this Thai pay slip image.

Return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "salary": <base salary as number WITH decimals>,
  "luncheonAllowance": <luncheon allowance/ค่าอาหาร as number WITH decimals or 0>,
  "otMeal": <OT meal allowance as number WITH decimals or 0>,
  "overtime15x": <overtime 1.5X as number WITH decimals or 0>,
  "overtime20x": <overtime 2.0X as number WITH decimals or 0>,
  "overtime30x": <overtime 3.0X as number WITH decimals or 0>,
  "bonus": <bonus/โบนัส as number WITH decimals or 0>,
  "socialSecurity": <social security/ประกันสังคม deduction as number WITH decimals or 0>,
  "providentFund": <provident fund/กองทุนสำรอง deduction as number WITH decimals or 0>,
  "taxWithheld": <tax/ภาษี deduction as number WITH decimals or 0>,
  "inHouseLoan": <in-house loan/เงินกู้ deduction as number WITH decimals or 0>,
  "otherDeductions": <other deductions as number WITH decimals or 0>
}

Look for INCOME section:
- Salary (base pay)
- Luncheon Allowance / ค่าอาหาร
- OT Meal / ค่าอาหาร OT
- Overtime 1.5X / OT 1.5
- Overtime 2.0X / OT 2.0
- Overtime 3.0X / OT 3.0
- Bonus / โบนัส

Look for DEDUCT section:
- Social Security / ประกันสังคม
- Provident Fund / กองทุนสำรอง (e.g. 10,997.75 → return 10997.75)
- Tax / ภาษี (e.g. 26,018.48 → return 26018.48)
- In-house Loan / เงินกู้
- Other deductions

IMPORTANT:
- Return numbers WITH decimal places (e.g., 10997.75, NOT 10997)
- Remove commas but KEEP decimal points (e.g., "10,997.75" → 10997.75)
- Do NOT round numbers - preserve exact decimal values
- If a field is not found, use 0`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageDataUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        progressBar.style.width = '70%';

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        progressBar.style.width = '90%';

        console.log('✅ OpenAI Response:', data);

        // Extract the JSON from the response
        const resultText = data.choices[0].message.content.trim();
        console.log('📝 Extracted text:', resultText);

        // Parse JSON (remove markdown code blocks if present)
        let jsonText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extractedData = JSON.parse(jsonText);

        console.log('📊 Parsed data:', extractedData);

        // Auto-fill form - INCOME
        if (extractedData.salary) document.getElementById('salary').value = extractedData.salary;
        if (extractedData.luncheonAllowance) document.getElementById('luncheonAllowance').value = extractedData.luncheonAllowance;
        if (extractedData.otMeal) document.getElementById('otMeal').value = extractedData.otMeal;
        if (extractedData.overtime15x) document.getElementById('overtime15x').value = extractedData.overtime15x;
        if (extractedData.overtime20x) document.getElementById('overtime20x').value = extractedData.overtime20x;
        if (extractedData.overtime30x) document.getElementById('overtime30x').value = extractedData.overtime30x;
        if (extractedData.bonus) document.getElementById('bonus').value = extractedData.bonus;

        // Auto-fill form - DEDUCT
        if (extractedData.socialSecurity) document.getElementById('socialSecurity').value = extractedData.socialSecurity;
        if (extractedData.providentFund) document.getElementById('providentFund').value = extractedData.providentFund;
        if (extractedData.taxWithheld) document.getElementById('taxWithheld').value = extractedData.taxWithheld;
        if (extractedData.inHouseLoan) document.getElementById('inHouseLoan').value = extractedData.inHouseLoan;
        if (extractedData.otherDeductions) document.getElementById('otherDeductions').value = extractedData.otherDeductions;

        statusDiv.className = 'ocr-status success';
        messageSpan.textContent = '✅ อ่านข้อมูลจากสลิปสำเร็จ! (OpenAI Vision - กรุณาตรวจสอบความถูกต้อง)';
        progressBar.style.width = '100%';

    } catch (error) {
        console.error('❌ OpenAI OCR Error:', error);
        console.error('Error details:', error.message);

        // Check for specific error types
        let errorMessage = '❌ เกิดข้อผิดพลาดในการอ่านสลิป';
        let errorDetail = error.message || 'Unknown error';

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = '❌ API Key ไม่ถูกต้อง';
            errorDetail = 'กรุณาตรวจสอบและตั้งค่า API Key ใหม่';
        } else if (error.message.includes('429')) {
            errorMessage = '❌ เกิน Rate Limit';
            errorDetail = 'กรุณาลองใหม่ภายหลัง';
        } else if (error.message.includes('insufficient_quota')) {
            errorMessage = '❌ OpenAI credit หมด';
            errorDetail = 'กรุณาเติมเงินหรือใช้ Tesseract แทน';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = '❌ ปัญหาการเชื่อมต่อ';
            errorDetail = 'กรุณาตรวจสอบ internet connection';
        }

        statusDiv.className = 'ocr-status error';
        messageSpan.textContent = errorMessage;
        progressBar.style.width = '100%';

        // Offer to fallback to Tesseract
        const confirmMessage = `เกิดข้อผิดพลาดกับ OpenAI Vision\n\n${errorMessage}\n${errorDetail}\n\nต้องการลองใช้ Tesseract OCR (ฟรี) แทนหรือไม่?`;
        if (confirm(confirmMessage)) {
            await performOCRWithTesseract(imageDataUrl);
        }
    }
}

function extractSalaryData(text) {
    console.log('🔍 Extracting salary data from OCR text...');
    console.log('📝 OCR Text:', text); // Debug: แสดง text ที่ OCR อ่านได้

    const result = {
        found: false,
        salary: null,
        socialSecurity: null
    };

    // Clean text - แต่เก็บ comma ไว้ก่อน
    const originalText = text;
    text = text.replace(/\s+/g, ' ');

    // ลองหาตัวเลขทั้งหมดในข้อความ
    const allNumbers = text.match(/[\d,]+/g);
    console.log('🔢 All numbers found:', allNumbers);

    // Pattern สำหรับหา Net Pay / สุทธิ
    const netPayPatterns = [
        /(?:net\s*pay|สุทธิ|รับสุทธิ).*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /(?:total|รวม).*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /(\d{1,3}(?:,\d{3})+)/ // ตัวเลขที่มี comma (เช่น 50,000)
    ];

    // ลอง pattern ทีละตัว
    for (let pattern of netPayPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const amount = parseInt(match[1].replace(/,/g, ''));
            if (amount >= 10000 && amount <= 999999) {
                result.salary = amount;
                result.found = true;
                console.log('✅ Found salary:', amount, 'from pattern:', pattern);
                break;
            }
        }
    }

    // ถ้ายังไม่เจอ ลองหาจากตัวเลขทั้งหมดที่มี comma
    if (!result.found && allNumbers) {
        for (let numStr of allNumbers) {
            const amount = parseInt(numStr.replace(/,/g, ''));
            // หาตัวเลขที่น่าจะเป็นเงินเดือน (10K - 1M)
            if (amount >= 10000 && amount <= 999999) {
                result.salary = amount;
                result.found = true;
                console.log('✅ Found salary from number list:', amount);
                break;
            }
        }
    }

    // Try to find social security
    const ssPatterns = [
        /(?:ประกันสังคม|social\s*security|ss|s\.s\.).*?(\d{3,4})/i,
        /750/,
        /(\d{3})\s*(?=บาท|baht)/i
    ];

    for (let pattern of ssPatterns) {
        const match = text.match(pattern);
        if (match) {
            const amount = match[1] ? parseInt(match[1].replace(/,/g, '')) : 750;
            if (amount >= 100 && amount <= 1500) {
                result.socialSecurity = amount;
                console.log('✅ Found social security:', amount);
                break;
            }
        }
    }

    // If found salary but not SS, estimate it (min 100, max 750)
    if (result.salary && !result.socialSecurity) {
        result.socialSecurity = Math.min(750, Math.round(result.salary * 0.05));
    }

    console.log('📊 Extraction result:', result);
    return result;
}

function viewImage(monthKey) {
    const data = salaryData[monthKey];
    if (data && data.slip_image) {
        // Create modal to show full image
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = data.slip_image;
        img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 10px;';

        modal.appendChild(img);
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    }
}

// =============== Use Data for Tax Calculation ===============
function useDataForTaxCalculation() {
    let totalSalary = 0;
    let totalBonus = 0;
    let totalSocialSecurity = 0;

    for (let monthKey in salaryData) {
        const data = salaryData[monthKey];
        if (data && data.salary > 0) {
            totalSalary += data.salary || 0;
            totalBonus += data.bonus || 0;
            totalSocialSecurity += data.socialSecurity || 0;
        }
    }

    if (totalSalary === 0) {
        alert('⚠️ ยังไม่มีข้อมูลรายได้! กรุณาเพิ่มข้อมูลสลิปก่อน');
        return;
    }

    // Save to localStorage for index.html to use
    const taxData = {
        salary: totalSalary,
        bonus: totalBonus,
        socialSecurity: totalSocialSecurity,
        fromSalarySlips: true,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('taxCalculationData', JSON.stringify(taxData));

    if (confirm(`✅ พบข้อมูล:\n\n` +
                `💰 เงินเดือนรวมทั้งปี: ${formatNumber(totalSalary)} บาท\n` +
                `🎁 โบนัสรวมทั้งปี: ${formatNumber(totalBonus)} บาท\n` +
                `🏥 ประกันสังคมรวม: ${formatNumber(totalSocialSecurity)} บาท\n\n` +
                `ต้องการนำข้อมูลนี้ไปคำนวณภาษีหรือไม่?`)) {
        window.location.href = 'index.html';
    }
}

// ใช้ข้อมูลประมาณการ (เฉลี่ย × 12 เดือน)
function useEstimatedData() {
    let totalSalary = 0;
    let totalBonus = 0;
    let totalSocialSecurity = 0;
    let monthsCount = 0;

    for (let monthKey in salaryData) {
        const data = salaryData[monthKey];
        if (data && data.salary > 0) {
            totalSalary += data.salary || 0;
            totalBonus += data.bonus || 0;
            totalSocialSecurity += data.socialSecurity || 0;
            monthsCount++;
        }
    }

    if (monthsCount === 0) {
        alert('⚠️ ยังไม่มีข้อมูลรายได้! กรุณาเพิ่มข้อมูลสลิปก่อน');
        return;
    }

    // คำนวณค่าเฉลี่ย
    const avgSalary = totalSalary / monthsCount;
    const avgBonus = totalBonus / monthsCount;
    const avgSocialSecurity = totalSocialSecurity / monthsCount;

    // ประมาณการทั้งปี (× 12 เดือน) - เก็บทศนิยม 2 ตำแหน่ง
    const estimatedYearlySalary = parseFloat((avgSalary * 12).toFixed(2));
    const estimatedYearlyBonus = parseFloat((avgBonus * 12).toFixed(2));
    const estimatedYearlySS = parseFloat((avgSocialSecurity * 12).toFixed(2));

    // Save to localStorage for index.html to use
    const taxData = {
        salary: estimatedYearlySalary,
        bonus: estimatedYearlyBonus,
        socialSecurity: estimatedYearlySS,
        fromSalarySlips: true,
        isEstimated: true,
        monthsUsed: monthsCount,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('taxCalculationData', JSON.stringify(taxData));

    if (confirm(`📊 ประมาณการรายได้ทั้งปี (จาก ${monthsCount} เดือน):\n\n` +
                `💰 เงินเดือนเฉลี่ย: ${formatNumber(avgSalary)} บาท/เดือน\n` +
                `   → ประมาณการทั้งปี: ${formatNumber(estimatedYearlySalary)} บาท\n\n` +
                `🎁 โบนัสเฉลี่ย: ${formatNumber(avgBonus)} บาท/เดือน\n` +
                `   → ประมาณการทั้งปี: ${formatNumber(estimatedYearlyBonus)} บาท\n\n` +
                `🏥 ประกันสังคมเฉลี่ย: ${formatNumber(avgSocialSecurity)} บาท/เดือน\n` +
                `   → ประมาณการทั้งปี: ${formatNumber(estimatedYearlySS)} บาท\n\n` +
                `⚠️ หมายเหตุ: นี่เป็นการประมาณการเท่านั้น\nต้องการนำข้อมูลนี้ไปคำนวณภาษีหรือไม่?`)) {
        window.location.href = 'index.html';
    }
}

// =============== Utility Functions ===============
function formatNumber(num) {
    if (isNaN(num)) return '0';

    // Keep 2 decimal places if has decimals, otherwise show as integer
    const hasDecimals = num % 1 !== 0;
    if (hasDecimals) {
        // Has decimals - show 2 decimal places
        const parts = parseFloat(num).toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    } else {
        // No decimals - show as integer
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

// =============== OCR Settings Functions ===============
function setupOCRSettings() {
    // Event listener for radio buttons to show/hide API key field
    const radioButtons = document.querySelectorAll('input[name="ocrEngine"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const openaiSettings = document.getElementById('openaiSettings');
            openaiSettings.style.display = this.value === 'openai' ? 'block' : 'none';
        });
    });

    // Load saved settings
    loadOCRSettings();
}

function loadOCRSettings() {
    const saved = localStorage.getItem('ocrSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);

            // Set radio button
            const radio = document.querySelector(`input[name="ocrEngine"][value="${settings.engine}"]`);
            if (radio) {
                radio.checked = true;
                // Trigger change event to show/hide API key field
                radio.dispatchEvent(new Event('change'));
            }

            // Set API key if exists
            if (settings.apiKey) {
                document.getElementById('openaiApiKey').value = settings.apiKey;
            }

            console.log('✅ Loaded OCR settings:', settings.engine);
        } catch (e) {
            console.error('❌ Error loading OCR settings:', e);
        }
    }
}

function openSettings() {
    loadOCRSettings();
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const selectedEngine = document.querySelector('input[name="ocrEngine"]:checked').value;
    const apiKey = document.getElementById('openaiApiKey').value.trim();

    // Validate if OpenAI is selected but no API key
    if (selectedEngine === 'openai' && !apiKey) {
        alert('⚠️ กรุณาใส่ OpenAI API Key');
        return;
    }

    const settings = {
        engine: selectedEngine,
        apiKey: selectedEngine === 'openai' ? apiKey : null
    };

    try {
        localStorage.setItem('ocrSettings', JSON.stringify(settings));
        console.log('✅ Saved OCR settings:', selectedEngine);

        // Show success message with correct engine name
        let engineName = '';
        if (selectedEngine === 'proxy') {
            engineName = '🌐 Backend Proxy (แนะนำ) - ฟรี 10 รูป/วัน';
        } else if (selectedEngine === 'openai') {
            engineName = '🔑 OpenAI Vision (Own API Key) - ไม่จำกัด';
        } else {
            engineName = '🆓 Tesseract OCR (ฟรี) - ไม่จำกัด';
        }
        alert(`✅ บันทึกการตั้งค่าเรียบร้อย!\n\nOCR Engine: ${engineName}`);
        closeSettings();
    } catch (e) {
        console.error('❌ Error saving settings:', e);
        alert('❌ เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    }
}

// Close settings modal when clicking outside
window.addEventListener('click', function(event) {
    const settingsModal = document.getElementById('settingsModal');
    if (event.target == settingsModal) {
        closeSettings();
    }
});

// NOTE: exportSalarySlipsPDF() function อยู่ใน export-pdf.js แล้ว
