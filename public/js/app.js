class MicrophoneTest {
    constructor() {
        this.stream = null;
        this.visualizer = null;
        this.devices = [];
        this.selectedDeviceId = null;
        
        // DOM elements
        this.startButton = document.getElementById('startTest');
        this.stopButton = document.getElementById('stopTest');
        this.statusDisplay = document.getElementById('statusDisplay');
        this.errorDisplay = document.getElementById('errorDisplay');
        this.errorMessage = document.getElementById('errorMessage');
        this.deviceSelector = document.getElementById('deviceSelector');
        this.micSelect = document.getElementById('micSelect');
        
        this.initializeEventListeners();
        this.checkBrowserSupport();
        this.loadDevices();
    }

    initializeEventListeners() {
        this.startButton.addEventListener('click', () => this.startTest());
        this.stopButton.addEventListener('click', () => this.stopTest());
        this.micSelect.addEventListener('change', (e) => {
            this.selectedDeviceId = e.target.value;
        });
    }

    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
            this.startButton.disabled = true;
            return false;
        }
        
        if (!window.AudioContext && !window.webkitAudioContext) {
            this.showError('Your browser does not support Web Audio API. Audio visualization will not be available.');
        }
        
        return true;
    }

    async loadDevices() {
        try {
            // Request permission first to get device labels
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            // Now get the actual device list
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'audioinput');
            
            if (this.devices.length > 1) {
                this.populateDeviceSelector();
                this.deviceSelector.style.display = 'block';
            }
        } catch (error) {
            console.log('Could not enumerate devices:', error);
            // This is okay, we'll just use the default device
        }
    }

    populateDeviceSelector() {
        this.micSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Default microphone';
        this.micSelect.appendChild(defaultOption);
        
        // Add device options
        this.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${device.deviceId.substr(0, 8)}...`;
            this.micSelect.appendChild(option);
        });
    }

    async startTest() {
        this.hideError();
        this.setStatus('Requesting microphone access...', 'text-blue-600');
        
        try {
            // Configure audio constraints
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            // Add device constraint if specific device selected
            if (this.selectedDeviceId) {
                constraints.audio.deviceId = { exact: this.selectedDeviceId };
            }
            
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Initialize visualizer
            this.visualizer = new AudioVisualizer();
            const visualizerInitialized = await this.visualizer.initialize(this.stream);
            
            if (visualizerInitialized) {
                this.setStatus('Microphone is working! Speak into your microphone to see the visualization.', 'text-green-600');
            } else {
                this.setStatus('Microphone is working! (Visualization not available)', 'text-green-600');
            }
            
            // Update UI
            this.startButton.classList.add('hidden');
            this.stopButton.classList.remove('hidden');
            
            // Monitor stream status
            this.monitorStream();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.handleMicrophoneError(error);
        }
    }

    stopTest() {
        if (this.stream) {
            // Stop all tracks
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.visualizer) {
            this.visualizer.stop(); // This will trigger recording completion
            // Don't destroy visualizer immediately to allow recording to complete
        }
        
        // Update UI
        this.startButton.classList.remove('hidden');
        this.stopButton.classList.add('hidden');
        
        // Show completion message
        this.setStatus('Microphone test completed! Check your recording below.', 'text-green-600');
        this.hideError();
    }

    monitorStream() {
        if (!this.stream) return;
        
        const audioTrack = this.stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.addEventListener('ended', () => {
                this.setStatus('Microphone access ended. Click "Start Microphone Test" to try again.', 'text-orange-600');
                this.stopTest();
            });
        }
    }

    handleMicrophoneError(error) {
        let errorMsg = '';
        
        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                errorMsg = 'Microphone access denied. Please allow microphone permissions and refresh the page.';
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                errorMsg = 'No microphone found. Please connect a microphone and try again.';
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                errorMsg = 'Microphone is already in use by another application. Please close other apps using your microphone.';
                break;
            case 'OverconstrainedError':
            case 'ConstraintNotSatisfiedError':
                errorMsg = 'Selected microphone device is not available. Please try with a different device.';
                break;
            case 'SecurityError':
                errorMsg = 'Microphone access blocked due to security settings. Please check your browser security settings.';
                break;
            case 'AbortError':
                errorMsg = 'Microphone access was aborted. Please try again.';
                break;
            case 'TypeError':
                errorMsg = 'Browser configuration error. Please try using a different browser or check your audio settings.';
                break;
            case 'InvalidStateError':
                errorMsg = 'Invalid microphone state. Please refresh the page and try again.';
                break;
            default:
                errorMsg = `An error occurred: ${error.message || 'Unknown error'}. Please try refreshing the page.`;
        }
        
        this.showError(errorMsg);
        this.setStatus('Microphone test failed. See error message above.', 'text-red-600');
        
        // Reset UI state
        this.startButton.classList.remove('hidden');
        this.stopButton.classList.add('hidden');
    }

    setStatus(message, className = 'text-gray-600') {
        this.statusDisplay.innerHTML = `<p class="${className}">${message}</p>`;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorDisplay.classList.remove('hidden');
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            if (!this.errorDisplay.classList.contains('hidden')) {
                this.hideError();
            }
        }, 10000);
    }

    hideError() {
        this.errorDisplay.classList.add('hidden');
    }

    // Method to check if microphone is currently active
    isMicrophoneActive() {
        return this.stream !== null && this.stream.active;
    }

    // Method to start a new test (resets everything)
    startNewTest() {
        // Hide recording player
        const recordingSection = document.getElementById('recordingPlayer');
        if (recordingSection) {
            recordingSection.classList.add('hidden');
        }
        
        // Destroy current visualizer
        if (this.visualizer) {
            this.visualizer.destroy();
            this.visualizer = null;
        }
        
        // Start fresh test
        this.startTest();
    }

    // Method to get current audio level (if visualizer is active)
    getCurrentAudioLevel() {
        if (this.visualizer && this.visualizer.isActive) {
            return this.visualizer.calculateVolume();
        }
        return 0;
    }

    // Method to refresh device list
    async refreshDevices() {
        if (this.isMicrophoneActive()) {
            // Don't refresh while testing
            return;
        }
        
        try {
            this.setStatus('Refreshing device list...', 'text-blue-600');
            await this.loadDevices();
            this.setStatus('Device list updated. Click "Start Microphone Test" to begin', 'text-gray-600');
        } catch (error) {
            console.error('Error refreshing devices:', error);
            this.setStatus('Could not refresh device list', 'text-red-600');
        }
    }

    // Cleanup method
    destroy() {
        this.stopTest();
        
        // Remove event listeners
        this.startButton?.removeEventListener('click', () => this.startTest());
        this.stopButton?.removeEventListener('click', () => this.stopTest());
        this.micSelect?.removeEventListener('change', (e) => {
            this.selectedDeviceId = e.target.value;
        });
    }
}

// Global instance for debugging and external access
let microphoneTestInstance = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    microphoneTestInstance = new MicrophoneTest();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space bar to toggle test
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            if (microphoneTestInstance.isMicrophoneActive()) {
                microphoneTestInstance.stopTest();
            } else {
                microphoneTestInstance.startTest();
            }
        }
        
        // Escape to stop test
        if (e.code === 'Escape' && microphoneTestInstance.isMicrophoneActive()) {
            microphoneTestInstance.stopTest();
        }
    });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - could pause visualizer for performance
        console.log('Page hidden - microphone test continues');
    } else {
        // Page is visible again
        console.log('Page visible - microphone test active');
    }
});

// Handle page unload - cleanup resources
window.addEventListener('beforeunload', () => {
    if (microphoneTestInstance) {
        microphoneTestInstance.destroy();
    }
});

// Expose some methods globally for debugging
window.micTest = {
    getInstance: () => microphoneTestInstance,
    isActive: () => microphoneTestInstance?.isMicrophoneActive() || false,
    getAudioLevel: () => microphoneTestInstance?.getCurrentAudioLevel() || 0,
    refreshDevices: () => microphoneTestInstance?.refreshDevices(),
    stop: () => microphoneTestInstance?.stopTest(),
    start: () => microphoneTestInstance?.startTest(),
    startNew: () => microphoneTestInstance?.startNewTest()
};