import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient'; // Direct Supabase client for non-auth specific calls (e.g. RPC, profiles)

import ResendVerificationModal from '../components/modals/ResendVerificationModal';
import SixDigitCodeModal from '../components/modals/SixDigitCodeModal';
import LanguageSelectionModal from '../components/modals/LanguageSelectionModal';
import CompanyCodeModal from '../components/modals/CompanyCodeModal';

const SignInPage = () => {
  const {
    user,
    signInWithPassword,
    signUp,
    authError,
    setAuthError,
    loading: authLoading,
    fetchUserProfile
  } = useAuth();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState('signIn'); // 'signIn', 'signUp_accountType', 'signUp_agencyForm', 'signUp_userInfo'

  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpEmailState, setSignUpEmailState] = useState('');
  const [signUpPasswordState, setSignUpPasswordState] = useState('');
  const [accountType, setAccountType] = useState('');

  // Message states are now primarily handled by authError from context
  // Local messages for non-auth feedback can still be used if needed.
  const [localMessage, setLocalMessage] = useState({ text: '', type: '' });


  // Modal visibility states
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [isSixDigitCodeModalOpen, setIsSixDigitCodeModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isCompanyCodeModalOpen, setIsCompanyCodeModalOpen] = useState(false);

  const [userForModals, setUserForModals] = useState(null); // Store user/profile data for modal operations

  useEffect(() => {
    // If user is logged in and verified (basic check), redirect
    // More complex redirect logic (e.g. based on profile.has_company_set_up) will be added
    if (user) {
        // This is a simple redirect. The original logic in main.js is more complex,
        // involving checks for is_verified_by_code, has_company_set_up, isAdmin.
        // We'll replicate that after successful sign-in.
        // For now, if a user object exists, assume login was successful enough to try dashboard.
        console.log('User detected on SignInPage mount/update, potentially redirecting via handleSuccessfulSignIn if profile is complete.');
        // navigate('/pages/dashboard.html'); // Potentially too early, see handleSuccessfulSignIn
        // It's better to call handleSuccessfulSignIn if user object is present and profile checks are needed
        // This useEffect might be too aggressive if it runs on every user object change without full profile context.
        // Consider if this is needed or if handleSuccessfulSignIn covers it post-login action.
    }
  }, [user, navigate]);

  useEffect(() => {
    const currentYearSpan = document.getElementById('currentYearInReact');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
  }, []);

  const handleSuccessfulSignIn = async (authedUser) => {
    setAuthError(null); // Clear any previous auth errors
    const profile = await fetchUserProfile(authedUser.id);
    setUserForModals({ ...authedUser, profile }); // Store for modals

    if (profile && profile.is_verified_by_code) {
      // User is verified by 8-digit code
      const isAdmin = authedUser.app_metadata?.is_admin === true;
      if (!isAdmin) {
        localStorage.setItem('onboardingComplete', 'true');
        navigate('/tasks');
      } else {
        if (profile.has_company_set_up === false) {
          localStorage.removeItem('onboardingComplete');
          setIsLanguageModalOpen(true); // Then redirects to agency_setup_page via modal
        } else {
          localStorage.setItem('onboardingComplete', 'true');
          navigate('/dashboard');
        }
      }
    } else if (profile) { // Profile exists but not verified by code
      setIsSixDigitCodeModalOpen(true);
    } else {
      // Profile might not exist yet (e.g. first login after email verify, before profile auto-creation or if it failed)
      // This case needs careful handling. The original main.js has complex logic for this.
      // For now, if profile is null, show an error or attempt profile creation if applicable.
      // The AuthProvider's fetchUserProfile might need enhancement if it should trigger profile creation.
      // The original main.js called an edge function 'create-initial-profile' if profile fetch gave PGRST116.
      // This logic should ideally be in AuthProvider or called here.
      setLocalMessage({ text: 'Profile not found or not yet verified. Please complete any pending verification steps.', type: 'warning' });
      // Potentially open 6-digit code modal if verification_code exists on profile even if not verified_by_code
      // Ensure userForModals is updated with profile (even if it's just the code) before opening modal
      // This relies on the profile object being part of authedUser or fetched correctly.
      if (profile?.verification_code) { // Check fetched profile
          setIsSixDigitCodeModalOpen(true);
      }
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setLocalMessage({ text: '', type: '' });
    setAuthError(null);
    const { success, error: signInError, data } = await signInWithPassword(signInEmail, signInPassword);
    if (success && data.user) {
      await handleSuccessfulSignIn(data.user);
    } else if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        setLocalMessage({ text: 'Email not confirmed. Resend verification?', type: 'info' });
        setUserForModals({ email: signInEmail }); // For resend modal
        setIsResendModalOpen(true);
      } else {
        // authError is already set by AuthContext, but we can set a local one too
        setLocalMessage({ text: signInError.message, type: 'danger' });
      }
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setLocalMessage({ text: '', type: '' });
    setAuthError(null);
    const optionsData = {
      first_name: signUpFirstName,
      account_type: accountType,
    };
    const { success, error: signUpError, data } = await signUp(signUpEmailState, signUpPasswordState, optionsData);
    if (success) {
      // data.user might be null if email verification is required.
      // data.session will also be null.
      if (data.user && data.user.identities && data.user.identities.length === 0) { // Email verification likely sent
         setLocalMessage({ text: `Confirmation email sent to ${signUpEmailState}. Please verify your email. (Simulated - check Supabase logs if email sending is configured)`, type: 'info' });
      } else {
         setLocalMessage({ text: 'Sign up successful! Please check your email for a verification link.', type: 'success' });
      }
      setCurrentView('signIn'); // Switch to sign-in view
    } else if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        setLocalMessage({ text: 'User already registered. Try signing in or resend verification.', type: 'info' });
        setUserForModals({ email: signUpEmailState }); // For resend modal
        setIsResendModalOpen(true);
      } else {
        setLocalMessage({ text: signUpError.message, type: 'danger' });
      }
    }
  };

  // Modal Handlers
  const handleResendEmailSubmit = async (emailToResend) => {
    setLocalMessage({ text: '', type: '' });
    const { data, error } = await supabase.auth.resend({ type: 'signup', email: emailToResend });
    if (error) return { success: false, message: error.message };
    // Check if identities array is empty, which can indicate email was already confirmed, or other states.
    // Supabase resend behavior can vary.
    if (data && data.user && data.user.identities && data.user.identities.length === 0) {
         return { success: true, message: `A new confirmation link has been sent to ${emailToResend}. If you don't see it, please check your spam folder.`};
    }
    return { success: true, message: `If an account exists for ${emailToResend} and requires confirmation, a new verification link has been sent.` };
  };

  const handleSubmitSixDigitCode = async (code) => {
    if (!userForModals || !userForModals.id || !userForModals.profile) {
        return { success: false, message: 'User or profile information is missing for 6-digit code verification.' };
    }
    // Compare with profile.verification_code
    if (String(userForModals.profile.verification_code).trim() === code.trim()) {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_verified_by_code: true })
            .eq('id', userForModals.id);
        if (updateError) return { success: false, message: `Error updating profile: ${updateError.message}` };

        setIsSixDigitCodeModalOpen(false);
        // Re-run the successful sign-in logic with the now updated profile context
        // Need to refetch user/profile or ensure context updates and then re-evaluate
        const updatedUser = { ...userForModals, profile: { ...userForModals.profile, is_verified_by_code: true } };
        await handleSuccessfulSignIn(updatedUser);
        return { success: true, message: 'Code verified successfully!' };
    } else {
        return { success: false, message: 'Incorrect verification code.' };
    }
  };

  const handleSaveLanguage = async (lang) => {
    if (!userForModals || !userForModals.id) {
        return { success: false, message: 'User information is missing.' };
    }
    const { error } = await supabase
        .from('profiles')
        .update({ preferred_ui_language: lang })
        .eq('id', userForModals.id);
    if (error) return { success: false, message: `Error saving language: ${error.message}` };

    localStorage.setItem('preferredLang', lang); // For i18n.js
    // TODO: i18next.changeLanguage(lang);
    setIsLanguageModalOpen(false);
    navigate('/agency-setup'); // Navigate to agency setup
    return { success: true, message: 'Language preference saved.' };
  };

  // CompanyCodeModal Handlers
  const handleVerifyCompanyCode = async (companyCode) => {
    const { data, error } = await supabase.rpc('validate_company_code', { p_code: companyCode });
    if (error) return { success: false, message: `Error: ${error.message}` };
    if (data && data.length > 0 && data[0].is_valid) { // Assuming rpc returns { is_valid: boolean, company_id: uuid, company_name: text }
      setUserForModals(prev => ({ ...prev, companyData: {id: data[0].company_id, name: data[0].company_name} }));
      return { success: true, message: `Company ${data[0].company_name} found.` };
    }
    return { success: false, message: 'Invalid company code.' };
  };

  const handleVerifyCompanyEmail = async (email) => {
    if (!userForModals?.companyData?.id) return { success: false, message: 'Company not validated.'};
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, user_status, auth_user_id') // auth_user_id is crucial for linking to auth.users
        .eq('email', email)
        .eq('company_id', userForModals.companyData.id)
        .single();
    if (error || !data) return { success: false, message: 'Email not registered with this company or error.'};
    if (data.user_status !== 'New' && data.user_status !== 'Invited') { // From original logic
        return { success: false, message: 'Account already active or status prevents this action.'};
    }
    setUserForModals(prev => ({ ...prev, profileForCompanyJoin: data }));
    return { success: true, message: 'Email verified for company.' };
  };

  const handleSetCompanyPassword = async (newPassword) => {
    if (!userForModals?.profileForCompanyJoin?.id || !userForModals?.profileForCompanyJoin?.auth_user_id) {
        return { success: false, message: 'User profile data for activation is missing.'};
    }
    try {
        const { data, error } = await supabase.functions.invoke('activate-profile', {
            body: {
                userIdToActivate: userForModals.profileForCompanyJoin.auth_user_id,
                newPassword: newPassword,
                profileIdToUpdateStatus: userForModals.profileForCompanyJoin.id
            }
        });
        if (error) throw error;
        setIsCompanyCodeModalOpen(false);
        setLocalMessage({ text: 'Account activated! You can now sign in.', type: 'success'});
        setCurrentView('signIn');
        return { success: true, message: data.message || 'Account activated successfully!' };
    } catch (error) {
        return { success: false, message: `Activation failed: ${error.message || 'Unknown error'}` };
    }
  };

  const renderAuthToggle = () => {
    if (currentView === 'signIn') {
      return ( <> <span className="text-muted me-2">Don't have an account yet?</span> <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('signUp_accountType'); setLocalMessage({text:'', type:''}); setAuthError(null); }} className="fw-bold text-decoration-none">Sign up</a> </> );
    } else {
      return ( <> <span className="text-muted me-2">Already have an account?</span> <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('signIn'); setLocalMessage({text:'', type:''}); setAuthError(null); }} className="fw-bold text-decoration-none">Sign In Button</a> </> );
    }
  };

  const renderSignInForm = () => (
     <div> <h2 className="h3 mb-1 fw-semibold">Sign In Button</h2> <p className="text-muted mb-4">Welcome back!</p>
      <form onSubmit={handleSignInSubmit}>
        <div className="form-floating mb-3"><input type="email" className="form-control" value={signInEmail} onChange={(e)=>setSignInEmail(e.target.value)} placeholder="email" required disabled={authLoading} /><label>Email</label></div>
        <div className="form-floating mb-3"><input type="password" className="form-control" value={signInPassword} onChange={(e)=>setSignInPassword(e.target.value)} placeholder="password" required disabled={authLoading} /><label>Password</label></div>
        {(localMessage.text || authError) && <div className={`alert alert-${localMessage.type || (authError ? 'danger' : 'info')} mt-3`}>{localMessage.text || authError?.message}</div>}
        <button className="btn btn-primary w-100 py-2 mt-3" type="submit" disabled={authLoading}>{authLoading ? 'Signing In...' : 'Sign In Button'}</button>
      </form>
      <button className="btn btn-link mt-1" onClick={() => {setUserForModals({email: signInEmail}); setIsResendModalOpen(true);}} disabled={authLoading}>Resend Verification?</button>
    </div>
  );

  const renderAccountTypeSelection = () => (
    <div> <h2 className="h3 mb-1 fw-semibold">Select Account Type</h2> <p className="text-muted mb-4">Choose how you want to use Property Hub.</p>
      <div className="form-floating mb-3">
        <select className="form-select" value={accountType} onChange={(e)=>{setAccountType(e.target.value);setLocalMessage({text:'',type:''}); setAuthError(null);}} disabled={authLoading}> <option value="" disabled>Choose...</option> <option value="agency">Agency</option> <option value="user">User</option> </select> <label>Account Type</label>
      </div>
      {(localMessage.text || authError) && <div className={`alert alert-${localMessage.type || (authError ? 'danger' : 'info')} mt-3`}>{localMessage.text || authError?.message}</div>}
      <button className="btn btn-primary w-100 py-2 mt-3" disabled={!accountType || authLoading} onClick={() => { if (accountType === 'agency') setCurrentView('signUp_agencyForm'); if (accountType === 'user') setCurrentView('signUp_userInfo'); }}>Continue</button>
    </div>
  );

  const renderUserAccountInfo = () => (
    <div> <h2 className="h3 mb-1 fw-semibold">User Account Information</h2> <p className="text-muted mb-4">As a User, you require an account set up by your Agency...</p>
      <div className="mt-4"><button type="button" className="btn btn-secondary w-100 py-2" onClick={() => setIsCompanyCodeModalOpen(true)} disabled={authLoading}>I have a Company Code</button></div>
    </div>
  );

  const renderAgencySignupForm = () => (
    <div> <h2 className="h3 mb-1 fw-semibold">Create Agency Account</h2> <p className="text-muted mb-4">Fill out the form below.</p>
      <form onSubmit={handleSignUpSubmit}>
        <div className="form-floating mb-3"><input type="text" className="form-control" value={signUpFirstName} onChange={(e)=>setSignUpFirstName(e.target.value)} placeholder="first name" required disabled={authLoading} /><label>First Name</label></div>
        <div className="form-floating mb-3"><input type="email" className="form-control" value={signUpEmailState} onChange={(e)=>setSignUpEmailState(e.target.value)} placeholder="email" required disabled={authLoading} /><label>Email</label></div>
        <div className="form-floating mb-3"><input type="password" className="form-control" value={signUpPasswordState} onChange={(e)=>setSignUpPasswordState(e.target.value)} placeholder="password" required minLength="6" disabled={authLoading} /><label>Password</label></div>
        {(localMessage.text || authError) && <div className={`alert alert-${localMessage.type || (authError ? 'danger' : 'info')} mt-3`}>{localMessage.text || authError?.message}</div>}
        <button className="btn btn-primary w-100 py-2 mt-3" type="submit" disabled={authLoading}>{authLoading ? 'Signing Up...' : 'Sign Up'}</button>
      </form>
    </div>
  );

  // Main Render
  const bgImageUrl = `${import.meta.env.BASE_URL}assets/images/auth-background.png`;
  return (
    <>
      <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-center align-items-start p-5 text-white position-relative" style={{ backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
        <div className="position-relative"><h1 className="display-4 fw-bold mb-3">Property Hub</h1><p className="lead">DEBUG TEST - Manage property maintenance tasks with ease. Schedule services, track tasks, and get real-time updates. All in one app!</p></div>
      </div>
      <div className="col-lg-6 d-flex flex-column justify-content-center align-items-center p-4 p-md-5">
        <div className="w-100" style={{ maxWidth: '450px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <div className="d-flex justify-content-end" style={{ position: 'absolute', top: 0, right: 0 }}>{renderAuthToggle()}</div>
          {currentView === 'signIn' && renderSignInForm()}
          {currentView === 'signUp_accountType' && renderAccountTypeSelection()}
          {currentView === 'signUp_userInfo' && renderUserAccountInfo()}
          {currentView === 'signUp_agencyForm' && renderAgencySignupForm()}
          <p className="mt-5 mb-3 text-muted text-center">&copy; <span id="currentYearInReact"></span> Property Hub</p>
        </div>
      </div>

      <ResendVerificationModal isOpen={isResendModalOpen} onClose={() => setIsResendModalOpen(false)} onResendEmail={handleResendEmailSubmit} initialEmail={userForModals?.email} />
      <SixDigitCodeModal isOpen={isSixDigitCodeModalOpen} onClose={() => setIsSixDigitCodeModalOpen(false)} onSubmitCode={handleSubmitSixDigitCode} />
      <LanguageSelectionModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} onSaveLanguage={handleSaveLanguage} />
      <CompanyCodeModal
        isOpen={isCompanyCodeModalOpen}
        onClose={() => setIsCompanyCodeModalOpen(false)}
        onVerifyCode={handleVerifyCompanyCode}
        onVerifyEmail={handleVerifyCompanyEmail}
        onSetPassword={handleSetCompanyPassword}
      />
    </>
  );
};
export default SignInPage;
