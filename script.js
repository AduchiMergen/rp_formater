let server;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof StellarSdk !== 'undefined') {
        server = new StellarSdk.Server('https://horizon.stellar.org');
    } else {
        console.error('Stellar SDK not loaded');
        document.getElementById('formattedOutput').textContent = 'Error: Stellar SDK not loaded';
        return;
    }

    const txUrlInput = document.getElementById('txUrl');
    const formattedOutput = document.getElementById('formattedOutput');
    const copyBtn = document.getElementById('copyBtn');

    txUrlInput.addEventListener('input', async () => {
        const url = txUrlInput.value.trim();
        if (!url) {
            formattedOutput.innerHTML = 'Enter a transaction URL';
            return;
        }
        formattedOutput.innerHTML = 'Loading...';
        try {
            const formatted = await formatTransaction(url);
            formattedOutput.innerHTML = formatted;
        } catch (error) {
            console.error('Error:', error);
            formattedOutput.innerHTML = 'Error loading transaction details';
        }
    });

    copyBtn.addEventListener('click', async () => {
        try {
            const cleanText = getCleanText(formattedOutput);
            await navigator.clipboard.writeText(cleanText);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    });
});

function base64ToString(base64) {
    return decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function getSavedName(address) {
    const savedData = localStorage.getItem(`name_${address}`);
    if (!savedData) return null;
    try {
        return JSON.parse(savedData);
    } catch {
        // Handle old format
        return { name: savedData, isUserSet: false };
    }
}

function saveName(address, name, isUserSet = false) {
    localStorage.setItem(`name_${address}`, JSON.stringify({
        name,
        isUserSet
    }));
}

function createEditableTitle(address, displayData) {
    const { name, isUserSet } = displayData;
    const userSetIndicator = isUserSet ? '✎ ' : '';
    const deleteButton = isUserSet ? 
        `<span class="text-red-500 hover:text-red-700 cursor-pointer ml-1" onclick="event.stopPropagation(); deleteTitle('${address}')">×</span>` : 
        '';
    return `<span class="cursor-pointer border-b border-dotted border-gray-400 hover:text-blue-600 hover:border-blue-600" onclick="makeEditable(this, '${address}')">${userSetIndicator}${name}</span>${deleteButton}`;
}

window.makeEditable = function(element, address) {
    const input = document.createElement('input');
    input.className = 'border rounded px-1 py-0.5 text-sm';
    // Remove pencil icon if present when setting initial value
    input.value = element.textContent.replace('✎ ', '');
    
    input.onblur = async () => {
        const newName = input.value.trim();
        if (newName) {
            saveName(address, newName, true); // Mark as user-set
            // Trigger re-render by simulating input event
            const urlInput = document.getElementById('txUrl');
            const event = new Event('input', { bubbles: true });
            urlInput.dispatchEvent(event);
        }
        element.style.display = '';
        input.remove();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
    
    element.style.display = 'none';
    element.parentNode.insertBefore(input, element);
    input.focus();
};

window.deleteTitle = function(address) {
    localStorage.removeItem(`name_${address}`);
    // Trigger re-render
    const urlInput = document.getElementById('txUrl');
    const event = new Event('input', { bubbles: true });
    urlInput.dispatchEvent(event);
};

async function getAccountName(accountId) {
    // Check localStorage first
    const savedData = getSavedName(accountId);
    if (savedData) return savedData;

    try {
        const account = await server.loadAccount(accountId);
        const nameData = account.data_attr['Name'];
        if (nameData) {
            const name = base64ToString(nameData);
            saveName(accountId, name, false);
            return { name, isUserSet: false };
        }
        const shortAddr = shortenAddress(accountId);
        saveName(accountId, shortAddr, false);
        return { name: shortAddr, isUserSet: false };
    } catch (error) {
        console.error(`Error fetching account ${accountId}:`, error);
        const shortAddr = shortenAddress(accountId);
        saveName(accountId, shortAddr, false);
        return { name: shortAddr, isUserSet: false };
    }
}

// Rename function to be more specific
window.clearAutoSavedNames = async function() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('name_')) {
            const savedData = getSavedName(key.replace('name_', ''));
            if (savedData && !savedData.isUserSet) {
                localStorage.removeItem(key);
            }
        }
    });

    // Get current URL and force rerender
    const urlInput = document.getElementById('txUrl');
    const formattedOutput = document.getElementById('formattedOutput');
    
    if (urlInput.value.trim()) {
        formattedOutput.innerHTML = 'Loading...';
        try {
            const formatted = await formatTransaction(urlInput.value.trim());
            formattedOutput.innerHTML = formatted;
        } catch (error) {
            console.error('Error:', error);
            formattedOutput.innerHTML = 'Error loading transaction details';
        }
    }
};

async function formatTransaction(url) {
    if (!url) return 'Enter a transaction URL';
    
    try {
        const txId = extractTransactionId(url);
        if (!txId) return 'Invalid transaction URL';

        const tx = await server.transactions()
            .transaction(txId)
            .call();

        const operations = await server.operations()
            .forTransaction(txId)
            .call();

        return formatTxDetails(tx, operations.records);
    } catch (error) {
        console.error('Error:', error);
        return 'Error loading transaction details';
    }
}

function shortenAddress(address) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const SPECIAL_ADDRESS = 'GCNVDZIHGX473FEI7IXCUAEXUJ4BGCKEMHF36VYP5EMS7PX2QBLAMTLA';

function formatAmount(amount) {
    return Number(amount).toString();
}

async function formatTxDetails(tx, operations) {
    const groupedOps = {};
    const accountNames = new Map();
    const isSpecialSender = tx.source_account === SPECIAL_ADDRESS;
    
    if (!isSpecialSender) {
        // Format all operations without grouping
        let output = '';
        const senderNameData = await getAccountName(tx.source_account);
        output += createEditableTitle(tx.source_account, senderNameData) + '<br>';

        for (const op of operations) {
            if (op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                const destination = op.to || op.destination;
                const destNameData = await getAccountName(destination);
                const destDisplayName = destNameData.name || shortenAddress(destination);

                let amount = formatAmount(op.amount);
                let assetCode = op.asset_code || 'XLM';
                let issuer = op.asset_issuer || '';

                if (op.asset_type === 'native') {
                    output += `${createEditableTitle(destination, destNameData)} - ${amount} ${assetCode}<br>`;
                } else {
                    const issuerName = await getAccountName(issuer);
                    const issuerDisplay = issuerName.name || shortenAddress(issuer);
                    output += `${createEditableTitle(destination, destNameData)} - ${amount} ${assetCode}<br>`;
                }
            }
        }
        return output || 'No payment operations found in this transaction';
    }

    // For special sender, keep existing grouping logic
    operations.forEach(op => {
        if (op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
            const destination = op.to || op.destination;
            if (!groupedOps[destination]) {
                groupedOps[destination] = [];
            }
            
            let amount = formatAmount(op.amount);
            let assetCode = op.asset_code || 'XLM';
            let issuer = op.asset_issuer || '';

            if (op.asset_type === 'native') {
                issuer = 'native';
            }

            groupedOps[destination].push({
                issuer,
                amount,
                assetCode
            });
        }
    });

    // If not special sender, return first group only
    if (!isSpecialSender) {
        const [[destination, payments]] = Object.entries(groupedOps);
        const name = await getAccountName(tx.source_account);
        const displayName = name.name || shortenAddress(tx.source_account);
        
        let output = createEditableTitle(tx.source_account, name) + '<br>';
        for (const payment of payments) {
            if (payment.issuer !== 'native') {
                const issuerName = await getAccountName(payment.issuer);
                const issuerDisplay = issuerName.name || shortenAddress(payment.issuer);
                output += createEditableTitle(payment.issuer, issuerName);
                output += ` - ${payment.amount} ${payment.assetCode}<br>`;
            } else {
                output += `${payment.amount} ${payment.assetCode}<br>`;
            }
        }
        return output;
    }

    // For special sender, format full details with groups
    let output = '';
    for (const destination of Object.keys(groupedOps)) {
        const name = await getAccountName(destination);
        if (name) {
            accountNames.set(destination, name);
        }
    }

    let currentGroupOutput = '';
    let prevDestName = '';
    
    for (const [destination, payments] of Object.entries(groupedOps)) {
        const name = accountNames.get(destination);
        const displayName = name.name || shortenAddress(destination);
        
        // Start new group if displayName is significantly different
        if (prevDestName && !displayName.startsWith(prevDestName.split(' ')[0])) {
            output += currentGroupOutput + '<br>';
            currentGroupOutput = '';
        }
        
        currentGroupOutput += createEditableTitle(destination, name) + '<br>';
        for (const payment of payments) {
            if (payment.issuer !== 'native') {
                const issuerName = await getAccountName(payment.issuer);
                const issuerDisplay = issuerName.name || shortenAddress(payment.issuer);
                currentGroupOutput += createEditableTitle(payment.issuer, issuerName);
                currentGroupOutput += ` - ${payment.amount} ${payment.assetCode}<br>`;
            } else {
                currentGroupOutput += `${payment.amount} ${payment.assetCode}<br>`;
            }
        }
        
        prevDestName = displayName;
    }
    
    // Add last group
    if (currentGroupOutput) {
        output += currentGroupOutput;
    }

    return output || 'No payment operations found in this transaction';
}

function extractTransactionId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'stellar.expert') {
            const pathParts = urlObj.pathname.split('/');
            const txIndex = pathParts.findIndex(part => part === 'tx') + 1;
            return txIndex > 0 && txIndex < pathParts.length ? pathParts[txIndex] : null;
        }
        return null;
    } catch {
        return null;
    }
}

// Update getCleanText to handle the delete button
function getCleanText(element) {
    return element.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newline
        .replace(/✎\s/g, '')            // Remove pencil icon
        .replace(/<span class="text-red-500.*?×<\/span>/g, '') // Remove delete buttons
        .replace(/<[^>]+>/g, '')        // Remove remaining HTML tags
        .replace(/\n\n+/g, '\n\n')      // Replace multiple newlines with double newline
        .trim();                         // Remove extra whitespace
}