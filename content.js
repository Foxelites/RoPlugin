// Meerdere mogelijke selectors voor Robux element
const ROBUX_SELECTORS = [
    '#nav-robux-amount',
    '.rbx-navbar-robux',
    '.nav-robux-amount',
    '[data-testid="navigation-robux-amount"]',
    '.navbar-robux .text-robux',
    'li.navbar-robux .text-robux',
    'a[href*="/robux"] .text-robux',
    '.rbx-menu-item[href*="/robux"]',
    // Algemene selectors
    'li[class*="robux"] span',
    'a[href*="/robux"] span'
];

let processedElements = new WeakSet();
let settings = { 
    enableBlur: false,
    enableHover: false,
    enableFakeAmount: false,
    robuxValue: '9.6',
    robuxUnit: 'M+'
};

// Check instellingen zo snel mogelijk
chrome.storage.sync.get(['enableBlur', 'enableHover', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
    settings.enableBlur = result.enableBlur === true;
    settings.enableHover = result.enableHover === true; // Standaard uit
    settings.enableFakeAmount = result.enableFakeAmount === true;
    settings.robuxValue = result.robuxValue || '9.6';
    settings.robuxUnit = result.robuxUnit || 'M+';
    
    // Start DIRECT met zoeken als fake amount aan staat (nog voor applySettings)
    if (settings.enableFakeAmount) {
        startChangeInterval();
    }
    
    applySettings();
});

// Als blur of hover uit staat, verwijder het meteen (nog voordat body laadt)
(function() {
    chrome.storage.sync.get(['enableBlur', 'enableHover'], function(result) {
        const addClasses = () => {
            if (document.body) {
                // Blur disabled class
                if (result.enableBlur !== true) {
                    document.body.classList.add('rostreamer-blur-disabled');
                }
                // Hover disabled class
                if (result.enableHover === false) {
                    document.body.classList.add('rostreamer-hover-disabled');
                }
            } else {
                setTimeout(addClasses, 10);
            }
        };
        addClasses();
    });
})();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        chrome.storage.sync.get(['enableBlur', 'enableHover', 'enableFakeAmount', 'robuxValue', 'robuxUnit'], function(result) {
            settings.enableBlur = result.enableBlur === true;
            settings.enableHover = result.enableHover === true; // Standaard uit
            settings.enableFakeAmount = result.enableFakeAmount === true;
            settings.robuxValue = result.robuxValue || '9.6';
            settings.robuxUnit = result.robuxUnit || 'M+';
            applySettings();
            
            // Stuur response terug om de error te voorkomen
            sendResponse({success: true});
            
            // Reload na een korte delay
            setTimeout(() => location.reload(), 100);
        });
        
        // Return true om aan te geven dat we async response sturen
        return true;
    }
});

function applySettings() {
    // Wacht tot body beschikbaar is
    if (!document.body) {
        console.log('RoStreamer - Body not ready, waiting...');
        setTimeout(applySettings, 50);
        return;
    }
    
    // CSS is al geladen via hide.css
    // We hoeven alleen de body classes te togglen om blur en hover aan/uit te zetten
    if (settings.enableBlur) {
        document.body.classList.remove('rostreamer-blur-disabled');
    } else {
        document.body.classList.add('rostreamer-blur-disabled');
    }
    
    if (settings.enableHover) {
        document.body.classList.remove('rostreamer-hover-disabled');
    } else {
        document.body.classList.add('rostreamer-hover-disabled');
    }
    
    // Debug: log de classes
    console.log('RoStreamer - Blur:', settings.enableBlur, 'Hover:', settings.enableHover, 'FakeAmount:', settings.enableFakeAmount);
    console.log('RoStreamer - Body classes:', document.body.className);
    
    if (settings.enableFakeAmount) {
        startChangeInterval();
    } else {
        processedElements = new WeakSet();
        if (changeInterval) {
            clearInterval(changeInterval);
            changeInterval = null;
        }
    }
}

let changeAttempts = 0;
let changeInterval = null;

function findRobuxElement() {
    console.log('RoStreamer - Starting Robux element search...');
    
    // Probeer alle selectors eerst
    for (let selector of ROBUX_SELECTORS) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
            console.log('RoStreamer - Found with selector:', selector, element);
            return { element, method: 'selector: ' + selector };
        }
    }
    
    // Zoek naar het element met een Robux patroon EN in de juiste context
    console.log('RoStreamer - Searching by context and pattern...');
    
    // Zoek specifiek in de navigatiebar
    const navbar = document.querySelector('header, nav, [role="navigation"]');
    if (navbar) {
        console.log('RoStreamer - Found navbar, searching inside...');
        
        // Zoek naar alle links/elementen die naar /robux wijzen
        const robuxLinks = navbar.querySelectorAll('a[href*="/robux"], li[class*="robux"], [class*="nav-robux"]');
        
        console.log('RoStreamer - Found', robuxLinks.length, 'potential Robux containers');
        
        for (let container of robuxLinks) {
            // Zoek binnen deze container naar het cijfer element
            const spans = container.querySelectorAll('span, div');
            
            for (let element of spans) {
                const text = element.textContent.trim();
                
                // Check of het ALLEEN cijfers met K/M/B is (geen letters ervoor of erna)
                if (text && /^\d+[\.,]?\d*\s*[KMB]?\+?$/i.test(text) && text.length < 15) {
                    // Check of het zichtbaar is
                    const rect = element.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    
                    // Extra validatie: het mag NIET in een profiel link zitten
                    let isInProfileLink = false;
                    let parent = element.parentElement;
                    let checkDepth = 0;
                    
                    while (parent && checkDepth < 5) {
                        const href = parent.getAttribute('href') || '';
                        const className = parent.className || '';
                        
                        // Skip als het in een user profile link zit
                        if (href.includes('/users/') || 
                            className.includes('avatar') ||
                            className.includes('profile') ||
                            className.includes('username')) {
                            isInProfileLink = true;
                            console.log('RoStreamer - Skipping (in profile context):', text);
                            break;
                        }
                        
                        parent = parent.parentElement;
                        checkDepth++;
                    }
                    
                    if (!isInProfileLink) {
                        console.log('RoStreamer - ✓ Found valid Robux element in container:', text, element);
                        return { element, method: 'robux-container: ' + text };
                    }
                }
            }
        }
        
        // Als we nog niks vonden, laatste poging: zoek naar Robux icoon
        console.log('RoStreamer - Trying to find via Robux icon...');
        
        // Zoek naar Robux icoon (SVG of img met robux)
        const robuxIcons = navbar.querySelectorAll('svg, img, [class*="icon-robux"], [class*="robux-icon"]');
        
        for (let icon of robuxIcons) {
            // Zoek naast dit icoon naar een span/div met cijfers
            const parent = icon.parentElement;
            if (parent) {
                const siblings = parent.querySelectorAll('span, div');
                
                for (let sibling of siblings) {
                    const text = sibling.textContent.trim();
                    
                    if (text && /^\d+[\.,]?\d*\s*[KMB]?\+?$/i.test(text) && text.length < 15) {
                        const rect = sibling.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            console.log('RoStreamer - ✓ Found via icon sibling:', text, sibling);
                            return { element: sibling, method: 'icon-sibling: ' + text };
                        }
                    }
                }
            }
        }
    }
    
    console.log('RoStreamer - No Robux element found');
    return null;
}

function changeRobux() {
    if (!settings.enableFakeAmount) {
        console.log('RoStreamer - Fake amount disabled');
        return false;
    }
    
    changeAttempts++;
    console.log(`RoStreamer - Attempt ${changeAttempts} to change Robux...`);
    console.log('RoStreamer - Current settings:', settings);
    
    const result = findRobuxElement();
    
    if (result) {
        const { element, method } = result;
        
        // Verwijder uit processed set als het al was processed
        // Dit zorgt ervoor dat we het kunnen updaten
        processedElements.delete(element);
        
        const customAmount = settings.robuxValue + settings.robuxUnit;
        const originalText = element.textContent.trim();
        
        console.log('RoStreamer - Found element via:', method);
        console.log('RoStreamer - Original text:', originalText);
        console.log('RoStreamer - New text:', customAmount);
        
        // Verschillende methoden om de tekst te veranderen
        element.textContent = customAmount;
        element.innerText = customAmount;
        
        // Als het een child node heeft, verander die ook
        if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
            element.firstChild.textContent = customAmount;
        }
        
        processedElements.add(element);
        
        console.log('RoStreamer - ✓ Successfully changed to:', element.textContent);
        
        // Stop de interval als het gelukt is
        if (changeInterval) {
            clearInterval(changeInterval);
            changeInterval = null;
        }
        
        return true;
    } else {
        console.log('RoStreamer - ✗ No Robux element found yet...');
        return false;
    }
}

// Start een interval die blijft proberen
function startChangeInterval() {
    if (changeInterval) {
        clearInterval(changeInterval);
    }
    
    changeAttempts = 0;
    
    // Probeer DIRECT meteen (geen delay)
    const success = changeRobux();
    
    if (!success && settings.enableFakeAmount) {
        // Als het niet lukt, probeer zeer frequent (elke 100ms) voor maximaal 10 seconden
        changeInterval = setInterval(() => {
            const success = changeRobux();
            
            if (success || changeAttempts >= 100) {
                clearInterval(changeInterval);
                changeInterval = null;
                
                if (!success) {
                    console.log('RoStreamer - Gave up after 100 attempts. Element might not exist on this page.');
                }
            }
        }, 100); // Veel sneller: elke 100ms in plaats van 500ms
    }
}

applySettings();

// Detecteer URL changes (voor SPA navigatie)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        console.log('RoStreamer - URL changed from', lastUrl, 'to', currentUrl);
        lastUrl = currentUrl;
        
        // Reset processed elements bij navigatie
        processedElements = new WeakSet();
        
        // Start opnieuw met zoeken
        if (settings.enableFakeAmount) {
            console.log('RoStreamer - Restarting search after navigation');
            setTimeout(() => startChangeInterval(), 500);
        }
    }
});

// Observer voor DOM mutations EN URL changes
const observer = new MutationObserver((mutations) => {
    // Check URL change
    urlObserver.takeRecords();
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        processedElements = new WeakSet();
        if (settings.enableFakeAmount) {
            console.log('RoStreamer - URL changed, restarting');
            setTimeout(() => startChangeInterval(), 500);
        }
        return;
    }
    
    // Check Robux element changes
    if (settings.enableFakeAmount && !changeInterval) {
        // Alleen triggeren als er geen actieve interval is
        for (let mutation of mutations) {
            // Check of er significante wijzigingen zijn in de navbar
            if (mutation.target.closest && 
                (mutation.target.closest('header') || 
                 mutation.target.closest('nav') || 
                 mutation.target.matches('header') || 
                 mutation.target.matches('nav'))) {
                console.log('RoStreamer - Navbar mutation detected, checking Robux');
                changeRobux();
                break;
            }
        }
    }
});

// Start observer alleen als DOM geladen is
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.documentElement, { 
            childList: true, 
            subtree: true 
        });
        // Probeer DIRECT na DOM load
        if (settings.enableFakeAmount) {
            startChangeInterval();
        }
    });
} else {
    observer.observe(document.documentElement, { 
        childList: true, 
        subtree: true 
    });
    // Als DOM al geladen is, start METEEN
    if (settings.enableFakeAmount) {
        startChangeInterval();
    }
}

// Detecteer ook history.pushState en popstate (SPA navigatie)
const originalPushState = history.pushState;
history.pushState = function(...args) {
    originalPushState.apply(this, args);
    console.log('RoStreamer - pushState detected, URL:', location.href);
    processedElements = new WeakSet();
    if (settings.enableFakeAmount) {
        // Probeer DIRECT zonder delay
        startChangeInterval();
        // En nog een paar backups voor zekerheid
        setTimeout(() => {
            if (!changeInterval) startChangeInterval();
        }, 200);
        setTimeout(() => {
            if (!changeInterval) startChangeInterval();
        }, 500);
    }
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    console.log('RoStreamer - replaceState detected');
    processedElements = new WeakSet();
    if (settings.enableFakeAmount) {
        startChangeInterval(); // Direct, geen delay
    }
};

window.addEventListener('popstate', () => {
    console.log('RoStreamer - popstate detected');
    processedElements = new WeakSet();
    if (settings.enableFakeAmount) {
        startChangeInterval(); // Direct, geen delay
    }
});

// Extra: luister ook naar Roblox-specifieke events
document.addEventListener('click', (e) => {
    // Check of er op een navigatie link geklikt is
    const link = e.target.closest('a[href]');
    if (link && link.hostname === location.hostname) {
        console.log('RoStreamer - Navigation link clicked:', link.href);
        processedElements = new WeakSet();
        if (settings.enableFakeAmount) {
            // Start meteen bij klik
            setTimeout(() => startChangeInterval(), 50);
            // En nog een backup
            setTimeout(() => {
                if (!changeInterval) startChangeInterval();
            }, 300);
        }
    }
}, true);
