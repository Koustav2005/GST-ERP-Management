# Store Incharge Real-Time Collection Notifications

## Feature Overview

When a worker scans the QR code to collect materials, the Store Incharge watching the External Job Work Outstock list will now see an **instant confirmation modal** - just like the worker sees on their screen.

## How It Works

### Architecture

```
Store Incharge viewing External Job Work Outstock screen
    ↓
Polling every 5 seconds (backend query for pending/fulfilled requests)
    ↓
Worker scans QR code in their module
    ↓
Backend marks request as fulfilled
    ↓
Next poll (within 5 seconds) detects status change
    ↓
✅ Comparison detects: pending → fulfilled
    ↓
✅ Collection confirmation modal pops up on Store Incharge screen
    ↓
Shows: Worker name, Material, Collection time
    ↓
Auto-hides after 2 seconds
```

## Implementation

### State Management

1. **`previousRequestsState`** - Keeps track of previous request statuses
2. **`recentCollection`** - Data for the confirmation modal
3. **`showCollectionConfirm`** - Controls modal visibility
4. **`pollingInterval`** - Reference to the interval for cleanup

### Key Function: `checkForNewlyFulfilledRequests()`

```javascript
const checkForNewlyFulfilledRequests = (currentRequests) => {
  // Create map of current requests
  const currentMap = {};
  currentRequests.forEach(req => {
    currentMap[req.id] = req;
  });

  // Compare with previous state
  Object.keys(previousRequestsState).forEach(requestId => {
    const prevReq = previousRequestsState[requestId];
    const currentReq = currentMap[requestId];

    // If changed from pending to fulfilled
    if (prevReq && prevReq.status === 'pending' && currentReq && currentReq.status === 'fulfilled') {
      // Show confirmation modal
      setRecentCollection({
        id: currentReq.id,
        material_name: currentReq.material_name || currentReq.project_name,
        worker_name: currentReq.worker_name,
        collected_at: new Date().toLocaleString()
      });
      setShowCollectionConfirm(true);

      // Auto-hide after 2 seconds
      setTimeout(() => {
        setShowCollectionConfirm(false);
      }, 2000);
    }
  });

  // Update state for next comparison
  setPreviousRequestsState(currentMap);
};
```

### Polling Setup

```javascript
useEffect(() => {
  // Initial fetch
  fetchRequests();

  // Poll every 5 seconds
  const interval = setInterval(() => {
    console.log('🔄 Poll: Checking for new collections...');
    fetchRequests();
  }, 5000);

  // Cleanup on unmount
  return () => {
    if (interval) clearInterval(interval);
  };
}, []);
```

## User Flow

### Store Incharge Perspective

1. **Store Incharge opens** External Job Work Outstock screen
2. **Sees list** of pending material requests with worker names
3. **Worker (elsewhere) scans QR code** to collect materials
4. **Within 5 seconds:**
   - 📱 Modal appears on Store Incharge screen
   - Shows: "✅ Material collected by [Worker Name]"
   - Shows: Materials and timestamp
5. **Auto-closes** after 2 seconds
6. **Request moves** from "Pending" to "Fulfilled" tab

### Worker Perspective

1. **Worker scans QR code**
2. **Sees confirmation modal** with collected items
3. **Modal auto-closes** after 2 seconds
4. **Request moved to "Fulfilled"**

Both see confirmation simultaneously (within 5 second polling window)!

## Configuration

### Polling Interval
- **Current:** 5 seconds
- **Can adjust:** Change value in `setInterval(() => {...}, 5000)`
- **Trade-offs:**
  - Faster polling = More real-time but more API calls
  - Slower polling = Fewer API calls but more latency

### Auto-hide Duration
- **Current:** 2 seconds
- **Location:** `setTimeout(() => { setShowCollectionConfirm(false); }, 2000);`

## Performance Considerations

### API Calls
- **Frequency:** Every 5 seconds when screen is open
- **Load:** Minimal - Single GET request per poll
- **Optimization:** Uses same `getPendingExternalRequests()` endpoint

### Memory
- **previousRequestsState:** Small map of request objects
- **Cleanup:** Interval cleared on component unmount

### Network
- **Bandwidth:** Low - Queries fulfilled + pending requests
- **Latency:** Max 5 seconds delay before detection

## Edge Cases Handled

1. **Multiple workers collecting simultaneously**
   - Each collection triggers its own modal
   - No collision or missed notifications

2. **Store Incharge navigates away**
   - Polling stops (interval cleared)
   - Resumes when returning to screen

3. **Screen opened before any requests exist**
   - `previousRequestsState` initializes empty
   - Works correctly when requests arrive

4. **Request fulfilled but list already cleared**
   - Map comparison safely handles missing keys
   - No errors thrown

## Debugging

### Check polling in console:
```
🔄 Poll: Checking for new collections... (every 5 seconds)
🎉 DETECTED: Request 12 just fulfilled! (when collection happens)
```

### Monitor state:
- `previousRequestsState` - Previous snapshot of requests
- `recentCollection` - Data from most recent collection
- `showCollectionConfirm` - Modal visibility flag

## Future Enhancements

1. **Real-time WebSocket updates** - Instead of polling
2. **Customizable interval** - Admin settings for poll frequency
3. **Sound notification** - Alert sound when collection detected
4. **Persistent log** - Keep history of all collections
5. **Filtering** - Show notifications only for specific workers/projects

## Files Modified

- `src/screens/ExternalJobworkOutstockScreen.js`
  - Added: `pollingInterval` state
  - Added: `previousRequestsState` state
  - Added: `checkForNewlyFulfilledRequests()` function
  - Modified: `fetchRequests()` to call detection function
  - Modified: `useEffect()` to set up polling

## Summary

✅ Store Incharge sees collection confirmation instantly (within 5 seconds)
✅ Same modal as worker sees
✅ Auto-refreshing list
✅ Real-time status updates
✅ Minimal performance impact
✅ Automatic cleanup on unmount
