// Doctor list
const doctors = [
    'Dr. Raj',
    'Dr. Henry',
    'Dr. Venkat',
    'Dr. Divya',
    'Dr. Nisha',
    'Dr. Gowtham'
];

// Duty types
const dutyTypes = ['ICU', 'OT', 'ENDO', 'DUTY'];

// Current roster data - stores all assignments
// Structure: { "2025-1-15": { "Dr. Raj": "ICU", "Dr. Henry": "OFF" }, ... }
let rosterData = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    document.getElementById('monthSelect').value = now.getMonth();
    document.getElementById('yearSelect').value = now.getFullYear();
    
    // Load saved roster for current month
    loadRoster();
    
    renderCalendar();
    
    // When month/year changes, save current roster and load new month's roster
    document.getElementById('monthSelect').addEventListener('change', function() {
        loadRoster();
        renderCalendar();
    });
    document.getElementById('yearSelect').addEventListener('change', function() {
        loadRoster();
        renderCalendar();
    });
    
    document.getElementById('generateBtn').addEventListener('click', generateRoster);
    document.getElementById('validateBtn').addEventListener('click', validateAndDisplayWarnings);
    document.getElementById('clearBtn').addEventListener('click', clearRoster);
    
    // Modal controls
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancelEdit').addEventListener('click', closeModal);
    document.getElementById('saveEdit').addEventListener('click', saveEdits);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    });
});

// Render the calendar
function renderCalendar() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendar.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        dayCell.className = 'calendar-day';
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayCell.className += ' weekend';
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        const dutyList = document.createElement('div');
        dutyList.className = 'duty-list';
        dutyList.id = `day-${year}-${month}-${day}`;
        dayCell.appendChild(dutyList);
        
        dayCell.addEventListener('click', () => editDay(year, month, day));
        
        calendar.appendChild(dayCell);
    }
    
    // Display existing roster data if any
    displayRosterData(year, month);
}

// Display roster data on the calendar
function displayRosterData(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const dutyList = document.getElementById(`day-${year}-${month}-${day}`);
        
        if (dutyList && rosterData[dateKey]) {
            dutyList.innerHTML = '';
            
            // Show each doctor's assignment for this day
            Object.entries(rosterData[dateKey]).forEach(([doctor, duty]) => {
                const dutyItem = document.createElement('div');
                dutyItem.className = `duty-item ${duty.toLowerCase()}`;
                dutyItem.textContent = `${doctor.split(' ')[1]}: ${duty}`;
                dutyList.appendChild(dutyItem);
            });
        }
    }
}

// MAIN ROSTER GENERATION FUNCTION
function generateRoster() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    // Clear existing roster
    rosterData = {};
    
    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDays = [];
    
    // Initialize all days first
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const dateKey = `${year}-${month}-${day}`;
        rosterData[dateKey] = {}; // Initialize empty
        
        allDays.push({
            day: day,
            dayOfWeek: dayOfWeek,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            isSunday: dayOfWeek === 0,
            isFriday: dayOfWeek === 5
        });
    }
    
    // Track duty counts for each doctor
    const dutyCounts = {
        'Dr. Raj': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 },
        'Dr. Henry': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 },
        'Dr. Venkat': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 },
        'Dr. Divya': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 },
        'Dr. Nisha': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 },
        'Dr. Gowtham': { total: 0, icu: 0, ot: 0, endo: 0, weekends: 0 }
    };
    
    // Track who worked Sunday (needs a Friday)
    const sundayWorkers = [];
    
    // STEP 1: Assign night duties (who's on duty each night)
    allDays.forEach(dayInfo => {
        const dateKey = `${year}-${month}-${dayInfo.day}`;
        
        // Find available doctors for this day
        const availableDoctors = doctors.filter(doc => {
            // Check if doctor already has an OFF day assigned
            if (rosterData[dateKey][doc] === 'OFF') {
                return false;
            }
            
            // Gowtham restrictions: only weekdays, max 3 duties per month
            if (doc === 'Dr. Gowtham') {
                if (dayInfo.isWeekend) return false;
                if (dutyCounts[doc].total >= 3) return false;
            }
            
            // Other doctors: max 1 Saturday and 1 Sunday each
            if (doc !== 'Dr. Gowtham' && dayInfo.isWeekend) {
                if (dutyCounts[doc].weekends >= 2) return false;
            }
            
            return true;
        });
        
        if (availableDoctors.length === 0) {
            console.warn(`No available doctors for day ${dayInfo.day}`);
            return;
        }
        
        // Pick the doctor with the least duties so far
        availableDoctors.sort((a, b) => dutyCounts[a].total - dutyCounts[b].total);
        const selectedDoctor = availableDoctors[0];
        
        // Assign a duty type
        let dutyType;
        if (selectedDoctor === 'Dr. Gowtham') {
            // Gowtham only gets ICU or OT
            dutyType = dutyCounts[selectedDoctor].icu <= dutyCounts[selectedDoctor].ot ? 'ICU' : 'OT';
        } else {
            // For others, distribute ICU, OT, ENDO evenly
            const counts = dutyCounts[selectedDoctor];
            if (counts.icu <= counts.ot && counts.icu <= counts.endo) {
                dutyType = 'ICU';
            } else if (counts.ot <= counts.endo) {
                dutyType = 'OT';
            } else {
                dutyType = 'ENDO';
            }
        }
        
        // Assign the duty
        rosterData[dateKey][selectedDoctor] = dutyType;
        
        // Update counts
        dutyCounts[selectedDoctor].total++;
        dutyCounts[selectedDoctor][dutyType.toLowerCase()]++;
        if (dayInfo.isWeekend) {
            dutyCounts[selectedDoctor].weekends++;
        }
        
        // Mark next day as OFF for this doctor
        if (dayInfo.day < daysInMonth) {
            const nextDay = dayInfo.day + 1;
            const nextDateKey = `${year}-${month}-${nextDay}`;
            rosterData[nextDateKey][selectedDoctor] = 'OFF';
        }
        
        // Track Sunday workers
        if (dayInfo.isSunday) {
            sundayWorkers.push(selectedDoctor);
        }
    });
    
    // STEP 2: Assign Friday duties to Sunday workers
    const fridayDays = allDays.filter(d => d.isFriday).map(d => d.day);
    
    sundayWorkers.forEach((doctor, index) => {
        // Try to assign a Friday duty if they don't already have one
        const alreadyHasFriday = fridayDays.some(fridayDay => {
            const dateKey = `${year}-${month}-${fridayDay}`;
            const assignment = rosterData[dateKey][doctor];
            return assignment && assignment !== 'OFF';
        });
        
        if (!alreadyHasFriday && fridayDays.length > 0) {
            // Find a Friday where this doctor is available
            for (let fridayDay of fridayDays) {
                const dateKey = `${year}-${month}-${fridayDay}`;
                const currentAssignment = rosterData[dateKey][doctor];
                
                if (!currentAssignment || currentAssignment === 'OFF') {
                    // Assign Friday duty
                    let dutyType = dutyCounts[doctor].icu <= dutyCounts[doctor].ot ? 'ICU' : 'OT';
                    rosterData[dateKey][doctor] = dutyType;
                    dutyCounts[doctor].total++;
                    dutyCounts[doctor][dutyType.toLowerCase()]++;
                    
                    // Mark next day (Saturday) as OFF
                    if (fridayDay < daysInMonth) {
                        const saturdayKey = `${year}-${month}-${fridayDay + 1}`;
                        rosterData[saturdayKey][doctor] = 'OFF';
                    }
                    break;
                }
            }
        }
    });
    
    // Display the generated roster
    displayRosterData(year, month);
    
    // Save to localStorage
    saveRoster();
    
    // Show summary
    alert('Roster generated! Check the calendar for assignments.');
    console.log('Duty counts:', dutyCounts);
}

// Current editing state
let currentEditDay = null;

// Edit a specific day
function editDay(year, month, day) {
    currentEditDay = { year, month, day };
    const dateKey = `${year}-${month}-${day}`;
    const date = new Date(year, month, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Set modal title
    document.getElementById('modalTitle').textContent = `Edit ${dayName}`;
    
    // Build editor for each doctor
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';
    
    doctors.forEach(doctor => {
        const row = document.createElement('div');
        row.className = 'doctor-edit-row';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'doctor-name';
        nameDiv.textContent = doctor;
        
        const select = document.createElement('select');
        select.className = 'duty-select';
        select.dataset.doctor = doctor;
        
        // Add options
        const options = ['', 'ICU', 'OT', 'ENDO', 'DUTY', 'OFF'];
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt || '(None)';
            select.appendChild(option);
        });
        
        // Set current value
        const currentAssignment = rosterData[dateKey] && rosterData[dateKey][doctor];
        if (currentAssignment) {
            select.value = currentAssignment;
        }
        
        row.appendChild(nameDiv);
        row.appendChild(select);
        modalBody.appendChild(row);
    });
    
    // Show modal
    document.getElementById('editModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditDay = null;
}

// Save edits from modal
function saveEdits() {
    if (!currentEditDay) return;
    
    const { year, month, day } = currentEditDay;
    const dateKey = `${year}-${month}-${day}`;
    
    // Get all selects
    const selects = document.querySelectorAll('.duty-select');
    
    // Update roster data
    rosterData[dateKey] = {};
    selects.forEach(select => {
        const doctor = select.dataset.doctor;
        const duty = select.value;
        if (duty) {
            rosterData[dateKey][doctor] = duty;
        }
    });
    
    // Refresh display
    displayRosterData(year, month);
    
    // Save to localStorage
    saveRoster();
    
    // Close modal
    closeModal();
    
    // Validate after editing
    setTimeout(validateAndDisplayWarnings, 100);
}

// Validate all rules and show warnings
function validateAndDisplayWarnings() {
    const warnings = checkRules();
    displayWarnings(warnings);
}

// Check for rule violations
function checkRules() {
    const warnings = [];
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Count duties per doctor
    const doctorDuties = {};
    doctors.forEach(doc => {
        doctorDuties[doc] = {
            total: 0,
            weekends: 0,
            icu: 0,
            ot: 0,
            endo: 0,
            sundays: [],
            fridays: []
        };
    });
    
    // Collect all duty information
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        if (rosterData[dateKey]) {
            Object.entries(rosterData[dateKey]).forEach(([doctor, duty]) => {
                if (duty !== 'OFF') {
                    doctorDuties[doctor].total++;
                    
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        doctorDuties[doctor].weekends++;
                    }
                    
                    if (dayOfWeek === 0) {
                        doctorDuties[doctor].sundays.push(day);
                    }
                    
                    if (dayOfWeek === 5) {
                        doctorDuties[doctor].fridays.push(day);
                    }
                    
                    const dutyLower = duty.toLowerCase();
                    if (doctorDuties[doctor].hasOwnProperty(dutyLower)) {
                        doctorDuties[doctor][dutyLower]++;
                    }
                }
            });
        }
    }
    
    // RULE 1: Check OFF days after duties
    for (let day = 1; day < daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const nextDateKey = `${year}-${month}-${day + 1}`;
        
        if (rosterData[dateKey]) {
            Object.entries(rosterData[dateKey]).forEach(([doctor, duty]) => {
                if (duty !== 'OFF') {
                    // Check if next day has OFF
                    const nextDayAssignment = rosterData[nextDateKey] && rosterData[nextDateKey][doctor];
                    if (nextDayAssignment !== 'OFF') {
                        warnings.push(`${doctor} has duty on day ${day} but no OFF day on day ${day + 1}`);
                    }
                }
            });
        }
    }
    
    // RULE 2: Gowtham restrictions
    const gowthamDuties = doctorDuties['Dr. Gowtham'];
    if (gowthamDuties.total > 3) {
        warnings.push(`Dr. Gowtham has ${gowthamDuties.total} duties (max 3 allowed)`);
    }
    if (gowthamDuties.weekends > 0) {
        warnings.push(`Dr. Gowtham has ${gowthamDuties.weekends} weekend duties (should have 0)`);
    }
    if (gowthamDuties.endo > 0) {
        warnings.push(`Dr. Gowtham has ${gowthamDuties.endo} ENDO duties (only ICU/OT allowed)`);
    }
    
    // RULE 3: Weekend duty limits for others
    doctors.forEach(doctor => {
        if (doctor !== 'Dr. Gowtham') {
            if (doctorDuties[doctor].weekends > 2) {
                warnings.push(`${doctor} has ${doctorDuties[doctor].weekends} weekend duties (max 2 allowed)`);
            }
        }
    });
    
    // RULE 4: Sunday workers need Friday duty
    doctors.forEach(doctor => {
        const sundays = doctorDuties[doctor].sundays;
        const fridays = doctorDuties[doctor].fridays;
        
        if (sundays.length > 0 && fridays.length === 0) {
            warnings.push(`${doctor} worked Sunday (day ${sundays.join(', ')}) but has no Friday duty`);
        }
    });
    
    return warnings;
}

// Display warnings
function displayWarnings(warnings) {
    const warningsDiv = document.getElementById('warnings');
    
    if (warnings.length === 0) {
        warningsDiv.classList.remove('active');
        warningsDiv.innerHTML = '<h3>✅ All Rules Satisfied</h3><p style="color: #28a745;">No violations found!</p>';
        warningsDiv.classList.add('active');
        
        // Hide after 3 seconds
        setTimeout(() => {
            warningsDiv.classList.remove('active');
        }, 3000);
        return;
    }
    
    warningsDiv.classList.add('active');
    warningsDiv.innerHTML = '<h3>⚠️ Rule Violations</h3>';
    
    warnings.forEach(warning => {
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item';
        warningItem.textContent = warning;
        warningsDiv.appendChild(warningItem);
    });
}

// Save roster to localStorage (per month)
function saveRoster() {
    try {
        const month = parseInt(document.getElementById('monthSelect').value);
        const year = parseInt(document.getElementById('yearSelect').value);
        
        // Create unique key for this month/year
        const storageKey = `doctorRoster-${year}-${month}`;
        
        // Only save data for this specific month
        const monthData = {};
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month}-${day}`;
            if (rosterData[dateKey]) {
                monthData[dateKey] = rosterData[dateKey];
            }
        }
        
        // Convert to JSON and save
        const dataString = JSON.stringify(monthData);
        localStorage.setItem(storageKey, dataString);
        console.log(`Roster saved for ${year}-${month}`);
    } catch (error) {
        console.error('Error saving roster:', error);
        alert('Failed to save roster. Your browser storage might be full.');
    }
}

// Load roster from localStorage (per month)
function loadRoster() {
    try {
        const month = parseInt(document.getElementById('monthSelect').value);
        const year = parseInt(document.getElementById('yearSelect').value);
        
        // Create unique key for this month/year
        const storageKey = `doctorRoster-${year}-${month}`;
        
        // Get the saved data for this month
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            // Load only this month's data
            const monthData = JSON.parse(savedData);
            
            // Clear rosterData and load only this month
            rosterData = {};
            Object.assign(rosterData, monthData);
            
            console.log(`Roster loaded for ${year}-${month}`);
        } else {
            // No data for this month, clear roster
            rosterData = {};
            console.log(`No saved roster found for ${year}-${month}`);
        }
    } catch (error) {
        console.error('Error loading roster:', error);
        rosterData = {};
    }
}

// Clear roster data
function clearRoster() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Ask what to clear
    const choice = confirm(`Clear roster for ${monthName}?\n\nOK = Clear this month only\nCancel = Don't clear`);
    
    if (choice) {
        // Clear the current month
        const storageKey = `doctorRoster-${year}-${month}`;
        localStorage.removeItem(storageKey);
        rosterData = {};
        
        // Refresh the display
        renderCalendar();
        
        // Clear warnings
        document.getElementById('warnings').classList.remove('active');
        
        alert(`Roster for ${monthName} cleared successfully`);
    }
}
