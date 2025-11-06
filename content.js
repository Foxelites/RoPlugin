const ROBUX_SELECTOR = '#nav-robux-amount';

let processedElements = new WeakSet();
let settings = { 
    enableBlur: false, 
    enableFakeAmount: false,
    robuxValue: '9.6',
    robuxUnit: 'M+'
};

chrome.storage.sync.get(['enableBlur', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
    settings.enableBlur = result.enableBlur === true;
    settings.enableFakeAmount = result.enableFakeAmount === true;
    settings.robuxValue = result.robuxValue || '9.6';
    settings.robuxUnit = result.robuxUnit || 'M+';
    applySettings();
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        chrome.storage.sync.get(['enableBlur', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
            settings.enableBlur = result.enableBlur === true;
            settings.enableFakeAmount = result.enableFakeAmount === true;
            settings.robuxValue = result.robuxValue || '9.6';
            settings.robuxUnit = result.robuxUnit || 'M+';
            applySettings();
            location.reload();
        });
    }
});

function applySettings() {
    const styleId = 'robux-blur-style';
    let styleElement = document.getElementById(styleId);
    
    if (settings.enableBlur) {
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = `
            #nav-robux-amount {
                filter: blur(6px) !important;
                transition: filter 0.2s ease !important;
            }
            #nav-robux-amount:hover {
                filter: blur(0px) !important;
            }
        `;
    } else {
        if (styleElement) {
            styleElement.remove();
        }
    }
    
    if (settings.enableFakeAmount) {
        changeRobux();
    } else {
        processedElements = new WeakSet();
    }
}

function changeRobux() {
    if (!settings.enableFakeAmount) return;
    
    const robuxElement = document.querySelector(ROBUX_SELECTOR);
    
    if (robuxElement && !processedElements.has(robuxElement)) {
        const walker = document.createTreeWalker(
            robuxElement,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text && /\d/.test(text)) {
                const customAmount = settings.robuxValue + settings.robuxUnit;
                node.textContent = customAmount;
                processedElements.add(robuxElement);
                break;
            }
        }
    }
}

applySettings();

const observer = new MutationObserver(() => {
    if (settings.enableFakeAmount) {
        changeRobux();
    }
});

observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
});
