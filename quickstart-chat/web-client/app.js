// Initialize SpaceTimeDB client
const HOST = "http://localhost:3000";
const DBNAME = "quickstart-chat";

let connection = null;
let localIdentity = null;
let currentUser = null;

// DOM elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const usernameInput = document.getElementById('username');
const setNameButton = document.getElementById('set-name-btn');

// Connect to SpaceTimeDB
async function connectToSpaceTimeDB() {
    try {
        // Log available SDK objects to debug
        console.log("Available SDK:", window.spacetime);
        
        // Load token from localStorage if it exists
        const authToken = localStorage.getItem('spacetimedb_token');
        
        // Create connection - use the correct SDK object name
        connection = await window.spacetime.connect({
            uri: HOST,
            moduleName: DBNAME,
            authToken: authToken
        });
        
        // Save token for future sessions
        localStorage.setItem('spacetimedb_token', connection.authToken);
        
        // Save identity
        localIdentity = connection.identity;
        
        console.log("Connected to SpaceTimeDB");
        
        // Register callbacks
        registerCallbacks();
        
        // Subscribe to tables
        connection.subscribe();
    } catch (error) {
        console.error("Failed to connect to SpaceTimeDB:", error);
    }
}

// Register callbacks for database events
function registerCallbacks() {
    // User table callbacks
    connection.on('User:insert', handleUserInsert);
    connection.on('User:update', handleUserUpdate);
    
    // Message table callbacks
    connection.on('Message:insert', handleMessageInsert);
    
    // Reducer callbacks
    connection.on('reducer:SetName', handleSetNameResult);
    connection.on('reducer:SendMessage', handleSendMessageResult);
    
    // Subscription applied callback
    connection.on('subscription:applied', handleSubscriptionApplied);
}

// Helper function to get user name or identity
function getUserNameOrIdentity(user) {
    return user.Name || user.Identity.substring(0, 8);
}

// User insert callback
function handleUserInsert(user) {
    if (user.Online) {
        console.log(`${getUserNameOrIdentity(user)} is online`);
    }
    
    // Check if this is the local user
    if (user.Identity === localIdentity) {
        currentUser = user;
        usernameInput.value = user.Name || '';
    }
}

// User update callback
function handleUserUpdate(oldUser, newUser) {
    if (oldUser.Name !== newUser.Name) {
        console.log(`${getUserNameOrIdentity(oldUser)} renamed to ${newUser.Name}`);
    }
    
    if (oldUser.Online !== newUser.Online) {
        if (newUser.Online) {
            console.log(`${getUserNameOrIdentity(newUser)} connected.`);
        } else {
            console.log(`${getUserNameOrIdentity(newUser)} disconnected.`);
        }
    }
    
    // Update current user if it's us
    if (newUser.Identity === localIdentity) {
        currentUser = newUser;
        usernameInput.value = newUser.Name || '';
    }
}

// Message insert callback
function handleMessageInsert(message) {
    renderMessage(message);
}

// SetName reducer result callback
function handleSetNameResult(event) {
    if (event.callerIdentity === localIdentity && event.status && event.status.Failed) {
        console.error(`Failed to change name: ${event.status.Failed}`);
    }
}

// SendMessage reducer result callback
function handleSendMessageResult(event, text) {
    if (event.callerIdentity === localIdentity && event.status && event.status.Failed) {
        console.error(`Failed to send message: ${event.status.Failed}`);
    }
}

// Subscription applied callback
function handleSubscriptionApplied() {
    console.log("Subscription applied");
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Get all messages and sort by timestamp
    const messages = connection.tables.Message;
    const sortedMessages = [...messages].sort((a, b) => a.Sent - b.Sent);
    
    // Render all messages in order
    sortedMessages.forEach(renderMessage);
    
    // Scroll to bottom
    scrollToBottom();
}

// Render a message in the UI
function renderMessage(message) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // Determine if this message is from the current user
    const isSelf = message.Sender === localIdentity;
    if (isSelf) {
        messageElement.classList.add('self');
    } else {
        messageElement.classList.add('other');
    }
    
    // Find sender
    let senderName = "unknown";
    const sender = connection.tables.User.find(user => user.Identity === message.Sender);
    if (sender) {
        senderName = getUserNameOrIdentity(sender);
    }
    
    // Create sender element
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = senderName;
    
    // Create text element
    const textElement = document.createElement('div');
    textElement.className = 'text';
    textElement.textContent = message.Text;
    
    // Append elements
    messageElement.appendChild(senderElement);
    messageElement.appendChild(textElement);
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    scrollToBottom();
}

// Scroll messages container to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
function sendMessage() {
    const text = messageInput.value.trim();
    if (text) {
        connection.call('SendMessage', [text]);
        messageInput.value = '';
    }
}

// Set username
function setUsername() {
    const name = usernameInput.value.trim();
    if (name) {
        connection.call('SetName', [name]);
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

setNameButton.addEventListener('click', setUsername);
usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// Connect when document is ready
document.addEventListener('DOMContentLoaded', connectToSpaceTimeDB); 