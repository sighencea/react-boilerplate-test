import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const AccountPage = () => {
  const { user, isAdmin, session, setAuthError } = useAuth(); // Use session to re-check user if needed

  // Profile Form State
  const [profileData, setProfileData] = useState({
    full_name: '',
    // email: '', // Email is usually from user object and not directly editable in 'profiles' like this
    phone: '', // Assuming 'phone' is a column in your 'profiles' table
    // Add other profile fields as necessary: address_street, address_city, etc. if they are user-specific
    profile_image_url: '', // For displaying current, upload handled separately
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '', // Only if you want to verify current password - Supabase doesn't require it for updateUser
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Company Form State (for admin)
  const [companyData, setCompanyData] = useState({ name: '', address_street: '', phone_number: '' /* ... other fields */ });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [companySuccess, setCompanySuccess] = useState('');


  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess('');
    try {
      // Use AuthContext's fetchUserProfile or query directly if more fields are needed
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('full_name, phone, profile_image_url') // Add all fields you want to edit/display
        .eq('id', user.id)
        .single();

      if (dbError) {
        // PGRST116 means no row found, which can happen if profile creation is deferred/failed
        if (dbError.code === 'PGRST116') {
            console.warn('Profile not found for current user. User might need to complete onboarding or profile creation.');
            setProfileError('Profile information not yet available.');
            // Initialize with empty strings or defaults from user object if applicable
            setProfileData({
                full_name: user.user_metadata?.first_name || user.user_metadata?.full_name || '',
                phone: '',
                profile_image_url: '',
            });
        } else {
            throw dbError;
        }
      } else if (data) {
        setProfileData({
          full_name: data.full_name || user.user_metadata?.first_name || user.user_metadata?.full_name || '',
          phone: data.phone || '',
          profile_image_url: data.profile_image_url || '',
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const fetchCompanyDetails = useCallback(async () => {
    if (!isAdmin || !user?.app_metadata?.company_id) return;
    setCompanyLoading(true); setCompanyError(null); setCompanySuccess('');
    try {
        const { data, error: dbError } = await supabase
            .from('companies')
            .select('*') // Select all company fields
            .eq('id', user.app_metadata.company_id)
            .single();
        if (dbError) throw dbError;
        if (data) setCompanyData(data); // Assuming direct mapping for now
    } catch (err) {
        console.error("Error fetching company details:", err);
        setCompanyError(err.message);
    } finally {
        setCompanyLoading(false);
    }
  }, [isAdmin, user]);


  useEffect(() => {
    fetchProfile();
    if (isAdmin) {
        fetchCompanyDetails();
    }
  }, [fetchProfile, isAdmin, fetchCompanyDetails]);

  const handleProfileChange = (e) => {
    setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess('');
    try {
      const updates = {
        full_name: profileData.full_name,
        phone: profileData.phone,
        // profile_image_url: profileData.profile_image_url, // Handle image upload separately
        updated_at: new Date(), // Supabase automatically handles this for most tables
      };
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (updateError) throw updateError;
      setProfileSuccess('Profile updated successfully!');
      // Optionally re-fetch or update user in AuthContext if full_name changed and it's used globally
      // e.g., by updating user.user_metadata if AuthProvider handles that merge.
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess('');
    setAuthError(null); // Clear global auth errors from context

    try {
      // Supabase's updateUser for password doesn't require currentPassword
      const { error: updateError } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (updateError) throw updateError;
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // Clear form
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError(err.message); // Show specific error
      setAuthError(err); // Also set global context error if it's an auth specific one like "weak password"
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCompanyDataChange = (e) => {
    setCompanyData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !user?.app_metadata?.company_id) return;
    setCompanyLoading(true); setCompanyError(null); setCompanySuccess('');
    try {
        // Using 'save-company-details' Edge Function as per PROJECT_OVERVIEW.md
        const { data: funcData, error: funcError } = await supabase.functions.invoke('save-company-details', {
            body: { companyId: user.app_metadata.company_id, updates: companyData }
        });
        if (funcError) throw funcError;
        setCompanySuccess(funcData?.message || 'Company details updated successfully!');
        fetchCompanyDetails(); // Refresh company details
    } catch (err) {
        console.error("Error updating company details:", err);
        setCompanyError(err.message || (err?.context?.json?.error) || "Failed to save company details.");
    } finally {
        setCompanyLoading(false);
    }
  };


  return (
    <div className="container mt-4">
      <h1 data-i18n="accountPage.title">Account Settings</h1>

      {/* Profile Information Section */}
      <section id="profileInformationSection" className="mb-5 card">
        <div className="card-body">
            <h2 className="card-title" data-i18n="accountPage.profile.title">Profile Information</h2>
            {profileLoading && <p>Loading profile...</p>}
            {profileError && <div className="alert alert-danger">{profileError}</div>}
            {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}
            <form onSubmit={handleProfileSubmit}>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email Address</label>
                    <input type="email" className="form-control" id="email" value={user?.email || ''} disabled readOnly />
                </div>
                <div className="mb-3">
                    <label htmlFor="full_name" className="form-label" data-i18n="accountPage.profile.firstName">Full Name</label>
                    <input type="text" className="form-control" id="full_name" name="full_name" value={profileData.full_name} onChange={handleProfileChange} disabled={profileLoading} />
                </div>
                <div className="mb-3">
                    <label htmlFor="phone" className="form-label">Phone</label>
                    <input type="tel" className="form-control" id="phone" name="phone" value={profileData.phone} onChange={handleProfileChange} disabled={profileLoading} />
                </div>
                {/* TODO: Profile image display and upload */}
                <button type="submit" className="btn btn-primary" data-i18n="accountPage.profile.saveButton" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
      </section>

      {/* Change Password Section */}
      <section id="changePasswordSection" className="mb-5 card">
        <div className="card-body">
            <h2 className="card-title" data-i18n="accountPage.password.title">Change Password</h2>
            {passwordLoading && <p>Updating password...</p>}
            {passwordError && <div className="alert alert-danger">{passwordError}</div>}
            {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
            <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label" data-i18n="accountPage.password.new">New Password</label>
                    <input type="password" value={passwordData.newPassword} onChange={handlePasswordChange} className="form-control" id="newPassword" name="newPassword" required minLength="6" disabled={passwordLoading} />
                </div>
                <div className="mb-3">
                    <label htmlFor="confirmNewPassword" className="form-label" data-i18n="accountPage.password.confirmNew">Confirm New Password</label>
                    <input type="password" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} className="form-control" id="confirmNewPassword" name="confirmNewPassword" required minLength="6" disabled={passwordLoading} />
                </div>
                <button type="submit" className="btn btn-warning" data-i18n="accountPage.password.changeButton" disabled={passwordLoading}>
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
            </form>
        </div>
      </section>

      {/* Company Details Section (Admin only) */}
      {isAdmin && (
        <section id="companyDetailsSection" className="mb-5 card">
          <div className="card-body">
            <h2 className="card-title" data-i18n="accountPage.company.title">Company Details</h2>
            {companyLoading && <p>Loading company details...</p>}
            {companyError && <div className="alert alert-danger">{companyError}</div>}
            {companySuccess && <div className="alert alert-success">{companySuccess}</div>}
            <form onSubmit={handleCompanySubmit}>
                <div className="mb-3">
                    <label htmlFor="companyName" className="form-label">Company Name</label>
                    <input type="text" className="form-control" id="companyName" name="name" value={companyData.name || ''} onChange={handleCompanyDataChange} disabled={companyLoading} />
                </div>
                {/* Add other company fields here, e.g., address, phone, etc. Ensure 'name' matches columns in 'companies' table */}
                <div className="mb-3">
                    <label htmlFor="companyAddress" className="form-label">Company Address</label>
                    <input type="text" className="form-control" id="companyAddress" name="address_street" value={companyData.address_street || ''} onChange={handleCompanyDataChange} disabled={companyLoading} />
                </div>
                 <div className="mb-3">
                    <label htmlFor="companyPhone" className="form-label">Company Phone</label>
                    <input type="text" className="form-control" id="companyPhone" name="phone_number" value={companyData.phone_number || ''} onChange={handleCompanyDataChange} disabled={companyLoading} />
                </div>
                <button type="submit" className="btn btn-info" data-i18n="accountPage.company.saveButton" disabled={companyLoading}>
                    {companyLoading ? 'Saving...' : 'Save Company Details'}
                </button>
            </form>
          </div>
        </section>
      )}
      <div id="accountPageMessage" className="mt-3"></div> {/* General message placeholder if needed */}
    </div>
  );
};

export default AccountPage;
