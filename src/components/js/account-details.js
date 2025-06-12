document.addEventListener('DOMContentLoaded', async () => {
    console.log('[ACCDETAILS_DEBUG] DOMContentLoaded triggered.');

    // Declare variables at a higher scope
    let profileDataContainer;
    let profileLoadingIndicator;
    let companySettingsSection;
    let fullNameElement;
    let emailAddressElement;
    let phoneNumberElement;
    let languageDisplayElement;
    let editProfileModalElement;
    let editProfileForm;
    let modalFirstNameElement;
    let modalLastNameElement;
    let modalEmailAddressElement;
    let modalPhoneNumberElement;
    let modalLanguageSelectorElement;
    let saveProfileChangesButton;
    let editProfileButton;
    let editProfileMessageElement;
    let companySettingsForm;
    let saveCompanySettingsButton;
    let companyLogoInput;
    let logoPreview;
    let companySettingsMessage;
    let profileImageUploadElement;
    let profileImagePreviewModalElement;
    let currentProfileImageElement;
    let defaultProfileIconElement;

    // Assign loading state elements early
    profileDataContainer = document.getElementById('profileDataContainer');
    profileLoadingIndicator = document.getElementById('profileLoadingIndicator');
    companySettingsSection = document.getElementById('companySettingsSection');

    async function checkAdminStatusAndApplyUI() {
        try {
            if (!window._supabase) {
                console.error('[ACCDETAILS_DEBUG] Supabase client not available. Hiding company settings.');
                if (companySettingsSection) companySettingsSection.style.display = 'none';
                return;
            }

            const { data: { user }, error: userError } = await window._supabase.auth.getUser();

            if (userError || !user) {
                console.error('[ACCDETAILS_DEBUG] Error fetching user or no user logged in. Hiding company settings.', userError);
                if (companySettingsSection) companySettingsSection.style.display = 'none';
                return;
            }

            console.log('[ACCDETAILS_DEBUG] User found:', user.id);
            const { data: profile, error: profileError } = await window._supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('[ACCDETAILS_DEBUG] Error fetching profile. Hiding company settings.', profileError);
                if (companySettingsSection) companySettingsSection.style.display = 'none';
                return;
            }

            if (profile && profile.is_admin === true) {
                console.log('[ACCDETAILS_DEBUG] User is admin. Company settings visible.');
                if (companySettingsSection) companySettingsSection.style.display = 'block'; // Or remove 'none'
            } else if (profile && profile.is_admin === false) {
                console.log('[ACCDETAILS_DEBUG] User is not admin. Hiding company settings.');
                if (companySettingsSection) companySettingsSection.style.display = 'none';
            } else {
                console.log('[ACCDETAILS_DEBUG] Admin status unclear (profile missing or is_admin not set). Hiding company settings.');
                if (companySettingsSection) companySettingsSection.style.display = 'none';
            }
        } catch (error) {
            console.error('[ACCDETAILS_DEBUG] Exception in checkAdminStatusAndApplyUI. Hiding company settings.', error);
            if (companySettingsSection) companySettingsSection.style.display = 'none';
        }
    }

    try {
        // Assign elements within the try block or before first use
        profileDataContainer = document.getElementById('profileDataContainer');
        profileLoadingIndicator = document.getElementById('profileLoadingIndicator');
        companySettingsSection = document.getElementById('companySettingsSection');

        if (profileDataContainer && profileLoadingIndicator) {
            profileDataContainer.style.display = 'none';
            profileLoadingIndicator.classList.add('visible');
        } else {
            console.error('Profile data container or loading indicator not found.');
        }

        await checkAdminStatusAndApplyUI();

        // Main page elements
        fullNameElement = document.getElementById('fullName');
        emailAddressElement = document.getElementById('emailAddress');
        phoneNumberElement = document.getElementById('phoneNumber');
        languageDisplayElement = document.getElementById('languageDisplay');

        // Modal elements
        editProfileModalElement = document.getElementById('editProfileModal');
        editProfileForm = document.getElementById('editProfileForm');
        modalFirstNameElement = document.getElementById('modalFirstName');
        modalLastNameElement = document.getElementById('modalLastName');
        modalEmailAddressElement = document.getElementById('modalEmailAddress');
        modalPhoneNumberElement = document.getElementById('modalPhoneNumber');
        modalLanguageSelectorElement = document.getElementById('modalLanguageSelector');
        saveProfileChangesButton = document.getElementById('saveProfileChanges');
        editProfileButton = document.getElementById('editProfileButton');
        editProfileMessageElement = document.getElementById('editProfileMessage');

        // Company Settings Form Elements
        companySettingsForm = document.getElementById('companySettingsForm');
        saveCompanySettingsButton = document.getElementById('saveCompanySettingsButton');
        companyLogoInput = document.getElementById('companyLogo');
        logoPreview = document.getElementById('logoPreview');
        companySettingsMessage = document.getElementById('companySettingsMessage');
        profileImageUploadElement = document.getElementById('profileImageUpload');
        profileImagePreviewModalElement = document.getElementById('profileImagePreviewModal');
        currentProfileImageElement = document.getElementById('currentProfileImage');
        defaultProfileIconElement = document.getElementById('defaultProfileIcon');


    if (!fullNameElement || !emailAddressElement || !phoneNumberElement || !languageDisplayElement ||
        !editProfileModalElement || !editProfileForm || !modalFirstNameElement || !modalLastNameElement ||
        !modalEmailAddressElement || !modalPhoneNumberElement || !modalLanguageSelectorElement ||
        !saveProfileChangesButton || !editProfileButton || !editProfileMessageElement ||
        !companySettingsForm || !saveCompanySettingsButton || !companyLogoInput || !logoPreview || !companySettingsMessage ||
        !profileImageUploadElement || !profileImagePreviewModalElement || !currentProfileImageElement || !defaultProfileIconElement) {
        console.error('One or more critical elements not found in account.html. Page functionality will be limited.');
        // Hide loading indicator and show data container (even if empty/error)
        if (profileDataContainer && profileLoadingIndicator) {
            profileLoadingIndicator.classList.remove('visible');
            profileDataContainer.style.display = 'block';
        }
        // Depending on which elements are missing, you might not want to return immediately,
        // as some parts of the page (like profile display) might still work.
        // For now, we log the error and continue, as event listeners below have their own null checks.
    }

    window.loadAndDisplayAccountDetails = async function() {
        if (!window._supabase) {
            console.error('Supabase client is not available.');
            if(fullNameElement) fullNameElement.value = 'Error: Supabase client not found';
            if(emailAddressElement) emailAddressElement.value = 'Error: Supabase client not found';
            if(phoneNumberElement) phoneNumberElement.value = 'Error: Supabase client not found';
            if(languageDisplayElement) languageDisplayElement.value = 'Error: Supabase client not found';
            return;
        }

        try {
            const { data: { user }, error: userError } = await window._supabase.auth.getUser();

            if (userError) {
                console.error('Error fetching user:', userError);
                if(fullNameElement) fullNameElement.value = 'Error fetching user';
                if(emailAddressElement) emailAddressElement.value = 'Error fetching user';
                if(phoneNumberElement) phoneNumberElement.value = 'Error fetching user';
                if(languageDisplayElement) languageDisplayElement.value = 'Error fetching user';
                return;
            }

            if (!user) {
                console.log('No user logged in.');
                if(fullNameElement) fullNameElement.value = 'N/A';
                if(emailAddressElement) emailAddressElement.value = 'N/A';
                if(phoneNumberElement) phoneNumberElement.value = 'N/A';
                if(languageDisplayElement) languageDisplayElement.value = 'N/A';
                return;
            }

            const { data: profile, error: profileError } = await window._supabase
                .from('profiles')
                .select('first_name, last_name, email, phone_number, preferred_ui_language, avatar_url')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                if(fullNameElement) fullNameElement.value = 'Error loading profile data';
                if(emailAddressElement) emailAddressElement.value = 'Error loading profile data';
                if(phoneNumberElement) phoneNumberElement.value = 'Error loading profile data';
                if(languageDisplayElement) languageDisplayElement.value = 'Error loading profile data';
                if(currentProfileImageElement) currentProfileImageElement.style.display = 'none';
                if(defaultProfileIconElement) defaultProfileIconElement.style.display = 'block';
                return;
            }

            if (profile) {
                // Display avatar or default icon
                if (profile.avatar_url) {
                    if(currentProfileImageElement) {
                        currentProfileImageElement.src = profile.avatar_url;
                        currentProfileImageElement.style.display = 'block';
                    }
                    if(defaultProfileIconElement) defaultProfileIconElement.style.display = 'none';
                } else {
                    if(currentProfileImageElement) currentProfileImageElement.style.display = 'none';
                    if(defaultProfileIconElement) defaultProfileIconElement.style.display = 'block';
                }

                const firstName = profile.first_name || '';
                const lastName = profile.last_name || '';
                if(fullNameElement) fullNameElement.value = `${firstName} ${lastName}`.trim() || 'Name not set';
                if(emailAddressElement) emailAddressElement.value = profile.email || 'Email not set';

                if (phoneNumberElement) {
                    if (profile.phone_number && profile.phone_number.trim() !== '') {
                        phoneNumberElement.value = profile.phone_number;
                    } else {
                        phoneNumberElement.value = 'Not provided';
                    }
                }


                if (languageDisplayElement) {
                    if (profile.preferred_ui_language) {
                        let langFullName = 'Unknown';
                        if (profile.preferred_ui_language === 'en') {
                            langFullName = 'English';
                        } else if (profile.preferred_ui_language === 'de') {
                            langFullName = 'German';
                        } else {
                            langFullName = profile.preferred_ui_language;
                        }
                        languageDisplayElement.value = langFullName;
                    } else {
                        languageDisplayElement.value = 'Not set';
                    }
                }
            } else {
                console.log('No profile found for the user.');
                if(fullNameElement) fullNameElement.value = 'Profile not found';
                if(emailAddressElement) emailAddressElement.value = 'Profile not found';
                if(phoneNumberElement) phoneNumberElement.value = 'Profile not found';
                if(languageDisplayElement) languageDisplayElement.value = 'Profile not found';
                if(currentProfileImageElement) currentProfileImageElement.style.display = 'none';
                if(defaultProfileIconElement) defaultProfileIconElement.style.display = 'block';
            }
        } catch (error) {
            console.error('An unexpected error occurred in loadAndDisplayAccountDetails:', error);
            if(fullNameElement) fullNameElement.value = 'Failed to load profile';
            if(emailAddressElement) emailAddressElement.value = 'Failed to load profile';
            if(phoneNumberElement) phoneNumberElement.value = 'Failed to load profile';
            if(languageDisplayElement) languageDisplayElement.value = 'Failed to load profile';
            if(currentProfileImageElement) currentProfileImageElement.style.display = 'none';
            if(defaultProfileIconElement) defaultProfileIconElement.style.display = 'block';
        } finally {
            if (profileDataContainer && profileLoadingIndicator) {
                profileLoadingIndicator.classList.remove('visible');
                profileDataContainer.style.display = 'block';
            }
        }
    };

    // Function to load and display company settings
    async function loadCompanySettings() {
        // Admin check is now handled by checkAdminStatusAndApplyUI,
        // so this function should only proceed if the section is visible.
        if (companySettingsSection && companySettingsSection.style.display === 'none') {
            console.log('[ACCDETAILS_DEBUG] Company settings section is hidden. Skipping loadCompanySettings.');
            return;
        }

        if (!window._supabase) {
            console.error('Supabase client is not available for company settings.');
            if (companySettingsMessage) {
                companySettingsMessage.textContent = 'Error: Supabase client not found.';
                companySettingsMessage.className = 'alert alert-danger';
            }
            return;
        }

        try {
            const { data: { user }, error: userError } = await window._supabase.auth.getUser();

            if (userError) {
                console.error('Error fetching user for company settings:', userError);
                if (companySettingsMessage) {
                    companySettingsMessage.textContent = 'Error fetching user information.';
                    companySettingsMessage.className = 'alert alert-danger';
                }
                return;
            }

            if (!user) {
                console.log('No user logged in, cannot load company settings.');
                if (companySettingsMessage) {
                    companySettingsMessage.textContent = 'Please log in to view company settings.';
                    companySettingsMessage.className = 'alert alert-info';
                }
                // Optionally disable form fields here
                return;
            }
            console.log('[CompanySettings] User ID for query:', user.id);

            const { data: company, error: companyError } = await window._supabase
                .from('companies')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            console.log('[CompanySettings] Fetched company data:', company);
            // Log error only if it's a real error, not just "no rows found"
            if (companyError && companyError.code !== 'PGRST116') {
              console.error('[CompanySettings] Error fetching company data:', companyError);
            }


            if (companyError && companyError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error for us here
                console.error('[CompanySettings] Error fetching company settings (reported to user):', companyError); // Log specifically for user-reported error
                if (companySettingsMessage) {
                    companySettingsMessage.textContent = `Error loading company data: ${companyError.message}`;
                    companySettingsMessage.className = 'alert alert-danger';
                }
                return;
            }

            if (company) {
                // Get references to form elements - these are now top-level variables
                const companyNameInput = document.getElementById('companyName'); // Keep local getElementById for population, or use top-level
                const companyAddressStreetInput = document.getElementById('companyAddressStreet');
                const companyCityInput = document.getElementById('companyCity');
                const companyStateInput = document.getElementById('companyState');
                const companyPostCodeInput = document.getElementById('companyPostCode');
                const companyEmailInput = document.getElementById('companyEmail');
                const companyPhoneInput = document.getElementById('companyPhone');
                const companyWebsiteInput = document.getElementById('companyWebsite');
                const companyTaxIdInput = document.getElementById('companyTaxId');
                // logoPreview is already a top-level variable

                // Populate form fields
                if (companyNameInput) {
                    const companyNameValue = company.company_name;
                    console.log(`[CompanySettings] Attempting to set companyName with: '${companyNameValue}'`);
                    companyNameInput.value = companyNameValue || '';
                }
                if (companyAddressStreetInput) {
                    const companyAddressStreetValue = company.company_address_street;
                    console.log(`[CompanySettings] Attempting to set companyAddressStreet with: '${companyAddressStreetValue}'`);
                    companyAddressStreetInput.value = companyAddressStreetValue || '';
                }
                if (companyCityInput) {
                    const companyCityValue = company.company_address_city;
                    console.log(`[CompanySettings] Attempting to set companyCity with: '${companyCityValue}'`);
                    companyCityInput.value = companyCityValue || '';
                }
                if (companyStateInput) {
                    const companyStateValue = company.company_address_state;
                    console.log(`[CompanySettings] Attempting to set companyState with: '${companyStateValue}'`);
                    companyStateInput.value = companyStateValue || '';
                }
                if (companyPostCodeInput) {
                    const companyPostCodeValue = company.company_address_zip;
                    console.log(`[CompanySettings] Attempting to set companyPostCode with: '${companyPostCodeValue}'`);
                    companyPostCodeInput.value = companyPostCodeValue || '';
                }
                if (companyEmailInput) {
                    const companyEmailValue = company.company_email;
                    console.log(`[CompanySettings] Attempting to set companyEmail with: '${companyEmailValue}'`);
                    companyEmailInput.value = companyEmailValue || '';
                }
                if (companyPhoneInput) {
                    const companyPhoneValue = company.company_phone;
                    console.log(`[CompanySettings] Attempting to set companyPhone with: '${companyPhoneValue}'`);
                    companyPhoneInput.value = companyPhoneValue || '';
                }
                if (companyWebsiteInput) {
                    const companyWebsiteValue = company.company_website;
                    console.log(`[CompanySettings] Attempting to set companyWebsite with: '${companyWebsiteValue}'`);
                    companyWebsiteInput.value = companyWebsiteValue || '';
                }
                if (companyTaxIdInput) {
                    const companyTaxIdValue = company.company_tax_id;
                    console.log(`[CompanySettings] Attempting to set companyTaxId with: '${companyTaxIdValue}'`);
                    companyTaxIdInput.value = companyTaxIdValue || '';
                }

                // Handle logo preview (logoPreview is top-level)
                if (logoPreview) {
                    const logoUrl = company.company_logo_url;
                    console.log(`[CompanySettings] Attempting to set logoPreview with src: '${logoUrl}'`);
                    if (logoUrl) {
                        logoPreview.src = logoUrl;
                        logoPreview.style.display = 'block';
                    } else {
                        logoPreview.style.display = 'none';
                        logoPreview.src = '#'; // Clear src
                    }
                }
                if (companySettingsMessage) {
                     console.log('[CompanySettings] Company information loaded successfully.');
                     companySettingsMessage.textContent = 'Company information loaded.'; // Optional success message
                     companySettingsMessage.className = 'alert alert-success';
                     setTimeout(() => { if(companySettingsMessage) {companySettingsMessage.textContent = ''; companySettingsMessage.className='';}}, 3000);
                }

            } else {
                console.log('No company information set up yet for this user.');
                if (companySettingsMessage) {
                    companySettingsMessage.textContent = 'No company information has been set up yet.';
                    companySettingsMessage.className = 'alert alert-info';
                }
                // Clear form fields if no company data is found
                if(companySettingsForm) {
                    console.log('[CompanySettings] Resetting companySettingsForm.');
                    companySettingsForm.reset();
                }
                if (logoPreview) {
                    console.log('[CompanySettings] Hiding logoPreview as no company data/logo found.');
                    logoPreview.style.display = 'none';
                    logoPreview.src = '#';
                }
            }
        } catch (error) {
            console.error('[CompanySettings] An unexpected error occurred in loadCompanySettings:', error);
            if (companySettingsMessage) {
                companySettingsMessage.textContent = 'Failed to load company settings due to an unexpected error.';
                companySettingsMessage.className = 'alert alert-danger';
            }
        }
    }

    // Initial data loading calls
    await window.loadAndDisplayAccountDetails();
    await loadCompanySettings();

    } catch (error) {
        console.error('[ACCDETAILS_DEBUG] Critical error during initial page setup:', error);
        if (profileDataContainer && profileLoadingIndicator) {
            profileLoadingIndicator.classList.remove('visible');
            profileDataContainer.style.display = 'block'; // Show container, error messages might be inside
        }
        // Display a user-friendly message on the page if appropriate elements exist
        const generalErrorElement = document.getElementById('generalPageError'); // Assuming such an element exists
        if (generalErrorElement) {
            generalErrorElement.textContent = 'An error occurred while loading the page. Please try again later.';
            generalErrorElement.style.display = 'block';
        }
    }
    // Event listeners are now set up outside the main try...catch,
    // using the hoisted variables. Null checks are important here.

    if (companyLogoInput && logoPreview) {
        companyLogoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
            // If no file is selected, the preview remains as is or shows the previously loaded server logo.
            // Clearing it here might be confusing if the user decides not to change the logo after all.
        });
    }

    if (companySettingsForm && saveCompanySettingsButton) {
        saveCompanySettingsButton.addEventListener('click', async (event) => {
            event.preventDefault();
            saveCompanySettingsButton.disabled = true;
            if(companySettingsMessage) {
                companySettingsMessage.textContent = '';
                companySettingsMessage.className = '';
            }

            const { data: { user }, error: authError } = await window._supabase.auth.getUser();
            if (authError || !user) {
                if(companySettingsMessage) {
                    companySettingsMessage.textContent = 'User not authenticated. Please log in again.';
                    companySettingsMessage.className = 'alert alert-danger';
                }
                saveCompanySettingsButton.disabled = false;
                return;
            }

            const companyName = document.getElementById('companyName')?.value.trim();
            const companyAddressStreet = document.getElementById('companyAddressStreet')?.value.trim();
            const companyCity = document.getElementById('companyCity')?.value.trim();
            const companyState = document.getElementById('companyState')?.value.trim();
            const companyPostCode = document.getElementById('companyPostCode')?.value.trim();
            const companyEmail = document.getElementById('companyEmail')?.value.trim();
            const companyPhone = document.getElementById('companyPhone')?.value.trim();
            const companyWebsite = document.getElementById('companyWebsite')?.value.trim();
            const companyTaxId = document.getElementById('companyTaxId')?.value.trim();

            if (!companyName || !companyAddressStreet || !companyCity || !companyState || !companyPostCode || !companyEmail) {
                if(companySettingsMessage) {
                    companySettingsMessage.textContent = 'Please fill in all required fields: Company Name, Street, City, State, Post Code, and Email.';
                    companySettingsMessage.className = 'alert alert-danger';
                }
                saveCompanySettingsButton.disabled = false;
                return;
            }
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(companyEmail)) {
                if(companySettingsMessage) {
                    companySettingsMessage.textContent = 'Please enter a valid email address.';
                    companySettingsMessage.className = 'alert alert-danger';
                }
                saveCompanySettingsButton.disabled = false;
                return;
            }

            let currentLogoUrl = null;
            if (logoPreview && logoPreview.src && !logoPreview.src.startsWith('data:') && logoPreview.src !== window.location.href + '#' /* check if it's not placeholder */) {
                 // Check if src is not a data URL (new upload preview) and not just '#'
                if (logoPreview.style.display !== 'none') { // and it's visible
                    currentLogoUrl = logoPreview.src;
                }
            }

            let companyLogoUrlToSave = currentLogoUrl; // Assume existing logo by default if any
            const logoFile = companyLogoInput.files[0];

            if (logoFile) {
                if(companySettingsMessage) {
                    companySettingsMessage.textContent = 'Uploading logo...';
                    companySettingsMessage.className = 'alert alert-info';
                }
                const fileExtension = logoFile.name.split('.').pop();
                const fileName = `user_${user.id}/company_logo_${Date.now()}.${fileExtension}`;

                try {
                    const { data: uploadData, error: uploadError } = await window._supabase.storage
                        .from('agency-logos')
                        .upload(fileName, logoFile, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = window._supabase.storage
                        .from('agency-logos')
                        .getPublicUrl(fileName);

                    companyLogoUrlToSave = publicUrlData.publicUrl;
                    if(companySettingsMessage) companySettingsMessage.textContent = 'Logo uploaded. Saving details...';

                } catch (error) {
                    console.error('Error uploading company logo:', error);
                    if(companySettingsMessage) {
                        companySettingsMessage.textContent = `Error uploading logo: ${error.message}`;
                        companySettingsMessage.className = 'alert alert-danger';
                    }
                    saveCompanySettingsButton.disabled = false;
                    return;
                }
            }

            const companyData = {
                company_name: companyName,
                address_street: companyAddressStreet,
                address_city: companyCity,
                address_state: companyState,
                address_postal_code: companyPostCode,
                email: companyEmail,
                phone_number: companyPhone || null,
                website_url: companyWebsite || null,
                tax_id: companyTaxId || null,
                company_logo_url: companyLogoUrlToSave
            };

            if(companySettingsMessage) {
                companySettingsMessage.textContent = 'Saving company details...';
                companySettingsMessage.className = 'alert alert-info';
            }

            try {
                const { data: functionResponse, error: functionError } = await window._supabase.functions.invoke('save-company-details', {
                    body: JSON.stringify(companyData)
                });

                if (functionError) throw functionError;
                if (functionResponse && functionResponse.error) throw new Error(functionResponse.error);

                if(companySettingsMessage) {
                    companySettingsMessage.textContent = 'Company settings saved successfully!';
                    companySettingsMessage.className = 'alert alert-success';
                }
                await loadCompanySettings();
            } catch (error) {
                console.error('Error saving company settings:', error);
                if(companySettingsMessage) {
                    companySettingsMessage.textContent = `Error saving settings: ${error.message || 'Unknown error'}`;
                    companySettingsMessage.className = 'alert alert-danger';
                }
            } finally {
                saveCompanySettingsButton.disabled = false;
                if(companySettingsMessage){
                    setTimeout(() => {
                        companySettingsMessage.textContent = '';
                        companySettingsMessage.className = '';
                    }, 5000);
                }
            }
        });
    }

    // Populate Modal on Show Event
    if (editProfileModalElement && editProfileButton) {
        // const modalInstance = new bootstrap.Modal(editProfileModalElement); // Not strictly needed if only using button's data-bs-toggle

        editProfileButton.addEventListener('click', async () => {
            editProfileMessageElement.style.display = 'none'; // Clear previous messages
            try {
                const { data: { user } , error: userErr } = await window._supabase.auth.getUser();
                if (userErr || !user) {
                    editProfileMessageElement.textContent = 'User not logged in or session expired.';
                    editProfileMessageElement.className = 'alert alert-danger';
                    editProfileMessageElement.style.display = 'block';
                    console.error('Error fetching user for modal:', userErr);
                    // Consider not opening the modal or disabling save button if this happens
                    // For now, we allow modal to open but fields might be empty or save will fail
                    return;
                }

                const { data: profile, error: profileErr } = await window._supabase
                    .from('profiles')
                    .select('first_name, last_name, email, phone_number, preferred_ui_language, avatar_url')
                    .eq('id', user.id)
                    .single();

                // Reset profile image upload elements
                if (profileImageUploadElement) profileImageUploadElement.value = null;
                if (profileImagePreviewModalElement) {
                    profileImagePreviewModalElement.src = '#';
                    profileImagePreviewModalElement.style.display = 'none';
                    // Optionally, if you want to show current avatar in modal preview:
                    // if (profile && profile.avatar_url) {
                    //    profileImagePreviewModalElement.src = profile.avatar_url;
                    //    profileImagePreviewModalElement.style.display = 'block';
                    // }
                }

                if (profileErr || !profile) {
                    editProfileMessageElement.textContent = 'Error fetching profile for editing.';
                    editProfileMessageElement.className = 'alert alert-danger';
                    editProfileMessageElement.style.display = 'block';
                    console.error('Error fetching profile for modal:', profileErr);
                     // Populate with whatever is available or defaults
                    modalFirstNameElement.value = '';
                    modalLastNameElement.value = '';
                    modalEmailAddressElement.value = user.email || ''; // Email from auth user as fallback
                    modalPhoneNumberElement.value = '';
                    modalLanguageSelectorElement.value = 'en';
                    return; // Keep modal open but show error.
                }

                // Populate modal fields
                modalFirstNameElement.value = profile.first_name || '';
                modalLastNameElement.value = profile.last_name || '';
                modalEmailAddressElement.value = profile.email || ''; // Should be readonly, but populate anyway
                modalPhoneNumberElement.value = profile.phone_number || '';
                modalLanguageSelectorElement.value = profile.preferred_ui_language || 'en';

            } catch (e) {
                editProfileMessageElement.textContent = 'An unexpected error occurred preparing the form.';
                editProfileMessageElement.className = 'alert alert-danger';
                editProfileMessageElement.style.display = 'block';
                console.error('Error in editProfileButton click listener:', e);
            }
        });
    }

    // Event Listener for Profile Image Upload
    if (profileImageUploadElement && profileImagePreviewModalElement) {
        profileImageUploadElement.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileImagePreviewModalElement.src = e.target.result;
                    profileImagePreviewModalElement.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                // Optionally hide preview if no file is selected
                // profileImagePreviewModalElement.src = '#';
                // profileImagePreviewModalElement.style.display = 'none';
            }
        });
    }

    // Handle Save Changes
    if (saveProfileChangesButton && editProfileForm) {
        saveProfileChangesButton.addEventListener('click', async () => {
            const firstName = modalFirstNameElement.value.trim();
            const lastName = modalLastNameElement.value.trim();
            const phoneNumber = modalPhoneNumberElement.value.trim();
            const preferredLanguage = modalLanguageSelectorElement.value;

            if (!firstName || !lastName) {
                editProfileMessageElement.textContent = 'First Name and Last Name are required.';
                editProfileMessageElement.className = 'alert alert-danger';
                editProfileMessageElement.style.display = 'block';
                return;
            }

            try {
                const { data: { user }, error: getUserError } = await window._supabase.auth.getUser();
                if (getUserError || !user) {
                    editProfileMessageElement.textContent = 'User session expired. Please log in again.';
                    editProfileMessageElement.className = 'alert alert-danger';
                    editProfileMessageElement.style.display = 'block';
                    return;
                }

                let newAvatarUrl = null;
                let oldAvatarUrlToDelete = null;
                const imageFile = profileImageUploadElement ? profileImageUploadElement.files[0] : null;

                // Before uploading, get current avatar_url if a new file is selected
                if (imageFile) {
                    const { data: currentProfileData, error: currentProfileError } = await window._supabase
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', user.id)
                        .single();
                    if (currentProfileError) {
                        console.warn('Could not fetch current avatar_url before upload:', currentProfileError.message);
                    } else if (currentProfileData && currentProfileData.avatar_url) {
                        oldAvatarUrlToDelete = currentProfileData.avatar_url;
                    }

                    if(editProfileMessageElement) {
                        editProfileMessageElement.textContent = 'Uploading profile image...';
                        editProfileMessageElement.className = 'alert alert-info';
                        editProfileMessageElement.style.display = 'block';
                    }

                    const fileExtension = imageFile.name.split('.').pop();
                    const fileName = `user_${user.id}/profile_image_${Date.now()}.${fileExtension}`;

                    try {
                        const { data: uploadData, error: uploadError } = await window._supabase.storage
                            .from('profile-images')
                            .upload(fileName, imageFile, {
                                cacheControl: '3600',
                                upsert: true
                            });

                        if (uploadError) {
                            console.error('Error uploading profile image:', uploadError);
                            if(editProfileMessageElement) {
                               editProfileMessageElement.textContent = `Error uploading image: ${uploadError.message}`;
                               editProfileMessageElement.className = 'alert alert-danger';
                            }
                            // Do not return yet, let user decide if they want to save other data or try again
                        } else {
                            const { data: publicUrlData } = window._supabase.storage
                                .from('profile-images')
                                .getPublicUrl(fileName);
                            newAvatarUrl = publicUrlData.publicUrl;
                            if(editProfileMessageElement) {
                               editProfileMessageElement.textContent = 'Image uploaded. Saving profile...';
                               // ClassName will be updated by subsequent profile save messages
                            }
                        }
                    } catch (storageError) {
                        console.error('Supabase storage error:', storageError);
                        if(editProfileMessageElement) {
                           editProfileMessageElement.textContent = `Storage error: ${storageError.message}`;
                           editProfileMessageElement.className = 'alert alert-danger';
                        }
                        // Do not return yet
                    }
                }

                const updates = {
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber || null,
                    preferred_ui_language: preferredLanguage,
                    updated_at: new Date()
                };

                if (newAvatarUrl) {
                    updates.avatar_url = newAvatarUrl;
                }
                // If no new image was uploaded and newAvatarUrl is null,
                // 'avatar_url' is not added to 'updates', so Supabase won't change it.

                const { data: updatedProfile, error: updateError } = await window._supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id)
                    .select('avatar_url') // Select the potentially updated avatar_url
                    .single();

                if (updateError) {
                    console.error('Error updating profile:', updateError);
                    editProfileMessageElement.textContent = `Error updating profile: ${updateError.message}`;
                    editProfileMessageElement.className = 'alert alert-danger';
                    editProfileMessageElement.style.display = 'block';
                } else {
                    editProfileMessageElement.textContent = 'Profile updated successfully!';
                    editProfileMessageElement.className = 'alert alert-success';
                    editProfileMessageElement.style.display = 'block';

                    // Attempt to delete old avatar AFTER profile update is successful
                    if (oldAvatarUrlToDelete && newAvatarUrl && oldAvatarUrlToDelete !== newAvatarUrl) {
                        try {
                            // Extract file path from URL. Example: .../profile-images/user_userid/image.png
                            // The path for Supabase storage remove is 'user_userid/image.png'
                            const oldFilePath = oldAvatarUrlToDelete.substring(oldAvatarUrlToDelete.indexOf(`user_${user.id}/`));
                            if (oldFilePath) {
                                console.log(`Attempting to delete old profile image: ${oldFilePath}`);
                                const { error: deleteError } = await window._supabase.storage
                                    .from('profile-images')
                                    .remove([oldFilePath]);
                                if (deleteError) {
                                    console.warn('Failed to delete old profile image:', deleteError.message);
                                    // Do not block success message for this, just log it
                                } else {
                                    console.log('Old profile image deleted successfully.');
                                }
                            }
                        } catch (deleteException) {
                            console.warn('Exception while trying to delete old profile image:', deleteException.message);
                        }
                    }

                    // Consider calling loadAndDisplayAccountDetails if not reloading
                    window.location.reload(); // Reloads to show changes including avatar

                    // The following might not be reached if reload is too fast,
                    // but good for cases where reload is removed or conditional.
                    if (window.loadAndDisplayAccountDetails) {
                        await window.loadAndDisplayAccountDetails();
                    }

                    setTimeout(() => {
                        const modalInstance = bootstrap.Modal.getInstance(editProfileModalElement);
                        if (modalInstance) {
                           modalInstance.hide();
                        }
                        if (editProfileMessageElement) editProfileMessageElement.style.display = 'none';
                    }, 1500);
                }
            } catch (e) {
                console.error('Error saving profile changes:', e);
                if(editProfileMessageElement) {
                    editProfileMessageElement.textContent = 'An unexpected error occurred while saving.';
                    editProfileMessageElement.className = 'alert alert-danger';
                    editProfileMessageElement.style.display = 'block';
                }
            }
        });
    }
});
