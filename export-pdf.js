// =============== Export PDF Functions ===============
// ไฟล์นี้จัดการการ Export PDF สำหรับทั้งหน้าคำนวณภาษีและหน้าสลิปเงินเดือน

/**
 * Export ผลการคำนวณภาษีเป็น PDF (สำหรับ index.html)
 * ใช้ window.print() แทน html2pdf เพราะ browser support ดีกว่า
 */
function exportTaxPDF() {
    // Validation: Check if user is on Step 4
    const step4 = document.getElementById('step4');
    if (!step4 || !step4.classList.contains('active')) {
        alert('⚠️ กรุณาคำนวณภาษีให้เสร็จก่อน\n\nไปที่ Step 4 (ผลการคำนวณ) ก่อน Export PDF');
        return;
    }

    // Get current calculation results
    const baselineTax = document.getElementById('finalBaselineTax').textContent;
    const baselineMonthly = document.getElementById('finalBaselineMonthly').textContent;
    const plan1Tax = document.getElementById('finalPlan1Tax').textContent;
    const plan1Monthly = document.getElementById('finalPlan1Monthly').textContent;
    const plan1Savings = document.getElementById('finalPlan1Savings').textContent;
    const plan2Tax = document.getElementById('finalPlan2Tax').textContent;
    const plan2Monthly = document.getElementById('finalPlan2Monthly').textContent;
    const plan2Savings = document.getElementById('finalPlan2Savings').textContent;

    // Validation: Check if data is calculated (not default "0 บาท/ปี")
    if (baselineTax === '0 บาท/ปี' || baselineTax === '' || !baselineTax) {
        alert('⚠️ ยังไม่มีผลการคำนวณ\n\nกรุณากรอกข้อมูลรายได้และค่าลดหย่อนให้ครบ แล้วคำนวณภาษีก่อน Export PDF');
        return;
    }

    // Get recommendation
    let recommendation = document.getElementById('recommendation').innerHTML;

    // === แปลง Canvas เป็น Image สำหรับ PDF ===
    // กราฟแท่งเปรียบเทียบ
    const barChartCanvas = document.getElementById('finalComparisonChart');
    let barChartImage = '';
    if (barChartCanvas) {
        try {
            barChartImage = barChartCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Cannot convert bar chart to image:', e);
        }
    }

    // กราฟวงกลมแผน 1
    const plan1PieCanvas = document.getElementById('plan1PieChart');
    let plan1PieImage = '';
    if (plan1PieCanvas) {
        try {
            plan1PieImage = plan1PieCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Cannot convert plan1 pie chart to image:', e);
        }
    }

    // กราฟวงกลมแผน 2
    const plan2PieCanvas = document.getElementById('plan2PieChart');
    let plan2PieImage = '';
    if (plan2PieCanvas) {
        try {
            plan2PieImage = plan2PieCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Cannot convert plan2 pie chart to image:', e);
        }
    }

    // Helper function: ลบ comma และแปลงเป็นตัวเลข
    function parseNumber(value) {
        if (!value) return 0;
        return parseInt(value.toString().replace(/,/g, '')) || 0;
    }

    // === Step 1: รายได้ ===
    const salary = parseNumber(document.getElementById('salary').value);
    const bonus = parseNumber(document.getElementById('bonus').value);

    // === Step 2: ค่าลดหย่อนพื้นฐาน ===
    const personalDeduction = 60000; // ค่าลดหย่อนส่วนตัว (ติ๊กเสมอ)
    const spouseDeduction = document.getElementById('spouseDeduction').checked ? 60000 : 0;

    // บิดามารดา (30,000 บาท/คน)
    const parentDeductionChecked = document.getElementById('parentDeduction') ? document.getElementById('parentDeduction').checked : false;
    const parentCount = parentDeductionChecked && document.getElementById('parentCount') ? parseNumber(document.getElementById('parentCount').value) : 0;
    const parentDeduction = parentCount * 30000;

    // บิดามารดาคู่สมรส (30,000 บาท/คน)
    const parentSpouseDeductionChecked = document.getElementById('parentSpouseDeduction') ? document.getElementById('parentSpouseDeduction').checked : false;
    const parentSpouseCount = parentSpouseDeductionChecked && document.getElementById('parentSpouseCount') ? parseNumber(document.getElementById('parentSpouseCount').value) : 0;
    const parentSpouseDeduction = parentSpouseCount * 30000;

    // ประกันสังคม
    const socialSecurity = document.getElementById('socialSecurity') ? parseNumber(document.getElementById('socialSecurity').value) : 0;

    const basicDeductionTotal = personalDeduction + spouseDeduction + parentDeduction + parentSpouseDeduction + socialSecurity;

    // === Step 3: ค่าลดหย่อนเพิ่มเติม (แผน 1 และ 2) ===
    const deductionItems = [
        { id: 'lifeInsurance', name: 'ประกันชีวิต', max: '100,000' },
        { id: 'healthInsurance', name: 'ประกันสุขภาพ', max: '100,000' },
        { id: 'pensionInsurance', name: 'บำนาญ', max: 'ตามจริง' },
        { id: 'pvd', name: 'กองทุนสำรองเลี้ยงชีพ (PVD)', max: '500,000' },
        { id: 'rmf', name: 'RMF', max: '500,000' },
        { id: 'thaiEsg', name: 'Thai ESG', max: '300,000' },
        { id: 'thaiEsgx', name: 'Thai ESGx', max: '300,000' },
        { id: 'homeLoan', name: 'ดอกเบี้ยบ้าน', max: '100,000' },
        { id: 'donationDouble', name: 'บริจาค 2 เท่า', max: '10%' },
        { id: 'donationPolitical', name: 'บริจาคพรรคการเมือง', max: '10,000' },
        { id: 'easyEreceipt', name: 'Easy E-Receipt', max: '50,000' }
    ];

    let plan1Items = [];
    let plan2Items = [];

    deductionItems.forEach(item => {
        const plan1Check = document.getElementById(`plan1_${item.id}_check`);
        const plan1Value = document.getElementById(`plan1_${item.id}`);
        const plan2Check = document.getElementById(`plan2_${item.id}_check`);
        const plan2Value = document.getElementById(`plan2_${item.id}`);

        if (plan1Check && plan1Check.checked && plan1Value) {
            plan1Items.push({
                name: item.name,
                value: parseNumber(plan1Value.value),
                max: item.max
            });
        }

        if (plan2Check && plan2Check.checked && plan2Value) {
            plan2Items.push({
                name: item.name,
                value: parseNumber(plan2Value.value),
                max: item.max
            });
        }
    });

    // Get current date in Thai format
    const now = new Date();
    const thaiDate = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const fileDate = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    // Create PDF content
    const pdfContent = `
        <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
            <h1 style="text-align: center; color: #667eea; margin-bottom: 10px;">📊 ผลการคำนวณภาษีเงินได้</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">ปีภาษี 2568</p>
            <p style="text-align: center; color: #999; font-size: 0.9rem; margin-bottom: 40px;">สร้างเมื่อ: ${thaiDate}</p>

            <!-- Step 1: ข้อมูลรายได้ -->
            <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="color: #667eea; margin-top: 0;">💰 Step 1: ข้อมูลรายได้</h3>
                <p style="margin: 10px 0;"><strong>เงินเดือนต่อเดือน:</strong> ${parseInt(salary).toLocaleString('th-TH')} บาท</p>
                <p style="margin: 10px 0;"><strong>โบนัสต่อปี:</strong> ${parseInt(bonus).toLocaleString('th-TH')} บาท</p>
                <p style="margin: 10px 0; padding-top: 10px; border-top: 1px solid #ddd;"><strong>รายได้รวมต่อปี:</strong> ${((parseInt(salary) * 12) + parseInt(bonus)).toLocaleString('th-TH')} บาท</p>
            </div>

            <!-- Step 2: ค่าลดหย่อนพื้นฐาน -->
            <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="color: #4CAF50; margin-top: 0;">👨‍👩‍👧‍👦 Step 2: ค่าลดหย่อนพื้นฐาน</h3>
                <p style="margin: 10px 0;">✅ ค่าลดหย่อนส่วนตัว: 60,000 บาท</p>
                ${spouseDeduction > 0 ? '<p style="margin: 10px 0;">✅ ค่าลดหย่อนคู่สมรส: 60,000 บาท</p>' : '<p style="margin: 10px 0; color: #999;">○ ค่าลดหย่อนคู่สมรส: ไม่ได้ใช้</p>'}
                ${parentDeduction > 0 ? `<p style="margin: 10px 0;">✅ ค่าเลี้ยงดูบิดามารดา: ${parentCount} คน × 30,000 = ${parentDeduction.toLocaleString('th-TH')} บาท</p>` : '<p style="margin: 10px 0; color: #999;">○ ค่าเลี้ยงดูบิดามารดา: ไม่ได้ใช้</p>'}
                ${parentSpouseDeduction > 0 ? `<p style="margin: 10px 0;">✅ ค่าเลี้ยงดูบิดามารดาคู่สมรส: ${parentSpouseCount} คน × 30,000 = ${parentSpouseDeduction.toLocaleString('th-TH')} บาท</p>` : '<p style="margin: 10px 0; color: #999;">○ ค่าเลี้ยงดูบิดามารดาคู่สมรส: ไม่ได้ใช้</p>'}
                ${socialSecurity > 0 ? `<p style="margin: 10px 0;">✅ ประกันสังคม: ${socialSecurity.toLocaleString('th-TH')} บาท</p>` : '<p style="margin: 10px 0; color: #999;">○ ประกันสังคม: ไม่ได้ใช้</p>'}
                <p style="margin: 15px 0 0 0; padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold; color: #4CAF50;">รวมค่าลดหย่อนพื้นฐาน: ${basicDeductionTotal.toLocaleString('th-TH')} บาท</p>
            </div>

            <!-- Step 3: ตารางเปรียบเทียบค่าลดหย่อนเพิ่มเติม -->
            <div style="page-break-before: auto; page-break-inside: avoid; margin-bottom: 30px;">
                <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px;">🎯 Step 3: เปรียบเทียบค่าลดหย่อนเพิ่มเติม</h2>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #667eea; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #667eea;">รายการ</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #667eea; background: #4CAF50;">🟢 แผน 1</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #667eea; background: #F57C00;">🟡 แผน 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deductionItems.map(item => {
                            const plan1Item = plan1Items.find(p => p.name === item.name);
                            const plan2Item = plan2Items.find(p => p.name === item.name);
                            return `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${plan1Item ? '#e8f5e9' : '#f5f5f5'};">
                                        ${plan1Item ? `✅ ${plan1Item.value.toLocaleString('th-TH')} บาท` : '○ ไม่ได้ใช้'}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${plan2Item ? '#fff9e6' : '#f5f5f5'};">
                                        ${plan2Item ? `✅ ${plan2Item.value.toLocaleString('th-TH')} บาท` : '○ ไม่ได้ใช้'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        <tr style="background: #f0f4ff; font-weight: bold;">
                            <td style="padding: 12px; border: 1px solid #ddd;">รวมลดหย่อนเพิ่มเติม</td>
                            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #4CAF50;">
                                ${plan1Items.reduce((sum, item) => sum + item.value, 0).toLocaleString('th-TH')} บาท
                            </td>
                            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #F57C00;">
                                ${plan2Items.reduce((sum, item) => sum + item.value, 0).toLocaleString('th-TH')} บาท
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Step 4: ผลการคำนวณ (บังคับขึ้นหน้าใหม่) -->
            <div style="page-break-before: always;"></div>
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 20px;">📊 Step 4: ผลการคำนวณภาษี</h2>

            <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
                <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; border-left: 5px solid #2196F3;">
                    <h3 style="color: #2196F3; margin-top: 0; font-size: 1.1rem;">🔵 ไม่ลดหย่อนเพิ่ม</h3>
                    <p style="font-size: 1.3rem; font-weight: bold; margin: 10px 0;">${baselineTax}</p>
                    <p style="color: #666; font-size: 0.9rem;">${baselineMonthly}</p>
                </div>

                <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; border-left: 5px solid #4CAF50;">
                    <h3 style="color: #4CAF50; margin-top: 0; font-size: 1.1rem;">🟢 แผน 1</h3>
                    <p style="font-size: 1.3rem; font-weight: bold; margin: 10px 0;">${plan1Tax}</p>
                    <p style="color: #666; font-size: 0.9rem;">${plan1Monthly}</p>
                    <p style="color: #4CAF50; font-weight: bold; margin-top: 10px;">ประหยัด: ${plan1Savings} บาท</p>
                </div>

                <div style="background: #fff9e6; padding: 20px; border-radius: 10px; border-left: 5px solid #FFC107;">
                    <h3 style="color: #F57C00; margin-top: 0; font-size: 1.1rem;">🟡 แผน 2</h3>
                    <p style="font-size: 1.3rem; font-weight: bold; margin: 10px 0;">${plan2Tax}</p>
                    <p style="color: #666; font-size: 0.9rem;">${plan2Monthly}</p>
                    <p style="color: #F57C00; font-weight: bold; margin-top: 10px;">ประหยัด: ${plan2Savings} บาท</p>
                </div>
            </div>

            <!-- กราฟและคำแนะนำ (ทั้งหมดอยู่หน้าเดียวกัน) -->
            <div class="recommendation-section" style="margin-top: 40px; page-break-inside: avoid; page-break-before: auto;">
                <h3 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px;">📊 กราฟเปรียบเทียบ</h3>

                <!-- กราฟแท่งเปรียบเทียบ -->
                ${barChartImage ? `
                    <div style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
                        <h4 style="color: #666; margin-bottom: 10px;">เปรียบเทียบภาษีทั้ง 3 แผน</h4>
                        <img src="${barChartImage}" style="max-width: 90%; height: auto; border: 1px solid #ddd; border-radius: 8px;" alt="กราฟเปรียบเทียบ">
                    </div>
                ` : ''}

                <!-- กราฟวงกลมแผน 1 และ 2 -->
                <div style="display: flex; gap: 15px; margin: 20px 0; justify-content: space-around; page-break-inside: avoid;">
                    ${plan1PieImage ? `
                        <div style="flex: 1; text-align: center;">
                            <h4 style="color: #4CAF50; margin-bottom: 10px; font-size: 0.95rem;">🟢 แผน 1</h4>
                            <img src="${plan1PieImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;" alt="กราฟแผน 1">
                        </div>
                    ` : ''}
                    ${plan2PieImage ? `
                        <div style="flex: 1; text-align: center;">
                            <h4 style="color: #F57C00; margin-bottom: 10px; font-size: 0.95rem;">🟡 แผน 2</h4>
                            <img src="${plan2PieImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;" alt="กราฟแผน 2">
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- คำแนะนำ -->
            <div style="margin-top: 30px; page-break-inside: avoid;">
                <h3 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px;">💡 คำแนะนำ</h3>
                <div style="background: #fff3e0; padding: 20px; border-radius: 10px; border-left: 5px solid #FF9800;">
                    ${recommendation.replace(/<canvas[^>]*id="[^"]*"[^>]*>.*?<\/canvas>/gi, '').replace(/<div[^>]*style="[^"]*display:\s*grid[^"]*"[^>]*>.*?<\/div>/gi, '')}
                </div>
            </div>

            <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 0.85rem;">
                <p>📝 หมายเหตุ: การคำนวณนี้เป็นเพียงการประมาณการเท่านั้น กรุณาตรวจสอบกับกรมสรรพากรเพื่อความถูกต้อง</p>
                <p style="margin-top: 10px;">สร้างโดย: ระบบคำนวณภาษีเงินได้บุคคลธรรมดา</p>
            </div>
        </div>
    `;

    // Create print iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position: absolute; width: 0; height: 0; border: none;';
    document.body.appendChild(printFrame);

    // Write content to iframe
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ผลการคำนวณภาษี_${fileDate}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 20px; }
                    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

                    /* ป้องกันการ break ในส่วนสำคัญ */
                    .no-break { page-break-inside: avoid; }
                    .comparison-grid { page-break-inside: avoid; }
                    .recommendation-section { page-break-before: auto; page-break-inside: avoid; }

                    /* เปลี่ยน Grid เป็น Flex เพื่อ print ได้ดีกว่า */
                    .comparison-grid {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        gap: 20px !important;
                    }
                    .comparison-grid > div {
                        flex: 1 1 30% !important;
                        min-width: 200px !important;
                    }

                    /* กราฟรูปภาพ */
                    img {
                        max-width: 100% !important;
                        height: auto !important;
                        page-break-inside: avoid !important;
                    }
                }
                body { font-family: 'Sarabun', Arial, sans-serif; }
            </style>
        </head>
        <body>
            ${pdfContent}
        </body>
        </html>
    `);
    frameDoc.close();

    // Wait for iframe to load, then print
    setTimeout(function() {
        printFrame.contentWindow.print();

        // Remove iframe after printing
        setTimeout(function() {
            document.body.removeChild(printFrame);
        }, 1000);
    }, 500);
}

/**
 * Export สรุปสลิปเงินเดือนเป็น PDF (สำหรับ salary-slips.html)
 */
function exportSalarySlipsPDF() {
    // Get salary data from localStorage
    const saved = localStorage.getItem('salarySlips_2568');
    let salaryData = {};
    if (saved) {
        try {
            salaryData = JSON.parse(saved);
        } catch (e) {
            alert('❌ ไม่พบข้อมูลสลิปเงินเดือน');
            return;
        }
    } else {
        alert('❌ ไม่พบข้อมูลสลิปเงินเดือน กรุณาเพิ่มข้อมูลก่อน');
        return;
    }

    // Calculate totals
    let totalIncome = 0;
    let monthsCount = 0;
    for (let monthKey in salaryData) {
        const data = salaryData[monthKey];
        if (data && data.salary > 0) {
            totalIncome += (data.totalIncome || data.salary || 0);
            monthsCount++;
        }
    }

    if (monthsCount === 0) {
        alert('❌ ไม่พบข้อมูลรายได้ กรุณาเพิ่มข้อมูลก่อน');
        return;
    }

    const avgIncome = totalIncome / monthsCount;

    // Get current date
    const now = new Date();
    const thaiDate = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const fileDate = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    // Thai months
    const THAI_MONTHS = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // Generate month rows HTML
    let monthRowsHTML = '';
    for (let i = 1; i <= 12; i++) {
        const monthKey = i.toString().padStart(2, '0');
        const monthData = salaryData[monthKey];
        const monthName = THAI_MONTHS[i-1];

        if (monthData && monthData.salary > 0) {
            const income = monthData.totalIncome || monthData.salary || 0;
            const deduct = monthData.totalDeduct || monthData.socialSecurity || 0;
            const net = monthData.netPay || (income - deduct);

            monthRowsHTML += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${monthName} 2568</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(income)} บาท</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(deduct)} บาท</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatNumber(net)} บาท</td>
                </tr>
            `;
        } else {
            monthRowsHTML += `
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;">${monthName} 2568</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #999;" colspan="3">ยังไม่มีข้อมูล</td>
                </tr>
            `;
        }
    }

    // Helper function for formatting numbers
    function formatNumber(num) {
        if (isNaN(num)) return '0';
        const hasDecimals = num % 1 !== 0;
        if (hasDecimals) {
            const parts = parseFloat(num).toFixed(2).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        } else {
            return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    // Create PDF content
    const pdfContent = `
        <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
            <h1 style="text-align: center; color: #667eea; margin-bottom: 10px;">📄 สรุปสลิปเงินเดือน</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">ปีภาษี 2568</p>
            <p style="text-align: center; color: #999; font-size: 0.9rem; margin-bottom: 40px;">สร้างเมื่อ: ${thaiDate}</p>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: white;">💼 สรุปรายได้ทั้งปี</h2>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div style="background: rgba(255, 255, 255, 0.15); padding: 15px; border-radius: 10px;">
                        <p style="font-size: 0.9rem; margin: 0 0 5px 0;">รายได้รวมทั้งปี</p>
                        <p style="font-size: 1.5rem; font-weight: bold; margin: 0;">${formatNumber(totalIncome)} บาท</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.15); padding: 15px; border-radius: 10px;">
                        <p style="font-size: 0.9rem; margin: 0 0 5px 0;">รายได้เฉลี่ยต่อเดือน</p>
                        <p style="font-size: 1.5rem; font-weight: bold; margin: 0;">${formatNumber(avgIncome)} บาท</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.15); padding: 15px; border-radius: 10px;">
                        <p style="font-size: 0.9rem; margin: 0 0 5px 0;">มีข้อมูล</p>
                        <p style="font-size: 1.5rem; font-weight: bold; margin: 0;">${monthsCount}/12 เดือน</p>
                    </div>
                </div>
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📅 รายละเอียดรายเดือน</h2>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #667eea;">เดือน</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #667eea;">รายได้รวม</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #667eea;">หักรวม</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #667eea;">รับสุทธิ</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthRowsHTML}
                </tbody>
                <tfoot>
                    <tr style="background: #f0f4ff; font-weight: bold;">
                        <td style="padding: 12px; border: 1px solid #ddd;">รวมทั้งปี</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${formatNumber(totalIncome)} บาท</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: right;" colspan="2">
                            (${monthsCount} เดือนที่มีข้อมูล)
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 0.85rem;">
                <p>📝 หมายเหตุ: ข้อมูลนี้เก็บไว้ในเครื่องคุณเท่านั้น (localStorage)</p>
                <p style="margin-top: 10px;">สร้างโดย: ระบบจัดการสลิปเงินเดือน</p>
            </div>
        </div>
    `;

    // Create print iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position: absolute; width: 0; height: 0; border: none;';
    document.body.appendChild(printFrame);

    // Write content to iframe
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>สรุปสลิปเงินเดือน_2568_${fileDate}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 20px; }
                    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

                    /* ป้องกันการ break ในส่วนสำคัญ */
                    .no-break { page-break-inside: avoid; }
                    .comparison-grid { page-break-inside: avoid; }
                    .recommendation-section { page-break-before: auto; page-break-inside: avoid; }

                    /* เปลี่ยน Grid เป็น Flex เพื่อ print ได้ดีกว่า */
                    .comparison-grid {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        gap: 20px !important;
                    }
                    .comparison-grid > div {
                        flex: 1 1 30% !important;
                        min-width: 200px !important;
                    }

                    /* กราฟรูปภาพ */
                    img {
                        max-width: 100% !important;
                        height: auto !important;
                        page-break-inside: avoid !important;
                    }
                }
                body { font-family: 'Sarabun', Arial, sans-serif; }
            </style>
        </head>
        <body>
            ${pdfContent}
        </body>
        </html>
    `);
    frameDoc.close();

    // Wait for iframe to load, then print
    setTimeout(function() {
        printFrame.contentWindow.print();

        // Remove iframe after printing
        setTimeout(function() {
            document.body.removeChild(printFrame);
        }, 1000);
    }, 500);
}
