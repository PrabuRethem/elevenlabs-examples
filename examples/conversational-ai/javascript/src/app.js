// --- src/app.js ---
import { Conversation } from '@elevenlabs/client';

let conversation = null;

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

async function getSignedUrl() {
    try {
        const response = await fetch('/api/signed-url');
        if (!response.ok) throw new Error('Failed to get signed URL');
        const data = await response.json();
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

async function getAgentId() {
    const response = await fetch('/api/getAgentId');
    const { agentId } = await response.json();
    return agentId;
}

function updateStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
    statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
    const statusElement = document.getElementById('speakingStatus');
    // Update based on the exact mode string we receive
    const isSpeaking = mode.mode === 'speaking';
    statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
    statusElement.classList.toggle('speaking', isSpeaking);
    console.log('Speaking status updated:', { mode, isSpeaking }); // Debug log
}

function addMessage(text, source) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${source}`;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = source === 'user' ? 'You' : 'Agent';
    
    const textDiv = document.createElement('div');
    textDiv.textContent = text;
    
    messageDiv.appendChild(metaDiv);
    messageDiv.appendChild(textDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    try {
        // const hasPermission = await requestMicrophonePermission();
        // if (!hasPermission) {
        //     alert('Microphone permission is required for the conversation.');
        //     return;
        // }

        //const signedUrl = await getSignedUrl();
        const agentId = await getAgentId(); // You can switch to agentID for public agents
        
        conversation = await Conversation.startSession({
            //signedUrl: signedUrl,
            //agentId: agentId, 
            textOnly: true,
            connectionType: 'websocket',
            signedUrl: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidXNlcl9hZ2VudF8yODAxa2VleGM5bndla3ZydHF3YWpoZXpwbWM0X2NvbnZfNjIwMWtqNTlzdGI1ZXdrYmJ6cTF6ZjRhM2hhciIsIm1ldGFkYXRhIjoie1wiYXBwbHlfZGV2X2Rpc2NvdW50XCI6IGZhbHNlLCBcInNpZ25lZF91cmxcIjogbnVsbCwgXCJzb3VyY2VcIjogbnVsbCwgXCJ2ZXJzaW9uXCI6IG51bGwsIFwiYnJhbmNoX2lkXCI6IFwiXCJ9IiwidmlkZW8iOnsicm9vbUpvaW4iOnRydWUsInJvb20iOiJyb29tX2FnZW50XzI4MDFrZWV4Yzlud2VrdnJ0cXdhamhlenBtYzRfY29udl82MjAxa2o1OXN0YjVld2tiYnpxMXpmNGEzaGFyIiwiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuU3Vic2NyaWJlIjp0cnVlLCJjYW5QdWJsaXNoRGF0YSI6dHJ1ZX0sInN1YiI6InVzZXJfYWdlbnRfMjgwMWtlZXhjOW53ZWt2cnRxd2FqaGV6cG1jNF9jb252XzYyMDFrajU5c3RiNWV3a2JienExemY0YTNoYXIiLCJpc3MiOiJBUElLZXlFeHRlcm5hbCIsIm5iZiI6MTc3MTg1MjA2NSwiZXhwIjoxNzcxODUyOTY1fQ.It77azfZCg3BHTRsYpYMsJvf3xcPyPeCfgQHbb-ORWw',
            onConnect: () => {
                console.log('Connected');
                updateStatus(true);
                startButton.disabled = true;
                endButton.disabled = false;
                // Enable message input
                const messageInput = document.getElementById('messageInput');
                const sendButton = document.getElementById('sendButton');
                messageInput.disabled = false;
                sendButton.disabled = false;
                clearMessages();
            },
            onDisconnect: () => {
                console.log('Disconnected');
                updateStatus(false);
                startButton.disabled = false;
                endButton.disabled = true;
                updateSpeakingStatus({ mode: 'listening' }); // Reset to listening mode on disconnect
                // Disable message input
                const messageInput = document.getElementById('messageInput');
                const sendButton = document.getElementById('sendButton');
                messageInput.disabled = true;
                sendButton.disabled = true;
            },
            onError: (error) => {
                console.error('Conversation error:', error);
                alert('An error occurred during the conversation.');
            },
            onModeChange: (mode) => {
                console.log('Mode changed:', mode); // Debug log to see exact mode object
                updateSpeakingStatus(mode);
            },
            onMessage: (message) => {
                console.log('Message received:', message);
                
                // Handle different message types
                if (message.type === 'conversation_initiation_metadata') {
                    // Initial conversation metadata - skip displaying
                    return;
                }
                
                // Extract text from message
                let messageText = '';
                let source = 'agent';
                
                // Handle different message formats
                if (typeof message === 'string') {
                    // Simple string message
                    messageText = message;
                    source = 'agent';
                } else if (message.type === 'response_audio_transcript' || message.type === 'response_text') {
                    messageText = message.text || message.transcript || message.content || '';
                    source = 'agent';
                } else if (message.type === 'user_transcript' || message.type === 'user_message') {
                    messageText = message.text || message.transcript || message.content || '';
                    source = 'user';
                } else if (message.text) {
                    messageText = message.text;
                    source = message.role === 'user' ? 'user' : 'agent';
                } else if (message.transcript) {
                    messageText = message.transcript;
                    source = message.role === 'user' ? 'user' : 'agent';
                } else if (message.content) {
                    messageText = message.content;
                    source = message.role === 'user' ? 'user' : 'agent';
                } else if (message.message) {
                    messageText = message.message;
                    source = message.role === 'user' ? 'user' : 'agent';
                } else {
                    // Fallback: try to extract any text content or stringify
                    const stringified = JSON.stringify(message);
                    // Only show if it's not just metadata
                    if (stringified.length < 200 && !stringified.includes('conversation_initiation')) {
                        messageText = stringified;
                    }
                }
                
                // Only add message if we have meaningful text
                if (messageText && messageText.trim()) {
                    addMessage(messageText.trim(), source);
                }
            }
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        alert('Failed to start conversation. Please try again.');
    }
}

async function endConversation() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || !conversation) {
        return;
    }
    
    // Clear input immediately for better UX
    messageInput.value = '';
    
    // Send message to conversation
    try {
        conversation.sendUserMessage(message);
        addMessage(message, 'user');
        // Note: User message will be displayed via onMessage callback to avoid duplicates
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

document.getElementById('startButton').addEventListener('click', startConversation);
document.getElementById('endButton').addEventListener('click', endConversation);

// Message input handlers
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});
