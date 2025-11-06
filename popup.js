document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get(['enableBlur', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
        document.getElementById('enableBlur').checked = result.enableBlur === true;
        document.getElementById('enableFakeAmount').checked = result.enableFakeAmount === true;
        document.getElementById('robuxValue').value = result.robuxValue || '9.6';
        document.getElementById('robuxUnit').value = result.robuxUnit || 'M+';
    });
});

document.getElementById('enableBlur').addEventListener('change', function(e) {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ enableBlur: enabled }, function() {
        showStatus();
        updateContentScript();
    });
});

document.getElementById('enableFakeAmount').addEventListener('change', function(e) {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ enableFakeAmount: enabled }, function() {
        showStatus();
        updateContentScript();
    });
});

document.getElementById('robuxValue').addEventListener('input', function(e) {
    const value = e.target.value;
    chrome.storage.sync.set({ robuxValue: value }, function() {
        showStatus();
        updateContentScript();
    });
});

document.getElementById('robuxUnit').addEventListener('change', function(e) {
    const unit = e.target.value;
    chrome.storage.sync.set({ robuxUnit: unit }, function() {
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
            chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSettings'});
        }
    });
}

