import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assests/images/logo.jpeg';
import './home.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import axios from 'axios';

import SearchSuggestions from '../search';

const Home = () => {
  const [query, setQuery] = useState('');
  const [searchMatch, setSearchMatch] = useState({})
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (query.trim()) {
      let serializedLatLngPairs
      try {
        // Make API call to FastAPI endpoint
        const response = await axios.get(
          process.env.REACT_APP_SEARCH_ENDPOINT,
          {
            params: {
              search_query: query,
            }
          }
        );
        // Set the result to state
        setSearchMatch(response.data);
        console.log("Vector database response: ", response.data)
        const latLngPairs = response.data.metadata[0].map(item => {
          return {
              lat: item.lat,
              lng: item.lng
          };
      });

       // Serialize the latLngPairs to JSON
       serializedLatLngPairs = encodeURIComponent(JSON.stringify(latLngPairs));
      
      } catch (error) {
        console.error("Error fetching search results:", error);
      }

      // Navigate with both the query and the latLngPairs in the URL
      navigate(`/searchall?query=${encodeURIComponent(query)}&latLngPairs=${serializedLatLngPairs}`);
    }
  };

  const handleSearchAll = () => {
      navigate(`/searchall`);
  };

  return (
    <div className="home-container">
      <img src={logo} alt="Logo" className="logo" />
      <div className="search-bar">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Generative Any Search"
            className="search-input"
          />
          <button className="search-icon-button" onClick={handleSearch}>
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </div>
        <div className="button-container">
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
          <button onClick={handleSearchAll} className="search-button">
            Search All
          </button>
        </div>
        <div className="suggestions-wrapper">
          <SearchSuggestions />
        </div>
      </div>
    </div>
  );
};

export default Home;
