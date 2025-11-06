document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get(['enableBlur', 'enableHover', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
        const enableBlur = result.enableBlur === true;
        const enableHover = result.enableHover === true; // Standaard uit
        
        document.getElementById('enableBlur').checked = enableBlur;
        document.getElementById('enableHover').checked = enableHover;
        document.getElementById('enableFakeAmount').checked = result.enableFakeAmount === true;
        document.getElementById('robuxValue').value = result.robuxValue || '9.6';
        document.getElementById('robuxUnit').value = result.robuxUnit || 'M+';
        
        // Toggle hover option beschikbaarheid
        toggleHoverOption(enableBlur);
    });
});

// Functie om hover optie te enablen/disablen
function toggleHoverOption(blurEnabled) {
    const hoverOption = document.getElementById('hoverOption');
    const hoverCheckbox = document.getElementById('enableHover');
    
    if (blurEnabled) {
        hoverOption.classList.remove('disabled');
        hoverCheckbox.disabled = false;
    } else {
        hoverOption.classList.add('disabled');
        hoverCheckbox.disabled = true;
    }
}

// Luister naar blur checkbox changes
document.getElementById('enableBlur').addEventListener('change', function(e) {
    toggleHoverOption(e.target.checked);
});

// Validatie voor robux value input (real-time)
document.getElementById('robuxValue').addEventListener('input', function(e) {
    let value = e.target.value;
    
    // Alleen nummers en punten toestaan
    value = value.replace(/[^0-9.]/g, '');
    
    // Maximaal 1 punt toestaan
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Maximaal 3 cijfers voor de punt
    if (parts[0].length > 3) {
        value = parts[0].substring(0, 3) + (parts[1] !== undefined ? '.' + parts[1] : '');
    }
    
    // Maximaal 1 cijfer na de punt
    if (parts[1] && parts[1].length > 1) {
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }
    
    e.target.value = value;
});

// Apply button handler
document.getElementById('applyBtn').addEventListener('click', function() {
    const enableBlur = document.getElementById('enableBlur').checked;
    const enableHover = document.getElementById('enableHover').checked;
    const enableFakeAmount = document.getElementById('enableFakeAmount').checked;
    const robuxValue = document.getElementById('robuxValue').value;
    const robuxUnit = document.getElementById('robuxUnit').value;
    
    // Sla alle instellingen op
    chrome.storage.sync.set({ 
        enableBlur: enableBlur,
        enableHover: enableHover,
        enableFakeAmount: enableFakeAmount,
        robuxValue: robuxValue,
        robuxUnit: robuxUnit
    }, function() {
        showStatus();
        updateContentScript();
    });
});

function showStatus() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}

function updateContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSettings'}, function(response) {
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.log('Message error (page will reload anyway):', chrome.runtime.lastError.message);
                }
                // Pagina wordt automatisch gereload door content script
            });
        }
    });
}

