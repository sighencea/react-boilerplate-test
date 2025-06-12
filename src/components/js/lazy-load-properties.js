document.addEventListener('DOMContentLoaded', () => {
    const propertiesContainer = document.getElementById('propertiesContainer');
    let qrModalInstance = null; // For QR Code Display Modal
    const qrModalEl = document.getElementById('qrCodeDisplayModal');
    if (qrModalEl) {
        qrModalInstance = new bootstrap.Modal(qrModalEl);
    }

    let initialOffset = 0;
    const propertiesPerPage = 9; // Display 9 properties per fetch (3x3 grid)
    let isLoading = false;
    let allPropertiesLoaded = false;

    // The displayProperties function (assumed to be correctly added in a previous step,
    // but provided here for completeness of this script's context)
    // This function was designed to create property cards and link them.
    function displayProperties(properties) {
        if (!propertiesContainer) {
            console.error('Properties container not found in displayProperties.');
            return;
        }

    if (properties.length === 0 && initialOffset === 0) {
        let noPropertiesMessageText = 'You currently have no properties. Click \'Add Property\' to create one!'; // Default fallback
        if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
            const translated = i18next.t('propertiesPage.noProperties');
            // Check if translation is different from key and not undefined/null
            if (translated && translated !== 'propertiesPage.noProperties') {
                noPropertiesMessageText = translated;
            }
        }
        propertiesContainer.innerHTML = `<div class="col-12"><p>${noPropertiesMessageText}</p></div>`;
        allPropertiesLoaded = true; // No properties to load
        return;
    }

        let propertiesHtml = properties.map(property => {
            const imageUrl = property.property_image_url ? property.property_image_url : 'https://via.placeholder.com/300x200.png?text=No+Image';
            const propertyName = property.property_name || 'Unnamed Property';
            const propertyAddress = property.address || 'Address not available';
            const propertyType = property.property_type || 'N/A';
            const propertyId = property.id;

            return `
              <div class="col-lg-4 col-md-6 mb-4">
                <a href="property-details.html?id=${propertyId}" class="text-decoration-none d-block h-100">
                  <div class="card property-card-link h-100">
                    <img src="${imageUrl}" class="card-img-top" alt="${propertyName}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                      <h5 class="card-title text-primary">${propertyName}</h5>
                      <p class="card-text text-secondary flex-grow-1">${propertyAddress}</p>
                      <p class="card-text"><small class="text-muted">Type: ${propertyType}</small></p>
                      <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="btn btn-sm btn-outline-primary align-self-start">View Details</span>
                        ${property.qr_code_image_url ? `
                          <button type="button" class="btn btn-sm btn-outline-secondary qr-code-button" title="Show QR Code"
                                  data-qr-url="${property.qr_code_image_url}"
                                  data-property-name="${propertyName}">
                            <i class="bi bi-qr-code"></i>
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            `;
        }).join('');

        if (initialOffset === 0 && propertiesContainer.innerHTML.includes('data-i18n="propertiesPage.noProperties"')) {
            // If "No properties found" was there, replace it completely
            propertiesContainer.innerHTML = propertiesHtml;
        } else if (initialOffset === 0) {
             propertiesContainer.innerHTML = propertiesHtml;
        }

        else {
            propertiesContainer.innerHTML += propertiesHtml;
        }

    }

    async function fetchProperties(offset, limit) {
        if (isLoading || allPropertiesLoaded) {
            return;
        }
        isLoading = true;
        console.log(`Fetching properties: offset=${offset}, limit=${limit}`);

        if (!window._supabase) {
            console.error('Supabase client not available.');
            isLoading = false;
            return;
        }

        try {
            // RLS is expected to filter by user
            const { data, error } = await window._supabase
                .from('properties')
                .select('id, property_name, address, property_image_url, property_type, qr_code_image_url') // Added qr_code_image_url
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error fetching properties:', error);
                // Optionally display an error message to the user in the container
                if (offset === 0) { // Only show error on initial load
                    propertiesContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error loading properties. Please try again later.</p></div>';
                }
                allPropertiesLoaded = true; // Stop trying if there's an error
                return;
            }

            if (data) {
                console.log('Properties fetched:', data.length);
                displayProperties(data);
                initialOffset += data.length;
                if (data.length < limit) {
                    allPropertiesLoaded = true;
                    console.log('All properties loaded.');
                }
            }
        } catch (err) {
            console.error('Unexpected error fetching properties:', err);
             if (offset === 0) {
                propertiesContainer.innerHTML = '<div class="col-12"><p class="text-danger">An unexpected error occurred. Please try again later.</p></div>';
            }
            allPropertiesLoaded = true; // Stop trying
        } finally {
            isLoading = false;
        }
    }

    // New function to be exposed globally
    async function refreshAndLoadProperties() {
      console.log('Refreshing properties list...');
      if (!propertiesContainer) {
        console.error('Properties container not found during refresh.');
        return;
      }
      isLoading = false; // Reset loading lock if a refresh is forced
      allPropertiesLoaded = false; // Reset this flag
      initialOffset = 0; // Reset offset to start from the beginning
      propertiesContainer.innerHTML = '<div class="col-12"><p data-i18n="propertiesPage.loading">Loading properties...</p></div>'; // Optional: show a loading message

      // Translate loading message if i18next is available
      if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
          const loadingText = i18next.t('propertiesPage.loading', { defaultValue: 'Loading properties...' });
          propertiesContainer.innerHTML = `<div class="col-12"><p>${loadingText}</p></div>`;
      }

      await fetchProperties(initialOffset, propertiesPerPage); // Fetch the first page
    }

    window.refreshPropertiesList = refreshAndLoadProperties;

    function lazyScrollHandler() {
        // Check if the user has scrolled to near the bottom of the page
        // (window.innerHeight + window.scrollY) is the bottom of the viewport
        // document.body.offsetHeight is the total height of the page
        // The - 200 is a buffer
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200 && !isLoading && !allPropertiesLoaded) {
            console.log('Reached bottom, loading more properties...');
            fetchProperties(initialOffset, propertiesPerPage);
        }
    }

    // Initial load
    if (propertiesContainer) {
        fetchProperties(initialOffset, propertiesPerPage);
    } else {
        console.error('Properties container (propertiesContainer) not found on page load.');
    }

    // Attach scroll listener for lazy loading
    window.addEventListener('scroll', lazyScrollHandler);
    // Also consider an IntersectionObserver for a more modern/performant approach if issues with scroll handler.

    // Event Listener for QR Code Buttons (using event delegation)
    if (propertiesContainer && qrModalInstance) {
        propertiesContainer.addEventListener('click', function(event) {
            const qrButton = event.target.closest('.qr-code-button');
            if (qrButton) {
                event.preventDefault(); // Prevent any default anchor behavior if it were an <a>
                const qrUrl = qrButton.dataset.qrUrl;
                const propertyName = qrButton.dataset.propertyName || 'Property';
                
                const qrCodeModalImage = document.getElementById('qrCodeModalImage');
                const qrCodeDownloadLink = document.getElementById('qrCodeDownloadLink');
                // const qrCodeModalLabel = document.getElementById('qrCodeDisplayModalLabel'); // If we want to set title

                if (qrCodeModalImage) qrCodeModalImage.src = qrUrl;
                if (qrCodeDownloadLink) {
                    qrCodeDownloadLink.href = qrUrl;
                    qrCodeDownloadLink.download = `qr_code_${propertyName.replace(/\s+/g, '_')}.png`;
                }
                // if (qrCodeModalLabel) qrCodeModalLabel.textContent = `${propertyName} QR Code`;


                qrModalInstance.show();
            }
        });
    }
});
