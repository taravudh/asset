# IndexedDB Migration Guide

This guide explains how to migrate from Supabase to IndexedDB for the Asset Survey Mapping application.

## Why IndexedDB?

IndexedDB offers several advantages for this application:

1. **No Connection Issues**: IndexedDB runs locally in the browser, eliminating connection timeouts
2. **Reliability**: Data is stored locally, reducing dependency on external services
3. **Performance**: Fast queries with minimal overhead
4. **Offline Support**: Works without an internet connection
5. **Storage Capacity**: Can store much more data than localStorage

## How the Migration Works

The application now uses the browser's built-in IndexedDB API to store and retrieve data. This approach:

- Stores data directly in the browser
- Maintains the same data structure as before
- Provides similar CRUD operations
- Handles user authentication locally

## Key Changes

1. **Database Initialization**:
   - The database schema is created automatically on first run
   - Tables for projects, assets, layers, and users are created

2. **Authentication**:
   - User accounts are stored locally in IndexedDB
   - Passwords are hashed for security
   - Session management uses localStorage

3. **Data Access**:
   - All database operations use the IndexedDB API
   - User-specific data filtering happens at the query level
   - No more RLS policies or connection issues

## Using the Application

The application works the same way as before, but with these improvements:

- **Faster Performance**: Database operations complete instantly
- **No Timeouts**: No more connection timeout errors
- **Reliable Deletion**: Project deletion works consistently
- **Offline Support**: Can work without an internet connection

## Data Persistence

Your data is stored in the browser's IndexedDB storage. This means:

- Data persists between browser sessions
- Data is specific to your browser/device
- You can export data as GeoJSON or CSV for backup

## Limitations

While IndexedDB solves the connection issues, be aware of these limitations:

1. **Local Storage Only**: Data is stored only on your current device
2. **No Multi-User Collaboration**: Each user has their own separate database
3. **Storage Limits**: Subject to browser storage limitations (though these are quite large)

## Troubleshooting

If you encounter any issues:

1. **Database Initialization Errors**:
   - Refresh the page to retry initialization
   - Check browser console for specific error messages

2. **Data Not Appearing**:
   - Ensure you're signed in with the correct account
   - Try refreshing the page

3. **Storage Issues**:
   - Clear browser cache if you encounter storage errors
   - Export important data regularly as backup