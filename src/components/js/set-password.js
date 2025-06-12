// js/set-password.js
document.addEventListener('DOMContentLoaded', () => {
    const setPasswordForm = document.getElementById('setPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const setPasswordBtn = document.getElementById('setPasswordBtn');
    const messageDiv = document.getElementById('setPasswordMessage');

    let supabase = window._supabase; // Expected to be initialized by supabase-client.js

    if (!supabase) {
        console.error('Supabase client not found. Make sure it is loaded and initialized before set-password.js');
        displayMessage('Critical error: Supabase client not available. Cannot set password.', true);
        if (setPasswordBtn) setPasswordBtn.disabled = true;
        return;
    }

    // Initialize i18n for this page if window.initI18n is available
    if (window.initI18n) {
        window.initI18n();
    } else {
        console.warn('initI18n function not found. Page translations might not apply.');
    }

    // Handle user state changes (e.g., when token from URL is processed)
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('onAuthStateChange event:', event, 'session:', session);
        if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
            // This event often fires after a recovery/invite link is used and user is ready to set a new password
            // Or after updateUser is successful.
            // No specific action needed here just from the event, form submission handles the update.
            // We could enable the form here if it was initially disabled.
            displayMessage('You can now set your new password.', false);
        } else if (event === 'SIGNED_IN' && session && session.user && session.user.recovery_sent_at) {
            // This might be another state indicating readiness for password update
            displayMessage('Please set your new password to complete your account setup.', false);
        } else if (event === 'SIGNED_IN' && session && session.user && !session.user.recovery_sent_at) {
            // If user is already fully signed in (e.g. token processed, password already set somehow)
            // displayMessage('You are already signed in. Redirecting...', false);
            // setTimeout(() => window.location.href = '../pages/dashboard.html', 2000);
            // For now, let them attempt to set password anyway, updateUser will handle if it's a valid session.
        }

        // Check if the user object contains an 'invited_at' timestamp
        // This is just for logging, actual password update doesn't depend on this.
        if (session && session.user) {
            console.log('User details:', session.user);
            if (session.user.invited_at) {
                 console.log('This user was invited at:', session.user.invited_at);
            }
        }
    });


    if (setPasswordForm) {
        setPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (setPasswordBtn) setPasswordBtn.disabled = true;
            clearMessage();

            const password = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!password || !confirmPassword) {
                displayMessage('Please fill in both password fields.', true, 'setPasswordPage.validation.bothFieldsRequired');
                if (setPasswordBtn) setPasswordBtn.disabled = false;
                return;
            }

            if (password.length < 6) {
                displayMessage('Password must be at least 6 characters long.', true, 'setPasswordPage.validation.passwordTooShort');
                if (setPasswordBtn) setPasswordBtn.disabled = false;
                return;
            }

            if (password !== confirmPassword) {
                displayMessage('Passwords do not match. Please try again.', true, 'setPasswordPage.validation.passwordsMismatch');
                if (setPasswordBtn) setPasswordBtn.disabled = false;
                return;
            }

            try {
                const { data: updateUserData, error: updateUserError } = await supabase.auth.updateUser({ password: password });

                if (updateUserError) {
                    console.error('Error updating password:', updateUserError);
                    displayMessage(`Error updating password: ${updateUserError.message}`, true);
                } else {
                    console.log('Password updated successfully for user:', updateUserData.user);
                    displayMessage('Password set. Finalizing account activation...', false, 'setPasswordPage.info.finalizingActivation'); // New temp message

                    try {
                        const { data: activationData, error: activationError } = await supabase.functions.invoke('activate-profile');

                        if (activationError) {
                            console.error('Error activating profile:', activationError);
                            displayMessage('Password set, but there was an issue finalizing account activation. Please try signing in. If issues persist, contact support.', true, 'setPasswordPage.errors.activationFailed');
                        } else {
                            console.log('Profile activated successfully:', activationData);
                            displayMessage('Account activated and password updated successfully! You will be redirected to sign in.', false, 'setPasswordPage.success.activatedAndPasswordUpdated'); // New success message
                            setTimeout(() => {
                                window.location.href = '../index.html'; // Redirect to login page
                            }, 3000);
                        }
                    } catch (activationCatchError) {
                        console.error('Unexpected error during profile activation call:', activationCatchError);
                        displayMessage('Password set, but an unexpected error occurred during account finalization. Please try signing in.', true, 'setPasswordPage.errors.activationUnexpected');
                    }
                }
            } catch (err) {
                console.error('Unexpected error during password update process:', err); // Clarified outer catch
                displayMessage('An unexpected error occurred while setting your password. Please try again.', true, 'setPasswordPage.errors.unexpected'); // Generic for outer
            } finally {
                if (setPasswordBtn) setPasswordBtn.disabled = false;
            }
        });
    } else {
        console.error('Set password form not found.');
        displayMessage('Error: Password form not found on page.', true);
    }

    function displayMessage(message, isError, i18nKey = null) {
        if (messageDiv) {
            messageDiv.innerHTML = ''; // Clear previous messages
            const alertType = isError ? 'alert-danger' : 'alert-success';
            const messageText = i18nKey && window.i18next && window.i18next.exists(i18nKey)
                                ? window.i18next.t(i18nKey)
                                : message;
            messageDiv.innerHTML = `<div class="alert ${alertType}" role="alert">${messageText}</div>`;
        }
    }

    function clearMessage() {
        if (messageDiv) {
            messageDiv.innerHTML = '';
        }
    }
});
