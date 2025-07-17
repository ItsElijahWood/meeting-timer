// meeting-timer-sw.js

let stopwatchInterval = null;
let startTime = 0; // Timestamp when the stopwatch started (or last resumed)
let elapsedSeconds = 0; // Total elapsed time in seconds
let isRunning = false;

// Function to format time for display (similar to your main script)
function formatTime(s) {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// Function to broadcast the current stopwatch state to all connected clients (webpages)
function broadcastStopwatchState() {
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'STOPWATCH_UPDATE',
                elapsedSeconds: elapsedSeconds,
                formattedTime: formatTime(elapsedSeconds) // Send formatted time too for convenience
            });
        });
    });
}

// Start the stopwatch interval
function startStopwatch() {
    if (!isRunning) {
        isRunning = true;
        // Adjust startTime to account for previously elapsed time
        startTime = Date.now() - (elapsedSeconds * 1000); // Convert seconds to milliseconds

        // Clear any existing interval to prevent duplicates
        if (stopwatchInterval) {
            clearInterval(stopwatchInterval);
        }

        stopwatchInterval = setInterval(() => {
            const now = Date.now();
            elapsedSeconds = Math.floor((now - startTime) / 1000); // Calculate elapsed seconds
            broadcastStopwatchState();
        }, 1000); // Update every second

        console.log('Stopwatch started in SW');
        // Immediately send initial state after starting
        broadcastStopwatchState();
    }
}

// Pause the stopwatch interval
function pauseStopwatch() {
    if (isRunning) {
        isRunning = false;
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        console.log('Stopwatch paused in SW');
        // Broadcast the final paused state
        broadcastStopwatchState();
    }
}

// Reset the stopwatch
function resetStopwatch() {
    pauseStopwatch(); // Ensure it's stopped first
    startTime = 0;
    elapsedSeconds = 0;
    console.log('Stopwatch reset in SW');
    broadcastStopwatchState(); // Broadcast reset state (00:00)
}

// Listen for messages from the client (your webpage)
self.addEventListener('message', event => {
    if (event.data.type === 'START_STOPWATCH') {
        startStopwatch();
    } else if (event.data.type === 'PAUSE_STOPWATCH') {
        pauseStopwatch();
    } else if (event.data.type === 'RESET_STOPWATCH') {
        resetStopwatch();
    } else if (event.data.type === 'REQUEST_INITIAL_STATE') {
        // When a new page loads or regains focus, send its current state
        event.source.postMessage({
            type: 'STOPWATCH_INITIAL_STATE',
            elapsedSeconds: elapsedSeconds,
            isRunning: isRunning,
            // startTime is internal to SW, don't necessarily need to send it
        });
    }
});

// Standard Service Worker lifecycle events
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    // Clean up old caches here if necessary
    event.waitUntil(clients.claim()); // Allows the service worker to control pages on its first load
});