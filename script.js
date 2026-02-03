// อัตราภาษีเงินได้บุคคลธรรมดาตามกฎหมายไทย (ปี 2569)
// แบบขั้นบันได: [เริ่มต้น, สิ้นสุด, อัตรา%]
const TAX_BRACKETS = [
    { min: 0, max: 150000, rate: 0 },
    { min: 150000, max: 300000, rate: 5 },
    { min: 300000, max: 500000, rate: 10 },
    { min: 500000, max: 750000, rate: 15 },
    { min: 750000, max: 1000000, rate: 20 },
    { min: 1000000, max: 2000000, rate: 25 },
    { min: 2000000, max: 5000000, rate: 30 },
    { min: 5000000, max: Infinity, rate: 35 }
];

// ตัวแปร Global
let currentStep = 1;
let incomeData = {};
let basicDeductions = {};
let plan1Data = {};
let plan2Data = {};
let chartInstance = null;

// =============== Helper Functions ===============

function formatNumber(num) {
    // แปลงเป็น number ก่อน
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseNumberWithComma(value) {
    if (typeof value === 'string') {
        return parseFloat(value.replace(/,/g, '')) || 0;
    }
    return parseFloat(value) || 0;
}

// Alias สำหรับ parseNumberWithComma
const parseNumber = parseNumberWithComma;

function calculateTax(netIncome, totalDeduction) {
    const taxableIncome = Math.max(netIncome - totalDeduction, 0);
    let totalTax = 0;

    for (let bracket of TAX_BRACKETS) {
        if (taxableIncome <= bracket.min) break;

        // คำนวณรายได้ที่ต้องเสียภาษีในช่วงนี้
        const incomeInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;

        if (incomeInBracket > 0) {
            const taxAtThisRate = incomeInBracket * (bracket.rate / 100);
            totalTax += taxAtThisRate;
        }
    }

    return Math.round(totalTax);
}

// =============== Auto Save/Load for Step 3 ===============

function savePlanData() {
    try {
        const planData = {
            plan1: {},
            plan2: {}
        };

        // รายการค่าลดหย่อนทั้งหมด (ต้องตรงกับ setupPlanItems)
        const deductionItems = [
            'lifeInsurance', 'healthInsurance', 'pensionInsurance',
            'pvd', 'rmf', 'thaiEsg', 'thaiEsgx',
            'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'
        ];

        // บันทึกค่าของทั้ง Plan 1 และ Plan 2
        ['plan1', 'plan2'].forEach(plan => {
            deductionItems.forEach(item => {
                const checkbox = document.getElementById(`${plan}_${item}_check`);
                const slider = document.getElementById(`${plan}_${item}`);

                if (checkbox && slider) {
                    planData[plan][item] = {
                        checked: checkbox.checked,
                        value: parseFloat(slider.value) || 0
                    };
                }
            });
        });

        localStorage.setItem('taxCalc_planData', JSON.stringify(planData));
        console.log('💾 Saved plan data:', planData);
    } catch (e) {
        console.error('❌ Error saving plan data:', e);
    }
}

function loadPlanData() {
    try {
        const saved = localStorage.getItem('taxCalc_planData');
        if (!saved) {
            console.log('📂 No saved plan data found');
            return;
        }

        const planData = JSON.parse(saved);
        console.log('📂 Loading plan data:', planData);

        // โหลดค่ากลับมาทั้ง Plan 1 และ Plan 2
        ['plan1', 'plan2'].forEach(plan => {
            if (!planData[plan]) return;

            Object.keys(planData[plan]).forEach(item => {
                const data = planData[plan][item];
                const checkbox = document.getElementById(`${plan}_${item}_check`);
                const slider = document.getElementById(`${plan}_${item}`);
                const container = document.getElementById(`${plan}_${item}_container`);

                if (checkbox && slider && data) {
                    // ตั้งค่า checkbox
                    checkbox.checked = data.checked;

                    // ตั้งค่า slider
                    slider.value = data.value;

                    // อัพเดต display
                    const displaySpan = document.getElementById(`${plan}_${item}_display`);
                    if (displaySpan) {
                        displaySpan.textContent = formatNumber(data.value);
                    }

                    // แสดง/ซ่อน slider container ตาม checkbox
                    if (container) {
                        container.style.display = data.checked ? 'block' : 'none';
                    }
                }
            });
        });

        // อัพเดต slider limits และ calculations
        updateSliderLimits('plan1');
        updateSliderLimits('plan2');
        updateAllScenarios();

        // บันทึกข้อมูลกลับเข้า localStorage เพื่อให้ตรงกับ UI
        // (เพราะการตั้งค่า checkbox.checked และ slider.value ไม่ trigger event listeners)
        savePlanData();

        console.log('✅ Plan data loaded successfully');
    } catch (e) {
        console.error('❌ Error loading plan data:', e);
    }
}

// =============== Step Navigation ===============

function nextStep(step) {
    // บันทึกข้อมูลของ step ปัจจุบัน
    if (currentStep === 1) {
        saveIncomeData();
    } else if (currentStep === 2) {
        saveBasicDeductions();
    } else if (currentStep === 3) {
        // คำนวณผลสุดท้าย
        calculateFinalResults();
    }

    // ซ่อน step ปัจจุบัน
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

    // แสดง step ใหม่
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // อัพเดตการคำนวณหน้า Simulation
    if (currentStep === 3) {
        updateAllScenarios();
    }
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function jumpToStep(step) {
    console.log(`🎯 Jumping to step ${step}`);

    // Save current step data
    if (currentStep === 1) {
        saveIncomeData();
    } else if (currentStep === 2) {
        saveBasicDeductions();
    }

    // Remove active class from current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

    // Set new step
    currentStep = step;

    // Add active class to new step
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

    // If jumping to step 3, update scenarios
    if (currentStep === 3) {
        updateAllScenarios();
    }

    // If jumping to step 4, calculate final results
    if (currentStep === 4) {
        calculateFinalResults();
    }

    // Update bottom nav active state (mobile)
    updateBottomNav(step);

    // Update floating summary
    updateFloatingSummary();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startOver() {
    currentStep = 1;
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
    document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.querySelector('.progress-step[data-step="1"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAllData() {
    // ยืนยันก่อนลบ
    if (confirm('⚠️ คุณต้องการล้างข้อมูลทั้งหมดและเริ่มใหม่หรือไม่?\n\nข้อมูลที่บันทึกไว้ทั้งหมดจะถูกลบ!')) {
        console.log('🗑️ Clearing all data...');

        // ล้าง localStorage
        localStorage.clear();

        // แสดงข้อความแล้วรีโหลดหน้า
        alert('✅ ล้างข้อมูลเรียบร้อยแล้ว!\n\nกำลังรีเฟรชหน้า...');

        // รีโหลดหน้า
        location.reload();
    }
}

// ตรวจสอบและโหลดข้อมูลจากหน้าจัดการสลิป
function checkAndLoadSalarySlipsData() {
    const taxData = localStorage.getItem('taxCalculationData');
    if (!taxData) return;

    try {
        const data = JSON.parse(taxData);
        if (!data.fromSalarySlips) return;

        console.log('📄 Found data from salary slips:', data);

        // Choose color and title based on data type
        const isEstimated = data.isEstimated || false;
        const bgColor = isEstimated ?
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
            'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        const title = isEstimated ?
            `📊 นำข้อมูลประมาณการมาแล้ว! (จาก ${data.monthsUsed} เดือน)` :
            '✅ นำข้อมูลจากสลิปเงินเดือนมาแล้ว!';

        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            z-index: 10000;
            max-width: 350px;
            animation: slideIn 0.5s ease;
        `;
        notification.innerHTML = `
            <strong style="display: block; margin-bottom: 10px;">${title}</strong>
            <p style="margin: 5px 0; font-size: 0.9rem;">💰 เงินเดือน: ${formatNumber(data.salary)} บาท${isEstimated ? '/ปี' : ''}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;">🎁 โบนัส: ${formatNumber(data.bonus)} บาท${isEstimated ? '/ปี' : ''}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;">🏥 ประกันสังคม: ${formatNumber(data.socialSecurity)} บาท${isEstimated ? '/ปี' : ''}</p>
            ${isEstimated ? '<p style="margin-top: 10px; font-size: 0.85rem; opacity: 0.9;">⚠️ หมายเหตุ: นี่เป็นการประมาณการ</p>' : ''}
            <button onclick="this.parentElement.remove()" style="
                margin-top: 10px;
                background: white;
                color: ${isEstimated ? '#667eea' : '#4CAF50'};
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                width: 100%;
            ">ตกลง</button>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);

        // Auto-fill the data
        const salarySlider = document.getElementById('salarySlider');
        const bonusSlider = document.getElementById('bonusSlider');
        const socialSecuritySlider = document.getElementById('socialSecuritySlider');

        // คำนวณเงินเดือนต่อเดือน (หารด้วย 12)
        const monthlySalary = Math.round((data.salary || 0) / 12);

        if (salarySlider) {
            salarySlider.value = monthlySalary;
            document.getElementById('salary').value = formatNumber(monthlySalary);
            document.getElementById('salaryDisplay').textContent = formatNumber(monthlySalary);
        }

        if (bonusSlider) {
            bonusSlider.value = data.bonus || 0;
            document.getElementById('bonus').value = formatNumber(data.bonus || 0);
            document.getElementById('bonusDisplay').textContent = formatNumber(data.bonus || 0);
        }

        if (socialSecuritySlider) {
            // ประกันสังคมก็หารด้วย 12 เช่นกัน
            const monthlySS = Math.round((data.socialSecurity || 0) / 12);
            socialSecuritySlider.value = monthlySS;
            document.getElementById('socialSecurity').value = formatNumber(monthlySS);
            document.getElementById('socialSecurityDisplay').textContent = formatNumber(monthlySS);
        }

        // Remove the flag so it doesn't auto-fill again
        localStorage.removeItem('taxCalculationData');

        console.log('✅ Auto-filled data from salary slips');

    } catch (e) {
        console.error('❌ Error loading salary slips data:', e);
    }
}

// =============== Step 1: Income Data ===============

function saveIncomeData() {
    const salary = parseNumberWithComma(document.getElementById('salary').value);
    const bonus = parseNumberWithComma(document.getElementById('bonus').value);
    const totalIncome = (salary * 12) + bonus;
    const expenses = Math.min(totalIncome * 0.5, 100000);
    const netIncome = totalIncome - expenses;

    incomeData = {
        salary,
        bonus,
        totalIncome,
        expenses,
        netIncome
    };

    // บันทึกลง localStorage
    localStorage.setItem('taxCalc_incomeData', JSON.stringify(incomeData));
}

function updateIncomePreview() {
    const salary = parseNumberWithComma(document.getElementById('salary').value || 0);
    const bonus = parseNumberWithComma(document.getElementById('bonus').value || 0);
    const totalIncome = (salary * 12) + bonus;
    const expenses = Math.min(totalIncome * 0.5, 100000);
    const netIncome = totalIncome - expenses;

    document.getElementById('totalIncomePreview').textContent = formatNumber(totalIncome);
    document.getElementById('expensesPreview').textContent = formatNumber(expenses);
    document.getElementById('netIncomePreview').textContent = formatNumber(netIncome);
}

// =============== Step 2: Basic Deductions ===============

function saveBasicDeductions() {
    let total = 60000; // ส่วนตัว

    if (document.getElementById('spouseDeduction').checked) {
        total += 60000;
    }

    // บุตรคนแรก / เกิดก่อนปี 2561 (30,000 บาท/คน)
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    total += childCount * 30000;

    // บุตรคนที่ 2+ เกิดปี 2561 เป็นต้นไป (60,000 บาท/คน)
    const childCount2561 = parseInt(document.getElementById('childCount2561')?.value) || 0;
    total += childCount2561 * 60000;

    if (document.getElementById('parentDeduction').checked) {
        const parentCount = parseInt(document.getElementById('parentCount').value);
        total += parentCount * 30000;
    }

    if (document.getElementById('parentSpouseDeduction').checked) {
        const parentSpouseCount = parseInt(document.getElementById('parentSpouseCount').value);
        total += parentSpouseCount * 30000;
    }

    // ประกันสุขภาพบิดามารดา (สูงสุด 15,000 บาท)
    if (document.getElementById('parentHealthInsurance')?.checked) {
        const parentHealthAmount = Math.min(parseNumberWithComma(document.getElementById('parentHealthInsuranceAmount')?.value || 0), 15000);
        total += parentHealthAmount;
    }

    const socialSecurity = Math.min(parseNumberWithComma(document.getElementById('socialSecurity').value) * 12, 10000);
    total += socialSecurity;

    basicDeductions = { total };

    // บันทึกลง localStorage
    const formData = {
        spouseDeduction: document.getElementById('spouseDeduction').checked,
        childCount,
        childCount2561,
        parentDeduction: document.getElementById('parentDeduction').checked,
        parentCount: document.getElementById('parentCount').value,
        parentSpouseDeduction: document.getElementById('parentSpouseDeduction').checked,
        parentSpouseCount: document.getElementById('parentSpouseCount').value,
        parentHealthInsurance: document.getElementById('parentHealthInsurance')?.checked || false,
        parentHealthInsuranceAmount: document.getElementById('parentHealthInsuranceAmount')?.value || 0,
        socialSecurity: document.getElementById('socialSecurity').value
    };
    localStorage.setItem('taxCalc_basicDeductions', JSON.stringify(formData));
}

function updateBasicDeductionPreview() {
    let total = 60000;

    if (document.getElementById('spouseDeduction').checked) {
        total += 60000;
    }

    // บุตรคนแรก / เกิดก่อนปี 2561 (30,000 บาท/คน)
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    total += childCount * 30000;

    // บุตรคนที่ 2+ เกิดปี 2561 เป็นต้นไป (60,000 บาท/คน)
    const childCount2561 = parseInt(document.getElementById('childCount2561')?.value) || 0;
    total += childCount2561 * 60000;

    if (document.getElementById('parentDeduction').checked) {
        const parentCount = parseInt(document.getElementById('parentCount').value);
        total += parentCount * 30000;
    }

    if (document.getElementById('parentSpouseDeduction').checked) {
        const parentSpouseCount = parseInt(document.getElementById('parentSpouseCount').value);
        total += parentSpouseCount * 30000;
    }

    // ประกันสุขภาพบิดามารดา (สูงสุด 15,000 บาท)
    if (document.getElementById('parentHealthInsurance')?.checked) {
        const parentHealthAmount = Math.min(parseNumberWithComma(document.getElementById('parentHealthInsuranceAmount')?.value || 0), 15000);
        total += parentHealthAmount;
    }

    const socialSecurity = Math.min(parseNumberWithComma(document.getElementById('socialSecurity').value || 0) * 12, 10000);
    total += socialSecurity;

    document.getElementById('basicDeductionPreview').textContent = formatNumber(total);
}

// ฟังก์ชันคำนวณและแสดงผลลดหย่อนบุตรรวม
function updateChildDeductionDisplay() {
    const childCount = parseInt(document.getElementById('childCount')?.value) || 0;
    const childCount2561 = parseInt(document.getElementById('childCount2561')?.value) || 0;
    const totalChildDeduction = (childCount * 30000) + (childCount2561 * 60000);
    document.getElementById('childDeductionDisplay').textContent = formatNumber(totalChildDeduction);
}

function updateAndSaveBasicDeductions() {
    updateBasicDeductionPreview();
    saveBasicDeductions();
}

// =============== Step 3: Simulation ===============

function switchScenario(scenario) {
    // อัพเดต tabs
    document.querySelectorAll('.scenario-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // อัพเดต panels
    document.querySelectorAll('.scenario-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${scenario}-panel`).classList.add('active');
}

function updateAllScenarios() {
    updateBaselineScenario();
    updatePlan1();
    updatePlan2();

    // อัพเดต max ของ slider ตามลิมิตที่เหลือ
    updateSliderLimits('plan1');
    updateSliderLimits('plan2');

    // อัพเดตการแสดงลิมิตรวม
    updateLimitDisplay('plan1');
    updateLimitDisplay('plan2');
}

function updateBaselineScenario() {
    const netIncome = incomeData.netIncome || 0;
    const deductions = basicDeductions.total || 0;
    const tax = calculateTax(netIncome, deductions);

    document.getElementById('baselineTaxPreview').textContent = formatNumber(tax) + ' บาท/ปี';
    document.getElementById('baselineTaxMonthlyPreview').textContent = formatNumber(Math.round(tax / 12)) + ' บาท/เดือน';
}

function getPlan1Deductions() {
    const netIncome = incomeData.netIncome || 0;
    let total = 0;

    // รวบรวมค่าลดหย่อนจาก Plan 1
    const items = ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf', 'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'];

    // คำนวณประกันชีวิต + ประกันสุขภาพ (รวมไม่เกิน 100K) ก่อน
    let insuranceTotal = 0;
    const insuranceItems = ['lifeInsurance', 'healthInsurance'];

    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`plan1_${item}_check`);
        const slider = document.getElementById(`plan1_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;
            insuranceTotal += value;
        }
    });

    // ตรวจสอบว่ารวมกันไม่เกิน 100,000
    if (insuranceTotal > 100000) {
        insuranceTotal = 100000;
    }
    total += insuranceTotal;

    // คำนวณ retirement funds (รวมไม่เกิน 500K)
    let retirementTotal = 0;
    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];

    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`plan1_${item}_check`);
        const slider = document.getElementById(`plan1_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;

            // ใช้ข้อจำกัดแต่ละรายการ
            if (item === 'pensionInsurance') value = Math.min(value, netIncome * 0.15, 200000);
            else if (item === 'pvd') value = Math.min(value, 500000);
            else if (item === 'rmf') value = Math.min(value, netIncome * 0.30, 500000);

            retirementTotal += value;
        }
    });

    // ตรวจสอบว่ารวมกันไม่เกิน 500,000
    if (retirementTotal > 500000) {
        retirementTotal = 500000;
    }
    total += retirementTotal;

    // คำนวณรายการอื่นๆ
    items.forEach(item => {
        if (insuranceItems.includes(item) || retirementItems.includes(item)) return; // ข้ามรายการที่คำนวณไปแล้ว

        const checkbox = document.getElementById(`plan1_${item}_check`);
        const slider = document.getElementById(`plan1_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;

            // ตรวจสอบข้อจำกัด
            if (item === 'thaiEsg') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'thaiEsgx') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'homeLoan') value = Math.min(value, 100000);
            else if (item === 'donationDouble') value = Math.min(value * 2, netIncome * 0.10); // 2 เท่า!
            else if (item === 'donationPolitical') value = Math.min(value, 10000);
            else if (item === 'easyEreceipt') value = Math.min(value, 50000);

            total += value;
        }
    });

    return total;
}

function getPlan2Deductions() {
    const netIncome = incomeData.netIncome || 0;
    let total = 0;

    const items = ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf', 'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'];

    // คำนวณประกันชีวิต + ประกันสุขภาพ (รวมไม่เกิน 100K) ก่อน
    let insuranceTotal = 0;
    const insuranceItems = ['lifeInsurance', 'healthInsurance'];

    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`plan2_${item}_check`);
        const slider = document.getElementById(`plan2_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;
            insuranceTotal += value;
        }
    });

    // ตรวจสอบว่ารวมกันไม่เกิน 100,000
    if (insuranceTotal > 100000) {
        insuranceTotal = 100000;
    }
    total += insuranceTotal;

    // คำนวณ retirement funds (รวมไม่เกิน 500K)
    let retirementTotal = 0;
    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];

    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`plan2_${item}_check`);
        const slider = document.getElementById(`plan2_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;

            // ใช้ข้อจำกัดแต่ละรายการ
            if (item === 'pensionInsurance') value = Math.min(value, netIncome * 0.15, 200000);
            else if (item === 'pvd') value = Math.min(value, 500000);
            else if (item === 'rmf') value = Math.min(value, netIncome * 0.30, 500000);

            retirementTotal += value;
        }
    });

    // ตรวจสอบว่ารวมกันไม่เกิน 500,000
    if (retirementTotal > 500000) {
        retirementTotal = 500000;
    }
    total += retirementTotal;

    // คำนวณรายการอื่นๆ
    items.forEach(item => {
        if (insuranceItems.includes(item) || retirementItems.includes(item)) return; // ข้ามรายการที่คำนวณไปแล้ว

        const checkbox = document.getElementById(`plan2_${item}_check`);
        const slider = document.getElementById(`plan2_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;

            // ตรวจสอบข้อจำกัด
            if (item === 'thaiEsg') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'thaiEsgx') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'homeLoan') value = Math.min(value, 100000);
            else if (item === 'donationDouble') value = Math.min(value * 2, netIncome * 0.10); // 2 เท่า!
            else if (item === 'donationPolitical') value = Math.min(value, 10000);
            else if (item === 'easyEreceipt') value = Math.min(value, 50000);

            total += value;
        }
    });

    return total;
}

// ฟังก์ชันรวบรวมรายละเอียดการลดหย่อนแต่ละรายการ
function getDeductionBreakdown(plan) {
    const netIncome = incomeData.netIncome || 0;
    const breakdown = {};

    const items = ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf',
                   'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'];

    const labels = {
        'lifeInsurance': 'ประกันชีวิต',
        'healthInsurance': 'ประกันสุขภาพ',
        'pensionInsurance': 'ประกันบำนาญ',
        'pvd': 'PVD',
        'rmf': 'RMF',
        'thaiEsg': 'Thai ESG',
        'thaiEsgx': 'Thai ESGx',
        'homeLoan': 'ดอกเบี้ยบ้าน',
        'donationDouble': 'บริจาค 2x',
        'donationPolitical': 'บริจาคพรรคการเมือง',
        'easyEreceipt': 'Easy E-Receipt'
    };

    items.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);

        if (checkbox && slider && checkbox.checked) {
            let value = parseFloat(slider.value) || 0;

            // ใช้ข้อจำกัดเดียวกับใน getPlanDeductions (ไม่รวม combined limits ที่จะทำภายหลัง)
            if (item === 'pensionInsurance') value = Math.min(value, netIncome * 0.15, 200000);
            else if (item === 'pvd') value = Math.min(value, 500000);
            else if (item === 'rmf') value = Math.min(value, netIncome * 0.30, 500000);
            else if (item === 'thaiEsg') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'thaiEsgx') value = Math.min(value, netIncome * 0.30, 300000);
            else if (item === 'homeLoan') value = Math.min(value, 100000);
            else if (item === 'donationDouble') value = Math.min(value * 2, netIncome * 0.10);
            else if (item === 'donationPolitical') value = Math.min(value, 10000);
            else if (item === 'easyEreceipt') value = Math.min(value, 50000);

            if (value > 0) {
                breakdown[labels[item]] = value;
            }
        }
    });

    // ตรวจสอบ 100K limit สำหรับประกันชีวิต + ประกันสุขภาพ
    const insuranceTotal = (breakdown['ประกันชีวิต'] || 0) + (breakdown['ประกันสุขภาพ'] || 0);
    if (insuranceTotal > 100000) {
        // ปรับให้เป็น 100K โดยลดแต่ละส่วนตามสัดส่วน
        const ratio = 100000 / insuranceTotal;
        if (breakdown['ประกันชีวิต']) breakdown['ประกันชีวิต'] *= ratio;
        if (breakdown['ประกันสุขภาพ']) breakdown['ประกันสุขภาพ'] *= ratio;
    }

    // ตรวจสอบ 500K limit สำหรับ retirement funds
    const retirementTotal = (breakdown['ประกันบำนาญ'] || 0) + (breakdown['PVD'] || 0) + (breakdown['RMF'] || 0);
    if (retirementTotal > 500000) {
        // ปรับให้เป็น 500K โดยลดแต่ละส่วนตามสัดส่วน
        const ratio = 500000 / retirementTotal;
        if (breakdown['ประกันบำนาญ']) breakdown['ประกันบำนาญ'] *= ratio;
        if (breakdown['PVD']) breakdown['PVD'] *= ratio;
        if (breakdown['RMF']) breakdown['RMF'] *= ratio;
    }

    return breakdown;
}

function updatePlan1() {
    const netIncome = incomeData.netIncome || 0;
    const basicDed = basicDeductions.total || 0;
    const plan1Ded = getPlan1Deductions();
    const totalDed = basicDed + plan1Ded;
    const tax = calculateTax(netIncome, totalDed);
    const baselineTax = calculateTax(netIncome, basicDed);
    const savings = baselineTax - tax;

    document.getElementById('plan1TaxPreview').textContent = formatNumber(tax) + ' บาท/ปี';
    document.getElementById('plan1TaxMonthlyPreview').textContent = formatNumber(Math.round(tax / 12)) + ' บาท/เดือน';
    document.getElementById('plan1SavingsPreview').textContent = 'ประหยัด: ' + formatNumber(savings) + ' บาท';
}

function updatePlan2() {
    const netIncome = incomeData.netIncome || 0;
    const basicDed = basicDeductions.total || 0;
    const plan2Ded = getPlan2Deductions();
    const totalDed = basicDed + plan2Ded;
    const tax = calculateTax(netIncome, totalDed);
    const baselineTax = calculateTax(netIncome, basicDed);
    const savings = baselineTax - tax;

    document.getElementById('plan2TaxPreview').textContent = formatNumber(tax) + ' บาท/ปี';
    document.getElementById('plan2TaxMonthlyPreview').textContent = formatNumber(Math.round(tax / 12)) + ' บาท/เดือน';
    document.getElementById('plan2SavingsPreview').textContent = 'ประหยัด: ' + formatNumber(savings) + ' บาท';
}

// =============== Step 4: Final Results ===============

function calculateFinalResults() {
    const netIncome = incomeData.netIncome || 0;
    const basicDed = basicDeductions.total || 0;
    const plan1Ded = getPlan1Deductions();
    const plan2Ded = getPlan2Deductions();

    const baselineTax = calculateTax(netIncome, basicDed);
    const plan1Tax = calculateTax(netIncome, basicDed + plan1Ded);
    const plan2Tax = calculateTax(netIncome, basicDed + plan2Ded);

    // แสดงผลในการ์ด
    document.getElementById('finalBaselineTax').textContent = formatNumber(baselineTax) + ' บาท/ปี';
    document.getElementById('finalBaselineMonthly').textContent = formatNumber(baselineTax / 12) + ' บาท/เดือน';

    document.getElementById('finalPlan1Tax').textContent = formatNumber(plan1Tax) + ' บาท/ปี';
    document.getElementById('finalPlan1Monthly').textContent = formatNumber(plan1Tax / 12) + ' บาท/เดือน';
    document.getElementById('finalPlan1Savings').textContent = formatNumber(baselineTax - plan1Tax);

    document.getElementById('finalPlan2Tax').textContent = formatNumber(plan2Tax) + ' บาท/ปี';
    document.getElementById('finalPlan2Monthly').textContent = formatNumber(plan2Tax / 12) + ' บาท/เดือน';
    document.getElementById('finalPlan2Savings').textContent = formatNumber(baselineTax - plan2Tax);

    // สร้างกราฟ
    createFinalChart(baselineTax, plan1Tax, plan2Tax);

    // สร้างคำแนะนำ
    createRecommendation(baselineTax, plan1Tax, plan2Tax, plan1Ded, plan2Ded);

    // สร้างตารางรายละเอียด
    createDetailedTables();

    // สร้าง Pie Charts
    createPieCharts();
}

function createFinalChart(baseline, plan1, plan2) {
    const ctx = document.getElementById('finalComparisonChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    // รับข้อมูลรายละเอียดการลดหย่อน
    const plan1Breakdown = getDeductionBreakdown('plan1');
    const plan2Breakdown = getDeductionBreakdown('plan2');

    // รวบรวมรายการทั้งหมด
    const allItems = new Set([...Object.keys(plan1Breakdown), ...Object.keys(plan2Breakdown)]);

    // สีสำหรับแต่ละรายการ
    const colors = {
        'ประกันชีวิต': '#FF6B6B',
        'ประกันสุขภาพ': '#4ECDC4',
        'ประกันบำนาญ': '#45B7D1',
        'PVD': '#96CEB4',
        'RMF': '#FFEAA7',
        'Thai ESG': '#DFE6E9',
        'Thai ESGx': '#74B9FF',
        'ดอกเบี้ยบ้าน': '#A29BFE',
        'บริจาค 2x': '#FD79A8',
        'บริจาคพรรคการเมือง': '#FDCB6E',
        'Easy E-Receipt': '#6C5CE7'
    };

    // สร้าง datasets สำหรับ stacked bar chart
    const datasets = [];

    allItems.forEach(item => {
        datasets.push({
            label: item,
            data: [
                0, // Baseline ไม่มีการลดหย่อนเพิ่ม
                plan1Breakdown[item] || 0,
                plan2Breakdown[item] || 0
            ],
            backgroundColor: colors[item] || '#95A5A6',
            borderColor: colors[item] || '#95A5A6',
            borderWidth: 1
        });
    });

    // เพิ่ม dataset สำหรับภาษีที่เหลือ (ส่วนที่ต้องจ่ายจริง)
    datasets.unshift({
        label: 'ภาษีที่ต้องจ่าย',
        data: [baseline, plan1, plan2],
        backgroundColor: 'rgba(231, 76, 60, 0.7)',
        borderColor: 'rgba(231, 76, 60, 1)',
        borderWidth: 2
    });

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['ไม่ลดหย่อนเพิ่ม', 'แผน 1', 'แผน 2'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: false
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value) + ' บาท';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return label + ': ' + formatNumber(value) + ' บาท';
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'เปรียบเทียบภาษีและการลดหย่อน',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function createRecommendation(baseline, plan1, plan2, plan1Ded, plan2Ded) {
    const savings1 = baseline - plan1;
    const savings2 = baseline - plan2;

    let bestPlan = '';
    let html = '<h3>💡 คำแนะนำ</h3>';

    if (savings2 > savings1 && savings2 > 10000) {
        bestPlan = 'แผน 2';
        html += `
            <p><strong>แนะนำ: แผน 2</strong> เป็นตัวเลือกที่ดีที่สุดสำหรับคุณ</p>
            <ul>
                <li>ประหยัดภาษีได้ถึง ${formatNumber(savings2)} บาท/ปี</li>
                <li>ต้องลงทุนในกองทุน/ลดหย่อนเพิ่ม: ${formatNumber(plan2Ded)} บาท</li>
                <li>คุ้มค่าเพราะใช้สิทธิ์พิเศษปี 2568 (Thai ESGx, บริจาค 2 เท่า)</li>
                <li>ROI จากการลดภาษี: ${((savings2/plan2Ded)*100).toFixed(1)}%</li>
            </ul>
        `;
    } else if (savings1 > savings2 && savings1 > 5000) {
        bestPlan = 'แผน 1';
        html += `
            <p><strong>แนะนำ: แผน 1</strong> เหมาะสมกับคุณ</p>
            <ul>
                <li>ประหยัดภาษีได้ ${formatNumber(savings1)} บาท/ปี</li>
                <li>ต้องลงทุนในกองทุน/ลดหย่อนเพิ่ม: ${formatNumber(plan1Ded)} บาท</li>
                <li>เป็นแผนที่สมดุลระหว่างการลงทุนและผลประโยชน์</li>
                <li>ROI จากการลดภาษี: ${((savings1/plan1Ded)*100).toFixed(1)}%</li>
            </ul>
        `;
    } else {
        html += `
            <p><strong>คำแนะนำ:</strong> การลดหย่อนเพิ่มเติมอาจไม่คุ้มค่าสำหรับรายได้ของคุณ</p>
            <ul>
                <li>การประหยัดภาษีมีไม่มากนัก</li>
                <li>อาจไม่จำเป็นต้องลงทุนในกองทุนเพิ่มเติม</li>
                <li>แต่ถ้ามีแผนลงทุนอยู่แล้ว ก็ยังได้สิทธิ์ลดหย่อน</li>
            </ul>
        `;
    }

    document.getElementById('recommendation').innerHTML = html;
}

function createDetailedTables() {
    let html = '';

    // Baseline
    html += `
        <h4>🔵 ไม่ลดหย่อนเพิ่ม</h4>
        <table>
            <tr><td>รายได้สุทธิ</td><td>${formatNumber(incomeData.netIncome)} บาท</td></tr>
            <tr><td>ค่าลดหย่อนพื้นฐาน</td><td>${formatNumber(basicDeductions.total)} บาท</td></tr>
            <tr><td>รายได้หลังหักลดหย่อน</td><td>${formatNumber(incomeData.netIncome - basicDeductions.total)} บาท</td></tr>
        </table>
    `;

    // Plan 1
    const plan1Ded = getPlan1Deductions();
    html += `
        <h4>🟢 แผน 1</h4>
        <table>
            <tr><td>ค่าลดหย่อนพื้นฐาน</td><td>${formatNumber(basicDeductions.total)} บาท</td></tr>
            <tr><td>ค่าลดหย่อนเพิ่มเติม</td><td>${formatNumber(plan1Ded)} บาท</td></tr>
            <tr><td>ค่าลดหย่อนรวม</td><td>${formatNumber(basicDeductions.total + plan1Ded)} บาท</td></tr>
        </table>
    `;

    // Plan 2
    const plan2Ded = getPlan2Deductions();
    html += `
        <h4>🟡 แผน 2</h4>
        <table>
            <tr><td>ค่าลดหย่อนพื้นฐาน</td><td>${formatNumber(basicDeductions.total)} บาท</td></tr>
            <tr><td>ค่าลดหย่อนเพิ่มเติม</td><td>${formatNumber(plan2Ded)} บาท</td></tr>
            <tr><td>ค่าลดหย่อนรวม</td><td>${formatNumber(basicDeductions.total + plan2Ded)} บาท</td></tr>
        </table>
    `;

    document.getElementById('detailedTables').innerHTML = html;
}

// สร้าง Pie Charts สำหรับแสดงรายละเอียดการลดหย่อนแต่ละแผน
let pieChart1 = null;
let pieChart2 = null;

function createPieCharts() {
    const plan1Breakdown = getDeductionBreakdown('plan1');
    const plan2Breakdown = getDeductionBreakdown('plan2');

    // สีสำหรับแต่ละรายการ (เหมือนกราฟหลัก)
    const colors = {
        'ประกันชีวิต': '#FF6B6B',
        'ประกันสุขภาพ': '#4ECDC4',
        'ประกันบำนาญ': '#45B7D1',
        'PVD': '#96CEB4',
        'RMF': '#FFEAA7',
        'Thai ESG': '#DFE6E9',
        'Thai ESGx': '#74B9FF',
        'ดอกเบี้ยบ้าน': '#A29BFE',
        'บริจาค 2x': '#FD79A8',
        'บริจาคพรรคการเมือง': '#FDCB6E',
        'Easy E-Receipt': '#6C5CE7'
    };

    // Pie Chart สำหรับ Plan 1
    const ctx1 = document.getElementById('plan1PieChart');
    if (ctx1) {
        if (pieChart1) pieChart1.destroy();

        const plan1Labels = Object.keys(plan1Breakdown);
        const plan1Data = Object.values(plan1Breakdown);
        const plan1Colors = plan1Labels.map(label => colors[label] || '#95A5A6');

        if (plan1Data.length > 0) {
            pieChart1 = new Chart(ctx1, {
                type: 'pie',
                data: {
                    labels: plan1Labels,
                    datasets: [{
                        data: plan1Data,
                        backgroundColor: plan1Colors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return label + ': ' + formatNumber(value) + ' บาท (' + percentage + '%)';
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'สัดส่วนการลดหย่อน - แผน 1',
                            font: { size: 14, weight: 'bold' }
                        }
                    }
                }
            });
        }
    }

    // Pie Chart สำหรับ Plan 2
    const ctx2 = document.getElementById('plan2PieChart');
    if (ctx2) {
        if (pieChart2) pieChart2.destroy();

        const plan2Labels = Object.keys(plan2Breakdown);
        const plan2Data = Object.values(plan2Breakdown);
        const plan2Colors = plan2Labels.map(label => colors[label] || '#95A5A6');

        if (plan2Data.length > 0) {
            pieChart2 = new Chart(ctx2, {
                type: 'pie',
                data: {
                    labels: plan2Labels,
                    datasets: [{
                        data: plan2Data,
                        backgroundColor: plan2Colors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return label + ': ' + formatNumber(value) + ' บาท (' + percentage + '%)';
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'สัดส่วนการลดหย่อน - แผน 2',
                            font: { size: 14, weight: 'bold' }
                        }
                    }
                }
            });
        }
    }
}

// =============== Quick Value Setters ===============

// คำนวณ available limit สำหรับประกันชีวิต + ประกันสุขภาพ (รวมไม่เกิน 100,000)
function getAvailableInsuranceLimit(plan, currentItem) {
    const INSURANCE_LIMIT = 100000;
    let used = 0;

    const insuranceItems = ['lifeInsurance', 'healthInsurance'];

    insuranceItems.forEach(item => {
        if (item === currentItem) return; // ข้ามตัวที่กำลังตั้งค่า

        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);

        if (checkbox && slider && checkbox.checked) {
            used += parseFloat(slider.value) || 0;
        }
    });

    const available = INSURANCE_LIMIT - used;
    return Math.max(0, available);
}

// คำนวณ available limit สำหรับ PVD+RMF+Pension (รวมไม่เกิน 500,000)
function getAvailableRetirementLimit(plan, currentItem) {
    const RETIREMENT_LIMIT = 500000;
    let used = 0;

    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];

    retirementItems.forEach(item => {
        if (item === currentItem) return; // ข้ามตัวที่กำลังตั้งค่า

        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);

        if (checkbox && slider && checkbox.checked) {
            used += parseFloat(slider.value) || 0;
        }
    });

    const available = RETIREMENT_LIMIT - used;
    return Math.max(0, available);
}

// อัพเดต slider limits สำหรับประกันชีวิต + ประกันสุขภาพ
function updateInsuranceSliderLimits(plan) {
    const INSURANCE_LIMIT = 100000;
    const insuranceItems = ['lifeInsurance', 'healthInsurance'];

    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        const sliderDiv = document.getElementById(`${plan}_${item}_slider`);

        if (!checkbox || !slider || !sliderDiv) return;

        let currentValue = parseFloat(slider.value) || 0;

        // ถ้า current value เกิน 100K ให้รีเซ็ตเป็น 0
        if (currentValue > INSURANCE_LIMIT) {
            currentValue = 0;
            slider.value = 0;
            const displaySpan = sliderDiv.querySelector('.slider-display');
            if (displaySpan) displaySpan.textContent = '0 บาท';
        }

        const available = getAvailableInsuranceLimit(plan, item);

        // ตั้ง max ของ slider = available (ไม่ต้องบวก currentValue เพราะ available คือที่ใช้ได้ทั้งหมดแล้ว)
        const newMax = Math.min(INSURANCE_LIMIT, available);
        slider.max = newMax;

        // ⚠️ CRITICAL: ถ้า current value เกิน newMax ให้ลดลงมา
        if (currentValue > newMax) {
            slider.value = newMax;
            currentValue = newMax;
            const displaySpan = sliderDiv.querySelector('.slider-display');
            if (displaySpan) displaySpan.textContent = formatNumber(newMax) + ' บาท';
        }

        // ถ้า available = 0 และ current = 0 ก็ disable
        if (available === 0 && currentValue === 0) {
            slider.disabled = true;
            slider.style.opacity = '0.5';
            slider.style.cursor = 'not-allowed';
        } else {
            slider.disabled = false;
            slider.style.opacity = '1';
            slider.style.cursor = 'pointer';
        }
    });
}

// อัพเดตคำเตือนสำหรับประกันชีวิต + ประกันสุขภาพ
function updateInsuranceWarnings(plan) {
    const INSURANCE_LIMIT = 100000;
    const insuranceItems = ['lifeInsurance', 'healthInsurance'];
    let totalUsed = 0;

    // คำนวณยอดรวม
    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);

        if (checkbox && slider && checkbox.checked) {
            totalUsed += parseFloat(slider.value) || 0;
        }
    });

    // อัพเดตคำเตือนในแต่ละรายการ
    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        const sliderDiv = document.getElementById(`${plan}_${item}_slider`);

        if (!checkbox || !sliderDiv) return;

        const warningSpan = sliderDiv.querySelector('.limit-warning');
        if (!warningSpan) return;

        const currentValue = parseFloat(slider.value) || 0;
        const available = getAvailableInsuranceLimit(plan, item);

        // แสดงคำเตือนเฉพาะตอนที่ check
        if (checkbox.checked) {
            const remaining = INSURANCE_LIMIT - totalUsed;

            if (totalUsed > INSURANCE_LIMIT) {
                warningSpan.textContent = `⚠️ เกินวงเงิน 100,000! (รวม ${formatNumber(totalUsed)} บาท)`;
                warningSpan.style.color = '#f44336';
                warningSpan.style.fontWeight = 'bold';
            } else if (available === 0 && currentValue === 0) {
                warningSpan.textContent = `🚫 ไม่สามารถเลือกได้ เต็มวงเงิน 100,000 แล้ว`;
                warningSpan.style.color = '#f44336';
                warningSpan.style.fontWeight = 'bold';
            } else if (available === 0) {
                warningSpan.textContent = `⚠️ ไม่สามารถเพิ่มได้ เต็มวงเงิน 100,000 แล้ว`;
                warningSpan.style.color = '#ff9800';
                warningSpan.style.fontWeight = 'bold';
            } else if (remaining < 10000) {
                warningSpan.textContent = `⚠️ เหลือ ${formatNumber(remaining)} บาท จาก 100,000`;
                warningSpan.style.color = '#ff9800';
            } else {
                warningSpan.textContent = `✓ เหลือ ${formatNumber(remaining)} บาท`;
                warningSpan.style.color = '#4caf50';
            }
        } else {
            warningSpan.textContent = '';
        }
    });

    // อัพเดต slider limits
    updateInsuranceSliderLimits(plan);
}

// อัพเดต slider limits สำหรับ retirement funds
function updateRetirementSliderLimits(plan) {
    const RETIREMENT_LIMIT = 500000;
    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];
    const netIncome = incomeData.netIncome || 0;

    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        const sliderDiv = document.getElementById(`${plan}_${item}_slider`);

        if (!checkbox || !slider || !sliderDiv) return;

        let currentValue = parseFloat(slider.value) || 0;

        // คำนวณ max ที่แท้จริงของแต่ละรายการ
        let itemMax = 500000; // default
        if (item === 'pensionInsurance') {
            itemMax = Math.min(netIncome * 0.15, 200000);
        } else if (item === 'pvd') {
            itemMax = 500000;
        } else if (item === 'rmf') {
            itemMax = Math.min(netIncome * 0.30, 500000);
        }

        // ถ้า current value เกิน itemMax ให้รีเซ็ตเป็น 0
        if (currentValue > itemMax) {
            currentValue = 0;
            slider.value = 0;
            const displaySpan = sliderDiv.querySelector('.slider-display');
            if (displaySpan) displaySpan.textContent = '0 บาท';
        }

        const available = getAvailableRetirementLimit(plan, item);

        // ตั้ง max ของ slider = available (ไม่ต้องบวก currentValue เพราะ available คือที่ใช้ได้ทั้งหมดแล้ว)
        const newMax = Math.min(itemMax, available);
        slider.max = newMax;

        // ⚠️ CRITICAL: ถ้า current value เกิน newMax ให้ลดลงมา
        if (currentValue > newMax) {
            slider.value = newMax;
            currentValue = newMax;
            const displaySpan = sliderDiv.querySelector('.slider-display');
            if (displaySpan) displaySpan.textContent = formatNumber(newMax) + ' บาท';
        }

        // ถ้า available = 0 และ current = 0 ก็ disable
        if (available === 0 && currentValue === 0) {
            slider.disabled = true;
            slider.style.opacity = '0.5';
            slider.style.cursor = 'not-allowed';
        } else {
            slider.disabled = false;
            slider.style.opacity = '1';
            slider.style.cursor = 'pointer';
        }
    });
}

// อัพเดตคำเตือนสำหรับ retirement funds
function updateRetirementWarnings(plan) {
    const RETIREMENT_LIMIT = 500000;
    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];
    let totalUsed = 0;

    // คำนวณยอดรวม
    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);

        if (checkbox && slider && checkbox.checked) {
            totalUsed += parseFloat(slider.value) || 0;
        }
    });

    // อัพเดตคำเตือนในแต่ละรายการ
    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        const sliderDiv = document.getElementById(`${plan}_${item}_slider`);

        if (!checkbox || !sliderDiv) return;

        const warningSpan = sliderDiv.querySelector('.limit-warning');
        if (!warningSpan) return;

        const currentValue = parseFloat(slider.value) || 0;
        const available = getAvailableRetirementLimit(plan, item);

        // แสดงคำเตือนเฉพาะตอนที่ check
        if (checkbox.checked) {
            const remaining = RETIREMENT_LIMIT - totalUsed;

            if (totalUsed > RETIREMENT_LIMIT) {
                warningSpan.textContent = `⚠️ เกินวงเงิน 500,000! (รวม ${formatNumber(totalUsed)} บาท)`;
                warningSpan.style.color = '#f44336';
                warningSpan.style.fontWeight = 'bold';
            } else if (available === 0 && currentValue === 0) {
                warningSpan.textContent = `🚫 ไม่สามารถเลือกได้ เต็มวงเงิน 500,000 แล้ว`;
                warningSpan.style.color = '#f44336';
                warningSpan.style.fontWeight = 'bold';
            } else if (available === 0) {
                warningSpan.textContent = `⚠️ ไม่สามารถเพิ่มได้ เต็มวงเงิน 500,000 แล้ว`;
                warningSpan.style.color = '#ff9800';
                warningSpan.style.fontWeight = 'bold';
            } else if (remaining < 50000) {
                warningSpan.textContent = `⚠️ เหลือ ${formatNumber(remaining)} บาท จาก 500,000`;
                warningSpan.style.color = '#ff9800';
            } else {
                warningSpan.textContent = `✓ เหลือ ${formatNumber(remaining)} บาท`;
                warningSpan.style.color = '#4caf50';
            }
        } else {
            warningSpan.textContent = '';
        }
    });

    // อัพเดต slider limits
    updateRetirementSliderLimits(plan);
}

function setQuickValue(plan, item, value, percent) {
    const slider = document.getElementById(`${plan}_${item}`);
    const sliderDiv = document.getElementById(`${plan}_${item}_slider`);
    const displaySpan = sliderDiv.querySelector('.slider-display');

    if (!slider || !sliderDiv || !displaySpan) {
        console.error(`Cannot find elements for ${plan}_${item}`);
        return;
    }

    let finalValue;

    // ถ้าเป็น 'max-available'
    if (value === 'max-available') {
        const netIncome = incomeData.netIncome || 0;

        // สำหรับประกันชีวิต + ประกันสุขภาพ (รวมไม่เกิน 100K)
        if (['lifeInsurance', 'healthInsurance'].includes(item)) {
            const available = getAvailableInsuranceLimit(plan, item);
            finalValue = Math.min(100000, available);
        }
        // สำหรับ retirement funds (รวมไม่เกิน 500K)
        else if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
            const available = getAvailableRetirementLimit(plan, item);

            if (item === 'pensionInsurance') {
                // ประกันบำนาญ: max 15% ของรายได้, ไม่เกิน 200,000, และไม่เกิน available
                finalValue = Math.min(netIncome * 0.15, 200000, available);
            } else if (item === 'pvd') {
                // PVD: ไม่เกิน available
                finalValue = Math.min(500000, available);
            } else if (item === 'rmf') {
                // RMF: max 30% ของรายได้, ไม่เกิน 500,000, และไม่เกิน available
                finalValue = Math.min(netIncome * 0.30, 500000, available);
            }
        }
        finalValue = Math.round(finalValue);
    }
    // ถ้าเป็นการคำนวณเปอร์เซ็นต์
    else if (value === 'percent' && percent) {
        const netIncome = incomeData.netIncome || 0;
        finalValue = Math.round(netIncome * (percent / 100));

        // จำกัดไม่ให้เกิน max ของ slider
        const maxValue = parseInt(slider.max);
        finalValue = Math.min(finalValue, maxValue);

        // ถ้าเป็น retirement fund ต้องเช็ค available ด้วย
        if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
            const available = getAvailableRetirementLimit(plan, item);
            finalValue = Math.min(finalValue, available);
        }
    } else {
        finalValue = value;
    }

    // Set slider value
    slider.value = finalValue;

    // Update display
    if (item === 'donationDouble') {
        displaySpan.textContent = `${formatNumber(finalValue)} บาท → ลดหย่อน ${formatNumber(finalValue * 2)} บาท (2x)`;
    } else {
        displaySpan.textContent = formatNumber(finalValue) + ' บาท';
    }

    // อัพเดตคำเตือนถ้าเป็น insurance
    if (['lifeInsurance', 'healthInsurance'].includes(item)) {
        updateInsuranceWarnings(plan);
    }

    // อัพเดตคำเตือนถ้าเป็น retirement fund
    if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
        updateRetirementWarnings(plan);
    }

    // Trigger update
    if (plan === 'plan1') {
        updatePlan1();
    } else if (plan === 'plan2') {
        updatePlan2();
    }

    console.log(`Quick value set: ${plan}_${item} = ${finalValue}`);
}

// รีเซ็ตค่าของไอเทมเป็น 0
function resetItemValue(plan, item) {
    const slider = document.getElementById(`${plan}_${item}`);
    const sliderDiv = document.getElementById(`${plan}_${item}_slider`);
    const displaySpan = sliderDiv?.querySelector('.slider-display');

    if (!slider || !sliderDiv) {
        console.error(`Cannot find elements for ${plan}_${item}`);
        return;
    }

    // รีเซ็ตค่าเป็น 0
    slider.value = 0;
    if (displaySpan) displaySpan.textContent = '0 บาท';

    // อัพเดต limits และ warnings ตามประเภท
    if (['lifeInsurance', 'healthInsurance'].includes(item)) {
        updateInsuranceSliderLimits(plan);
        updateInsuranceWarnings(plan);
    } else if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
        updateRetirementSliderLimits(plan);
        updateRetirementWarnings(plan);
    }

    // Trigger update
    if (plan === 'plan1') {
        updatePlan1();
    } else if (plan === 'plan2') {
        updatePlan2();
    }

    console.log(`✅ Reset: ${plan}_${item} = 0`);
}

// =============== Event Listeners ===============

// ใช้ทั้ง DOMContentLoaded และ window.onload เพื่อความแน่ใจ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

function initializeApp() {
    console.log('🚀 Application starting...');
    console.log('Document ready state:', document.readyState);

    // Step 1: Income sliders
    console.log('📊 Setting up Step 1 sliders...');
    setupSlider('salary', 'salarySlider', 'salaryDisplay', updateIncomePreview);
    setupSlider('bonus', 'bonusSlider', 'bonusDisplay', updateIncomePreview);

    // Step 2: Basic deduction sliders
    console.log('👨‍👩‍👧‍👦 Setting up Step 2 sliders...');

    // บุตรคนแรก / เกิดก่อนปี 2561
    setupSlider('childCount', 'childSlider', 'childDisplay', function() {
        updateChildDeductionDisplay();
        updateAndSaveBasicDeductions();
    });

    // บุตรคนที่ 2+ เกิดปี 2561 เป็นต้นไป
    setupSlider('childCount2561', 'childSlider2561', 'childDisplay2561', function() {
        updateChildDeductionDisplay();
        updateAndSaveBasicDeductions();
    });

    setupSlider('socialSecurity', 'socialSecuritySlider', 'socialSecurityDisplay', updateAndSaveBasicDeductions);

    // ประกันสุขภาพบิดามารดา slider
    setupSlider('parentHealthInsuranceAmount', 'parentHealthInsuranceSlider', 'parentHealthInsuranceDisplay', updateAndSaveBasicDeductions);

    // Parent options toggle
    document.getElementById('parentDeduction').addEventListener('change', function() {
        document.getElementById('parentOptions').style.display = this.checked ? 'block' : 'none';
        updateAndSaveBasicDeductions();
    });

    document.getElementById('parentSpouseDeduction').addEventListener('change', function() {
        document.getElementById('parentSpouseOptions').style.display = this.checked ? 'block' : 'none';
        updateAndSaveBasicDeductions();
    });

    // ประกันสุขภาพบิดามารดา checkbox toggle
    document.getElementById('parentHealthInsurance').addEventListener('change', function() {
        document.getElementById('parentHealthInsuranceOptions').style.display = this.checked ? 'block' : 'none';
        updateAndSaveBasicDeductions();
    });

    document.getElementById('spouseDeduction').addEventListener('change', updateAndSaveBasicDeductions);
    document.getElementById('parentCount').addEventListener('change', updateAndSaveBasicDeductions);
    document.getElementById('parentSpouseCount').addEventListener('change', updateAndSaveBasicDeductions);

    // Step 3: Plan 1 checkboxes and sliders
    console.log('🟢 Setting up Plan 1 items...');
    setupPlanItems('plan1', ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf', 'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'], updatePlan1);

    // Step 3: Plan 2 checkboxes and sliders
    console.log('🟡 Setting up Plan 2 items...');
    setupPlanItems('plan2', ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf', 'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'], updatePlan2);

    // Load saved data AFTER setting up listeners
    console.log('💾 Loading saved data...');
    loadSavedData();

    // Load Step 3 plan data (Plan 1 & Plan 2)
    console.log('📂 Loading Step 3 plan data...');
    loadPlanData();

    // Check if data from salary slips
    checkAndLoadSalarySlipsData();

    // Initial updates
    console.log('🔄 Initial updates...');
    updateIncomePreview();
    updateBasicDeductionPreview();

    // ตั้งค่า slider limits เริ่มต้นสำหรับทั้ง plan1 และ plan2
    console.log('🎚️ Setting up initial slider limits...');

    // Fix saved data ที่อาจเกิน limits
    fixSliderLimits('plan1');
    fixSliderLimits('plan2');

    updateInsuranceSliderLimits('plan1');
    updateInsuranceWarnings('plan1');
    updateRetirementSliderLimits('plan1');
    updateRetirementWarnings('plan1');

    updateInsuranceSliderLimits('plan2');
    updateInsuranceWarnings('plan2');
    updateRetirementSliderLimits('plan2');
    updateRetirementWarnings('plan2');

    // อัพเดตการคำนวณ Step 3 & 4
    console.log('🧮 Updating scenarios...');
    updateAllScenarios();

    console.log('✅ Application ready!');
}

// แก้ไขค่า slider ที่เกิน limits (จาก saved data เก่า)
function fixSliderLimits(plan) {
    const netIncome = incomeData.netIncome || 0;

    // Fix insurance (100K limit)
    const insuranceItems = ['lifeInsurance', 'healthInsurance'];
    let insuranceTotal = 0;

    insuranceItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        if (checkbox && slider && checkbox.checked) {
            insuranceTotal += parseFloat(slider.value) || 0;
        }
    });

    if (insuranceTotal > 100000) {
        console.warn(`⚠️ ${plan} insurance total exceeds 100K, resetting...`);
        insuranceItems.forEach(item => {
            const slider = document.getElementById(`${plan}_${item}`);
            const sliderDiv = document.getElementById(`${plan}_${item}_slider`);
            if (slider && sliderDiv) {
                slider.value = 0;
                const displaySpan = sliderDiv.querySelector('.slider-display');
                if (displaySpan) displaySpan.textContent = '0 บาท';
            }
        });
    }

    // Fix retirement funds (500K limit)
    const retirementItems = ['pensionInsurance', 'pvd', 'rmf'];
    let retirementTotal = 0;

    retirementItems.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        if (checkbox && slider && checkbox.checked) {
            retirementTotal += parseFloat(slider.value) || 0;
        }
    });

    if (retirementTotal > 500000) {
        console.warn(`⚠️ ${plan} retirement total exceeds 500K, resetting...`);
        retirementItems.forEach(item => {
            const slider = document.getElementById(`${plan}_${item}`);
            const sliderDiv = document.getElementById(`${plan}_${item}_slider`);
            if (slider && sliderDiv) {
                slider.value = 0;
                const displaySpan = sliderDiv.querySelector('.slider-display');
                if (displaySpan) displaySpan.textContent = '0 บาท';
            }
        });
    }
}

function setupSlider(inputId, sliderId, displayId, callback) {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);

    if (!input || !slider || !display) {
        console.error(`❌ setupSlider failed: Missing element`, {inputId, sliderId, displayId});
        return;
    }

    console.log(`✅ Setting up slider: ${inputId}`);

    // Slider to input
    slider.addEventListener('input', function() {
        const value = this.value;
        input.value = formatNumber(value);
        display.textContent = formatNumber(value);
        console.log(`🎚️ Slider ${inputId} changed to:`, value);
        if (callback) callback();
    });

    // Input to slider
    input.addEventListener('input', function() {
        const value = parseNumberWithComma(this.value);
        slider.value = value;
        display.textContent = formatNumber(value);
        console.log(`⌨️ Input ${inputId} changed to:`, value);
        if (callback) callback();
    });

    // Set initial value
    if (slider.value) {
        input.value = formatNumber(slider.value);
        display.textContent = formatNumber(slider.value);
        console.log(`🎯 Initial value for ${inputId}:`, slider.value);
    }
}

function setupPlanItems(plan, items, updateCallback) {
    console.log(`Setting up ${plan} with ${items.length} items`);

    items.forEach(item => {
        const checkbox = document.getElementById(`${plan}_${item}_check`);
        const slider = document.getElementById(`${plan}_${item}`);
        const sliderDiv = document.getElementById(`${plan}_${item}_slider`);

        // ตรวจสอบว่าทุก element มีอยู่จริง
        if (!checkbox || !slider || !sliderDiv) {
            console.warn(`⚠️ Missing element for ${plan}_${item}`, {
                checkbox: !!checkbox,
                slider: !!slider,
                sliderDiv: !!sliderDiv
            });
            return;
        }

        // Initialize slider display
        const displaySpan = sliderDiv.querySelector('.slider-display');
        if (!displaySpan) {
            console.warn(`⚠️ Missing display span for ${plan}_${item}`);
            return;
        }

        console.log(`✅ Setup ${plan}_${item}`);

        const initialValue = parseFloat(slider.value) || 0;
        if (item === 'donationDouble') {
            displaySpan.textContent = `${formatNumber(initialValue)} บาท → ลดหย่อน ${formatNumber(initialValue * 2)} บาท (2x)`;
        } else {
            displaySpan.textContent = formatNumber(initialValue) + ' บาท';
        }

        // Checkbox toggle - แสดง/ซ่อน slider
        checkbox.addEventListener('change', function() {
            console.log(`☑️ Checkbox ${plan}_${item} changed:`, this.checked);
            if (this.checked) {
                sliderDiv.style.display = 'flex';
                console.log(`👁️ Showing slider for ${plan}_${item}`);

                // ตั้งค่า slider limits เมื่อเปิด checkbox
                if (['lifeInsurance', 'healthInsurance'].includes(item)) {
                    updateInsuranceSliderLimits(plan);
                    updateInsuranceWarnings(plan);
                } else if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
                    updateRetirementSliderLimits(plan);
                    updateRetirementWarnings(plan);
                }
            } else {
                sliderDiv.style.display = 'none';
                console.log(`🙈 Hiding slider for ${plan}_${item}`);

                // รีเซ็ตค่าเป็น 0 เมื่อปิด checkbox
                slider.value = 0;
                if (item === 'donationDouble') {
                    displaySpan.textContent = '0 บาท → ลดหย่อน 0 บาท (2x)';
                } else {
                    displaySpan.textContent = '0 บาท';
                }

                // อัพเดต limits ของรายการอื่นๆ
                if (['lifeInsurance', 'healthInsurance'].includes(item)) {
                    updateInsuranceSliderLimits(plan);
                    updateInsuranceWarnings(plan);
                } else if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
                    updateRetirementSliderLimits(plan);
                    updateRetirementWarnings(plan);
                }
            }

            if (updateCallback) updateCallback();
        });

        // Slider change - อัพเดตค่าแสดงผล
        slider.addEventListener('input', function() {
            const value = parseFloat(this.value) || 0;
            console.log(`🎚️ Slider ${plan}_${item} changed to:`, value);

            if (item === 'donationDouble') {
                // แสดงทั้งจำนวนจริงและลดหย่อน 2 เท่า
                displaySpan.textContent = `${formatNumber(value)} บาท → ลดหย่อน ${formatNumber(value * 2)} บาท (2x)`;
            } else {
                displaySpan.textContent = formatNumber(value) + ' บาท';
            }

            // อัพเดตคำเตือนและ limits ถ้าเป็น insurance
            if (['lifeInsurance', 'healthInsurance'].includes(item)) {
                updateInsuranceSliderLimits(plan);
                updateInsuranceWarnings(plan);
            }

            // อัพเดตคำเตือนและ limits ถ้าเป็น retirement fund
            if (['pensionInsurance', 'pvd', 'rmf'].includes(item)) {
                updateRetirementSliderLimits(plan);
                updateRetirementWarnings(plan);
            }

            if (updateCallback) updateCallback();
        });
    });
}

// ฟังก์ชันสำหรับตารางเปรียบเทียบใหม่
function toggleDeductionRow(plan, item) {
    const checkbox = document.getElementById(`${plan}_${item}_check`);
    const container = document.getElementById(`${plan}_${item}_container`);
    const slider = document.getElementById(`${plan}_${item}`);
    const displaySpan = document.getElementById(`${plan}_${item}_display`);

    if (!checkbox || !container || !slider || !displaySpan) {
        console.warn(`⚠️ Missing elements for ${plan}_${item}`);
        return;
    }

    if (checkbox.checked) {
        container.style.display = 'block';
        console.log(`👁️ Showing slider for ${plan}_${item}`);
    } else {
        container.style.display = 'none';
        slider.value = 0;
        displaySpan.textContent = '0';
        console.log(`🙈 Hiding slider for ${plan}_${item}`);
    }

    // อัพเดต max ของ slider อื่นๆ ตามลิมิตที่เหลือ
    updateSliderLimits(plan);

    // อัพเดตการแสดงลิมิตรวม
    updateLimitDisplay(plan);

    // อัพเดตการคำนวณ
    updateAllScenarios();

    // บันทึกข้อมูลอัตโนมัติ
    savePlanData();
}

function updateDeductionValue(plan, item) {
    const slider = document.getElementById(`${plan}_${item}`);
    const displaySpan = document.getElementById(`${plan}_${item}_display`);

    if (!slider || !displaySpan) {
        console.warn(`⚠️ Missing elements for updating ${plan}_${item}`);
        return;
    }

    const value = parseFloat(slider.value) || 0;
    displaySpan.textContent = formatNumber(value);
    console.log(`🎚️ Updated ${plan}_${item} to:`, value);

    // อัพเดต max ของ slider อื่นๆ ตามลิมิตที่เหลือ
    updateSliderLimits(plan);

    // อัพเดตการแสดงลิมิตรวม
    updateLimitDisplay(plan);

    // อัพเดตการคำนวณ
    updateAllScenarios();

    // บันทึกข้อมูลอัตโนมัติ
    savePlanData();
}

// ฟังก์ชันสำหรับอัพเดต max ของ slider ตามลิมิตที่เหลือ
function updateSliderLimits(plan) {
    const netIncome = incomeData.netIncome || 0;

    // === ลิมิตประกัน 100,000 ===
    const lifeInsCheck = document.getElementById(`${plan}_lifeInsurance_check`)?.checked || false;
    const healthInsCheck = document.getElementById(`${plan}_healthInsurance_check`)?.checked || false;
    const lifeInsSlider = document.getElementById(`${plan}_lifeInsurance`);
    const healthInsSlider = document.getElementById(`${plan}_healthInsurance`);

    if (lifeInsSlider && healthInsSlider) {
        const lifeInsValue = lifeInsCheck ? (parseFloat(lifeInsSlider.value) || 0) : 0;
        const healthInsValue = healthInsCheck ? (parseFloat(healthInsSlider.value) || 0) : 0;

        // คำนวณว่าแต่ละตัวลากได้สูงสุดเท่าไร (ไม่ว่าจะ checked หรือไม่ ก็ต้องจำกัดตามอีกตัว)
        const lifeInsMax = Math.min(100000, 100000 - healthInsValue);
        const healthInsMax = Math.min(100000, 100000 - lifeInsValue);

        lifeInsSlider.max = lifeInsMax;
        healthInsSlider.max = healthInsMax;

        console.log(`${plan} ประกัน: life=${lifeInsValue}/${lifeInsMax}, health=${healthInsValue}/${healthInsMax}`);

        // ถ้าค่าปัจจุบันเกิน max ใหม่ ให้ลดลง
        if (lifeInsValue > lifeInsMax) {
            lifeInsSlider.value = lifeInsMax;
            document.getElementById(`${plan}_lifeInsurance_display`).textContent = formatNumber(lifeInsMax);
        }
        if (healthInsValue > healthInsMax) {
            healthInsSlider.value = healthInsMax;
            document.getElementById(`${plan}_healthInsurance_display`).textContent = formatNumber(healthInsMax);
        }
    }

    // === ลิมิตกลุ่ม 500,000 (PVD + RMF + ประกันบำนาญ) ===
    const pensionCheck = document.getElementById(`${plan}_pensionInsurance_check`)?.checked || false;
    const pvdCheck = document.getElementById(`${plan}_pvd_check`)?.checked || false;
    const rmfCheck = document.getElementById(`${plan}_rmf_check`)?.checked || false;

    const pensionSlider = document.getElementById(`${plan}_pensionInsurance`);
    const pvdSlider = document.getElementById(`${plan}_pvd`);
    const rmfSlider = document.getElementById(`${plan}_rmf`);

    if (pensionSlider && pvdSlider && rmfSlider) {
        let pensionValue = pensionCheck ? (parseFloat(pensionSlider.value) || 0) : 0;
        let pvdValue = pvdCheck ? (parseFloat(pvdSlider.value) || 0) : 0;
        let rmfValue = rmfCheck ? (parseFloat(rmfSlider.value) || 0) : 0;

        let totalRetirement = pensionValue + pvdValue + rmfValue;

        // คำนวณ max แต่ละตัวตามเงื่อนไขเดี่ยว
        const pensionIndividualMax = Math.min(netIncome * 0.15, 200000);
        const pvdIndividualMax = 500000;
        const rmfIndividualMax = Math.min(netIncome * 0.30, 500000);

        // ⚠️ CRITICAL: ถ้ารวมเกิน 500k ให้ลดค่าลงตามลำดับ (rmf → pvd → pension)
        if (totalRetirement > 500000) {
            const excess = totalRetirement - 500000;
            let adjusted = false;

            // ลด RMF ก่อน
            if (rmfValue > 0) {
                const rmfReduction = Math.min(rmfValue, excess);
                rmfValue -= rmfReduction;
                rmfSlider.value = rmfValue;
                document.getElementById(`${plan}_rmf_display`).textContent = formatNumber(rmfValue);
                totalRetirement -= rmfReduction;
                adjusted = true;
            }

            // ถ้ายังเกินอยู่ ลด PVD
            if (totalRetirement > 500000 && pvdValue > 0) {
                const excess2 = totalRetirement - 500000;
                const pvdReduction = Math.min(pvdValue, excess2);
                pvdValue -= pvdReduction;
                pvdSlider.value = pvdValue;
                document.getElementById(`${plan}_pvd_display`).textContent = formatNumber(pvdValue);
                totalRetirement -= pvdReduction;
                adjusted = true;
            }

            // ถ้ายังเกินอยู่ ลด ประกันบำนาญ
            if (totalRetirement > 500000 && pensionValue > 0) {
                const excess3 = totalRetirement - 500000;
                const pensionReduction = Math.min(pensionValue, excess3);
                pensionValue -= pensionReduction;
                pensionSlider.value = pensionValue;
                document.getElementById(`${plan}_pensionInsurance_display`).textContent = formatNumber(pensionValue);
                totalRetirement -= pensionReduction;
                adjusted = true;
            }

            // บันทึกกลับเข้า localStorage ถ้ามีการปรับค่า
            if (adjusted) {
                savePlanData();
            }
        }

        // Max ที่ใช้ได้จริง = min(ลิมิตเดี่ยว, ค่าปัจจุบัน + ที่เหลือในกลุ่ม 500K)
        const pensionMax = Math.min(pensionIndividualMax, pensionValue + Math.max(0, 500000 - totalRetirement));
        const pvdMax = Math.min(pvdIndividualMax, pvdValue + Math.max(0, 500000 - totalRetirement));
        const rmfMax = Math.min(rmfIndividualMax, rmfValue + Math.max(0, 500000 - totalRetirement));

        pensionSlider.max = pensionMax;
        pvdSlider.max = pvdMax;
        rmfSlider.max = rmfMax;

        console.log(`${plan} กลุ่ม500K: pension=${pensionValue}/${pensionMax}, pvd=${pvdValue}/${pvdMax}, rmf=${rmfValue}/${rmfMax}, total=${totalRetirement}/500000`);

        // ถ้าค่าปัจจุบันเกิน max ใหม่ ให้ลดลง (สำหรับเคสอื่นๆ)
        if (pensionValue > pensionMax) {
            pensionSlider.value = pensionMax;
            document.getElementById(`${plan}_pensionInsurance_display`).textContent = formatNumber(pensionMax);
        }
        if (pvdValue > pvdMax) {
            pvdSlider.value = pvdMax;
            document.getElementById(`${plan}_pvd_display`).textContent = formatNumber(pvdMax);
        }
        if (rmfValue > rmfMax) {
            rmfSlider.value = rmfMax;
            document.getElementById(`${plan}_rmf_display`).textContent = formatNumber(rmfMax);
        }
    }

    // === ลิมิตรายการอื่นๆ (ตามเงื่อนไขเดี่ยว) ===
    const thaiEsgSlider = document.getElementById(`${plan}_thaiEsg`);
    const thaiEsgxSlider = document.getElementById(`${plan}_thaiEsgx`);

    if (thaiEsgSlider) {
        thaiEsgSlider.max = Math.min(netIncome * 0.30, 300000);
    }
    if (thaiEsgxSlider) {
        thaiEsgxSlider.max = Math.min(netIncome * 0.30, 300000);
    }
}

// ฟังก์ชันสำหรับอัพเดตการแสดงลิมิตรวม
function updateLimitDisplay(plan) {
    const netIncome = incomeData.netIncome || 0;

    // คำนวณลิมิตประกัน (ประกันชีวิต + ประกันสุขภาพ)
    let insuranceTotal = 0;
    const lifeIns = document.getElementById(`${plan}_lifeInsurance_check`)?.checked ?
        (parseFloat(document.getElementById(`${plan}_lifeInsurance`)?.value) || 0) : 0;
    const healthIns = document.getElementById(`${plan}_healthInsurance_check`)?.checked ?
        (parseFloat(document.getElementById(`${plan}_healthInsurance`)?.value) || 0) : 0;
    insuranceTotal = lifeIns + healthIns;

    // คำนวณลิมิตกลุ่ม 500K (PVD + RMF + ประกันบำนาญ)
    let retirementTotal = 0;
    const pension = document.getElementById(`${plan}_pensionInsurance_check`)?.checked ?
        (parseFloat(document.getElementById(`${plan}_pensionInsurance`)?.value) || 0) : 0;
    const pvd = document.getElementById(`${plan}_pvd_check`)?.checked ?
        (parseFloat(document.getElementById(`${plan}_pvd`)?.value) || 0) : 0;
    const rmf = document.getElementById(`${plan}_rmf_check`)?.checked ?
        (parseFloat(document.getElementById(`${plan}_rmf`)?.value) || 0) : 0;
    retirementTotal = pension + pvd + rmf;

    // อัพเดตการแสดงผลลิมิตประกัน
    const insuranceTotalEl = document.getElementById(`${plan}_insurance_total`);
    const insuranceBarEl = document.getElementById(`${plan}_insurance_bar`);
    const insuranceWarningEl = document.getElementById(`${plan}_insurance_warning`);

    if (insuranceTotalEl && insuranceBarEl && insuranceWarningEl) {
        const insurancePercent = Math.min((insuranceTotal / 100000) * 100, 100);
        insuranceTotalEl.textContent = `${formatNumber(insuranceTotal)} / 100,000`;
        insuranceBarEl.style.width = `${insurancePercent}%`;

        if (insuranceTotal > 100000) {
            insuranceBarEl.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
            insuranceWarningEl.textContent = `⚠️ เกินลิมิต! ใช้ได้เพียง 100,000 บาท`;
            insuranceWarningEl.style.color = '#dc3545';
            insuranceWarningEl.style.fontWeight = '600';
        } else if (insuranceTotal > 90000) {
            insuranceBarEl.style.background = 'linear-gradient(90deg, #ffc107, #ffd54f)';
            insuranceWarningEl.textContent = `⚠️ ใกล้ถึงลิมิตแล้ว (เหลือ ${formatNumber(100000 - insuranceTotal)} บาท)`;
            insuranceWarningEl.style.color = '#f57c00';
            insuranceWarningEl.style.fontWeight = '500';
        } else {
            insuranceBarEl.style.background = plan === 'plan1' ?
                'linear-gradient(90deg, #4CAF50, #81C784)' :
                'linear-gradient(90deg, #F57C00, #FFB74D)';
            insuranceWarningEl.textContent = insuranceTotal > 0 ?
                `✓ ใช้ได้ปกติ (เหลือ ${formatNumber(100000 - insuranceTotal)} บาท)` : '';
            insuranceWarningEl.style.color = '#666';
            insuranceWarningEl.style.fontWeight = 'normal';
        }
    }

    // อัพเดตการแสดงผลลิมิตกลุ่ม 500K
    const retirementTotalEl = document.getElementById(`${plan}_retirement_total`);
    const retirementBarEl = document.getElementById(`${plan}_retirement_bar`);
    const retirementWarningEl = document.getElementById(`${plan}_retirement_warning`);

    if (retirementTotalEl && retirementBarEl && retirementWarningEl) {
        // ตรวจสอบลิมิตแยกของแต่ละรายการ
        const pensionLimit = Math.min(netIncome * 0.15, 200000);
        const rmfLimit = Math.min(netIncome * 0.30, 500000);

        const retirementPercent = Math.min((retirementTotal / 500000) * 100, 100);
        retirementTotalEl.textContent = `${formatNumber(retirementTotal)} / 500,000`;
        retirementBarEl.style.width = `${retirementPercent}%`;

        let warnings = [];
        if (pension > pensionLimit) {
            warnings.push(`ประกันบำนาญใช้ได้เพียง ${formatNumber(pensionLimit)} บาท (15% ของรายได้)`);
        }
        if (rmf > rmfLimit) {
            warnings.push(`RMF ใช้ได้เพียง ${formatNumber(rmfLimit)} บาท (30% ของรายได้)`);
        }

        if (retirementTotal > 500000) {
            retirementBarEl.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
            retirementWarningEl.textContent = `⚠️ เกินลิมิต! ใช้ได้เพียง 500,000 บาท`;
            retirementWarningEl.style.color = '#dc3545';
            retirementWarningEl.style.fontWeight = '600';
        } else if (warnings.length > 0) {
            retirementBarEl.style.background = 'linear-gradient(90deg, #ffc107, #ffd54f)';
            retirementWarningEl.textContent = `⚠️ ${warnings[0]}`;
            retirementWarningEl.style.color = '#f57c00';
            retirementWarningEl.style.fontWeight = '500';
        } else if (retirementTotal > 450000) {
            retirementBarEl.style.background = 'linear-gradient(90deg, #ffc107, #ffd54f)';
            retirementWarningEl.textContent = `⚠️ ใกล้ถึงลิมิตแล้ว (เหลือ ${formatNumber(500000 - retirementTotal)} บาท)`;
            retirementWarningEl.style.color = '#f57c00';
            retirementWarningEl.style.fontWeight = '500';
        } else {
            retirementBarEl.style.background = plan === 'plan1' ?
                'linear-gradient(90deg, #4CAF50, #81C784)' :
                'linear-gradient(90deg, #F57C00, #FFB74D)';
            retirementWarningEl.textContent = retirementTotal > 0 ?
                `✓ ใช้ได้ปกติ (เหลือ ${formatNumber(500000 - retirementTotal)} บาท)` : '';
            retirementWarningEl.style.color = '#666';
            retirementWarningEl.style.fontWeight = 'normal';
        }
    }
}

// ฟังก์ชันสำหรับตั้งค่า Max
function setMaxValue(plan, item) {
    const slider = document.getElementById(`${plan}_${item}`);
    const displaySpan = document.getElementById(`${plan}_${item}_display`);

    if (!slider || !displaySpan) {
        console.warn(`⚠️ Missing elements for ${plan}_${item}`);
        return;
    }

    // อัพเดต slider limits ก่อน เพื่อให้ได้ค่า max ที่ถูกต้อง
    updateSliderLimits(plan);

    // ใช้ค่า max ที่คำนวณไว้แล้วจาก updateSliderLimits()
    const maxValue = parseInt(slider.max) || 0;

    // ตั้งค่า slider และอัพเดต display
    slider.value = maxValue;
    displaySpan.textContent = formatNumber(maxValue);

    console.log(`🎯 Set ${plan}_${item} to MAX:`, maxValue, `(slider.max=${slider.max})`);

    // อัพเดตการแสดงลิมิตรวม
    updateLimitDisplay(plan);

    // อัพเดตการคำนวณ
    updateAllScenarios();
}

function loadSavedData() {
    // Load income data
    const savedIncome = localStorage.getItem('taxCalc_incomeData');
    if (savedIncome) {
        const data = JSON.parse(savedIncome);
        if (data.salary) {
            document.getElementById('salary').value = formatNumber(data.salary);
            document.getElementById('salarySlider').value = data.salary;
            document.getElementById('salaryDisplay').textContent = formatNumber(data.salary);
        }
        if (data.bonus) {
            document.getElementById('bonus').value = formatNumber(data.bonus);
            document.getElementById('bonusSlider').value = data.bonus;
            document.getElementById('bonusDisplay').textContent = formatNumber(data.bonus);
        }
        // โหลดข้อมูลกลับเข้า global variable
        incomeData = {
            salary: data.salary || 0,
            bonus: data.bonus || 0,
            totalIncome: data.totalIncome || 0,
            expenses: data.expenses || 0,
            netIncome: data.netIncome || 0
        };

        // บันทึกข้อมูลกลับเข้า localStorage เพื่อให้ตรงกับ UI
        saveIncomeData();
    }

    // Load basic deductions
    const savedBasic = localStorage.getItem('taxCalc_basicDeductions');
    if (savedBasic) {
        const data = JSON.parse(savedBasic);
        if (data.spouseDeduction) document.getElementById('spouseDeduction').checked = data.spouseDeduction;

        // บุตรคนแรก / เกิดก่อนปี 2561
        if (data.childCount) {
            document.getElementById('childSlider').value = data.childCount;
            document.getElementById('childCount').value = data.childCount;
            document.getElementById('childDisplay').textContent = data.childCount;
        }

        // บุตรคนที่ 2+ เกิดปี 2561 เป็นต้นไป
        if (data.childCount2561) {
            const slider2561 = document.getElementById('childSlider2561');
            const input2561 = document.getElementById('childCount2561');
            const display2561 = document.getElementById('childDisplay2561');
            if (slider2561 && input2561 && display2561) {
                slider2561.value = data.childCount2561;
                input2561.value = data.childCount2561;
                display2561.textContent = data.childCount2561;
            }
        }

        // อัพเดตค่าลดหย่อนบุตรรวม
        const childTotal = ((data.childCount || 0) * 30000) + ((data.childCount2561 || 0) * 60000);
        document.getElementById('childDeductionDisplay').textContent = formatNumber(childTotal);

        if (data.parentDeduction) {
            document.getElementById('parentDeduction').checked = data.parentDeduction;
            document.getElementById('parentOptions').style.display = 'block';
            document.getElementById('parentCount').value = data.parentCount;
        }
        if (data.parentSpouseDeduction) {
            document.getElementById('parentSpouseDeduction').checked = data.parentSpouseDeduction;
            document.getElementById('parentSpouseOptions').style.display = 'block';
            document.getElementById('parentSpouseCount').value = data.parentSpouseCount;
        }

        // ประกันสุขภาพบิดามารดา
        if (data.parentHealthInsurance) {
            const checkbox = document.getElementById('parentHealthInsurance');
            const options = document.getElementById('parentHealthInsuranceOptions');
            const slider = document.getElementById('parentHealthInsuranceSlider');
            const input = document.getElementById('parentHealthInsuranceAmount');
            const display = document.getElementById('parentHealthInsuranceDisplay');
            if (checkbox && options && slider && input && display) {
                checkbox.checked = data.parentHealthInsurance;
                options.style.display = 'block';
                const amount = parseNumberWithComma(data.parentHealthInsuranceAmount || 0);
                slider.value = amount;
                input.value = formatNumber(amount);
                display.textContent = formatNumber(amount);
            }
        }

        if (data.socialSecurity) {
            const value = parseNumberWithComma(data.socialSecurity);
            document.getElementById('socialSecuritySlider').value = value;
            document.getElementById('socialSecurity').value = formatNumber(value);
            document.getElementById('socialSecurityDisplay').textContent = formatNumber(value);
        }

        // คำนวณและโหลดกลับเข้า global variable
        let total = 60000; // ส่วนตัว
        if (data.spouseDeduction) total += 60000;
        total += (data.childCount || 0) * 30000;
        total += (data.childCount2561 || 0) * 60000;
        if (data.parentDeduction) total += parseInt(data.parentCount || 1) * 30000;
        if (data.parentSpouseDeduction) total += parseInt(data.parentSpouseCount || 1) * 30000;
        if (data.parentHealthInsurance) {
            total += Math.min(parseNumberWithComma(data.parentHealthInsuranceAmount || 0), 15000);
        }
        if (data.socialSecurity) {
            const socialSecurity = Math.min(parseNumberWithComma(data.socialSecurity) * 12, 10000);
            total += socialSecurity;
        }
        basicDeductions = { total };

        // บันทึกข้อมูลกลับเข้า localStorage เพื่อให้ตรงกับ UI
        // (เพราะการตั้งค่า checkbox.checked และ slider.value ไม่ trigger event listeners)
        saveBasicDeductions();
    }

    updateIncomePreview();
    updateBasicDeductionPreview();
}

// =============== Dark Mode Toggle ===============

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('taxCalc_theme', newTheme);

    updateThemeUI(newTheme);

    // อัพเดท Chart.js colors ถ้ามี chart
    if (chartInstance) {
        updateChartColors(newTheme);
    }
}

function updateThemeUI(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');

    if (icon && label) {
        if (theme === 'dark') {
            icon.textContent = '☀️';
            label.textContent = 'Light';
        } else {
            icon.textContent = '🌙';
            label.textContent = 'Dark';
        }
    }
}

function updateChartColors(theme) {
    if (!chartInstance) return;

    const textColor = theme === 'dark' ? '#e4e4e7' : '#333';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    chartInstance.options.scales.x.ticks.color = textColor;
    chartInstance.options.scales.y.ticks.color = textColor;
    chartInstance.options.scales.x.grid.color = gridColor;
    chartInstance.options.scales.y.grid.color = gridColor;
    chartInstance.options.plugins.legend.labels.color = textColor;

    chartInstance.update();
}

function initTheme() {
    const savedTheme = localStorage.getItem('taxCalc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

// เรียกใช้ initTheme ตอนโหลดหน้า
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initMobileUX();
});

// =============== Mobile UX Functions ===============

function initMobileUX() {
    // Initialize bottom nav
    updateBottomNav(currentStep);

    // Initialize floating summary
    updateFloatingSummary();

    // Initialize swipe gestures
    initSwipeGestures();
}

function updateBottomNav(step) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
        const itemStep = parseInt(item.getAttribute('data-step'));
        if (itemStep === step) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function updateFloatingSummary() {
    const floatingAmount = document.getElementById('floatingTaxAmount');
    if (!floatingAmount) return;

    // คำนวณภาษีประมาณการจากข้อมูลปัจจุบัน
    const totalIncome = incomeData.totalIncome || 0;
    const expenses = Math.min(totalIncome * 0.5, 100000);
    const netIncome = totalIncome - expenses;
    const basicDeduction = basicDeductions.total || 60000;
    const tax = calculateTax(netIncome, basicDeduction);

    floatingAmount.textContent = formatNumber(tax) + ' บาท';
}

function toggleFloatingSummary() {
    const summary = document.getElementById('floatingSummary');
    if (summary) {
        summary.classList.toggle('hidden');
    }
}

function initSwipeGestures() {
    const wizardContainer = document.querySelector('.wizard-container');
    if (!wizardContainer) return;

    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    wizardContainer.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    wizardContainer.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) < minSwipeDistance) return;

        if (swipeDistance > 0 && currentStep > 1) {
            // Swipe right - go to previous step
            jumpToStep(currentStep - 1);
        } else if (swipeDistance < 0 && currentStep < 4) {
            // Swipe left - go to next step
            jumpToStep(currentStep + 1);
        }
    }
}

// Update floating summary when income changes
function onIncomeChange() {
    updateFloatingSummary();
}

// =============== Quick Templates ===============

const TEMPLATES = {
    junior: {
        name: 'เริ่มต้นทำงาน',
        salary: 25000,
        bonus: 25000,
        spouseDeduction: false,
        childCount: 0,
        childCount2561: 0,
        parentDeduction: false,
        parentCount: 0,
        parentSpouseDeduction: false,
        parentSpouseCount: 0,
        parentHealthInsurance: false,
        parentHealthInsuranceAmount: 0,
        socialSecurity: 9000
    },
    single: {
        name: 'พนักงานโสด',
        salary: 45000,
        bonus: 90000,
        spouseDeduction: false,
        childCount: 0,
        childCount2561: 0,
        parentDeduction: true,
        parentCount: 2,
        parentSpouseDeduction: false,
        parentSpouseCount: 0,
        parentHealthInsurance: false,
        parentHealthInsuranceAmount: 0,
        socialSecurity: 9000
    },
    family: {
        name: 'มีครอบครัว',
        salary: 60000,
        bonus: 120000,
        spouseDeduction: true,
        childCount: 1,
        childCount2561: 1,
        parentDeduction: true,
        parentCount: 2,
        parentSpouseDeduction: true,
        parentSpouseCount: 2,
        parentHealthInsurance: true,
        parentHealthInsuranceAmount: 15000,
        socialSecurity: 9000
    },
    senior: {
        name: 'ผู้บริหาร',
        salary: 120000,
        bonus: 360000,
        spouseDeduction: true,
        childCount: 1,
        childCount2561: 1,
        parentDeduction: true,
        parentCount: 2,
        parentSpouseDeduction: true,
        parentSpouseCount: 2,
        parentHealthInsurance: true,
        parentHealthInsuranceAmount: 15000,
        socialSecurity: 9000
    },
    freelance: {
        name: 'ฟรีแลนซ์',
        salary: 35000,
        bonus: 50000,
        spouseDeduction: false,
        childCount: 0,
        childCount2561: 0,
        parentDeduction: false,
        parentCount: 0,
        parentSpouseDeduction: false,
        parentSpouseCount: 0,
        parentHealthInsurance: false,
        parentHealthInsuranceAmount: 0,
        socialSecurity: 5400
    },
    custom: {
        name: 'กำหนดเอง',
        salary: 30000,
        bonus: 0,
        spouseDeduction: false,
        childCount: 0,
        childCount2561: 0,
        parentDeduction: false,
        parentCount: 0,
        parentSpouseDeduction: false,
        parentSpouseCount: 0,
        parentHealthInsurance: false,
        parentHealthInsuranceAmount: 0,
        socialSecurity: 9000
    }
};

function applyTemplate(templateId) {
    const template = TEMPLATES[templateId];
    if (!template) return;

    console.log(`📋 Applying template: ${template.name}`);

    // Update template card selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Apply Step 1 - Income
    const salaryInput = document.getElementById('salary');
    const salarySlider = document.getElementById('salarySlider');
    const bonusInput = document.getElementById('bonus');
    const bonusSlider = document.getElementById('bonusSlider');

    if (salaryInput && salarySlider) {
        salaryInput.value = formatNumber(template.salary);
        salarySlider.value = template.salary;
        document.getElementById('salaryDisplay').textContent = formatNumber(template.salary);
    }

    if (bonusInput && bonusSlider) {
        bonusInput.value = formatNumber(template.bonus);
        bonusSlider.value = template.bonus;
        document.getElementById('bonusDisplay').textContent = formatNumber(template.bonus);
    }

    // Apply Step 2 - Basic Deductions
    const spouseCheckbox = document.getElementById('spouseDeduction');
    if (spouseCheckbox) {
        spouseCheckbox.checked = template.spouseDeduction;
    }

    // บุตรคนแรก / เกิดก่อนปี 2561
    const childSlider = document.getElementById('childSlider');
    const childCountInput = document.getElementById('childCount');
    if (childSlider && childCountInput) {
        childSlider.value = template.childCount;
        childCountInput.value = template.childCount;
        document.getElementById('childDisplay').textContent = template.childCount;
    }

    // บุตรคนที่ 2+ เกิดปี 2561 เป็นต้นไป
    const childSlider2561 = document.getElementById('childSlider2561');
    const childCountInput2561 = document.getElementById('childCount2561');
    if (childSlider2561 && childCountInput2561) {
        childSlider2561.value = template.childCount2561 || 0;
        childCountInput2561.value = template.childCount2561 || 0;
        document.getElementById('childDisplay2561').textContent = template.childCount2561 || 0;
    }

    // อัพเดตค่าลดหย่อนบุตรรวม
    const childTotal = ((template.childCount || 0) * 30000) + ((template.childCount2561 || 0) * 60000);
    document.getElementById('childDeductionDisplay').textContent = formatNumber(childTotal);

    const parentCheckbox = document.getElementById('parentDeduction');
    const parentOptions = document.getElementById('parentOptions');
    const parentCount = document.getElementById('parentCount');
    if (parentCheckbox && parentOptions && parentCount) {
        parentCheckbox.checked = template.parentDeduction;
        parentOptions.style.display = template.parentDeduction ? 'block' : 'none';
        parentCount.value = template.parentCount;
    }

    const parentSpouseCheckbox = document.getElementById('parentSpouseDeduction');
    const parentSpouseOptions = document.getElementById('parentSpouseOptions');
    const parentSpouseCount = document.getElementById('parentSpouseCount');
    if (parentSpouseCheckbox && parentSpouseOptions && parentSpouseCount) {
        parentSpouseCheckbox.checked = template.parentSpouseDeduction;
        parentSpouseOptions.style.display = template.parentSpouseDeduction ? 'block' : 'none';
        parentSpouseCount.value = template.parentSpouseCount;
    }

    // ประกันสุขภาพบิดามารดา
    const parentHealthCheckbox = document.getElementById('parentHealthInsurance');
    const parentHealthOptions = document.getElementById('parentHealthInsuranceOptions');
    const parentHealthSlider = document.getElementById('parentHealthInsuranceSlider');
    const parentHealthInput = document.getElementById('parentHealthInsuranceAmount');
    if (parentHealthCheckbox && parentHealthOptions && parentHealthSlider && parentHealthInput) {
        parentHealthCheckbox.checked = template.parentHealthInsurance || false;
        parentHealthOptions.style.display = template.parentHealthInsurance ? 'block' : 'none';
        parentHealthSlider.value = template.parentHealthInsuranceAmount || 0;
        parentHealthInput.value = formatNumber(template.parentHealthInsuranceAmount || 0);
        document.getElementById('parentHealthInsuranceDisplay').textContent = formatNumber(template.parentHealthInsuranceAmount || 0);
    }

    const socialSecurityInput = document.getElementById('socialSecurity');
    const socialSecuritySlider = document.getElementById('socialSecuritySlider');
    if (socialSecurityInput && socialSecuritySlider) {
        socialSecurityInput.value = formatNumber(template.socialSecurity);
        socialSecuritySlider.value = template.socialSecurity;
        document.getElementById('socialSecurityDisplay').textContent = formatNumber(template.socialSecurity);
    }

    // Update previews
    updateIncomePreview();
    updateBasicDeductionPreview();
    updateFloatingSummary();

    // Save data
    saveIncomeData();
    saveBasicDeductions();

    // Show success feedback
    showTemplateFeedback(template.name);
}

function showTemplateFeedback(templateName) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'template-toast';
    toast.innerHTML = `✅ ใช้รูปแบบ "${templateName}" เรียบร้อย`;
    toast.style.cssText = `
        position: fixed;
        bottom: ${window.innerWidth <= 768 ? '100px' : '30px'};
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: toastIn 0.3s ease-out;
    `;

    // Add animation keyframes if not exists
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes toastIn {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes toastOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(20px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove toast after 2 seconds
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// =============== Share Feature Functions ===============

/**
 * Generate a shareable URL with current calculation data
 */
function generateShareUrl() {
    const data = {
        // Income data
        salary: parseNumber(document.getElementById('salary')?.value) || 0,
        bonus: parseNumber(document.getElementById('bonus')?.value) || 0,
        otherIncome: parseNumber(document.getElementById('otherIncome')?.value) || 0,

        // Basic deductions
        spouse: document.getElementById('spouseDeduction')?.checked ? 1 : 0,

        // Child deductions
        childCount: parseInt(document.getElementById('childCount')?.value) || 0,
        childCount2561: parseInt(document.getElementById('childCount2561')?.value) || 0,

        // Parent deductions
        parentCount: document.getElementById('parentDeduction')?.checked ?
            (parseInt(document.getElementById('parentCount')?.value) || 0) : 0,
        parentSpouseCount: document.getElementById('parentSpouseDeduction')?.checked ?
            (parseInt(document.getElementById('parentSpouseCount')?.value) || 0) : 0,

        // Social security
        socialSecurity: parseNumber(document.getElementById('socialSecurity')?.value) || 0,

        // Plan 1 deductions
        p1_life: parseNumber(document.getElementById('plan1_lifeInsurance')?.value) || 0,
        p1_health: parseNumber(document.getElementById('plan1_healthInsurance')?.value) || 0,
        p1_pension: parseNumber(document.getElementById('plan1_pensionInsurance')?.value) || 0,
        p1_pvd: parseNumber(document.getElementById('plan1_pvd')?.value) || 0,
        p1_rmf: parseNumber(document.getElementById('plan1_rmf')?.value) || 0,
        p1_esg: parseNumber(document.getElementById('plan1_thaiEsg')?.value) || 0,
        p1_esgx: parseNumber(document.getElementById('plan1_thaiEsgx')?.value) || 0,
        p1_home: parseNumber(document.getElementById('plan1_homeLoan')?.value) || 0,

        // Plan 2 deductions
        p2_life: parseNumber(document.getElementById('plan2_lifeInsurance')?.value) || 0,
        p2_health: parseNumber(document.getElementById('plan2_healthInsurance')?.value) || 0,
        p2_pension: parseNumber(document.getElementById('plan2_pensionInsurance')?.value) || 0,
        p2_pvd: parseNumber(document.getElementById('plan2_pvd')?.value) || 0,
        p2_rmf: parseNumber(document.getElementById('plan2_rmf')?.value) || 0,
        p2_esg: parseNumber(document.getElementById('plan2_thaiEsg')?.value) || 0,
        p2_esgx: parseNumber(document.getElementById('plan2_thaiEsgx')?.value) || 0,
        p2_home: parseNumber(document.getElementById('plan2_homeLoan')?.value) || 0
    };

    // Compress data to base64
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(jsonStr));

    // Create URL
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('d', base64);

    return url.toString();
}

/**
 * Load data from URL parameters
 */
function loadFromShareUrl() {
    const params = new URLSearchParams(window.location.search);
    const dataStr = params.get('d');

    if (!dataStr) return false;

    try {
        const jsonStr = decodeURIComponent(atob(dataStr));
        const data = JSON.parse(jsonStr);

        // Set income data
        if (data.salary) document.getElementById('salary').value = data.salary;
        if (data.bonus) document.getElementById('bonus').value = data.bonus;
        if (data.otherIncome) document.getElementById('otherIncome').value = data.otherIncome;

        // Set basic deductions
        if (data.spouse) document.getElementById('spouseDeduction').checked = true;

        // Set child deductions
        if (data.childCount) {
            document.getElementById('childDeduction').checked = true;
            document.getElementById('childCount').value = data.childCount;
        }
        if (data.childCount2561) {
            document.getElementById('childCount2561').value = data.childCount2561;
        }

        // Set parent deductions
        if (data.parentCount) {
            document.getElementById('parentDeduction').checked = true;
            document.getElementById('parentCount').value = data.parentCount;
        }
        if (data.parentSpouseCount) {
            document.getElementById('parentSpouseDeduction').checked = true;
            document.getElementById('parentSpouseCount').value = data.parentSpouseCount;
        }

        // Set social security
        if (data.socialSecurity) document.getElementById('socialSecurity').value = data.socialSecurity;

        // Set Plan 1 deductions
        setSharedDeduction('plan1', 'lifeInsurance', data.p1_life);
        setSharedDeduction('plan1', 'healthInsurance', data.p1_health);
        setSharedDeduction('plan1', 'pensionInsurance', data.p1_pension);
        setSharedDeduction('plan1', 'pvd', data.p1_pvd);
        setSharedDeduction('plan1', 'rmf', data.p1_rmf);
        setSharedDeduction('plan1', 'thaiEsg', data.p1_esg);
        setSharedDeduction('plan1', 'thaiEsgx', data.p1_esgx);
        setSharedDeduction('plan1', 'homeLoan', data.p1_home);

        // Set Plan 2 deductions
        setSharedDeduction('plan2', 'lifeInsurance', data.p2_life);
        setSharedDeduction('plan2', 'healthInsurance', data.p2_health);
        setSharedDeduction('plan2', 'pensionInsurance', data.p2_pension);
        setSharedDeduction('plan2', 'pvd', data.p2_pvd);
        setSharedDeduction('plan2', 'rmf', data.p2_rmf);
        setSharedDeduction('plan2', 'thaiEsg', data.p2_esg);
        setSharedDeduction('plan2', 'thaiEsgx', data.p2_esgx);
        setSharedDeduction('plan2', 'homeLoan', data.p2_home);

        // Format number inputs
        formatAllInputs();

        // Calculate
        calculateAll();

        showTemplateFeedback('โหลดข้อมูลจาก Link สำเร็จ!');

        return true;
    } catch (e) {
        console.error('Error loading shared data:', e);
        return false;
    }
}

/**
 * Helper to set shared deduction values
 */
function setSharedDeduction(plan, item, value) {
    if (!value || value === 0) return;

    const checkbox = document.getElementById(`${plan}_${item}_check`);
    const slider = document.getElementById(`${plan}_${item}`);
    const container = document.getElementById(`${plan}_${item}_container`);
    const display = document.getElementById(`${plan}_${item}_display`);

    if (checkbox && slider && container && display) {
        checkbox.checked = true;
        container.style.display = 'block';
        slider.value = value;
        display.textContent = formatNumber(value);
    }
}

/**
 * Open share modal
 */
function openShareModal() {
    const modal = document.getElementById('shareModal');
    const urlInput = document.getElementById('shareUrl');

    // Generate and set URL
    const url = generateShareUrl();
    urlInput.value = url;

    // Show modal
    modal.classList.add('active');

    // Update social share links
    const encodedUrl = encodeURIComponent(url);
    const shareText = encodeURIComponent('ผลคำนวณภาษีเงินได้ปี 2569 ของฉัน');

    document.getElementById('shareLineBtn').href =
        `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;
    document.getElementById('shareFacebookBtn').href =
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    document.getElementById('shareTwitterBtn').href =
        `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
}

/**
 * Close share modal
 */
function closeShareModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('shareModal').classList.remove('active');
}

/**
 * Copy share URL to clipboard
 */
async function copyShareUrl() {
    const urlInput = document.getElementById('shareUrl');
    const copyBtn = document.getElementById('copyBtn');

    try {
        await navigator.clipboard.writeText(urlInput.value);
        copyBtn.textContent = 'คัดลอกแล้ว!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.textContent = 'คัดลอก';
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (e) {
        // Fallback for older browsers
        urlInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'คัดลอกแล้ว!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.textContent = 'คัดลอก';
            copyBtn.classList.remove('copied');
        }, 2000);
    }
}

/**
 * Share via Line
 */
function shareViaLine() {
    const url = generateShareUrl();
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank');
}

/**
 * Share via Facebook
 */
function shareViaFacebook() {
    const url = generateShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

/**
 * Share via Twitter
 */
function shareViaTwitter() {
    const url = generateShareUrl();
    const text = 'ผลคำนวณภาษีเงินได้ปี 2569 ของฉัน';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

/**
 * Share via Web Share API
 */
async function shareViaWebShare() {
    const url = generateShareUrl();

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'คำนวณภาษีเงินได้ 2569',
                text: 'ผลคำนวณภาษีเงินได้ของฉัน',
                url: url
            });
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('Share failed:', e);
            }
        }
    } else {
        // Fallback - copy to clipboard
        copyShareUrl();
    }
}

// =============== Compare Modal Functions ===============

/**
 * Open compare modal with detailed comparison
 */
function openCompareModal() {
    const modal = document.getElementById('compareModal');

    // คำนวณค่าภาษีโดยตรง (ไม่ดึงจาก Step 4)
    const totalIncome = incomeData.totalIncome || 0;
    const expenses = Math.min(totalIncome * 0.5, 100000);
    const netIncome = totalIncome - expenses;
    const basicDeduction = basicDeductions.total || 60000;

    // คำนวณค่าลดหย่อนแผน 1
    let plan1Deduction = 0;
    const plan1Items = ['lifeInsurance', 'healthInsurance', 'pensionInsurance', 'pvd', 'rmf', 'thaiEsg', 'thaiEsgx', 'homeLoan', 'donationDouble', 'donationPolitical', 'easyEreceipt'];
    plan1Items.forEach(item => {
        const checkbox = document.getElementById(`plan1_${item}_check`);
        const slider = document.getElementById(`plan1_${item}`);
        if (checkbox?.checked && slider) {
            plan1Deduction += parseNumber(slider.value) || 0;
        }
    });

    // คำนวณค่าลดหย่อนแผน 2
    let plan2Deduction = 0;
    plan1Items.forEach(item => {
        const checkbox = document.getElementById(`plan2_${item}_check`);
        const slider = document.getElementById(`plan2_${item}`);
        if (checkbox?.checked && slider) {
            plan2Deduction += parseNumber(slider.value) || 0;
        }
    });

    // คำนวณภาษี
    const baselineTax = calculateTax(netIncome, basicDeduction);
    const plan1Tax = calculateTax(netIncome, basicDeduction + plan1Deduction);
    const plan2Tax = calculateTax(netIncome, basicDeduction + plan2Deduction);

    // Determine best plan
    const taxes = [
        { name: 'baseline', tax: baselineTax, label: 'ไม่ลดหย่อนเพิ่ม' },
        { name: 'plan1', tax: plan1Tax, label: 'แผน 1' },
        { name: 'plan2', tax: plan2Tax, label: 'แผน 2' }
    ];

    const bestPlan = taxes.reduce((min, p) => p.tax < min.tax ? p : min);

    // Generate compare cards
    const compareGrid = document.getElementById('compareGrid');
    compareGrid.innerHTML = taxes.map(plan => `
        <div class="compare-card ${plan.name === bestPlan.name ? 'best' : ''}">
            <div class="compare-card-title">${plan.label}</div>
            <div class="compare-card-amount">${formatNumber(plan.tax)} บาท/ปี</div>
            <div class="compare-card-monthly">${formatNumber(Math.round(plan.tax / 12))} บาท/เดือน</div>
            ${plan.name !== 'baseline' ? `
                <div class="compare-card-savings">
                    ประหยัด ${formatNumber(baselineTax - plan.tax)} บาท
                </div>
            ` : ''}
            ${plan.name === bestPlan.name ? '<div class="compare-best-badge">✓ ดีที่สุด</div>' : ''}
        </div>
    `).join('');

    // Generate detailed comparison
    generateDetailedComparison();

    // Show modal
    modal.classList.add('active');
}

/**
 * Generate detailed comparison table
 */
function generateDetailedComparison() {
    const details = document.getElementById('compareDetails');

    // Get all deduction values
    const items = [
        { label: 'ประกันชีวิต', p1: 'plan1_lifeInsurance', p2: 'plan2_lifeInsurance' },
        { label: 'ประกันสุขภาพ', p1: 'plan1_healthInsurance', p2: 'plan2_healthInsurance' },
        { label: 'ประกันบำนาญ', p1: 'plan1_pensionInsurance', p2: 'plan2_pensionInsurance' },
        { label: 'PVD', p1: 'plan1_pvd', p2: 'plan2_pvd' },
        { label: 'RMF', p1: 'plan1_rmf', p2: 'plan2_rmf' },
        { label: 'Thai ESG', p1: 'plan1_thaiEsg', p2: 'plan2_thaiEsg' },
        { label: 'Thai ESGx', p1: 'plan1_thaiEsgx', p2: 'plan2_thaiEsgx' },
        { label: 'ดอกเบี้ยบ้าน', p1: 'plan1_homeLoan', p2: 'plan2_homeLoan' }
    ];

    let rows = items.map(item => {
        const p1Value = parseNumber(document.getElementById(item.p1)?.value) || 0;
        const p2Value = parseNumber(document.getElementById(item.p2)?.value) || 0;
        const diff = p2Value - p1Value;

        if (p1Value === 0 && p2Value === 0) return '';

        return `
            <tr>
                <td>${item.label}</td>
                <td>${formatNumber(p1Value)} บาท</td>
                <td>${formatNumber(p2Value)} บาท</td>
                <td>
                    ${diff !== 0 ? `
                        <span class="compare-diff ${diff < 0 ? 'negative' : ''}">
                            ${diff > 0 ? '+' : ''}${formatNumber(diff)}
                        </span>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).filter(row => row !== '').join('');

    if (!rows) {
        rows = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">ยังไม่มีข้อมูลค่าลดหย่อน</td></tr>';
    }

    details.innerHTML = `
        <div class="compare-details-title">รายละเอียดค่าลดหย่อน</div>
        <table class="compare-table">
            <thead>
                <tr>
                    <th>รายการ</th>
                    <th>แผน 1</th>
                    <th>แผน 2</th>
                    <th>ผลต่าง</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Close compare modal
 */
function closeCompareModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('compareModal').classList.remove('active');
}

// =============== Initialize Share Feature ===============
// Load shared data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for shared URL data
    setTimeout(() => {
        loadFromShareUrl();
    }, 500);

    // Setup star rating
    setupStarRating();
});

// =============== About Modal Functions ===============

function openAboutModal() {
    document.getElementById('aboutModal').classList.add('active');
}

function closeAboutModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('aboutModal').classList.remove('active');
}

// =============== Feedback Modal Functions ===============

let currentRating = 0;

function openFeedbackModal() {
    closeAboutModal();
    document.getElementById('feedbackModal').classList.add('active');
}

function closeFeedbackModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('feedbackModal').classList.remove('active');
    // Reset form
    document.getElementById('feedbackName').value = '';
    document.getElementById('feedbackEmail').value = '';
    document.getElementById('feedbackType').value = 'general';
    document.getElementById('feedbackMessage').value = '';
    currentRating = 0;
    updateStarDisplay();
}

function setupStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.rating);
            updateStarDisplay();
        });

        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });

        star.addEventListener('mouseleave', function() {
            updateStarDisplay();
        });
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function updateStarDisplay() {
    highlightStars(currentRating);
    const ratingText = document.getElementById('ratingText');
    const ratingTexts = ['คลิกดาวเพื่อให้คะแนน', 'ต้องปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ยอดเยี่ยม!'];
    ratingText.textContent = ratingTexts[currentRating];
}

function submitFeedback() {
    const name = document.getElementById('feedbackName').value.trim();
    const email = document.getElementById('feedbackEmail').value.trim();
    const type = document.getElementById('feedbackType').value;
    const message = document.getElementById('feedbackMessage').value.trim();

    if (!message) {
        alert('กรุณาใส่ข้อความ Feedback');
        return;
    }

    // สร้าง email content
    const typeLabels = {
        'general': 'ความคิดเห็นทั่วไป',
        'bug': 'แจ้งปัญหา/Bug',
        'feature': 'แนะนำฟีเจอร์ใหม่',
        'improvement': 'ข้อเสนอแนะปรับปรุง'
    };

    const subject = encodeURIComponent(`[TaxFlex Feedback] ${typeLabels[type]}`);
    const body = encodeURIComponent(
        `=== TaxFlex Feedback ===\n\n` +
        `ประเภท: ${typeLabels[type]}\n` +
        `คะแนน: ${currentRating > 0 ? '⭐'.repeat(currentRating) + ` (${currentRating}/5)` : 'ไม่ได้ให้คะแนน'}\n` +
        `ชื่อ: ${name || 'ไม่ระบุ'}\n` +
        `อีเมลติดต่อกลับ: ${email || 'ไม่ระบุ'}\n\n` +
        `ข้อความ:\n${message}\n\n` +
        `---\n` +
        `ส่งจาก TaxFlex v3.0.0\n` +
        `วันที่: ${new Date().toLocaleString('th-TH')}`
    );

    // เปิด email client
    const mailtoLink = `mailto:ekalukofficial@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');

    // แสดง success message
    alert('ขอบคุณสำหรับ Feedback!\n\nระบบจะเปิดโปรแกรม Email ของคุณ\nกรุณากดส่งเพื่อส่ง Feedback ถึงทีมพัฒนา');

    closeFeedbackModal();
}

// =============== Share App Link Functions ===============

function shareAppLink() {
    const appUrl = window.location.origin + window.location.pathname;
    const shareText = '💰 TaxFlex - คำนวณและวางแผนภาษีอย่างยืดหยุ่น\n\nลองใช้เครื่องมือคำนวณภาษีฟรี!';

    // ถ้ารองรับ Web Share API
    if (navigator.share) {
        navigator.share({
            title: 'TaxFlex - คำนวณภาษี',
            text: shareText,
            url: appUrl
        }).catch(err => {
            // ถ้า user cancel ก็ไม่ต้องทำอะไร
            if (err.name !== 'AbortError') {
                copyAppLink(appUrl);
            }
        });
    } else {
        copyAppLink(appUrl);
    }
}

function copyAppLink(url) {
    const appUrl = url || window.location.origin + window.location.pathname;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(appUrl).then(() => {
            showToast('คัดลอกลิงก์แอปแล้ว!', 'success');
        }).catch(() => {
            fallbackCopyAppLink(appUrl);
        });
    } else {
        fallbackCopyAppLink(appUrl);
    }
}

function fallbackCopyAppLink(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('คัดลอกลิงก์แอปแล้ว!', 'success');
    } catch (err) {
        showToast('ไม่สามารถคัดลอกได้', 'error');
    }
    document.body.removeChild(textarea);
}

function showToast(message, type = 'info') {
    // สร้าง toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.95rem;
        z-index: 99999;
        animation: toastSlideUp 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(toast);

    // ลบ toast หลัง 3 วินาที
    setTimeout(() => {
        toast.style.animation = 'toastSlideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =============== Export Functions ===============

function getExportData() {
    // รวบรวมข้อมูลสำหรับ export
    const totalIncome = incomeData.totalIncome || 0;
    const expenses = Math.min(totalIncome * 0.5, 100000);
    const netIncome = totalIncome - expenses;
    const basicDeduction = basicDeductions.total || 60000;

    // คำนวณค่าลดหย่อนแผน 1
    const plan1Items = {};
    let plan1Total = 0;
    const deductionLabels = {
        'lifeInsurance': 'ประกันชีวิต',
        'healthInsurance': 'ประกันสุขภาพ',
        'pensionInsurance': 'ประกันบำนาญ',
        'pvd': 'กองทุน PVD',
        'rmf': 'กองทุน RMF',
        'thaiEsg': 'Thai ESG',
        'thaiEsgx': 'Thai ESGx',
        'homeLoan': 'ดอกเบี้ยบ้าน',
        'donationDouble': 'บริจาค 2 เท่า',
        'donationPolitical': 'บริจาคพรรคการเมือง',
        'easyEreceipt': 'Easy E-Receipt'
    };

    Object.keys(deductionLabels).forEach(item => {
        const checkbox = document.getElementById(`plan1_${item}_check`);
        const slider = document.getElementById(`plan1_${item}`);
        const value = (checkbox?.checked && slider) ? parseNumber(slider.value) || 0 : 0;
        plan1Items[item] = value;
        plan1Total += value;
    });

    // คำนวณค่าลดหย่อนแผน 2
    const plan2Items = {};
    let plan2Total = 0;
    Object.keys(deductionLabels).forEach(item => {
        const checkbox = document.getElementById(`plan2_${item}_check`);
        const slider = document.getElementById(`plan2_${item}`);
        const value = (checkbox?.checked && slider) ? parseNumber(slider.value) || 0 : 0;
        plan2Items[item] = value;
        plan2Total += value;
    });

    // คำนวณภาษี
    const baselineTax = calculateTax(netIncome, basicDeduction);
    const plan1Tax = calculateTax(netIncome, basicDeduction + plan1Total);
    const plan2Tax = calculateTax(netIncome, basicDeduction + plan2Total);

    return {
        date: new Date().toLocaleString('th-TH'),
        income: {
            salary: incomeData.salary || 0,
            bonus: incomeData.bonus || 0,
            totalIncome,
            expenses,
            netIncome
        },
        basicDeduction,
        plan1: {
            items: plan1Items,
            total: plan1Total,
            tax: plan1Tax,
            savings: baselineTax - plan1Tax
        },
        plan2: {
            items: plan2Items,
            total: plan2Total,
            tax: plan2Tax,
            savings: baselineTax - plan2Tax
        },
        baselineTax,
        deductionLabels
    };
}

function exportToCSV() {
    const data = getExportData();

    // สร้าง CSV content
    let csv = '\ufeff'; // BOM for UTF-8
    csv += 'TaxFlex - รายงานการคำนวณภาษี\n';
    csv += `วันที่: ${data.date}\n\n`;

    // ข้อมูลรายได้
    csv += '=== ข้อมูลรายได้ ===\n';
    csv += `เงินเดือนต่อเดือน,${data.income.salary}\n`;
    csv += `โบนัสรวมต่อปี,${data.income.bonus}\n`;
    csv += `รายได้รวมต่อปี,${data.income.totalIncome}\n`;
    csv += `ค่าใช้จ่าย 50%,${data.income.expenses}\n`;
    csv += `รายได้สุทธิ,${data.income.netIncome}\n\n`;

    // ค่าลดหย่อนพื้นฐาน
    csv += '=== ค่าลดหย่อนพื้นฐาน ===\n';
    csv += `รวมค่าลดหย่อนพื้นฐาน,${data.basicDeduction}\n\n`;

    // เปรียบเทียบแผน
    csv += '=== เปรียบเทียบแผนการลดหย่อน ===\n';
    csv += 'รายการ,แผน 1,แผน 2\n';
    Object.keys(data.deductionLabels).forEach(key => {
        csv += `${data.deductionLabels[key]},${data.plan1.items[key]},${data.plan2.items[key]}\n`;
    });
    csv += `รวมค่าลดหย่อนเพิ่มเติม,${data.plan1.total},${data.plan2.total}\n\n`;

    // สรุปภาษี
    csv += '=== สรุปภาษี ===\n';
    csv += 'รายการ,ไม่ลดหย่อนเพิ่ม,แผน 1,แผน 2\n';
    csv += `ภาษีที่ต้องจ่าย (บาท/ปี),${data.baselineTax},${data.plan1.tax},${data.plan2.tax}\n`;
    csv += `ภาษีที่ต้องจ่าย (บาท/เดือน),${Math.round(data.baselineTax/12)},${Math.round(data.plan1.tax/12)},${Math.round(data.plan2.tax/12)}\n`;
    csv += `ประหยัดภาษี,-,${data.plan1.savings},${data.plan2.savings}\n`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TaxFlex_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('Export CSV สำเร็จ!', 'success');
}

function exportToExcel() {
    const data = getExportData();

    // สร้าง Excel-compatible HTML table
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>TaxFlex Report</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; }
                th { background: #667eea; color: white; }
                .header { background: #f0f0f0; font-weight: bold; }
                .number { text-align: right; }
                .highlight { background: #e8f5e9; }
            </style>
        </head>
        <body>
            <h2>TaxFlex - รายงานการคำนวณภาษี</h2>
            <p>วันที่: ${data.date}</p>

            <h3>ข้อมูลรายได้</h3>
            <table>
                <tr><td class="header">เงินเดือนต่อเดือน</td><td class="number">${formatNumber(data.income.salary)}</td></tr>
                <tr><td class="header">โบนัสรวมต่อปี</td><td class="number">${formatNumber(data.income.bonus)}</td></tr>
                <tr><td class="header">รายได้รวมต่อปี</td><td class="number">${formatNumber(data.income.totalIncome)}</td></tr>
                <tr><td class="header">ค่าใช้จ่าย 50%</td><td class="number">${formatNumber(data.income.expenses)}</td></tr>
                <tr><td class="header">รายได้สุทธิ</td><td class="number">${formatNumber(data.income.netIncome)}</td></tr>
                <tr><td class="header">ค่าลดหย่อนพื้นฐาน</td><td class="number">${formatNumber(data.basicDeduction)}</td></tr>
            </table>

            <h3>เปรียบเทียบแผนการลดหย่อน</h3>
            <table>
                <tr>
                    <th>รายการ</th>
                    <th>แผน 1</th>
                    <th>แผน 2</th>
                </tr>`;

    Object.keys(data.deductionLabels).forEach(key => {
        html += `<tr>
            <td>${data.deductionLabels[key]}</td>
            <td class="number">${formatNumber(data.plan1.items[key])}</td>
            <td class="number">${formatNumber(data.plan2.items[key])}</td>
        </tr>`;
    });

    html += `
                <tr class="header">
                    <td>รวมค่าลดหย่อนเพิ่มเติม</td>
                    <td class="number">${formatNumber(data.plan1.total)}</td>
                    <td class="number">${formatNumber(data.plan2.total)}</td>
                </tr>
            </table>

            <h3>สรุปภาษี</h3>
            <table>
                <tr>
                    <th>รายการ</th>
                    <th>ไม่ลดหย่อนเพิ่ม</th>
                    <th>แผน 1</th>
                    <th>แผน 2</th>
                </tr>
                <tr>
                    <td>ภาษีที่ต้องจ่าย (บาท/ปี)</td>
                    <td class="number">${formatNumber(data.baselineTax)}</td>
                    <td class="number">${formatNumber(data.plan1.tax)}</td>
                    <td class="number">${formatNumber(data.plan2.tax)}</td>
                </tr>
                <tr>
                    <td>ภาษีที่ต้องจ่าย (บาท/เดือน)</td>
                    <td class="number">${formatNumber(Math.round(data.baselineTax/12))}</td>
                    <td class="number">${formatNumber(Math.round(data.plan1.tax/12))}</td>
                    <td class="number">${formatNumber(Math.round(data.plan2.tax/12))}</td>
                </tr>
                <tr class="highlight">
                    <td>ประหยัดภาษี</td>
                    <td class="number">-</td>
                    <td class="number">${formatNumber(data.plan1.savings)}</td>
                    <td class="number">${formatNumber(data.plan2.savings)}</td>
                </tr>
            </table>

            <p style="margin-top: 20px; color: #666;">
                <small>หมายเหตุ: การคำนวณนี้เป็นเพียงการประมาณการ กรุณาตรวจสอบกับกรมสรรพากรเพื่อความถูกต้อง</small>
            </p>
        </body>
        </html>`;

    // Download
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TaxFlex_Report_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();

    showToast('Export Excel สำเร็จ!', 'success');
}
