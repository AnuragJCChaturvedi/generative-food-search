import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';  // For Firebase Realtime Database
import { database } from '../../../firebase';  // Import your Firebase Realtime Database instance
import usePlacesAutocomplete, { getGeocode } from 'use-places-autocomplete';  // For Places API
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Paper,
  MenuItem,
} from '@mui/material';  // Material-UI Components
import './form.css';  // Assuming you still want to use some custom styles

const MetadataForm = ({ clickedLocation, onFormSubmit, onClose, isOpen }) => {
  const [storeName, setStoreName] = useState('');  // Store name
  const [quantity, setQuantity] = useState('');  // Quantity
  const [description, setDescription] = useState('');  // Description
  const [addressValue, setAddressValue] = useState('');  // Address field for auto-fill
  const [loading, setLoading] = useState(false);  // Loading state for address

  // Places Autocomplete setup
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {},
    debounce: 300,
  });

  // Reverse geocode clicked location to get address
  useEffect(() => {
    if (clickedLocation) {
      const fetchAddress = async () => {
        try {
          setLoading(true);  // Start loading
          const results = await getGeocode({ location: clickedLocation });
          if (results.length > 0) {
            setAddressValue(results[0].formatted_address);  // Set the address from lat/lng
          } else {
            setAddressValue('Address not found');
          }
        } catch (error) {
          console.error("Error fetching address: ", error);
          setAddressValue('Address not found');
        } finally {
          setLoading(false);  // End loading
        }
      };
      fetchAddress();
    }
  }, [clickedLocation]);

  // Handle form submission with validation
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Simple validation
    if (!storeName || !quantity || !description) {
      alert("All fields are required.");
      return;
    }

    if (!clickedLocation) {
      alert("Please select a location on the map.");
      return;
    }

    try {
      // Replace '.' with '_' to avoid invalid path errors
      const sanitizedLat = clickedLocation.lat.toString().replace(/\./g, '_');
      const sanitizedLng = clickedLocation.lng.toString().replace(/\./g, '_');
      const storeRef = ref(database, `foodStores/${sanitizedLat}_${sanitizedLng}`);

      // Add metadata to Firebase Realtime Database
      await set(storeRef, {
        lat: clickedLocation.lat,
        lng: clickedLocation.lng,
        address: addressValue,  // Use the auto-filled address
        storeName,
        quantity: Number(quantity),
        description,
      });

      console.log("Metadata added successfully!");
      setStoreName('');
      setDescription('');
      setQuantity('');
      // Let the parent component know that the form was submitted
      onFormSubmit();  // Trigger the parent to clear and close the form
      onClose();  // Close the drawer
      
    } catch (error) {
      console.error("Error adding metadata: ", error);
    }
  };

  // Handle address selection from autocomplete
  const handleSelectAddress = async (suggestion) => {
    setValue(suggestion.description, false);  // Set the selected address in the input field
    clearSuggestions();  // Clear the suggestions list

    try {
      const results = await getGeocode({ address: suggestion.description });
      setAddressValue(suggestion.description);  // Set the address manually from the suggestion
    } catch (error) {
      console.log("Error fetching address: ", error);
    }
  };

  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose}></div>}

      <Box className={`metadata-form-container sideways-drawer ${isOpen ? 'open' : ''}`}>
        <Paper elevation={3} sx={{ padding: 3, maxWidth: '400px', margin: 'auto' }}>
          <Typography variant="h5" gutterBottom>Add Food Availability Details</Typography>
          {loading && <CircularProgress size={24} />}
          
          <form onSubmit={handleFormSubmit} className="metadata-form">
            <TextField
              label="Address"
              fullWidth
              value={addressValue || value}
              onChange={(e) => setValue(e.target.value)}
              helperText="Search for an address"
              variant="outlined"
              margin="normal"
              required
            />
            {status === "OK" && (
              <Box component="ul" className="address-suggestions">
                {data.map((suggestion) => (
                  <MenuItem
                    key={suggestion.place_id}
                    onClick={() => handleSelectAddress(suggestion)}
                  >
                    {suggestion.description}
                  </MenuItem>
                ))}
              </Box>
            )}

            <TextField
              label="Store Name"
              fullWidth
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter store name"
              variant="outlined"
              margin="normal"
              required
            />

            <TextField
              label="Quantity"
              fullWidth
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              variant="outlined"
              margin="normal"
              required
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              variant="outlined"
              margin="normal"
              required
            />

            <Box display="flex" justifyContent="space-between" marginTop={2}>
              <Button type="submit" variant="contained" color="primary">
                Submit
              </Button>
              <Button onClick={onClose} variant="outlined" color="secondary">
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </>
  );
};

export default MetadataForm;
