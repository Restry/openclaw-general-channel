const WebSocket = require('ws');
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const WS_URL = 'ws://localhost:3005';
const OMNI_SECRET = process.env.OMNI_SECRET || 'test_secret';

// --- Simulation Helpers ---

function log(step, msg) {
    console.log(`[WeChat Sim] ${step}: ${msg}`);
}

function createConnection() {
    return new WebSocket(WS_URL);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWeChatSimulation() {
    console.log("\n>>> Starting WeChat Client Simulation <<<\n");
    const clientId = `wx_user_${uuidv4()}`;
    let ws;

    try {
        // 1. Simulate WebSocket Connection
        log("Step 1", "Connecting to WebSocket...");
        ws = createConnection();
        
        await new Promise((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
        });
        log("Step 1", "Connected.");

        // 2. Simulate Handshake (Auth)
        log("Step 2", "Sending Auth Handshake...");
        ws.send(JSON.stringify({
            type: 'auth',
            token: OMNI_SECRET,
            client_id: clientId,
            client_type: 'wechat'
        }));

        const authResponse = await new Promise((resolve) => {
            ws.once('message', (data) => resolve(JSON.parse(data)));
        });

        if (authResponse.type !== 'auth_success' || authResponse.client_id !== clientId) {
            throw new Error(`Auth failed: ${JSON.stringify(authResponse)}`);
        }
        log("Step 2", "Authentication Successful.");

        // 3. Simulate Send Message
        log("Step 3", "Sending 'Hello Server' message...");
        const msgId = uuidv4();
        const textMsg = {
            id: msgId,
            type: 'text',
            content: 'Hello Server',
            timestamp: Date.now()
        };
        ws.send(JSON.stringify(textMsg));
        // Server currently just logs, so we verify connection stays alive
        await sleep(500); 
        if (ws.readyState !== WebSocket.OPEN) throw new Error("Connection closed unexpectedly after sending message");
        log("Step 3", "Message sent and connection stable.");

        // 4. Simulate Receive Reply (Simulated via HTTP trigger if real backend existed, 
        //    but here we might need to manually trigger or just assume for now based on current server capabilities.
        //    However, the server has an endpoint /api/outbound. We can call that to simulate a reply!)
        log("Step 4", "Simulating Backend Reply via HTTP API...");
        const http = require('http');
        const postData = JSON.stringify({
            client_id: clientId,
            payload: { type: 'text', content: 'Hello from Backend', timestamp: Date.now() }
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3005,
            path: '/api/outbound',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        }, (res) => {
           // just consuming response
           res.on('data', () => {});
        });
        
        req.write(postData);
        req.end();

        // Wait for the message on WebSocket
        const replyPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout waiting for reply")), 5000);
            ws.on('message', (data) => {
                const msg = JSON.parse(data);
                if (msg.type === 'outbound_message' && msg.payload.content === 'Hello from Backend') {
                    clearTimeout(timeout);
                    resolve(msg);
                }
            });
        });

        await replyPromise;
        log("Step 4", "Reply received via WebSocket.");

        // 5. Simulate Reconnection after close
        log("Step 5", "Closing connection to simulate drop...");
        ws.close();
        await sleep(1000);

        log("Step 5", "Reconnecting...");
        ws = createConnection();
        await new Promise(resolve => ws.on('open', resolve));
        
        ws.send(JSON.stringify({
            type: 'auth',
            token: OMNI_SECRET,
            client_id: clientId,
            client_type: 'wechat' // re-auth
        }));

        const reAuthResponse = await new Promise((resolve) => {
            ws.once('message', (data) => resolve(JSON.parse(data)));
        });

        if (reAuthResponse.type !== 'auth_success') throw new Error("Re-auth failed");
        log("Step 5", "Reconnection & Re-auth Successful.");

        console.log("\n>>> WeChat Simulation PASSED <<<");
        process.exit(0);

    } catch (err) {
        console.error("\n>>> WeChat Simulation FAILED <<<");
        console.error(err);
        if (ws) ws.close();
        process.exit(1);
    }
}

runWeChatSimulation();
