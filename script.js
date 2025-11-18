

    //<!-- Local App Script -->

        // --- App State ---
        let currentLocation = null;
        let localReports = []; // Store reports locally in a session array
        let map;
        let markersLayer; // A layer group to hold all *submitted* markers
        let tempMarker = null; // A temporary marker for map pinning

        // --- DOM Elements ---
        const reportForm = document.getElementById('report-form');
        const categorySelect = document.getElementById('category');
        const descriptionInput = document.getElementById('description');
        const getLocationBtn = document.getElementById('get-location-btn');
        const locationDisplay = document.getElementById('location-display');
        const submitBtn = document.getElementById('submit-btn');
        const messageArea = document.getElementById('message-area');
        const reportsList = document.getElementById('reports-list');

        // New DOM Elements for Location Methods
        const locationMethodRadios = document.querySelectorAll('input[name="locationMethod"]');
        const locationMethodAutoPanel = document.getElementById('location-method-auto');
        const locationMethodMapPanel = document.getElementById('location-method-map');
        const locationMethodManualPanel = document.getElementById('location-method-manual');
        const manualLatInput = document.getElementById('manual-lat');
        const manualLonInput = document.getElementById('manual-lon');


        // --- Utility Functions ---
        function showMessage(text, isError = false) {
            messageArea.textContent = text;
            messageArea.className = isError ? 'error' : 'success';
            if (text) {
                setTimeout(() => showMessage(''), 3000); // Clear after 3 seconds
            }
        }

        function formatTimestamp(date) {
            if (!date) return 'Just now';
            return date.toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short'
            });
        }

        // --- Geolocation ---
        async function handleGetLocation() {
            if (!navigator.geolocation) {
                locationDisplay.textContent = 'Geolocation is not supported by your browser.';
                locationDisplay.className = 'error';
                return;
            }

            locationDisplay.innerHTML = '<div class="spinner"></div>';
            locationDisplay.className = '';
            
            // Clear temp marker if one exists
            if (tempMarker) {
                tempMarker.remove();
                tempMarker = null;
            }
            
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });

                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                locationDisplay.textContent = `Location Acquired: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
                locationDisplay.className = 'success';
                validateForm();
            } catch (error) {
                console.error("Geolocation error:", error);
                let errorMsg = 'Unable to retrieve location.';
                if (error.code === 1) errorMsg = 'Permission denied. Please enable location.';
                if (error.code === 2) errorMsg = 'Location unavailable.';
                if (error.code === 3) errorMsg = 'Request timed out.';
                
                locationDisplay.textContent = errorMsg;
                locationDisplay.className = 'error';
                currentLocation = null;
                validateForm();
            }
        }

        // --- Form Handling ---
        function validateForm() {
            const isCategorySelected = categorySelect.value !== '';
            const isLocationAcquired = currentLocation !== null;
            
            submitBtn.disabled = !(isCategorySelected && isLocationAcquired);
        }

        async function handleSubmitReport(e) {
            e.preventDefault();
            if (!currentLocation || !categorySelect.value) {
                showMessage('Please select a category and get location.', true);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner"></div> Submitting...';

            const newReport = {
                id: Date.now(), // Simple unique ID
                category: categorySelect.value,
                description: descriptionInput.value || '',
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                timestamp: new Date() // Use local date
            };

            // Simulate async operation
            await new Promise(res => setTimeout(res, 500));

            try {
                // Add to the local array
                localReports.unshift(newReport); // Add to the beginning
                renderReportsAndMap(); // Re-render the list and map
                
                // Pan map to new report
                if (map) {
                    map.flyTo([newReport.latitude, newReport.longitude], 16);
                }
                
                // Clear the temp pin marker if it exists
                if (tempMarker) {
                    tempMarker.remove();
                    tempMarker = null;
                }

                showMessage('Report submitted successfully!', false);
                // Reset form
                reportForm.reset();
                manualLatInput.value = '';
                manualLonInput.value = '';
                currentLocation = null;
                locationDisplay.textContent = '';
                locationDisplay.className = '';
                
                // Reset location method to default
                document.querySelector('input[name="locationMethod"][value="auto"]').checked = true;
                handleLocationMethodChange(); // Update UI
                
                validateForm();

            } catch (error) {
                console.error("Error adding report: ", error);
                showMessage('Failed to submit report. Please try again.', true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Report';
                validateForm(); // Re-validate to disable button
            }
        }

        // --- New Location Method Handlers ---

        // Switches the visible UI panel based on radio button selection
        function handleLocationMethodChange() {
            const selectedMethod = document.querySelector('input[name="locationMethod"]:checked').value;

            // Hide all panels
            locationMethodAutoPanel.classList.add('hidden');
            locationMethodMapPanel.classList.add('hidden');
            locationMethodManualPanel.classList.add('hidden');

            // Clear current location and temp marker when switching
            currentLocation = null;
            locationDisplay.textContent = '';
            locationDisplay.className = '';
            if (tempMarker) {
                tempMarker.remove();
                tempMarker = null;
            }
            manualLatInput.value = '';
            manualLonInput.value = '';

            // Show the selected panel
            if (selectedMethod === 'auto') {
                locationMethodAutoPanel.classList.remove('hidden');
            } else if (selectedMethod === 'map') {
                locationMethodMapPanel.classList.remove('hidden');
            } else if (selectedMethod === 'manual') {
                locationMethodManualPanel.classList.remove('hidden');
            }
            
            validateForm(); // Re-validate
        }

        // Handles the map click event for pinning
        function handleMapClick(e) {
            const selectedMethod = document.querySelector('input[name="locationMethod"]:checked').value;
            // Only proceed if the user is in "Pin on Map" mode
            if (selectedMethod !== 'map') return;

            // Remove old temp marker if it exists
            if (tempMarker) {
                tempMarker.remove();
            }

            currentLocation = {
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
            };

            // Add a new temp marker
            tempMarker = L.marker([currentLocation.latitude, currentLocation.longitude])
                .addTo(map)
                .bindPopup("New Issue Location (Temporary)")
                .openPopup();
            
            // Update display and validate
            locationDisplay.textContent = `Pinned: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
            locationDisplay.className = 'success';
            validateForm();
        }

        // Handles manual input from lat/lon fields
        function handleManualInput() {
            const lat = parseFloat(manualLatInput.value);
            const lon = parseFloat(manualLonInput.value);

            // Basic validation
            if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                currentLocation = { latitude: lat, longitude: lon };
                locationDisplay.textContent = `Set: ${lat}, ${lon}`;
                locationDisplay.className = 'success';
                
                // Optional: pan map to manually entered coords
                if (map) {
                    map.flyTo([lat, lon], 14);
                }
                
                validateForm();
            } else {
                currentLocation = null;
                if (manualLatInput.value || manualLonInput.value) {
                    locationDisplay.textContent = 'Invalid coordinates.';
                    locationDisplay.className = 'error';
                } else {
                    locationDisplay.textContent = '';
                    locationDisplay.className = '';
                }
                validateForm();
            }
        }


        // --- Data Display (List & Map) ---
        function renderReportsAndMap() {
            // Clear the list
            reportsList.innerHTML = ''; 
            
            // Clear all markers from the map
            if (markersLayer) {
                markersLayer.clearLayers();
            }

            if (localReports.length === 0) {
                reportsList.innerHTML = '<p class="reports-list-empty">No reports submitted yet. Be the first!</p>';
                return;
            }

            localReports.forEach(report => {
                // 1. Add to list
                const card = createReportCard(report);
                reportsList.appendChild(card);

                // 2. Add to map
                if (map && markersLayer) {
                    const marker = L.marker([report.latitude, report.longitude]);
                    
                    // Add a popup to the marker
                    // Use CSS classes defined in <style>
                    marker.bindPopup(`
                        <div>
                            <strong>${report.category}</strong>
                            ${report.description ? `<p>${report.description}</p>` : ''}
                            <div class="popup-location">
                                ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}
                            </div>
                        </div>
                    `);
                    
                    // Add the marker to our layer group
                    markersLayer.addLayer(marker);
                }
            });
        }

        function createReportCard(report) {
            const div = document.createElement('div');
            div.className = 'report-card';
            
            const time = formatTimestamp(report.timestamp);
            
            div.innerHTML = `
                <div class="report-card-header">
                    <h3>${report.category}</h3>
                    <time>${time}</time>
                </div>
                ${report.description ? `<p>${report.description}</p>` : ''}
                <div class="location">
                    <p>Location: ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</p>
                </div>
            `;
            return div;
        }

        // --- Initialization ---
        function initialize() {
            // --- 1. Initialize Map ---
            try {
                // Start map at a default location (Manolo Fortich, Philippines)
                map = L.map('map').setView([8.36, 124.86], 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19,
                }).addTo(map);
                
                // Initialize the layer group and add it to the map
                markersLayer = L.layerGroup().addTo(map);

                // --- NEW: Add map click listener ---
                map.on('click', handleMapClick);

                // Try to set map view to user's current location on load for better UX
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(position => {
                        map.setView([position.coords.latitude, position.coords.longitude], 14);
                    }, () => {
                        console.warn("Could not get user location for initial map view. Using default.");
                    });
                }
            } catch (e) {
                console.error("Map initialization failed:", e);
                document.getElementById('map').innerHTML = '<p class="error" style="padding: 1rem;">Error: Could not load map.</p>';
            }

            // --- 2. Add event listeners ---
            getLocationBtn.addEventListener('click', handleGetLocation);
            reportForm.addEventListener('submit', handleSubmitReport);
            categorySelect.addEventListener('change', validateForm);
            
            // --- NEW: Add listeners for location methods ---
            locationMethodRadios.forEach(radio => {
                radio.addEventListener('change', handleLocationMethodChange);
            });
            manualLatInput.addEventListener('input', handleManualInput);
            manualLonInput.addEventListener('input', handleManualInput);

            // --- 3. Initial render ---
            renderReportsAndMap();
            handleLocationMethodChange(); // Set initial UI state
        }

        // --- Start the app ---
        // We need to wait for the DOM to be fully loaded before running our script
