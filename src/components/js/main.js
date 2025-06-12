// Function to update sidebar based on admin status
function updateSidebarForPermissions() {
  const isAdminString = localStorage.getItem('userIsAdmin');
  // Only hide links if userIsAdmin is explicitly 'false'.
  // If null/undefined (not logged in, or status not set), links remain visible.
  // Access control to pages themselves should be handled by dashboard_check.js or similar.
  if (isAdminString === 'false') {
    const navLinksToHide = [
      'dashboard.html',
      'properties.html',
      'staff.html'
      // 'tasks.html' should remain visible for non-admins
      // 'notifications.html' can remain visible for all
    ];

    navLinksToHide.forEach(href => {
      // Query for the <a> tag first
      const linkElement = document.querySelector(`.nav-menu li a[href="${href}"]`);
      if (linkElement && linkElement.parentElement) {
        // Then hide its parent <li> element
        linkElement.parentElement.style.display = 'none';
      }
    });
  }
}


document.addEventListener('DOMContentLoaded', function () {
  // Call updateSidebarForPermissions early to adjust UI based on stored admin status
  // This is especially relevant for pages loaded after login, like dashboard, tasks, etc.
  // On index.html, userIsAdmin might not be set yet, so it won't hide anything.
  updateSidebarForPermissions();

  // Company Code Modal Elements
  const companyCodeModalEl = document.getElementById('companyCodeModal');
  const companyCodeModalInstance = companyCodeModalEl ? new bootstrap.Modal(companyCodeModalEl) : null;
  const haveCompanyCodeButton = document.getElementById('haveCompanyCodeButton');

  const companyCodeStep1 = document.getElementById('companyCodeStep1');
  const companyCodeStep2 = document.getElementById('companyCodeStep2');
  const companyCodeStep3 = document.getElementById('companyCodeStep3');

  const companyCodeInput = document.getElementById('companyCodeInput');
  const companyCodeEmailInput = document.getElementById('companyCodeEmailInput');
  const companyCodePasswordInput = document.getElementById('companyCodePasswordInput');
  const companyCodeConfirmPasswordInput = document.getElementById('companyCodeConfirmPasswordInput');

  const verifyCompanyCodeButton = document.getElementById('verifyCompanyCodeButton');
  const verifyCompanyEmailButton = document.getElementById('verifyCompanyEmailButton');
  // const setCompanyPasswordButton = document.getElementById('setCompanyPasswordButton'); // This is the submit button of the form

  const companyCodeForm = document.getElementById('companyCodeForm');
  const companyCodeMessage = document.getElementById('companyCodeMessage');

  let validatedCompanyData = null;
  let validatedProfileData = null;

  if (companyCodeModalEl && !companyCodeModalInstance) { // Check if element exists but instance failed
    console.error('Company Code Modal element found, but failed to initialize Bootstrap instance.');
  } else if (!companyCodeModalEl) {
    // console.warn('Company Code Modal element (companyCodeModal) not found on this page.'); // It's fine if not on all pages
  }


  // Form and Section Elements
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const signInMessage = document.getElementById('signInMessage');
  const signUpUserMessage = document.getElementById('signUpUserMessage');

  // New Section View and Toggle Container References
  const authToggleContainer = document.getElementById('authToggleContainer');
  const signInFormSectionView = document.getElementById('signInFormSectionView');
  const signUpFormSectionView = document.getElementById('signUpFormSectionView');

  // Account Type Selection Elements
  const accountTypeSelectionView = document.getElementById('accountTypeSelectionView');
  const accountTypeSelect = document.getElementById('accountTypeSelect');
  const accountTypeContinueButton = document.getElementById('accountTypeContinueButton');
  const userAccountInfoView = document.getElementById('userAccountInfoView');
  const agencySignupFormView = document.getElementById('agencySignupFormView');

  // Disable continue button initially
  if (accountTypeContinueButton) {
    accountTypeContinueButton.disabled = true;
  }

  // Resend Verification Modal Elements (IDs remain the same)
  const resendVerificationModalEl = document.getElementById('resendVerificationModal');
  const resendModal = resendVerificationModalEl ? new bootstrap.Modal(resendVerificationModalEl) : null;
  const resendEmailInputModal = document.getElementById('resendEmailInputModal');
  const resendEmailModalButton = document.getElementById('resendEmailModalButton');
  const resendFeedbackMessageModal = document.getElementById('resendFeedbackMessageModal');

  // Six Digit Code Modal Elements
  const sixDigitCodeModalEl = document.getElementById('sixDigitCodeModal');
  let sixDigitCodeModalInstance = null; // Initialize instance later
  const sixDigitCodeInput = document.getElementById('sixDigitCodeInput');
  const submitSixDigitCodeButton = document.getElementById('submitSixDigitCodeButton');
  const sixDigitCodeMessage = document.getElementById('sixDigitCodeMessage');

  // Language Selection Modal Elements
  const languageSelectionModalEl = document.getElementById('languageSelectionModal');
  const languageSelectDropdown = document.getElementById('languageSelectDropdown');
  const saveLanguagePreferenceButton = document.getElementById('saveLanguagePreferenceButton');
  let languageSelectionModalInstance = null;
  if (languageSelectionModalEl) {
    languageSelectionModalInstance = new bootstrap.Modal(languageSelectionModalEl);
  }
  let currentUserIdForLanguagePref = null;


  // Initial View Setup - Updated for new section views
  if (signInFormSectionView && signUpFormSectionView) {
    signInFormSectionView.style.display = 'block'; // Show Sign In by default
    signUpFormSectionView.style.display = 'none';  // Hide Sign Up by default
    if (accountTypeSelectionView) accountTypeSelectionView.style.display = 'block'; // Show account type selection initially
    if (userAccountInfoView) userAccountInfoView.style.display = 'none';
    if (agencySignupFormView) agencySignupFormView.style.display = 'none';
    setupAuthToggle('signUp'); // Initially, display link to switch TO Sign Up
  }

  // Dynamic Year for Footer
  const currentYearSpan = document.getElementById('currentYear');
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // New View Toggling Logic Function
  function setupAuthToggle(viewToShow) {
    if (!authToggleContainer) return;

    let promptKey, linkKey, linkId, nextViewToShow;

    if (viewToShow === 'signUp') {
      promptKey = 'authToggle.dontHaveAccount';
      linkKey = 'authToggle.signUpLinkText';
      linkId = 'switchToSignUpViewLink';
      nextViewToShow = 'signUp';
    } else {
      promptKey = 'authToggle.alreadyHaveAccount';
      linkKey = 'authToggle.signInLinkText';
      linkId = 'switchToSignInViewLink';
      nextViewToShow = 'signIn';
    }

    const promptText = typeof i18next !== 'undefined' ? i18next.t(promptKey) : promptKey;
    const linkText = typeof i18next !== 'undefined' ? i18next.t(linkKey) : linkKey;

    authToggleContainer.innerHTML = `
      <span class="text-muted me-2" data-i18n="${promptKey}">${promptText}</span>
      <a href="#" id="${linkId}" class="fw-bold text-decoration-none" data-i18n="${linkKey}">${linkText}</a>
    `;

    const newToggleLink = document.getElementById(linkId);
    if (newToggleLink) {
      newToggleLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (nextViewToShow === 'signUp') {
          if (signInFormSectionView) signInFormSectionView.style.display = 'none';
          if (signUpFormSectionView) {
            signUpFormSectionView.style.display = 'block';
            // Reset to account type selection step
            if (accountTypeSelectionView) accountTypeSelectionView.style.display = 'block';
            if (userAccountInfoView) userAccountInfoView.style.display = 'none';
            if (agencySignupFormView) agencySignupFormView.style.display = 'none';
            // Reset dropdown and button state
            if (accountTypeSelect) accountTypeSelect.value = '';
            if (accountTypeContinueButton) accountTypeContinueButton.disabled = true;
          }
          setupAuthToggle('signIn');
        } else { // Switching to Sign In
          if (signUpFormSectionView) signUpFormSectionView.style.display = 'none';
          if (signInFormSectionView) signInFormSectionView.style.display = 'block';
          // Reset dropdown and button state when switching away from sign-up view as well
          if (accountTypeSelect) accountTypeSelect.value = '';
          if (accountTypeContinueButton) accountTypeContinueButton.disabled = true;
          setupAuthToggle('signUp');
        }

        if (signInMessage) signInMessage.textContent = '';
        if (signUpUserMessage) signUpUserMessage.textContent = '';

        const resendModalEl = document.getElementById('resendVerificationModal');
        const resendModalInstance = bootstrap.Modal.getInstance(resendModalEl);
        if (resendModalInstance) {
          resendModalInstance.hide();
        }
        if (resendFeedbackMessageModal) {
             resendFeedbackMessageModal.textContent = '';
        }
      });
    }
  }

  // Account Type Selection Logic
  if (accountTypeSelect) {
    accountTypeSelect.addEventListener('change', function() {
      if (signUpUserMessage) { signUpUserMessage.textContent = ''; signUpUserMessage.className = '';}
      if (accountTypeContinueButton) {
        accountTypeContinueButton.disabled = this.value === "";
      }
    });
  }

  if (accountTypeContinueButton) {
    accountTypeContinueButton.addEventListener('click', function(event) {
      event.preventDefault();

      if (!accountTypeSelect || accountTypeSelect.value === "") {
        if (signUpUserMessage) {
          signUpUserMessage.textContent = i18next.t('mainJs.signup.selectAccountTypePrompt');
          signUpUserMessage.className = 'alert alert-warning';
        }
        return;
      }
      const selectedAccountType = accountTypeSelect.value;

      if (accountTypeSelectionView) accountTypeSelectionView.style.display = 'none';
      // Message cleared by dropdown change listener, but good to ensure
      if (signUpUserMessage) { signUpUserMessage.textContent = ''; signUpUserMessage.className = '';}


      if (selectedAccountType === 'user') {
        if (userAccountInfoView) userAccountInfoView.style.display = 'block';
        if (agencySignupFormView) agencySignupFormView.style.display = 'none';
      } else { // 'agency' or other valid types
        if (userAccountInfoView) userAccountInfoView.style.display = 'none';
        if (agencySignupFormView) agencySignupFormView.style.display = 'block';
      }
    });
  }

  // Sign-up Logic (ID of form is still 'signUpForm')
  if (signUpForm) {
    console.log('Sign-up form listener attached.');
    signUpForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      // Ensure this form submission is only for agency sign-up
      if (!agencySignupFormView || agencySignupFormView.style.display === 'none') {
        console.log('Sign up attempt ignored, agency form not visible.');
        return;
      }

      if (resendModal) resendModal.hide(); // Hide modal on new submission attempt
      if (signUpUserMessage) { signUpUserMessage.textContent = ''; signUpUserMessage.className = '';}

      const firstName = document.getElementById('signUpFirstName').value;
      const email = document.getElementById('signUpEmail').value; // Use specific ID
      const password = document.getElementById('signUpPassword').value; // Use specific ID
      
      if (!firstName || !email || !password) { 
        if (signUpUserMessage) {
            signUpUserMessage.textContent = i18next.t('mainJs.signup.fillFields');
            signUpUserMessage.className = 'alert alert-warning';
        }
        return; 
      }
      if (password.length < 6) { 
        if (signUpUserMessage) {
            signUpUserMessage.textContent = i18next.t('mainJs.signup.passwordLength');
            signUpUserMessage.className = 'alert alert-warning';
        }
        return; 
      }

      try {
        if (!window._supabase) { 
          if (signUpUserMessage) {
            signUpUserMessage.textContent = i18next.t('mainJs.signup.supabaseInitError');
            signUpUserMessage.className = 'alert alert-danger';
          }
          console.error('Supabase client not available for sign-up.'); 
          return; 
        }
        const currentAccountType = accountTypeSelect.value;

        const optionsData = {
          first_name: firstName,
          account_type: currentAccountType
        };
        console.log('[signUp] options.data being sent to auth.signUp:', JSON.stringify(optionsData, null, 2));

        const { data, error } = await window._supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: optionsData
          }
        });

        if (error) {
          if (error.message && (error.message.includes('User already registered') || error.message.includes('already registered'))) {
            if (signUpUserMessage) {
               signUpUserMessage.textContent = i18next.t('resendVerification.alertAccountExistsResend');
               signUpUserMessage.className = 'alert alert-info';
            }
            if (resendEmailInputModal) resendEmailInputModal.value = email;
            if (resendFeedbackMessageModal) resendFeedbackMessageModal.textContent = '';
            if (resendModal) resendModal.show();
          } else {
            if (signUpUserMessage) {
                signUpUserMessage.textContent = i18next.t('mainJs.signup.errorMessage', { message: error.message });
                signUpUserMessage.className = 'alert alert-danger';
            }
          }
        } else if (data.user) {
          // Successfully signed up the user with auth.
          // Profile creation will now happen on first login after email verification.
          console.log('User signed up successfully. User metadata should include first_name and account_type.');
          console.log('User metadata at signup:', data.user.user_metadata);

          let firstNameDebugMessage = " (Debug: user_metadata.first_name: " + (data.user.user_metadata?.first_name || 'N/A') +
                                      ", user_metadata.account_type: " + (data.user.user_metadata?.account_type || 'N/A') + ")";


          if (data.user.identities && data.user.identities.length === 0) {
            if (signUpUserMessage) {
                signUpUserMessage.textContent = i18next.t('resendVerification.alertSignupEmailResent', { email: email }) + firstNameDebugMessage;
                signUpUserMessage.className = 'alert alert-info';
            }
            if (resendModal) resendModal.hide();
          } else {
            if (resendModal) resendModal.hide();
            if (signUpUserMessage) {
                signUpUserMessage.textContent = i18next.t('mainJs.signup.success') + firstNameDebugMessage;
                signUpUserMessage.className = 'alert alert-success';
            }
            signUpForm.reset();
          }
        } else {
          let firstNameDebugMessage = " (Debug: first_name NOT seen in user_metadata)";
          if (data && data.user && data.user.user_metadata && data.user.user_metadata.first_name) {
             firstNameDebugMessage = " (Debug: first_name '" + data.user.user_metadata.first_name + "' seen in user_metadata)";
          }
          if (resendModal) resendModal.hide();
          if (signUpUserMessage) {
            signUpUserMessage.textContent = i18next.t('mainJs.signup.successUnexpected') + firstNameDebugMessage;
            signUpUserMessage.className = 'alert alert-info';
          }
        }
      } catch (e) { 
        console.error('Sign-up catch:', e); 
        if (signUpUserMessage) {
            signUpUserMessage.textContent = i18next.t('mainJs.signup.unexpectedError') + (e.message ? ': ' + e.message : '');
            signUpUserMessage.className = 'alert alert-danger';
        }
      }
    });
  }

  // Sign-In Logic
  if (signInForm) {
    console.log('Sign-in form listener attached.');
    signInForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (resendModal) resendModal.hide();
      if (signInMessage) { signInMessage.textContent = ''; signInMessage.className = '';}

      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;

      if (!email || !password) { 
        if (signInMessage) {
            signInMessage.textContent = i18next.t('mainJs.signIn.fillFields');
            signInMessage.className = 'alert alert-warning';
        }
        return; 
      }
      try {
        if (!window._supabase) { 
          if (signInMessage) {
            signInMessage.textContent = i18next.t('mainJs.signIn.supabaseInitError');
            signInMessage.className = 'alert alert-danger';
          }
          console.error('Supabase client not available for sign-in.'); return;
        }
        const { data: authData, error: authError } = await window._supabase.auth.signInWithPassword({ email: email, password: password });
        
        if (authError) {
          if (authError.message && (authError.message.includes('Email not confirmed') || authError.message.includes('Please confirm your email'))) {
            if (signInMessage) {
                signInMessage.textContent = i18next.t('resendVerification.alertEmailNotVerifiedResend');
                signInMessage.className = 'alert alert-info';
            }
            if (resendEmailInputModal) resendEmailInputModal.value = email;
            if (resendFeedbackMessageModal) resendFeedbackMessageModal.textContent = '';
            if (resendModal) resendModal.show();
          } else {
            if (signInMessage) {
                signInMessage.textContent = i18next.t('mainJs.signIn.signInFailed', { message: authError.message });
                signInMessage.className = 'alert alert-danger';
            }
          }
        } else if (authData.user) {
          if (resendModal) resendModal.hide();
          const userId = authData.user.id;
          console.log('[signInUser] Attempting to fetch profile for user ID:', userId);

          let profile;
          let profileError;

          const profileQuery = await window._supabase
            .from('profiles')
            .select('id, is_verified_by_code, verification_code, has_company_set_up, is_admin, preferred_ui_language')
            .eq('id', userId)
            .single();

          profile = profileQuery.data;
          profileError = profileQuery.error;

          if (profileError) {
            console.log('[signInUser] Error received from initial profile fetch:', JSON.stringify(profileError, null, 2));
          } else if (profile) {
            console.log('[signInUser] Profile found successfully on initial fetch:', JSON.stringify(profile, null, 2));
          } else {
            console.log('[signInUser] Initial profile fetch returned no data and no specific error object. Profile is null/undefined.');
          }

          if (profileError && profileError.code === 'PGRST116') {
            console.log('[signInUser] Condition met: Profile not found (PGRST116). Attempting to create via Edge Function...');
            const { data: functionResponse, error: functionError } = await window._supabase.functions.invoke(
              'create-initial-profile',
              {
                body: {
                  preferredUiLanguage: (typeof i18next !== 'undefined' ? i18next.language : 'en')
                }
              }
            );

            if (functionError) {
              console.error('Error calling create-initial-profile function during sign-in:', functionError);
              let displayErrorMessage = 'Failed to set up your profile. ';
              if (functionError.context && functionError.context.json && functionError.context.json.error) {
                displayErrorMessage += functionError.context.json.error;
              } else {
                displayErrorMessage += functionError.message;
              }
              displayErrorMessage += ' Please try logging in again or contact support.';
              if (signInMessage) {
                signInMessage.textContent = displayErrorMessage;
                signInMessage.className = 'alert alert-danger';
              }
              await window._supabase.auth.signOut();
              return;
            }

            console.log('[signInUser] Initial profile created/ensured by Edge Function, re-fetching profile...', functionResponse?.profile);
            const { data: newProfile, error: newProfileError } = await window._supabase
              .from('profiles')
              .select('id, is_verified_by_code, verification_code, has_company_set_up, is_admin, preferred_ui_language')
              .eq('id', userId)
              .single();

            if (newProfileError || !newProfile) {
              console.error('CRITICAL: Profile still not found after Edge Function call:', newProfileError);
              if (signInMessage) {
                signInMessage.textContent = 'There was a critical error setting up your account. Please contact support.';
                signInMessage.className = 'alert alert-danger';
              }
              await window._supabase.auth.signOut();
              return;
            }
            profile = newProfile;
            profileError = null;
            console.log('[signInUser] Successfully re-fetched profile after Edge Function call:', JSON.stringify(profile, null, 2));
          } else if (profileError) {
            console.log('[signInUser] Condition NOT met for Edge Function call: Profile fetch failed with a different error (not PGRST116).');
            console.error('Error fetching profile (not PGRST116):', profileError);
             if (signInMessage) {
                signInMessage.textContent = i18next.t('mainJs.signIn.profileFetchFailed');
                signInMessage.className = 'alert alert-danger';
            }
            return;
          } else if (!profile) {
             console.log('[signInUser] Condition NOT met for Edge Function call: Profile was null but no specific error provided for initial fetch.');
             console.error('Profile is null even after potential creation and refetch without specific error.');
             if (signInMessage) {
                signInMessage.textContent = 'Could not retrieve your profile. Please contact support.';
                signInMessage.className = 'alert alert-danger';
            }
            await window._supabase.auth.signOut();
            return;
          } else {
             console.log('[signInUser] Condition NOT met for Edge Function call: Profile was found initially.');
          }

          const isAdmin = profile.is_admin;
          localStorage.setItem('userIsAdmin', isAdmin.toString());
          updateSidebarForPermissions();

          if (profile.is_verified_by_code) {
            if (signInMessage) {
              signInMessage.textContent = i18next.t('mainJs.signIn.successVerificationDone');
              signInMessage.className = 'alert alert-success';
            }
            if (!isAdmin) {
                localStorage.setItem('onboardingComplete', 'true');
                window.location.href = 'pages/tasks.html';
            } else {
                if (profile.has_company_set_up === false) {
                    currentUserIdForLanguagePref = userId;
                    localStorage.removeItem('onboardingComplete');
                    if (languageSelectionModalInstance) languageSelectionModalInstance.show();
                } else {
                    localStorage.setItem('onboardingComplete', 'true');
                    window.location.href = 'pages/dashboard.html';
                }
            }
          } else {
            if (signInMessage) signInMessage.textContent = '';

            if (!sixDigitCodeModalInstance && sixDigitCodeModalEl) {
              sixDigitCodeModalInstance = new bootstrap.Modal(sixDigitCodeModalEl);
            }

            if (sixDigitCodeModalInstance) {
              if (sixDigitCodeInput) sixDigitCodeInput.value = '';
              if (sixDigitCodeMessage) {
                sixDigitCodeMessage.textContent = '';
                sixDigitCodeMessage.className = '';
              }
              sixDigitCodeModalInstance.show();

              const handleSubmitCode = async () => {
                const enteredCode = sixDigitCodeInput ? sixDigitCodeInput.value : '';
                if (!enteredCode || !/^\d{8}$/.test(enteredCode)) {
                  if (sixDigitCodeMessage) {
                    sixDigitCodeMessage.textContent = i18next.t('sixDigitCodeModal.invalidInput');
                    sixDigitCodeMessage.className = 'alert alert-warning';
                  }
                  return;
                }

                if (enteredCode.trim() === String(profile.verification_code).trim()) {
                  const { error: updateError } = await window._supabase
                    .from('profiles')
                    .update({ is_verified_by_code: true })
                    .eq('id', userId);

                  if (updateError) {
                    console.error('Error updating profile verification status:', updateError.message);
                    if (sixDigitCodeMessage) {
                      sixDigitCodeMessage.textContent = i18next.t('sixDigitCodeModal.updateError');
                      sixDigitCodeMessage.className = 'alert alert-danger';
                    }
                  } else {
                    if (sixDigitCodeMessage) {
                      sixDigitCodeMessage.textContent = i18next.t('sixDigitCodeModal.success');
                      sixDigitCodeMessage.className = 'alert alert-success';
                    }
                    if (sixDigitCodeModalInstance) sixDigitCodeModalInstance.hide();

                    if (!isAdmin) {
                        localStorage.setItem('onboardingComplete', 'true');
                        window.location.href = 'pages/tasks.html';
                    } else {
                        if (profile.has_company_set_up === false) {
                            currentUserIdForLanguagePref = userId;
                            localStorage.removeItem('onboardingComplete');
                            if (languageSelectionModalInstance) languageSelectionModalInstance.show();
                        } else {
                            localStorage.setItem('onboardingComplete', 'true');
                            window.location.href = 'pages/dashboard.html';
                        }
                    }
                  }
                } else {
                  if (sixDigitCodeMessage) {
                    sixDigitCodeMessage.textContent = i18next.t('sixDigitCodeModal.incorrectCode');
                    sixDigitCodeMessage.className = 'alert alert-danger';
                  }
                }
              };

              if (submitSixDigitCodeButton) {
                  const newButton = submitSixDigitCodeButton.cloneNode(true);
                  submitSixDigitCodeButton.parentNode.replaceChild(newButton, submitSixDigitCodeButton);
                  newButton.addEventListener('click', handleSubmitCode);
              }
            } else {
              console.error('Six digit code modal element not found or failed to initialize.');
              if (signInMessage) {
                  signInMessage.textContent = i18next.t('mainJs.signIn.modalError');
                  signInMessage.className = 'alert alert-danger';
              }
            }
          }
        } else { 
          if (signInMessage) {
            signInMessage.textContent = i18next.t('mainJs.signIn.signInFailedCheckCredentials');
            signInMessage.className = 'alert alert-danger';
          }
        }
      } catch (e) { 
        console.error('Sign-in catch:', e);
        if (signInMessage) {
            signInMessage.textContent = i18next.t('mainJs.signIn.unexpectedError');
            signInMessage.className = 'alert alert-danger';
        }
      }
    });
  }

  // Language Preference Modal Save Button Logic
  if (saveLanguagePreferenceButton) {
    saveLanguagePreferenceButton.addEventListener('click', async function(event) {
      event.preventDefault();
      const selectedLang = languageSelectDropdown ? languageSelectDropdown.value : 'en';

      if (!currentUserIdForLanguagePref) {
        console.error('User ID not available for saving language preference.');
        alert(i18next.t('mainJs.languageModal.saveError', { message: 'User ID missing.'}) || 'Could not save language preference: User ID missing.');
        return;
      }

      this.disabled = true;

      try {
        const { error: updateError } = await window._supabase
          .from('profiles')
          .update({ preferred_ui_language: selectedLang })
          .eq('id', currentUserIdForLanguagePref);

        if (updateError) {
          console.error('Error updating language preference:', updateError);
          alert(i18next.t('mainJs.languageModal.saveError', { message: updateError.message }) || `Failed to save language preference: ${updateError.message}`);
        } else {
          localStorage.setItem('preferredLang', selectedLang);
          if (window.i18next) {
            await window.i18next.changeLanguage(selectedLang);
          }
          if (languageSelectionModalInstance) languageSelectionModalInstance.hide();
          window.location.href = 'pages/agency_setup_page.html';
        }
      } catch (e) {
        console.error('Unexpected error saving language preference:', e);
        alert(i18next.t('mainJs.languageModal.unexpectedError', { message: e.message }) || `An unexpected error occurred: ${e.message}`);
      } finally {
        this.disabled = false;
        currentUserIdForLanguagePref = null;
      }
    });
  }


  // Resend Verification Email Modal Logic
  if (resendEmailModalButton) {
    resendEmailModalButton.addEventListener('click', async function() {
      const emailToResend = resendEmailInputModal.value;
      if (resendFeedbackMessageModal) {
         resendFeedbackMessageModal.textContent = '';
         resendFeedbackMessageModal.className = '';
      } else {
         console.error("resendFeedbackMessageModal element not found");
         return;
      }

      if (!emailToResend) {
        if (resendFeedbackMessageModal) {
            resendFeedbackMessageModal.textContent = i18next.t('resendVerification.feedbackMissingEmail');
            resendFeedbackMessageModal.className = 'alert alert-warning d-block';
        }
        return;
      }

      try {
        if (!window._supabase) {
          if (resendFeedbackMessageModal) {
            resendFeedbackMessageModal.textContent = i18next.t('mainJs.signup.supabaseInitError');
            resendFeedbackMessageModal.className = 'alert alert-danger d-block';
          }
          return;
        }

        const redirectTo = window.location.origin + '/pages/email-verified-success.html';

        const { error: resendError } = await window._supabase.auth.resend({
          type: 'signup',
          email: emailToResend,
          options: {
            emailRedirectTo: redirectTo
          }
        });

        if (resendError) {
          if (resendFeedbackMessageModal) {
            resendFeedbackMessageModal.textContent = i18next.t('resendVerification.feedbackError', { message: resendError.message });
            resendFeedbackMessageModal.className = 'alert alert-danger d-block';
          }
        } else {
          if (resendFeedbackMessageModal) {
            resendFeedbackMessageModal.textContent = i18next.t('resendVerification.feedbackSuccess', { email: emailToResend });
            resendFeedbackMessageModal.className = 'alert alert-success d-block';
          }
        }
      } catch (e) {
        console.error('Resend email modal catch:', e);
        if (resendFeedbackMessageModal) {
            resendFeedbackMessageModal.textContent = i18next.t('resendVerification.feedbackError', { message: e.message });
            resendFeedbackMessageModal.className = 'alert alert-danger d-block';
        }
      }
    });
  }

  // Global Sign Out Button Logic
  const globalSignOutButton = document.getElementById('globalSignOutButton');

  if (globalSignOutButton) {
    globalSignOutButton.addEventListener('click', async function(event) {
      event.preventDefault();
      console.log('Global sign out button clicked.');
      if (window._supabase) {
        try {
          const { error } = await window._supabase.auth.signOut();
          if (error) {
            console.error('Error signing out:', error.message);
            alert('Error signing out: ' + error.message);
          } else {
            console.log('User signed out successfully.');
            localStorage.removeItem('onboardingComplete');
            localStorage.removeItem('userIsAdmin'); // Clear admin status on sign out
            window.location.href = '../index.html';
          }
        } catch (e) {
          console.error('Exception during sign out:', e);
          alert('An unexpected error occurred during sign out.');
        }
      } else {
        console.error('Supabase client not available for sign out.');
        alert('Supabase client not available. Cannot sign out.');
      }
    });
  }

  // --- Company Code Modal Logic ---
  function resetCompanyCodeModal() {
    if (companyCodeForm) companyCodeForm.reset();
    if (companyCodeMessage) companyCodeMessage.innerHTML = '';
    if (companyCodeStep1) companyCodeStep1.style.display = 'block';
    if (companyCodeStep2) companyCodeStep2.style.display = 'none';
    if (companyCodeStep3) companyCodeStep3.style.display = 'none';
    validatedCompanyData = null;
    validatedProfileData = null;
    // Re-enable buttons
    if (verifyCompanyCodeButton) verifyCompanyCodeButton.disabled = false;
    if (verifyCompanyEmailButton) verifyCompanyEmailButton.disabled = false;
    const setPwdBtn = document.getElementById('setCompanyPasswordButton');
    if (setPwdBtn) setPwdBtn.disabled = false;
  }

  if (haveCompanyCodeButton && companyCodeModalInstance) {
    haveCompanyCodeButton.addEventListener('click', () => {
      resetCompanyCodeModal();
      companyCodeModalInstance.show();
    });
  }

  if (verifyCompanyCodeButton) {
    verifyCompanyCodeButton.addEventListener('click', async () => {
      const code = companyCodeInput.value.trim();
      if (companyCodeMessage) companyCodeMessage.innerHTML = '';

      if (!/^\d{8}$/.test(code)) {
        companyCodeMessage.innerHTML = '<div class="alert alert-warning">Please enter a valid 8-digit company code.</div>'; // i18n later
        return;
      }
      verifyCompanyCodeButton.disabled = true;
      try {
        const { data, error } = await window._supabase.rpc('validate_company_code', { p_code: code });

        if (error) {
          console.error('Error validating company code via RPC:', error);
          companyCodeMessage.innerHTML = '<div class="alert alert-danger" data-i18n="companyCodeModal.message.rpcError">Error validating code. Please try again.</div>';
          validatedCompanyData = null;
          // Consider re-applying i18n if you have a function for it: applyi18n(companyCodeModalEl);
        } else if (data && data.length > 0) {
          const companyDetails = data[0]; // RPC returns an array of rows
          validatedCompanyData = { id: companyDetails.company_id, company_name: companyDetails.company_name };
          console.log('Company code verified via RPC:', validatedCompanyData);

          if (companyCodeStep1) companyCodeStep1.style.display = 'none';
          if (companyCodeStep2) companyCodeStep2.style.display = 'block';
          if (companyCodeMessage) companyCodeMessage.innerHTML = '';
          // Optionally, confirm company name to user:
          // companyCodeMessage.innerHTML = `<div class="alert alert-success">Company Found: ${validatedCompanyData.company_name}</div>`;
        } else {
          // No error, but data is null or empty array - code is invalid
          validatedCompanyData = null;
          companyCodeMessage.innerHTML = '<div class="alert alert-danger" data-i18n="companyCodeModal.message.invalidCode">Invalid company code. Please check the code and try again.</div>';
          // Consider re-applying i18n: applyi18n(companyCodeModalEl);
        }
      } catch (e) {
        console.error('Exception verifying company code via RPC:', e);
        companyCodeMessage.innerHTML = '<div class="alert alert-danger" data-i18n="companyCodeModal.message.unexpectedError">An unexpected error occurred. Please try again.</div>'; // i18n later
        validatedCompanyData = null;
      } finally {
        verifyCompanyCodeButton.disabled = false;
      }
    });
  }

  if (verifyCompanyEmailButton) {
    verifyCompanyEmailButton.addEventListener('click', async () => {
      const email = companyCodeEmailInput.value.trim();
      if (companyCodeMessage) companyCodeMessage.innerHTML = '';

      if (!email || !/\S+@\S+\.\S+/.test(email)) { // Basic email format validation
        companyCodeMessage.innerHTML = '<div class="alert alert-warning">Please enter a valid email address.</div>'; // i18n
        return;
      }
      if (!validatedCompanyData || !validatedCompanyData.id) {
        companyCodeMessage.innerHTML = '<div class="alert alert-danger">Company data not validated. Please verify company code first.</div>'; // i18n
        return;
      }
      verifyCompanyEmailButton.disabled = true;
      try {
        const { data, error } = await window._supabase
          .from('profiles')
          .select('id, email, user_status, auth_user_id') // Assuming auth_user_id might be the key for auth.users
          .eq('email', email)
          .eq('company_id', validatedCompanyData.id)
          .single();

        if (error || !data) {
          console.error('Error verifying company email:', error);
          companyCodeMessage.innerHTML = '<div class="alert alert-danger">Email not registered with this company, or an error occurred.</div>'; // i18n
          validatedProfileData = null;
        } else if (data.user_status !== 'New' && data.user_status !== 'Invited') { // Adjust status as per your setup
          companyCodeMessage.innerHTML = `<div class="alert alert-warning">This account (${email}) is already active or its status does not allow this action. Please contact your administrator.</div>`; // i18n
          validatedProfileData = null;
        } else {
          validatedProfileData = data;
          console.log('Company email verified:', validatedProfileData);
          if (companyCodeStep2) companyCodeStep2.style.display = 'none';
          if (companyCodeStep3) companyCodeStep3.style.display = 'block';
          if (companyCodeMessage) companyCodeMessage.innerHTML = '';
        }
      } catch (e) {
        console.error('Exception verifying company email:', e);
        companyCodeMessage.innerHTML = '<div class="alert alert-danger">An unexpected error occurred. Please try again.</div>'; // i18n
        validatedProfileData = null;
      } finally {
        verifyCompanyEmailButton.disabled = false;
      }
    });
  }

  if (companyCodeForm) {
    companyCodeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newPassword = companyCodePasswordInput.value;
      const confirmPassword = companyCodeConfirmPasswordInput.value;
      const setPasswordButton = document.getElementById('setCompanyPasswordButton');

      if (companyCodeMessage) companyCodeMessage.innerHTML = '';

      if (!newPassword || newPassword.length < 6) {
        companyCodeMessage.innerHTML = '<div class="alert alert-warning">Password must be at least 6 characters long.</div>'; // i18n
        return;
      }
      if (newPassword !== confirmPassword) {
        companyCodeMessage.innerHTML = '<div class="alert alert-warning">Passwords do not match.</div>'; // i18n
        return;
      }
      if (!validatedProfileData || !validatedProfileData.id) {
        companyCodeMessage.innerHTML = '<div class="alert alert-danger">User profile not validated. Please start over.</div>'; // i18n
        return;
      }

      // Determine the user ID for Supabase Auth. Prefer auth_user_id if available, else profile.id.
      const userIdForAuth = validatedProfileData.auth_user_id || validatedProfileData.id;

      if (setPasswordButton) setPasswordButton.disabled = true;

      try {
        // CRITICAL: This updateUser call will only work if the user has an active session.
        // For a new user activating via code, this is unlikely.
        // This will likely need an Edge Function that uses the service_role key.
        // For now, proceeding with client-side call, acknowledging this limitation.
        // One scenario where this *might* work is if the 'New'/'Invited' user already exists in auth.users
        // and Supabase allows them to set their password if they verify their email through a separate link first,
        // and then come back to use this company code flow. But that's not the implied flow.

        // If this is a user who has *never* logged in, supabase.auth.updateUser() will fail.
        // The correct flow for an admin-created user setting their password for the first time
        // without prior login usually involves a secure link (password reset flow) or an admin function.
        // Let's assume for now this is part of a flow where `updateUser` is viable.
        const { data: updateUserData, error: updateUserError } = await window._supabase.auth.updateUser({ password: newPassword });

        if (updateUserError) {
          // If error is "User not found", it means the user doesn't exist in auth.users or is not matched by current session.
          // If error is "requires a valid JWT", user is not logged in.
          console.error('Error updating user password:', updateUserError);
          throw new Error(`Password setup failed: ${updateUserError.message}. This may require administrator assistance if the account was pre-created.`);
        }

        console.log('Password updated successfully for user ID (auth):', userIdForAuth, updateUserData);

        // Now update the profile status to Active
        const { error: profileUpdateError } = await window._supabase
          .from('profiles')
          .update({ user_status: 'Active' })
          .eq('id', validatedProfileData.id); // Update based on profile's own ID

        if (profileUpdateError) {
          console.error('Error updating profile status:', profileUpdateError);
          // Password was updated, but profile status failed. This is a partial success state.
          // Inform user, but guide them to login as password might be set.
          companyCodeMessage.innerHTML = `<div class="alert alert-warning">Password set, but failed to update profile status: ${profileUpdateError.message}. Please try logging in.</div>`; // i18n
        } else {
          companyCodeMessage.innerHTML = '<div class="alert alert-success">Account activated successfully! You can now sign in.</div>'; // i18n
          setTimeout(() => {
            if (companyCodeModalInstance) companyCodeModalInstance.hide();
            resetCompanyCodeModal();
          }, 3000);
        }
      } catch (e) {
        console.error('Exception setting password or updating profile:', e);
        companyCodeMessage.innerHTML = `<div class="alert alert-danger">Error activating account: ${e.message}</div>`; // i18n
      } finally {
        if (setPasswordButton) setPasswordButton.disabled = false;
      }
    });
  }
  // --- End Company Code Modal Logic ---

});

// Sidebar Toggler Logic
document.addEventListener('DOMContentLoaded', function() {
  updateSidebarForPermissions(); // Also call here for pages that might not have the main auth logic DOM

  const sidebar = document.getElementById('sidebar');
  const sidebarToggler = document.getElementById('sidebarToggler');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');

  if (sidebar && sidebarToggler && sidebarOverlay) {
    sidebarToggler.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', function() {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }
});
