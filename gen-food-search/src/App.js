import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/home';
import Location from './components/location';

import FirebaseUtility from './utility/firebase'; 

const App = () => {
  return (
    <>
    <FirebaseUtility /> 
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/searchall" element={<Location />} />
      </Routes>
      </>
  );
};

export default App;
