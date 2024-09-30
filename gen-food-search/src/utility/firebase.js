import { useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase"
import axios from "axios";

function FirebaseUtility() {
  
  useEffect(() => {
    const fetchFirebaseData = () => {
      const dbRef = ref(database, process.env.REACT_APP_DATABASE_NAME);
      
      onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          sendToPythonAPI(data);
        }
      });
    };

    // Set an interval to fetch the data periodically (e.g., every 10 minutes)
    const intervalId = setInterval(() => {
      fetchFirebaseData();
    }, 6000); // 600000ms = 10 minutes

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);


  const sendToPythonAPI = (data) => {
    axios
      .post(process.env.REACT_APP_STORE_ENDPOINT, data )
      .then((response) => console.log("Data sent successfully"))
      .catch((error) => console.error("Error sending data:", error));
  };

  return null;
}

export default FirebaseUtility;
