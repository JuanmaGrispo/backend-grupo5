# API Documentation: Session Ratings System

## Overview

The Session Ratings system allows users to rate and comment on completed class sessions. Users can only rate sessions they attended, within 24 hours of the session's end time, and only once per session.

**Base URL**: `http://localhost:3000/api/v1/ratings`

**Authentication**: All endpoints require JWT Bearer Token authentication (except where noted).

---

## Entity Structure

### SessionRating Entity

```typescript
interface SessionRating {
  id: string;                    // UUID - Primary key
  user: User;                    // Eagerly loaded User entity
  session: ClassSession;         // Eagerly loaded ClassSession entity
  rating: number;                // Integer 1-5 (stars)
  comment?: string;             // Optional text comment (max 1000 chars)
  createdAt: Date;              // ISO 8601 timestamp
  updatedAt: Date;              // ISO 8601 timestamp
}
```

### Database Constraints

- **Unique Constraint**: `@Unique(['user', 'session'])` - One rating per user per session
- **Rating Constraint**: `@Check("rating >= 1 AND rating <= 5")` - Rating must be 1-5
- **Indexes**: 
  - `idx_rating_session` on `session` column
  - `idx_rating_user` on `user` column

---

## Business Rules & Validations

### Creating a Rating

A rating can only be created if ALL of the following conditions are met:

1. ✅ **Session exists** - The sessionId must be valid
2. ✅ **Session is COMPLETED** - Session status must be `COMPLETED`
3. ✅ **Within 24-hour window** - Current time must be within 24 hours after session end time
   - Session end = `startAt + durationMin`
   - Deadline = `endAt + 24 hours`
   - Current time must be ≤ deadline
4. ✅ **User attended session** - Must have an Attendance record for this session
5. ✅ **No existing rating** - User hasn't already rated this session

### Updating/Deleting a Rating

- Only the rating owner (the user who created it) can update or delete their rating

---

## API Endpoints

### 1. Create Rating

**POST** `/api/v1/ratings`

Creates a new rating for a completed session.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "rating": 5,
  "comment": "Excelente clase, muy recomendada!"
}
```

**Request Body Schema:**
```typescript
{
  sessionId: string;    // UUID - Required, must be valid session ID
  rating: number;       // Required, integer 1-5
  comment?: string;     // Optional, max 1000 characters
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid-string",
  "rating": 5,
  "comment": "Excelente clase, muy recomendada!",
  "createdAt": "2025-09-27T10:30:00.000Z",
  "updatedAt": "2025-09-27T10:30:00.000Z",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "uuid-string",
    "startAt": "2025-09-27T09:00:00.000Z",
    "durationMin": 60,
    "status": "COMPLETED",
    "classRef": {
      "id": "uuid-string",
      "title": "Yoga: Vinyasa Flow"
    }
  }
}
```

**Error Responses:**

| Status | Error | Message |
|--------|-------|---------|
| 400 | BadRequestException | "Solo se pueden calificar sesiones completadas" |
| 400 | BadRequestException | "Solo se pueden calificar sesiones dentro de las 24 horas posteriores a su finalización" |
| 400 | BadRequestException | "Ya calificaste esta sesión" |
| 401 | UnauthorizedException | "Debes haber asistido a la sesión para calificarla" |
| 404 | NotFoundException | "Sesión no encontrada" |

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/ratings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "6cc97f28-d3ee-49fe-af8c-087223e91feb",
    "rating": 5,
    "comment": "Excelente clase!"
  }'
```

---

### 2. Get My Ratings

**GET** `/api/v1/ratings/me`

Retrieves all ratings created by the authenticated user, ordered by creation date (newest first).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "rating": 5,
    "comment": "Excelente clase!",
    "createdAt": "2025-09-27T10:30:00.000Z",
    "updatedAt": "2025-09-27T10:30:00.000Z",
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "session": {
      "id": "uuid-string",
      "startAt": "2025-09-27T09:00:00.000Z",
      "durationMin": 60,
      "status": "COMPLETED",
      "classRef": {
        "id": "uuid-string",
        "title": "Yoga: Vinyasa Flow",
        "description": "A dynamic, continuous sequence...",
        "discipline": "Yoga"
      }
    }
  }
]
```

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/ratings/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Get Session Ratings

**GET** `/api/v1/ratings/session/:sessionId`

Retrieves all ratings for a specific session, ordered by creation date (newest first).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
- `sessionId` (string, required) - UUID of the session

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "rating": 5,
    "comment": "Excelente clase!",
    "createdAt": "2025-09-27T10:30:00.000Z",
    "updatedAt": "2025-09-27T10:30:00.000Z",
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "name": "John Doe",
      "photoUrl": "https://example.com/photo.jpg"
    }
  }
]
```

**Error Responses:**

| Status | Error | Message |
|--------|-------|---------|
| 404 | NotFoundException | "Sesión no encontrada" |

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/ratings/session/6cc97f28-d3ee-49fe-af8c-087223e91feb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Get Session Average Rating

**GET** `/api/v1/ratings/session/:sessionId/average`

Retrieves the average rating and total count of ratings for a specific session.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
- `sessionId` (string, required) - UUID of the session

**Success Response (200 OK):**
```json
{
  "average": 4.5,
  "count": 10
}
```

**Response Schema:**
```typescript
{
  average: number;  // Rounded to 1 decimal place (e.g., 4.5)
  count: number;    // Total number of ratings
}
```

**Special Cases:**
- If no ratings exist: `{ "average": 0, "count": 0 }`

**Error Responses:**

| Status | Error | Message |
|--------|-------|---------|
| 404 | NotFoundException | "Sesión no encontrada" |

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/ratings/session/6cc97f28-d3ee-49fe-af8c-087223e91feb/average \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Update Rating

**PUT** `/api/v1/ratings/:id`

Updates an existing rating. Only the rating owner can update it.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string, required) - UUID of the rating to update

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Muy buena clase, pero podría mejorar"
}
```

**Request Body Schema:**
```typescript
{
  rating?: number;    // Optional, integer 1-5
  comment?: string;   // Optional, max 1000 characters
}
```

**Note:** At least one field (`rating` or `comment`) must be provided.

**Success Response (200 OK):**
```json
{
  "id": "uuid-string",
  "rating": 4,
  "comment": "Muy buena clase, pero podría mejorar",
  "createdAt": "2025-09-27T10:30:00.000Z",
  "updatedAt": "2025-09-27T11:00:00.000Z",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "uuid-string",
    "startAt": "2025-09-27T09:00:00.000Z",
    "durationMin": 60,
    "status": "COMPLETED"
  }
}
```

**Error Responses:**

| Status | Error | Message |
|--------|-------|---------|
| 401 | UnauthorizedException | "No tenés permiso para modificar esta calificación" |
| 404 | NotFoundException | "Calificación no encontrada" |

**Example cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/ratings/uuid-rating-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Updated comment"
  }'
```

---

### 6. Delete Rating

**DELETE** `/api/v1/ratings/:id`

Deletes a rating. Only the rating owner can delete it.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
- `id` (string, required) - UUID of the rating to delete

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Calificación eliminada"
}
```

**Error Responses:**

| Status | Error | Message |
|--------|-------|---------|
| 401 | UnauthorizedException | "No tenés permiso para eliminar esta calificación" |
| 404 | NotFoundException | "Calificación no encontrada" |

**Example cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/ratings/uuid-rating-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## TypeScript Interfaces for Frontend

```typescript
// Rating Entity
interface SessionRating {
  id: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  user: {
    id: string;
    email: string;
    name?: string;
    photoUrl?: string;
  };
  session: {
    id: string;
    startAt: string; // ISO 8601
    durationMin: number;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
    classRef: {
      id: string;
      title: string;
      description?: string;
      discipline?: string;
    };
  };
}

// Create Rating DTO
interface CreateRatingDto {
  sessionId: string;
  rating: number; // 1-5
  comment?: string; // max 1000 chars
}

// Update Rating DTO
interface UpdateRatingDto {
  rating?: number; // 1-5
  comment?: string; // max 1000 chars
}

// Average Rating Response
interface AverageRatingResponse {
  average: number; // rounded to 1 decimal
  count: number;
}

// Error Response
interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}
```

---

## Frontend Implementation Guide

### 1. Rating Creation Flow

```typescript
// Step 1: Check if session can be rated
async function canRateSession(sessionId: string): Promise<boolean> {
  // Check:
  // - Session status is COMPLETED
  // - Current time is within 24h of session end
  // - User has attendance record
  // - User hasn't already rated
}

// Step 2: Create rating
async function createRating(sessionId: string, rating: number, comment?: string) {
  const response = await fetch('http://localhost:3000/api/v1/ratings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      rating,
      comment
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
}
```

### 2. Display Session Ratings

```typescript
// Get all ratings for a session
async function getSessionRatings(sessionId: string): Promise<SessionRating[]> {
  const response = await fetch(
    `http://localhost:3000/api/v1/ratings/session/${sessionId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  
  return await response.json();
}

// Get average rating
async function getSessionAverage(sessionId: string): Promise<AverageRatingResponse> {
  const response = await fetch(
    `http://localhost:3000/api/v1/ratings/session/${sessionId}/average`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  
  return await response.json();
}
```

### 3. User's Rating History

```typescript
// Get user's own ratings
async function getMyRatings(): Promise<SessionRating[]> {
  const response = await fetch('http://localhost:3000/api/v1/ratings/me', {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  return await response.json();
}
```

### 4. Update/Delete Rating

```typescript
// Update rating
async function updateRating(ratingId: string, rating?: number, comment?: string) {
  const response = await fetch(`http://localhost:3000/api/v1/ratings/${ratingId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rating, comment })
  });
  
  return await response.json();
}

// Delete rating
async function deleteRating(ratingId: string) {
  const response = await fetch(`http://localhost:3000/api/v1/ratings/${ratingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  return await response.json();
}
```

---

## Error Handling

### Common Error Scenarios

1. **Session Not Completed**
   - Status: 400
   - Message: "Solo se pueden calificar sesiones completadas"
   - Action: Show message, disable rating button

2. **24-Hour Window Expired**
   - Status: 400
   - Message: "Solo se pueden calificar sesiones dentro de las 24 horas posteriores a su finalización"
   - Action: Show message, disable rating button, display deadline

3. **User Didn't Attend**
   - Status: 401
   - Message: "Debes haber asistido a la sesión para calificarla"
   - Action: Show message, disable rating button

4. **Already Rated**
   - Status: 400
   - Message: "Ya calificaste esta sesión"
   - Action: Show existing rating, allow update/delete

5. **Unauthorized Update/Delete**
   - Status: 401
   - Message: "No tenés permiso para modificar/eliminar esta calificación"
   - Action: Hide edit/delete buttons for other users' ratings

---

## UI/UX Recommendations

### Rating Form
- **Rating Input**: Star selector (1-5 stars) or numeric input with validation
- **Comment Input**: Textarea with character counter (max 1000)
- **Submit Button**: Disabled until valid rating (1-5) is selected
- **Validation Messages**: Show inline validation errors

### Rating Display
- **Star Rating**: Visual star display (filled/empty stars)
- **Comment**: Display comment if provided
- **User Info**: Show user name and photo
- **Timestamp**: Show "X hours ago" or formatted date
- **Edit/Delete**: Show buttons only for user's own ratings

### Session Rating Summary
- **Average Stars**: Display average rating with stars
- **Total Count**: Show "(X calificaciones)"
- **Rating Distribution**: Optional bar chart showing 1-5 star distribution

---

## Testing Examples

### Test Case 1: Create Valid Rating
```json
POST /api/v1/ratings
{
  "sessionId": "valid-completed-session-id",
  "rating": 5,
  "comment": "Excelente!"
}
```
Expected: 201 Created with rating object

### Test Case 2: Rate Non-Completed Session
```json
POST /api/v1/ratings
{
  "sessionId": "scheduled-session-id",
  "rating": 5
}
```
Expected: 400 Bad Request - "Solo se pueden calificar sesiones completadas"

### Test Case 3: Rate After 24 Hours
```json
POST /api/v1/ratings
{
  "sessionId": "old-completed-session-id",
  "rating": 5
}
```
Expected: 400 Bad Request - "Solo se pueden calificar sesiones dentro de las 24 horas..."

### Test Case 4: Duplicate Rating
```json
POST /api/v1/ratings
{
  "sessionId": "already-rated-session-id",
  "rating": 4
}
```
Expected: 400 Bad Request - "Ya calificaste esta sesión"

---

## Integration Notes

### Session Status Flow
1. Session starts → Status: `IN_PROGRESS`
2. Session ends → Status: `COMPLETED` (manual update or automatic)
3. Rating window opens → Users can rate for 24 hours after session end
4. Rating window closes → No new ratings allowed (existing ratings remain)

### Attendance Requirement
- Users must have an `Attendance` record for the session
- Attendance is created via check-in process (`POST /api/v1/checkin/qr`)
- No attendance = Cannot rate

### Time Calculations
- Session end time: `startAt + durationMin` (in milliseconds)
- Rating deadline: `endAt + 24 hours` (in milliseconds)
- All times are in UTC

---

## Complete API Service Example (TypeScript)

```typescript
class RatingApiService {
  private baseUrl = 'http://localhost:3000/api/v1/ratings';
  
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    };
  }
  
  async createRating(dto: CreateRatingDto): Promise<SessionRating> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dto)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  }
  
  async getMyRatings(): Promise<SessionRating[]> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: this.getHeaders()
    });
    
    return await response.json();
  }
  
  async getSessionRatings(sessionId: string): Promise<SessionRating[]> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`, {
      headers: this.getHeaders()
    });
    
    return await response.json();
  }
  
  async getSessionAverage(sessionId: string): Promise<AverageRatingResponse> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}/average`, {
      headers: this.getHeaders()
    });
    
    return await response.json();
  }
  
  async updateRating(id: string, dto: UpdateRatingDto): Promise<SessionRating> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(dto)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  }
  
  async deleteRating(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
  }
}
```

---

## Summary

The Session Ratings API provides a complete system for users to rate and comment on completed class sessions. Key features:

- ✅ One rating per user per session
- ✅ 24-hour rating window after session ends
- ✅ Attendance verification required
- ✅ Rating range: 1-5 stars
- ✅ Optional comments (max 1000 chars)
- ✅ Average rating calculation
- ✅ User-specific rating management
- ✅ Full CRUD operations with proper authorization

All endpoints require JWT authentication and follow RESTful conventions.
