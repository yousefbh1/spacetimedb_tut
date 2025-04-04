import { Identity } from '@clockworklabs/spacetimedb-sdk';
import { DbConnectionBuilder } from '@clockworklabs/spacetimedb-sdk';
// Import generated bindings
import * as moduleBindings from './module_bindings'; 

// Constants
const HOST = "http://localhost:3000";
const DBNAME = "quickstart-chat";

// Global variables
let connection: DbConnection | null = null; // Use DbConnection type
let localIdentity: Identity | null = null;
let currentUser: moduleBindings.User | null = null;

// DOM elements - Assert non-null and cast to specific types
const messagesContainer = document.getElementById('messages') as HTMLDivElement;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const sendButton = document.getElementById('send-btn') as HTMLButtonElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const setNameButton = document.getElementById('set-name-btn') as HTMLButtonElement;

// Connect to SpaceTimeDB using the builder pattern on DbConnection
function connectToSpaceTimeDB() {
    const authToken = localStorage.getItem('spacetimedb_token') ?? undefined; // Use undefined if null

    console.log("Attempting to connect...");

    // Use builder pattern on DbConnectionBuilder
    new DbConnectionBuilder()
        .withUri(HOST)
        .withModuleName(DBNAME)
        .withToken(authToken)
        .onConnect(onConnected)
        .onConnectError(onConnectError)
        .onDisconnect(onDisconnected)
        .build();
}

// --- Connection Callbacks ---

function onConnected(conn: DbConnection, identity: Identity, token: string) {
    console.log("Connected!");
    connection = conn;
    localIdentity = identity;
    localStorage.setItem('spacetimedb_token', token);

    // Register table and reducer callbacks
    registerCallbacks();

    // Subscribe to all tables
    conn.subscribe(["SELECT * FROM User", "SELECT * FROM Message"]);
}

function onConnectError(error: Error) {
    console.error("Connection error:", error);
    // Optionally: Display error to the user
}

function onDisconnected(reason: string) { // SDK might pass only reason
    console.log("Disconnected:", reason);
    connection = null;
    localIdentity = null;
    currentUser = null;
    // Optionally: Clear UI, show disconnected message
    messagesContainer.innerHTML = '<p>Disconnected. Attempting to reconnect...</p>';
    // Attempt to reconnect after a delay
    setTimeout(connectToSpaceTimeDB, 5000); 
}

// Register callbacks for database events and reducers
function registerCallbacks() {
    if (!connection) return;

    // Initialize bindings with the connection
    moduleBindings.Init(connection);

    // User table callbacks
    moduleBindings.User.registerOnInsert(handleUserInsert);
    moduleBindings.User.registerOnUpdate(handleUserUpdate);
    
    // Message table callbacks
    moduleBindings.Message.registerOnInsert(handleMessageInsert);
    
    // Reducer result callbacks
    connection.registerReducer("SetName", handleSetNameResult);
    connection.registerReducer("SendMessage", handleSendMessageResult);
    
    // Subscription applied callback
    connection.onSubscriptionApplied(handleSubscriptionApplied);
}

// --- Table Event Handlers ---

function handleUserInsert(user: moduleBindings.User, event?: ReducerEvent) {
    console.log("User inserted:", user);
    if (user.online) {
        console.log(`${getUserNameOrIdentity(user)} is online`);
    }
    
    if (localIdentity && user.identity.isEqual(localIdentity)) {
        currentUser = user;
        usernameInput.value = user.name || '';
    }
}

function handleUserUpdate(oldUser: moduleBindings.User, newUser: moduleBindings.User, event?: ReducerEvent) {
    console.log("User updated:", oldUser, newUser);
    if (oldUser.name !== newUser.name) {
        console.log(`${getUserNameOrIdentity(oldUser)} renamed to ${newUser.name}`);
    }
    
    if (oldUser.online !== newUser.online) {
        if (newUser.online) {
            console.log(`${getUserNameOrIdentity(newUser)} connected.`);
        } else {
            console.log(`${getUserNameOrIdentity(newUser)} disconnected.`);
        }
    }
    
    if (localIdentity && newUser.identity.isEqual(localIdentity)) {
        currentUser = newUser;
        usernameInput.value = newUser.name || '';
    }
}

function handleMessageInsert(message: moduleBindings.Message, event?: ReducerEvent) {
    // Avoid rendering snapshot messages here
    if (event?.status !== 'snapshot') { 
        renderMessage(message);
    }
}

// --- Reducer Result Handlers ---

function handleSetNameResult(event: ReducerEvent, name: string) {
    // Use event properties like callerIdentity, status, message
    if (localIdentity && event.callerIdentity?.isEqual(localIdentity) && event.status === 'failed') {
        console.error(`Failed to change name to ${name}: ${event.message}`);
    }
}

function handleSendMessageResult(event: ReducerEvent, text: string) {
    if (localIdentity && event.callerIdentity?.isEqual(localIdentity) && event.status === 'failed') {
        console.error(`Failed to send message "${text}": ${event.message}`);
    }
}

// --- Subscription Handler ---

function handleSubscriptionApplied() {
    console.log("Subscription applied");
    
    messagesContainer.innerHTML = '';
    
    const messages = moduleBindings.Message.filter({});
    const sortedMessages = [...messages].sort((a, b) => {
        const sentA = BigInt(a.sent);
        const sentB = BigInt(b.sent);
        if (sentA < sentB) return -1;
        if (sentA > sentB) return 1;
        return 0;
    });
    
    sortedMessages.forEach(renderMessage);
    scrollToBottom();

    if (localIdentity) {
        const user = moduleBindings.User.findByIdentity(localIdentity);
        if (user) {
            currentUser = user;
            usernameInput.value = user.name || '';
        }
    }
}

// --- UI Rendering and Helpers ---

function getUserNameOrIdentity(user: moduleBindings.User): string {
    return user.name || user.identity.toHexString().substring(0, 8);
}

function renderMessage(message: moduleBindings.Message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const isSelf = localIdentity ? message.sender.isEqual(localIdentity) : false;
    messageElement.classList.add(isSelf ? 'self' : 'other');
    
    let senderName = "unknown";
    const sender = moduleBindings.User.findByIdentity(message.sender);
    if (sender) {
        senderName = getUserNameOrIdentity(sender);
    }
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = senderName;
    
    const textElement = document.createElement('div');
    textElement.className = 'text';
    textElement.textContent = message.text;
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(textElement);
    messagesContainer.appendChild(messageElement);
    
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- User Actions ---

function sendMessage() {
    if (!connection) return;
    const text = messageInput.value.trim();
    if (text) {
        moduleBindings.Reducers.sendMessage(text);
        messageInput.value = '';
    }
}

function setUsername() {
    if (!connection) return;
    const name = usernameInput.value.trim();
    if (name) {
        moduleBindings.Reducers.setName(name);
    }
}

// --- Initialization ---

// Add event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

setNameButton.addEventListener('click', setUsername);
usernameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// Connect when document is ready
document.addEventListener('DOMContentLoaded', connectToSpaceTimeDB); 