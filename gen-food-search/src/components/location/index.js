import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { ref, onValue, update, set } from 'firebase/database'; // Correctly import `set` from Firebase
import { database } from '../../firebase'; // Firebase config
import MetadataForm from './form'; // Import the form component
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';

import { useLocation } from 'react-router-dom';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
};

const defaultCenter = {
  lat: 40.712776, // Default latitude (New York City)
  lng: -74.005974, // Default longitude (New York City)
};

const pageBackgroundStyle = {
  minHeight: '100vh',
  backgroundImage: 'linear-gradient(135deg, #f0f4f8, #c9d6ff)', // Soft gradient background
  padding: '50px 0',
};

const infoWindowStyle = {
  backgroundColor: '#ffffff', // Card-like background
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
  borderRadius: '8px',
  padding: '15px',
  maxWidth: '300px',
};

const buttonStyles = {
  backgroundColor: '#1976d2',
  color: '#fff',
  margin: '10px 0',
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
};

// Default marker to use if window.google.maps is not available
const defaultMarkerIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 3.87 7 13 7 13s7-9.13 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z', 
  fillColor: '#FF0000', // Default red color
  fillOpacity: 1,
  strokeWeight: 2,
  strokeColor: '#000',
  scale: 1.5,
  anchor: { x: 12, y: 24 }, // Fallback anchor object in case google.maps.Point is not ready
};

// Function to return a custom SVG marker based on quantity
const getCustomSVGMarker = (quantity) => {
  if (!window.google || !window.google.maps) {
    return defaultMarkerIcon; // Return default marker when Google Maps is not loaded
  }

  let color = '#FF0000'; // Default color: red
  if (quantity > 10) {
    color = '#00FF00'; // Green for large quantities
  } else if (quantity > 5) {
    color = '#FFFF00'; // Yellow for medium quantities
  }

  // Return SVG string for the custom marker
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 3.87 7 13 7 13s7-9.13 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z', // Custom marker path (pin shape)
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#000',
    scale: 1.5, // Marker size
    anchor: new window.google.maps.Point(12, 24), // Position anchor
  };
};

const SearchAllPage = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [loading, setLoading] = useState(true); // For loading spinner
  const [showSnackbar, setShowSnackbar] = useState(false); // For feedback messages
  const [newQuantity, setNewQuantity] = useState(null); // For editing quantity
  const [mapRef, setMapRef] = useState(null); // Correctly define `setMapRef`
  const [isEditingQuantity, setIsEditingQuantity] = useState(false); // Track if the user is editing the quantity

  const location = useLocation();  // Get the current URL
  const [query, setQuery] = useState('');
  const [latLngPairs, setLatLngPairs] = useState([]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Get the query parameter 'query'
    const searchQuery = params.get('query');
    console.log("My search query: ", searchQuery)
    setQuery(searchQuery);

    // Get the latLngPairs from the URL and deserialize
    const latLngPairsString = params.get('latLngPairs');
    if (latLngPairsString) {
      try {
        // Decode the URL component and parse the JSON string
        const parsedLatLngPairs = JSON.parse(decodeURIComponent(latLngPairsString));
        setLatLngPairs(parsedLatLngPairs);
      } catch (error) {
        console.error('Error parsing latLngPairs:', error);
      }
    }
  }, [location.search]);

  // Function to reverse geocode lat/lng to an address
  const getAddressFromLatLng = useCallback(async (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        return response.results[0].formatted_address;
      }
      return 'Address not found';
    } catch (error) {
      console.error('Error fetching address: ', error);
      return 'Address not found';
    }
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoading(false); // Stop loading spinner
        },
        () => {
          setCurrentLocation(defaultCenter);
          setLoading(false); // Stop loading spinner
        }
      );
    } else {
      setCurrentLocation(defaultCenter);
      setLoading(false); // Stop loading spinner
    }
  }, []);

  // Retrieve data from Firebase Realtime Database
  useEffect(() => {
    const storeRef = ref(database, process.env.REACT_APP_DATABASE_NAME);
    onValue(storeRef, (snapshot) => {
      const data = snapshot.val();
      const markerData = [];

      const checks = {}
      if (latLngPairs && latLngPairs.length) {
        latLngPairs.map((pair, i) => {
          console.log("I have")
          console.log(`${pair.lat}:${pair.lng}`)
          checks[`${pair.lat}:${pair.lng}`] = true
      })
      }

      for (let key in data) {
        const { lat, lng, quantity, storeName, description, address, contact } = data[key];
        if (query && !checks[`${lat}:${lng}`]) {
          continue
        }
        if ( quantity >= 1) {
          markerData.push({
            lat,
            lng,
            quantity,
            storeName,
            description, // Include description
            address, // Include address
            contact, // Include contact information
            key,
          });
        }
      }
      setMarkers(markerData);
    });
  }, [latLngPairs]);

  // Handle map click to get lat/lng and reverse geocode address
  const handleMapClick = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setClickedLocation({ lat, lng });
    setIsDrawerOpen(true); // Open metadata form on map click

    const fetchedAddress = await getAddressFromLatLng(lat, lng);
    setAddress(fetchedAddress);
  };

  // Add metadata and save to Firebase
  const handleFormSubmit = async (metadata) => {
    try {
      const { storeName = "", quantity = 0, description = "", contact = ""} = metadata;

      // Sanitize lat/lng keys
      const sanitizedLat = clickedLocation.lat.toString().replace('.', '_');
      const sanitizedLng = clickedLocation.lng.toString().replace('.', '_');

      // Save to Firebase
      await set(ref(database, `foodStores/${sanitizedLat}_${sanitizedLng}`), {
        lat: clickedLocation.lat,
        lng: clickedLocation.lng,
        address,
        storeName,
        quantity: Number(quantity),
        description,
        contact,
      });

      // Refresh the markers to display the new one
      setMarkers((prevMarkers) => [
        ...prevMarkers,
        { lat: clickedLocation.lat, lng: clickedLocation.lng, storeName, quantity, description, contact, address },
      ]);

      // Close the form and show success
      setIsDrawerOpen(false);
      setShowSnackbar(true); // Show success snackbar
    } catch (error) {
      console.error('Error saving metadata: ', error);
    }
  };

  // Update quantity in Firebase and close the InfoWindow
  const handleUpdateQuantity = async (marker) => {
    const markerRef = ref(database, `foodStores/${marker.key}`);
    try {
      await update(markerRef, { quantity: Number(newQuantity || marker.quantity) });
      setNewQuantity(null);
      setIsEditingQuantity(false); // Close edit mode
      setSelectedMarker(null); // Close InfoWindow after updating
      setShowSnackbar(true); // Show success message
    } catch (error) {
      console.error('Error updating quantity: ', error);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <Box sx={pageBackgroundStyle}>
      <Box sx={{ textAlign: 'center', p: 5 }}>
        <Typography variant="h4" sx={{ color: '#1976d2', marginBottom: '30px' }}>
          Food Rescue
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY} libraries={['places']}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentLocation || defaultCenter}
              zoom={12}
              onClick={handleMapClick}
              onLoad={setMapRef} // Correctly set the map reference
            >
              {markers.map((marker, index) => (
                <Marker
                  key={index}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  label={{
                    text: String(marker.quantity), // Show quantity in the marker label
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                  icon={getCustomSVGMarker(marker.quantity)} // Use the custom marker SVG
                  onClick={() => setSelectedMarker(marker)}
                >
                  {selectedMarker?.lat === marker.lat && selectedMarker?.lng === marker.lng && (
                    <InfoWindow
                      position={{ lat: marker.lat, lng: marker.lng }}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <Box sx={infoWindowStyle}>
                        <h4>{marker.storeName}</h4>
                        <p>Quantity: {marker.quantity}</p>
                        <p><strong>Address:</strong> {marker.address}</p>
                        <p><strong>Description:</strong> {marker.description}</p>
                        <p><strong>Contact:</strong> {marker.contact}</p>

                        {!isEditingQuantity ? (
                          <Button
                            variant="contained"
                            onClick={() => setIsEditingQuantity(true)} // Open the edit field
                            sx={buttonStyles}
                          >
                            Edit Quantity
                          </Button>
                        ) : (
                          <>
                            <TextField
                              label="Edit Quantity"
                              type="number"
                              value={newQuantity || marker.quantity}
                              onChange={(e) => setNewQuantity(e.target.value)}
                              fullWidth
                              size="small"
                              sx={{ marginTop: '10px' }}
                            />
                            <Button
                              variant="contained"
                              onClick={() => handleUpdateQuantity(marker)}
                              sx={buttonStyles}
                            >
                              Update Quantity
                            </Button>
                          </>
                        )}
                      </Box>
                    </InfoWindow>
                  )}
                </Marker>
              ))}

              {clickedLocation && <Marker position={clickedLocation} />}
            </GoogleMap>
          </LoadScript>
        )}

        {/* Metadata Form for adding new marker data */}
        <MetadataForm
          isOpen={isDrawerOpen}
          clickedLocation={clickedLocation}
          address={address}
          onFormSubmit={handleFormSubmit}
          onClose={() => setIsDrawerOpen(false)} // Close the drawer
        />

        {/* Snackbar for success message */}
        <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            Action completed successfully!
          </Alert>
        </Snackbar>

        {/* Display the list of available food locations below the map */}
        <Box sx={{ marginTop: '30px', padding: '0 20px' }}>
          <Typography variant="h5" sx={{ marginBottom: '20px' }}>
            Food Available Locations
          </Typography>
          <List>
            {markers.map((marker, index) => (
              <div key={index}>
                <ListItem button onClick={() => setSelectedMarker(marker)}>
                  <ListItemText
                    primary={marker.storeName} // Store name as primary text
                    secondary={ // Combine quantity and description in secondary text
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          Quantity: {marker.quantity}
                        </Typography>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {' — '}{marker.description} {/* Add description */}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider />
              </div>
            ))}
          </List>
        </Box>
      </Box>
    </Box>
  );
};

export default SearchAllPage;
