# 📱 Mobile Photo Storage & Asset ID Matching Guide

## 🎯 Photo Filename System

### How It Works
When you take or upload a photo for an asset, the system automatically generates a filename that matches the asset ID:

```
Format: {ASSET_ID}_photo_{INDEX}_{TIMESTAMP}.jpg

Example: 
550e8400-e29b-41d4-a716-446655440000_photo_1_2025-01-29T10-30-45-123Z.jpg
```

### Benefits
- ✅ **Perfect Matching**: Each photo is uniquely linked to its asset
- ✅ **No Confusion**: Multiple assets can't have conflicting photo names
- ✅ **Chronological Order**: Timestamp shows when photo was taken
- ✅ **Easy Sorting**: Photos group by asset ID automatically

## 📂 Mobile Photo Storage Locations

### Android Devices

#### Default Camera App Photos
```
/storage/emulated/0/DCIM/Camera/
/storage/emulated/0/Pictures/
/sdcard/DCIM/Camera/
```

#### App-Specific Photos (when using camera through web app)
```
/storage/emulated/0/Android/data/com.android.chrome/files/Pictures/
/storage/emulated/0/Download/
```

#### External SD Card (if available)
```
/storage/[SD_CARD_ID]/DCIM/Camera/
/storage/[SD_CARD_ID]/Pictures/
```

### iOS Devices

#### Photos App (Camera Roll)
```
Photos app → Albums → Camera Roll
Photos app → Albums → Screenshots (for saved images)
```

#### Files App Locations
```
Files → On My iPhone → [App Name]/
Files → iCloud Drive → [App Name]/
```

#### Safari Downloads
```
Files → On My iPhone → Downloads/
Settings → Safari → Downloads → [Selected Location]
```

## 🔍 How to Find Your Photos

### Android
1. **File Manager App**
   - Open any file manager (Files, ES File Explorer, etc.)
   - Navigate to `Internal Storage/DCIM/Camera/`
   - Look for files starting with your asset ID

2. **Gallery App**
   - Open Gallery/Photos app
   - Check "Camera" or "Downloads" album
   - Photos taken through the web app appear here

3. **Chrome Downloads**
   - Chrome → Menu (⋮) → Downloads
   - Shows photos saved from the web app

### iOS
1. **Photos App**
   - Open Photos app
   - Check "Recents" or "Camera Roll"
   - Photos taken through Safari appear here

2. **Files App**
   - Open Files app
   - Check "Downloads" folder
   - Look in "On My iPhone" → Safari

3. **Safari Downloads**
   - Safari → Downloads button (arrow pointing down)
   - Shows recent downloads including photos

## 🔧 Technical Implementation

### In the App
```javascript
// Generate asset ID
const assetId = crypto.randomUUID()

// Create filename when photo is taken
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const photoIndex = photos.length + 1
const filename = `${assetId}_photo_${photoIndex}_${timestamp}.jpg`

// Store photo with metadata
const photoData = {
  data: base64ImageData,
  filename: filename,
  assetId: assetId,
  capturedAt: timestamp
}
```

### Photo Metadata Structure
```json
{
  "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "filename": "550e8400-e29b-41d4-a716-446655440000_photo_1_2025-01-29T10-30-45-123Z.jpg",
  "originalName": "IMG_20250129_103045.jpg",
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "capturedAt": "2025-01-29T10:30:45.123Z"
}
```

## 📋 Best Practices

### For Field Work
1. **Take Multiple Photos**: Each gets a unique index number
2. **Consistent Naming**: System handles this automatically
3. **Backup Strategy**: Photos are stored both locally and in the app
4. **Offline Capability**: Photos work even without internet

### For Data Management
1. **Export Options**: Use the Layer Manager to export all data
2. **CSV Export**: Includes photo URLs and filenames
3. **GeoJSON Export**: Contains photo metadata
4. **Batch Operations**: Handle multiple assets at once

## 🚀 Advanced Features

### Photo Search & Matching
```javascript
// Find all photos for a specific asset
const assetPhotos = allPhotos.filter(photo => 
  photo.filename.startsWith(assetId)
)

// Get photo count for an asset
const photoCount = assetPhotos.length

// Sort photos by capture time
const sortedPhotos = assetPhotos.sort((a, b) => 
  new Date(a.capturedAt) - new Date(b.capturedAt)
)
```

### Bulk Export with Proper Filenames
When you export data, the system:
- ✅ Maintains original filenames
- ✅ Groups photos by asset ID
- ✅ Includes metadata in CSV/GeoJSON
- ✅ Preserves chronological order

## 🔒 Privacy & Security

### Local Storage
- Photos are stored locally on your device
- App doesn't automatically upload to cloud
- You control when and where to share data

### Data Export
- Export includes all photo metadata
- Filenames preserve asset relationships
- No data loss during export/import

## 📱 Platform-Specific Notes

### Android Chrome
- Photos taken through camera input are saved to Downloads
- File access requires storage permissions
- Works with any Android file manager

### iOS Safari
- Photos saved to Photos app automatically
- Files app shows downloads
- Works with iOS 11+ file system access

### Progressive Web App (PWA)
- Can be installed like a native app
- Better camera integration
- Improved file handling
- Offline photo storage

This system ensures that every photo you take is perfectly matched to its corresponding asset, making data management and field work much more organized and efficient!