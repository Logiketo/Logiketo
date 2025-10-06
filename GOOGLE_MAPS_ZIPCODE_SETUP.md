# Google Maps Zip Code to Location Setup

## ✅ **Zip Code Auto-Location Feature Added!**

The Units page now includes automatic location detection from zip codes using Google Maps Geocoding API.

### **Features Added:**
- 🗺️ **Automatic Location Detection** - Enter a zip code and get the full location
- 📍 **Real-time Geocoding** - Uses Google Maps API to convert zip codes to addresses
- ⚡ **Smart Debouncing** - Waits 1 second after typing to avoid excessive API calls
- 🔄 **Loading States** - Shows loading indicators during geocoding
- 🎯 **US Focused** - Optimized for US zip codes

### **How It Works:**
1. **Enter Zip Code** - Type a US zip code in the Units edit form
2. **Auto-Detection** - System automatically detects the location after 1 second
3. **Location Populated** - Full address appears in the location field
4. **Success Notification** - Toast message confirms location was found

### **Setup Required:**

To enable the zip code to location feature, you need to:

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable these APIs:
     - **Maps JavaScript API**
     - **Geocoding API**
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Add API Key to Environment:**
   - Create a `.env` file in the `frontend` folder
   - Add your API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. **Restart the Development Server:**
   ```bash
   npm run dev
   ```

### **What You'll See:**
- **Loading States**: "Loading Google Maps..." when API is loading
- **Geocoding Indicator**: Spinning loader when converting zip code
- **Success Messages**: "Location updated from zip code!" when successful
- **Error Handling**: Clear messages if zip code is invalid or API fails

### **Example Usage:**
1. Go to Units page
2. Click "Edit Unit Details" on any unit
3. Enter a zip code like "10001" (New York)
4. Wait 1 second - location automatically populates as "New York, NY, United States"
5. Save the unit

### **Supported Formats:**
- **5-digit ZIP**: 10001
- **ZIP+4**: 10001-1234
- **US Only**: Currently optimized for United States zip codes

The feature works seamlessly with the existing Units management system and provides a much better user experience for location tracking! 🎉

---

**Note**: Without the API key, the zip code field will be disabled with a helpful message. The feature will work perfectly once you add your Google Maps API key.
