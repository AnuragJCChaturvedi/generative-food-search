from fastapi import FastAPI, HTTPException
from chromadb import Client
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI()

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Chroma DB client
chroma_client = Client()

# Define the collection name
collection_name = "foodpoints"

# Check if the collection exists, create it if not
if collection_name not in chroma_client.list_collections():
    chroma_client.create_collection(collection_name)

# Define the data structure for each store's information
class StoreInfo(BaseModel):
    address: str
    description: str
    lat: float
    lng: float
    quantity: int
    storeName: str

@app.post("/store")
async def store_data(data: Dict[str, StoreInfo]):  # Dictionary where keys are strings (lat/lng) and values are StoreInfo objects
    try:
        collection = chroma_client.get_collection(collection_name)
        
        ids = []
        documents = []
        metadatas = []

        # Iterate over the dictionary
        for unique_key, store_info in data.items():
            print(f"Processing store data for key: {unique_key}")
            try:
                # Collect IDs, documents, and metadata
                ids.append(unique_key)
                documents.append(f"{store_info.storeName}: {store_info.description} at {store_info.address}")
                metadatas.append({
                    "lat": store_info.lat,
                    "lng": store_info.lng,
                    "quantity": store_info.quantity
                })

            except Exception as e:
                print(f"Failed to prepare document for {unique_key}: {e}")
                raise HTTPException(status_code=500, detail=f"Error preparing item: {str(e)}")

        # Use the correct `add` method
        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        return {"message": "All data stored successfully."}

    except Exception as e:
        print(f"Internal server error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store data: {str(e)}")
    

# Endpoint to search the collection using a GET query
@app.get("/search")
async def search_vectors(search_query: Optional[str]):
    try:
        collection = chroma_client.get_collection(collection_name)
        
        # If search_query is provided, treat it as a text query first
        if search_query:
            # Perform text-based query
            search_results = collection.query(
                query_texts=[search_query],  # Searching by text
                n_results=5,  # Adjust as needed
                include=["documents", "metadatas"]  # Include both documents and metadata
            )
        
            # If no documents are found with text search, attempt metadata search
            if not search_results['documents']:
                # Try to interpret the query as a metadata search string (e.g., "lat=40.0,lng=-79.0")
                search_criteria = {}
                for part in search_query.split(","):
                    if "=" in part:
                        key, value = part.split("=")
                        if key in ["lat", "lng", "quantity"]:
                            search_criteria[key] = float(value) if key in ["lat", "lng"] else int(value)
                        else:
                            search_criteria[key] = value

                if search_criteria:
                    # Perform metadata-based query
                    search_results = collection.query(
                        where=search_criteria,
                        n_results=5, 
                        include=["documents", "metadatas"]
                    )

        else:
            raise HTTPException(status_code=400, detail="No search query provided.")

        # Return the results
        return {"documents": search_results['documents'], "metadata": search_results['metadatas']}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")




# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
