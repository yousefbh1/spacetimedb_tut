"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const spacetimedb_sdk_1 = require("@clockworklabs/spacetimedb-sdk");
// Import generated bindings
const moduleBindings = __importStar(require("./module_bindings"));
// Constants
const HOST = "http://localhost:3000";
const DBNAME = "quickstart-chat";
// Global variables
let connection = null; // Use DbConnection type
let localIdentity = null;
let currentUser = null;
// DOM elements - Assert non-null and cast to specific types
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const usernameInput = document.getElementById('username');
const setNameButton = document.getElementById('set-name-btn');
// Connect to SpaceTimeDB using the builder pattern on DbConnection
function connectToSpaceTimeDB() {
    var _a;
    const authToken = (_a = localStorage.getItem('spacetimedb_token')) !== null && _a !== void 0 ? _a : undefined; // Use undefined if null
    console.log("Attempting to connect...");
    // Use builder pattern on DbConnectionBuilder
    new spacetimedb_sdk_1.DbConnectionBuilder()
        .withUri(HOST)
        .withModuleName(DBNAME)
        .withToken(authToken)
        .onConnect(onConnected)
        .onConnectError(onConnectError)
        .onDisconnect(onDisconnected)
        .build();
}
// --- Connection Callbacks ---
function onConnected(conn, identity, token) {
    console.log("Connected!");
    connection = conn;
    localIdentity = identity;
    localStorage.setItem('spacetimedb_token', token);
    // Register table and reducer callbacks
    registerCallbacks();
    // Subscribe to all tables
    conn.subscribe(["SELECT * FROM User", "SELECT * FROM Message"]);
}
function onConnectError(error) {
    console.error("Connection error:", error);
    // Optionally: Display error to the user
}
function onDisconnected(reason) {
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
    if (!connection)
        return;
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
function handleUserInsert(user, event) {
    console.log("User inserted:", user);
    if (user.online) {
        console.log(`${getUserNameOrIdentity(user)} is online`);
    }
    if (localIdentity && user.identity.isEqual(localIdentity)) {
        currentUser = user;
        usernameInput.value = user.name || '';
    }
}
function handleUserUpdate(oldUser, newUser, event) {
    console.log("User updated:", oldUser, newUser);
    if (oldUser.name !== newUser.name) {
        console.log(`${getUserNameOrIdentity(oldUser)} renamed to ${newUser.name}`);
    }
    if (oldUser.online !== newUser.online) {
        if (newUser.online) {
            console.log(`${getUserNameOrIdentity(newUser)} connected.`);
        }
        else {
            console.log(`${getUserNameOrIdentity(newUser)} disconnected.`);
        }
    }
    if (localIdentity && newUser.identity.isEqual(localIdentity)) {
        currentUser = newUser;
        usernameInput.value = newUser.name || '';
    }
}
function handleMessageInsert(message, event) {
    // Avoid rendering snapshot messages here
    if ((event === null || event === void 0 ? void 0 : event.status) !== 'snapshot') {
        renderMessage(message);
    }
}
// --- Reducer Result Handlers ---
function handleSetNameResult(event, name) {
    var _a;
    // Use event properties like callerIdentity, status, message
    if (localIdentity && ((_a = event.callerIdentity) === null || _a === void 0 ? void 0 : _a.isEqual(localIdentity)) && event.status === 'failed') {
        console.error(`Failed to change name to ${name}: ${event.message}`);
    }
}
function handleSendMessageResult(event, text) {
    var _a;
    if (localIdentity && ((_a = event.callerIdentity) === null || _a === void 0 ? void 0 : _a.isEqual(localIdentity)) && event.status === 'failed') {
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
        if (sentA < sentB)
            return -1;
        if (sentA > sentB)
            return 1;
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
function getUserNameOrIdentity(user) {
    return user.name || user.identity.toHexString().substring(0, 8);
}
function renderMessage(message) {
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
    if (!connection)
        return;
    const text = messageInput.value.trim();
    if (text) {
        moduleBindings.Reducers.sendMessage(text);
        messageInput.value = '';
    }
}
function setUsername() {
    if (!connection)
        return;
    const name = usernameInput.value.trim();
    if (name) {
        moduleBindings.Reducers.setName(name);
    }
}
// --- Initialization ---
// Add event listeners
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
//# sourceMappingURL=app.js.map