// js/addProperty.js
document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'add';
  let editingPropertyId = null;
  let editingPropertyImageOldPath = null;
  const propertyIdStoreInput = document.getElementById('propertyIdStore'); // Get the hidden input
  const modalTitleElement = document.getElementById('addPropertyModalLabel');
  // Note: submitButton will be properly queried after addPropertyForm is confirmed to exist.
  let submitButton;
  let originalModalTitle = modalTitleElement ? modalTitleElement.textContent : 'Add New Property';
  let originalSubmitButtonText; // Will be set after submitButton is queried.

  const addPropertyModalElement = document.getElementById('addPropertyModal');
  const addPropertyForm = document.getElementById('addPropertyForm');
  const propertyImageFile = document.getElementById('propertyImageFile');
  const propertyImagePreview = document.getElementById('propertyImagePreview');
  const addPropertyMessage = document.getElementById('addPropertyMessage');

  let addPropertyModalInstance;
  if (addPropertyModalElement) {
    addPropertyModalInstance = new bootstrap.Modal(addPropertyModalElement);
  }

  // Query for submit button after ensuring addPropertyForm exists.
  if (addPropertyForm) {
    submitButton = addPropertyForm.querySelector('button[type="submit"]');
    if (submitButton) {
      originalSubmitButtonText = submitButton.textContent;
    }
  }

  // Set originalModalTitle again in case it was fetched before modalTitleElement was ready (though unlikely with DOMContentLoaded)
  if (modalTitleElement && !originalModalTitle) {
      originalModalTitle = modalTitleElement.textContent;
  }


  // Image preview logic
  if (propertyImageFile && propertyImagePreview) {
    propertyImageFile.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          propertyImagePreview.src = e.target.result;
          propertyImagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      } else {
        propertyImagePreview.src = '#';
        propertyImagePreview.style.display = 'none';
      }
    });
  }

  function openEditModal(propertyData) {
    // console.log("Data received by openEditModal:", JSON.stringify(propertyData, null, 2)); // Kept for potential future debugging if commented out

    if (!addPropertyModalInstance || !addPropertyForm) {
      console.error('Add Property Modal or Form not initialized.');
      return;
    }
    currentMode = 'edit';
    editingPropertyId = propertyData.id; // Assuming propertyData has an 'id' field
    editingPropertyImageOldPath = propertyData.old_image_path || null;
    if (propertyIdStoreInput) {
      propertyIdStoreInput.value = propertyData.id;
    }

    // Populate form fields
    const fieldsToPopulate = {
      'propertyName': propertyData.property_name,
      'propertyAddress': propertyData.address,
      'propertyType': propertyData.property_type,
      'propertyOccupier': propertyData.property_occupier,
      'propertyDescription': propertyData.property_details
    };

    for (const id in fieldsToPopulate) {
      const element = addPropertyForm.querySelector(`#${id}`);
      if (element) {
        const valueToSet = fieldsToPopulate[id] || '';
        element.value = valueToSet;
      } else {
        console.error(`Element with ID '${id}' not found during modal population!`);
      }
    }

    // Handle image preview
    if (propertyData.property_image_url && propertyImagePreview) {
      propertyImagePreview.src = propertyData.property_image_url;
      propertyImagePreview.style.display = 'block';
    } else if (propertyImagePreview) {
      propertyImagePreview.src = '#';
      propertyImagePreview.style.display = 'none';
    } else {
      // This case means propertyImagePreview itself was null during DOMContentLoaded
      console.error('propertyImagePreview element reference is missing!');
    }

    // Clear the file input
    if (propertyImageFile) {
        propertyImageFile.value = '';
    } else {
       // This case means propertyImageFile itself was null during DOMContentLoaded
      console.error('propertyImageFile element reference is missing!');
    }

    // Dynamically set/remove 'required' attribute for file input in edit mode
    if (propertyImageFile) { // Ensure propertyImageFile element exists
      if (propertyData.property_image_url) { // If there's an existing image
        propertyImageFile.removeAttribute('required');
        console.log("Edit mode with existing image: 'required' attribute removed from propertyImageFile.");
      } else { // No existing image, so make it required
        propertyImageFile.setAttribute('required', 'required');
        console.log("Edit mode with no existing image: 'required' attribute set for propertyImageFile.");
      }
    }

    if (modalTitleElement) modalTitleElement.textContent = 'Edit Property';
    if (submitButton) submitButton.textContent = 'Save Changes';

    // --- Start Diagnostic Logging (for context) ---
    console.log('--- openEditModal ---');
    console.log('Editing property data (raw):', JSON.stringify(propertyData, null, 2));

    if (propertyData) {
        console.log('Raw qr_code_image_url (in openEditModal):', propertyData.qr_code_image_url);
        // Dataset properties for QR button removed
    } else {
        console.log('propertyData object is null or undefined (in openEditModal).');
    }
    // --- End Diagnostic Logging (for context) ---

    // QR Code button logic removed from 'shown.bs.modal'
    addPropertyModalInstance.show();
  }
  window.openEditModal = openEditModal; // Expose globally

  async function attemptQrCodeGeneration(newPropertyId, userId, retriesLeft = 15) { // Added userId
    if (typeof qrcode !== 'undefined') {
      try {
        console.log('qrcode-generator is ready. Generating QR code for property ID:', newPropertyId);
        const propertyUrl = `${window.location.origin}/pages/property-details.html?id=${newPropertyId}`;

        var qrInstance = qrcode(0, 'H');
        qrInstance.addData(propertyUrl);
        qrInstance.make();

        var qrDataURL = qrInstance.createDataURL(4, 4);

        const qrImageBlob = await new Promise(resolve => {
          fetch(qrDataURL)
            .then(res => res.blob())
            .then(resolve);
        });

        const filePath = `users/${userId}/qr_codes/qr_${newPropertyId}.png`; // Updated filePath

        const { data: uploadData, error: uploadError } = await window._supabase.storage
          .from('property-qr-codes')
          .upload(filePath, qrImageBlob, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading QR code (qrcode-generator):', uploadError);
          showMessage('Property created, but QR code upload failed. You can generate it later.', 'warning');
        } else {
          const { data: publicUrlData } = window._supabase.storage
            .from('property-qr-codes')
            .getPublicUrl(filePath);

          if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('Error getting public URL for QR code (qrcode-generator):', publicUrlData);
            showMessage('Property created, QR uploaded, but failed to get its URL. Please check storage.', 'warning');
          } else {
            const qrCodeImageUrl = publicUrlData.publicUrl;
            const { error: updateError } = await window._supabase
              .from('properties')
              .update({ qr_code_image_url: qrCodeImageUrl, generate_qr_on_creation: true })
              .eq('id', newPropertyId);

            if (updateError) {
              console.error('Error updating property with QR code URL (qrcode-generator):', updateError);
              showMessage('Property created, QR uploaded, but failed to update property record with QR URL.', 'warning');
            } else {
              console.log('Property created and updated with QR code URL (qrcode-generator):', qrCodeImageUrl);
            }
          }
        }
      } catch (qrError) {
        console.error('Error during QR code generation/upload process (qrcode-generator):', qrError);
        showMessage(`Property created, but an error occurred during QR code processing: ${qrError.message}`, 'warning');
      }
    } else {
      if (retriesLeft > 0) {
        console.log(`qrcode-generator not ready, ${retriesLeft} retries left. Retrying in 200ms...`);
        // Note: We are not awaiting the setTimeout promise itself, but the recursive call will be.
        // This means the current attemptQrCodeGeneration will finish, but the chain of retries might continue.
        // If the library loads, one of the later calls will complete the QR generation.
        // If all retries exhaust, the final error message will be shown.
        // This is acceptable as the main property creation flow is what we are about to await.
        setTimeout(() => attemptQrCodeGeneration(newPropertyId, userId, retriesLeft - 1), 200);
      } else {
        console.error('qrcode-generator library did not load after multiple retries.');
        showMessage('Property created, but QR code generation failed: Required library (qrcode-generator) did not load. You can try generating it later.', 'warning');
      }
    }
  }

  // Handle form submission
  if (addPropertyForm && window._supabase) {
    // Re-assign submitButton here if it wasn't assigned due to addPropertyForm not being found initially
    // This is a bit redundant if DOMContentLoaded works as expected, but safe.
    if (!submitButton) {
        submitButton = addPropertyForm.querySelector('button[type="submit"]');
        if (submitButton && !originalSubmitButtonText) { // Set original text if not already set
            originalSubmitButtonText = submitButton.textContent;
        }
    }

    addPropertyForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      const formSubmitButton = event.currentTarget.querySelector('button[type="submit"]');

      addPropertyMessage.style.display = 'none';
      addPropertyMessage.textContent = '';
      addPropertyMessage.className = 'alert'; // Reset classes

      // Ensure formSubmitButton is valid before using
      if (!formSubmitButton) {
        console.error("Submit button not found on the form.");
        showMessage('Error: Submit button is missing from the form.', 'danger');
        return;
      }
      formSubmitButton.disabled = true;
      formSubmitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${currentMode === 'edit' ? 'Saving Changes...' : 'Saving...'}`;

      try {
        if (currentMode === 'edit') {
          // Edit mode logic
          const propertyId = editingPropertyId || (propertyIdStoreInput ? propertyIdStoreInput.value : null);
          if (!propertyId) {
            throw new Error("Property ID is missing. Cannot update.");
          }
          const originalButtonText = 'Save Changes';
          let newImageFile = propertyImageFile.files[0];
          const updatedPropertyPayload = {
            property_id: propertyId,
            property_name: addPropertyForm.querySelector('#propertyName').value,
            address: addPropertyForm.querySelector('#propertyAddress').value,
            property_type: addPropertyForm.querySelector('#propertyType').value,
            property_occupier: addPropertyForm.querySelector('#propertyOccupier').value,
            property_details: addPropertyForm.querySelector('#propertyDescription').value,
          };

          try {
            if (newImageFile) {
              const { data: { user }, error: getUserError } = await window._supabase.auth.getUser();
              if (getUserError || !user) throw new Error("User not authenticated.");
              const fileName = `${Date.now()}-${newImageFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
              const filePath = `users/${user.id}/property_images/${fileName}`;
              const { data: uploadData, error: uploadError } = await window._supabase.storage.from('property-images').upload(filePath, newImageFile, { cacheControl: '3600', upsert: false });
              if (uploadError) throw new Error(`New image upload failed: ${uploadError.message}`);
              const { data: publicUrlData, error: publicUrlError } = window._supabase.storage.from('property-images').getPublicUrl(uploadData.path);
              if (publicUrlError) throw new Error(`Failed to get new image public URL: ${publicUrlError.message}`);
              updatedPropertyPayload.property_image_url = publicUrlData.publicUrl;
              if (editingPropertyImageOldPath) {
                updatedPropertyPayload.old_property_image_to_delete_path = editingPropertyImageOldPath;
              }
            } else {
              if (propertyImagePreview.src && propertyImagePreview.src !== '#' && !propertyImagePreview.src.startsWith('data:')) {
                   updatedPropertyPayload.property_image_url = propertyImagePreview.src;
              } else {
                  updatedPropertyPayload.property_image_url = null;
              }
            }

            const { data: functionResponseData, error: functionInvokeError } = await window._supabase.functions.invoke('update-property', { body: updatedPropertyPayload });
            if (functionInvokeError) {
              let errMsg = "Failed to update property.";
              if (functionInvokeError.context && typeof functionInvokeError.context.json === 'function') {
                  try { const errJson = await functionInvokeError.context.json(); if (errJson.error) errMsg = errJson.error; } catch(e) { /* ignore */ }
              } else if (functionInvokeError.message) errMsg = functionInvokeError.message;
              throw new Error(errMsg);
            }
            if (functionResponseData && functionResponseData.error) throw new Error(functionResponseData.error);
            if (!functionResponseData || !functionResponseData.success) throw new Error('Failed to update property due to an unexpected server response.');

            // QR code generation for EDITED properties is handled by a button added in 'shown.bs.modal'
            // No automatic QR generation on general update anymore.

            showMessage('Property updated successfully!', 'success');
            if (addPropertyModalInstance) addPropertyModalInstance.hide();
            if (typeof window.loadPropertyDetails === 'function') window.loadPropertyDetails();
            else if (typeof window.refreshPropertiesList === 'function') window.refreshPropertiesList();

          } catch (error) {
            console.error('Error updating property:', error);
            showMessage(error.message || 'An unexpected error occurred during update.', 'danger');
          } finally {
            if (formSubmitButton) {
              formSubmitButton.disabled = false;
              formSubmitButton.innerHTML = originalButtonText;
            }
          }
          return; 
        }

        // ADD MODE LOGIC CONTINUES BELOW
        // const generateQr = document.getElementById('generateQrCodeCheckbox').checked; // Checkbox removed

        const formData = {
            property_name: document.getElementById('propertyName').value,
            address: document.getElementById('propertyAddress').value,
            property_type: document.getElementById('propertyType').value,
            occupier: document.getElementById('propertyOccupier').value,
            description: document.getElementById('propertyDescription').value,
            imageFile: propertyImageFile.files[0]
        };

        if (!formData.property_name || !formData.address || !formData.property_type || !formData.occupier || !formData.imageFile) {
            showMessage('All fields including image are required.', 'danger');
            if (formSubmitButton) {
                formSubmitButton.disabled = false;
                formSubmitButton.textContent = originalSubmitButtonText || 'Save Property';
            }
            return;
        }
         if (formData.imageFile.size > 5 * 1024 * 1024) {
            showMessage('Image file size should not exceed 5MB.', 'danger');
             if (formSubmitButton) {
                formSubmitButton.disabled = false;
                formSubmitButton.textContent = originalSubmitButtonText || 'Save Property';
            }
            return;
        }

        const file = formData.imageFile;
        const { data: { user }, error: getUserError } = await window._supabase.auth.getUser(); // User object fetched here
        if (getUserError || !user) throw new Error("User not authenticated.");

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        const filePath = `users/${user.id}/property_images/${fileName}`;

        const { data: uploadData, error: uploadError } = await window._supabase.storage.from('property-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        const { data: publicUrlData, error: publicUrlError } = await window._supabase.storage.from('property-images').getPublicUrl(uploadData.path);
        if (publicUrlError) throw new Error(`Failed to get image public URL: ${publicUrlError.message}`);
        const imageUrl = publicUrlData.publicUrl;

        let companyId;
        try {
          const { data: companyData, error: companyError } = await window._supabase.from('companies').select('id').eq('owner_id', user.id).limit(1).single();
          if (companyError) throw new Error('Could not determine company.');
          if (!companyData || !companyData.id) throw new Error('No company found for account.');
          companyId = companyData.id;
        } catch (e) {
          showMessage(e.message || 'Failed to fetch company details.', 'danger');
          if (formSubmitButton) {
            formSubmitButton.disabled = false;
            formSubmitButton.textContent = originalSubmitButtonText || 'Save Property';
          }
          return;
        }

        const propertyPayload = {
          property_name: formData.property_name,
          address: formData.address,
          property_type: formData.property_type,
          property_occupier: formData.occupier, 
          property_details: formData.description, 
          property_image_url: imageUrl,
          company_id: companyId, 
          qr_code_image_url: null 
        };

        const { data: functionResponseData, error: functionInvokeError } = await window._supabase.functions.invoke('create-property', { body: propertyPayload });

        if (functionInvokeError) {
          let errMsg = "Failed to create property.";
          if (functionInvokeError.context && typeof functionInvokeError.context.json === 'function') {
            try { const errJson = await functionInvokeError.context.json(); if (errJson.error) errMsg = errJson.error; } catch(e) { /* ignore */ }
          } else if (functionInvokeError.message) errMsg = functionInvokeError.message;
          throw new Error(errMsg); 
        }
        if (functionResponseData && functionResponseData.error) throw new Error(functionResponseData.error);
        
        const newPropertyId = functionResponseData.data.id;

        // Always generate QR for new properties
        console.log('Always generating QR code for new property ID:', newPropertyId);
        await attemptQrCodeGeneration(newPropertyId, user.id);

        showMessage('Property created successfully!', 'success');
        addPropertyForm.reset();
        propertyImagePreview.style.display = 'none';
        if (addPropertyModalInstance) addPropertyModalInstance.hide();
        if (typeof window.refreshPropertiesList === 'function') window.refreshPropertiesList();
        else alert("Property created! Refresh page.");

      } catch (error) {
        console.error('Submission error object:', error); 
        showMessage(error.message || 'An unexpected error occurred.', 'danger');
      } finally {
        if (formSubmitButton) {
            formSubmitButton.disabled = false;
            if (currentMode === 'edit' && formSubmitButton.innerHTML.includes('spinner')) {
                 formSubmitButton.textContent = 'Save Changes'; 
            } else if (currentMode === 'add' && formSubmitButton.innerHTML.includes('spinner')) {
                 formSubmitButton.textContent = originalSubmitButtonText || 'Save Property'; 
            }
        }
      }
    });
  } else {
    if (!addPropertyForm) console.error('Add Property Form (`addPropertyForm`) not found on this page.');
    if (!window._supabase) console.error('Supabase client (`window._supabase`) not found.');
  }

  function showMessage(message, type = 'info') {
    if (addPropertyMessage) {
      addPropertyMessage.textContent = message;
      addPropertyMessage.className = `alert alert-${type} alert-dismissible fade show`; 
      addPropertyMessage.style.display = 'block';
    } else {
      console.log (`Message for user (${type}):`, message);
    }
  }

  if (addPropertyModalElement) {
    addPropertyModalElement.addEventListener('hidden.bs.modal', function () {
      currentMode = 'add';
      editingPropertyId = null;
      editingPropertyImageOldPath = null;
      if (propertyIdStoreInput) propertyIdStoreInput.value = '';
      if (modalTitleElement) modalTitleElement.textContent = originalModalTitle || 'Add New Property'; 
      if (submitButton) {
        submitButton.textContent = originalSubmitButtonText || 'Save Property'; 
        submitButton.disabled = false; 
      }
      if (addPropertyForm) addPropertyForm.reset(); 
      if (propertyImageFile) propertyImageFile.setAttribute('required', 'required');
      if (propertyImagePreview) {
        propertyImagePreview.src = '#';
        propertyImagePreview.style.display = 'none';
      }
      if (addPropertyMessage) {
        addPropertyMessage.style.display = 'none';
        addPropertyMessage.textContent = '';
        addPropertyMessage.className = 'alert';
      }

      // Clear the dynamic QR button placeholder (which no longer exists) - removed
    });

    // Event listener for 'shown.bs.modal' (QR button logic removed)
    // If this listener has no other purpose, it could be removed entirely.
    // For now, let's keep it but empty its edit-mode specific QR logic.
    addPropertyModalElement.addEventListener('shown.bs.modal', function(event) {
        if (currentMode !== 'edit') {
            console.log('shown.bs.modal: Not in edit mode. No QR button logic needed.');
            return;
        }
        // All edit-mode QR button logic removed from here.
        // Relevant console logs for currentQrUrl or propertyIdForQrFromDataset are also removed as they were tied to the button.
        console.log('shown.bs.modal: Edit mode. QR button functionality has been removed.');
    });
  } // End of if (addPropertyModalElement)
});
