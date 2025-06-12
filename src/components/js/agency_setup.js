document.addEventListener('DOMContentLoaded', function () {
    const agencySetupForm = document.getElementById('agencySetupForm');
    const companyLogoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');

    const companyNameInput = document.getElementById('companyName');
    const companyAddressStreetInput = document.getElementById('companyAddressStreet');
    const companyEmailInput = document.getElementById('companyEmail');
    const companyCityInput = document.getElementById('companyCity');
    const companyStateInput = document.getElementById('companyState');
    const companyPostCodeInput = document.getElementById('companyPostCode');

    const companyPhoneInput = document.getElementById('companyPhone');
    const companyWebsiteInput = document.getElementById('companyWebsite');
    const companyTaxIdInput = document.getElementById('companyTaxId');

    const saveCompanyButton = document.getElementById('saveCompanyButton');
    const agencySetupMessage = document.getElementById('agencySetupMessage');

    // Basic i18n placeholder for messages
    const i18n = {
        t: (key, options) => {
            let message = key;
            if (options && options.message) {
                message = message.replace('{{message}}', options.message);
            }
            if (options && options.email) {
                message = message.replace('{{email}}', options.email);
            }
            // Add more replacements if needed
            switch (key) {
                case 'agencySetup.validation.requiredFields': return 'Please fill in all required fields.';
                case 'agencySetup.validation.invalidEmail': return 'Please enter a valid email address.';
                case 'agencySetup.error.noSession': return 'No active session. Please log in again.';
                case 'agencySetup.error.logoUploadFailed': return 'Logo upload failed: {{message}}';
                case 'agencySetup.error.getPublicUrlFailed': return 'Failed to get logo URL: {{message}}';
                case 'agencySetup.error.functionInvocationFailed': return 'Failed to save company details: {{message}}';
                case 'agencySetup.error.unexpected': return 'An unexpected error occurred: {{message}}';
                case 'agencySetup.success': return 'Company information saved successfully! Redirecting...';
                default: return key;
            }
        }
    };

    function displayMessage(message, type = 'danger') {
        if (agencySetupMessage) {
            agencySetupMessage.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        }
    }

    // Logo Preview Logic
    if (companyLogoInput && logoPreview) {
        companyLogoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                logoPreview.src = '#';
                logoPreview.style.display = 'none';
            }
        });
    }

    if (agencySetupForm) {
        agencySetupForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (agencySetupMessage) agencySetupMessage.innerHTML = '';
            if (saveCompanyButton) saveCompanyButton.disabled = true;

            // Client-Side Validation
            const requiredFields = [
                companyNameInput, companyAddressStreetInput, companyEmailInput,
                companyCityInput, companyStateInput, companyPostCodeInput
            ];
            let allFieldsValid = true;
            for (const field of requiredFields) {
                if (!field.value.trim()) {
                    allFieldsValid = false;
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }
            }

            if (!allFieldsValid) {
                displayMessage(i18n.t('agencySetup.validation.requiredFields'), 'warning');
                if (saveCompanyButton) saveCompanyButton.disabled = false;
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(companyEmailInput.value.trim())) {
                displayMessage(i18n.t('agencySetup.validation.invalidEmail'), 'warning');
                companyEmailInput.classList.add('is-invalid');
                if (saveCompanyButton) saveCompanyButton.disabled = false;
                return;
            } else {
                companyEmailInput.classList.remove('is-invalid');
            }

            try {
                const { data: sessionData, error: sessionError } = await window._supabase.auth.getSession();
                if (sessionError || !sessionData.session || !sessionData.session.user) {
                    displayMessage(i18n.t('agencySetup.error.noSession'), 'danger');
                    if (saveCompanyButton) saveCompanyButton.disabled = false;
                    // Consider redirect: window.location.href = '../index.html';
                    return;
                }
                const user = sessionData.session.user;

                let companyLogoUrl = null;
                const logoFile = companyLogoInput.files[0];

                if (logoFile) {
                    const fileExtension = logoFile.name.split('.').pop();
                    const filePath = `${user.id}/logo-${Date.now()}.${fileExtension}`;

                    const { error: uploadError } = await window._supabase.storage
                        .from('agency-logo')
                        .upload(filePath, logoFile, {
                            cacheControl: '3600', // Optional: cache for 1 hour
                            upsert: true // Optional: overwrite if file with same path exists
                        });

                    if (uploadError) {
                        displayMessage(i18n.t('agencySetup.error.logoUploadFailed', { message: uploadError.message }), 'danger');
                        if (saveCompanyButton) saveCompanyButton.disabled = false;
                        return;
                    }

                    const { data: publicUrlData, error: publicUrlError } = window._supabase.storage
                        .from('agency-logo')
                        .getPublicUrl(filePath);

                    if (publicUrlError) {
                        displayMessage(i18n.t('agencySetup.error.getPublicUrlFailed', { message: publicUrlError.message }), 'danger');
                        // Log this, but proceed without logo if getting URL fails after successful upload
                        console.error("Error getting public URL for logo:", publicUrlError);
                    } else if (publicUrlData) {
                        companyLogoUrl = publicUrlData.publicUrl;
                    }
                }

                // Process Company Website URL
                let processedWebsiteUrl = companyWebsiteInput.value.trim();
                if (processedWebsiteUrl) {
                  if (!/^https?:\/\//i.test(processedWebsiteUrl)) {
                    processedWebsiteUrl = 'https://' + processedWebsiteUrl;
                  }
                } else {
                  processedWebsiteUrl = null; // Ensure empty input becomes null
                }

                const companyData = {
                    company_name: companyNameInput.value.trim(),
                    address_street: companyAddressStreetInput.value.trim(),
                    email: companyEmailInput.value.trim(),
                    address_city: companyCityInput.value.trim(),
                    address_state: companyStateInput.value.trim(),
                    address_postal_code: companyPostCodeInput.value.trim(),
                    phone_number: companyPhoneInput.value.trim() || null,
                    website_url: processedWebsiteUrl,
                    tax_id: companyTaxIdInput.value.trim() || null,
                    company_logo_url: companyLogoUrl
                };

                console.log('[agency_setup.js] Corrected companyData being sent:', JSON.stringify(companyData, null, 2));

                // Invoke Supabase Edge Function
                const { data: functionResponse, error: functionError } = await window._supabase.functions.invoke('save-company-details', {
                    body: companyData
                });

                if (functionError) {
                    displayMessage(i18n.t('agencySetup.error.functionInvocationFailed', { message: functionError.message }), 'danger');
                    if (saveCompanyButton) saveCompanyButton.disabled = false;
                    return;
                }

                // Assuming the function returns a structure like { success: true } or { success: false, message: '...' }
                // Adjust based on actual function response
                if (functionResponse && (functionResponse.success || functionResponse.data?.success)) { // Check for success in response or response.data
                    displayMessage(i18n.t('agencySetup.success'), 'success');
                    setTimeout(() => {
                        window.location.href = '../pages/dashboard.html';
                    }, 2000);
                } else {
                    const errorMessage = functionResponse?.message || functionResponse?.data?.message || 'Unknown error from function.';
                    displayMessage(i18n.t('agencySetup.error.functionInvocationFailed', { message: errorMessage }), 'danger');
                    if (saveCompanyButton) saveCompanyButton.disabled = false;
                }

            } catch (error) {
                console.error("Unexpected error during company setup:", error);
                displayMessage(i18n.t('agencySetup.error.unexpected', { message: error.message }), 'danger');
                if (saveCompanyButton) saveCompanyButton.disabled = false;
            }
        });
    }
});
