# Tasks and User Points API

This document describes the new API endpoints for managing tasks and user points in the Data Refining React Native App.

## Tasks API

### Endpoints

#### Get All Tasks
- **GET** `/api/task`
- **Description**: Get all tasks with optional filtering
- **Query Parameters**:
  - `status`: Filter by task status (`active`, `completed`, `expired`)
  - `category`: Filter by task category
  - `difficulty`: Filter by difficulty (`easy`, `medium`, `hard`)
  - `isActive`: Filter by active status (boolean)
  - `createdBy`: Filter by creator user ID
  - `minPoints`: Minimum bounty points
  - `maxPoints`: Maximum bounty points
  - `expiresAfter`: Tasks expiring after this date
  - `expiresBefore`: Tasks expiring before this date
  - `search`: Search in title, description, and category

#### Get Active Tasks
- **GET** `/api/task/active`
- **Description**: Get only active (non-expired) tasks
- **Access**: Public

#### Get Task by ID
- **GET** `/api/task/:id`
- **Description**: Get a specific task by ID
- **Access**: Public

#### Create Task
- **POST** `/api/task`
- **Description**: Create a new task
- **Access**: Private (Authenticated users)
- **Body**:
```json
{
  "title": "Task Title",
  "description": "Task Description",
  "bountyPoints": 100,
  "expiryDate": "2025-12-31T23:59:59Z",
  "category": "Category",
  "difficulty": "easy|medium|hard",
  "metadata": {
    "tags": ["tag1", "tag2"],
    "requirements": ["req1", "req2"],
    "instructions": ["step1", "step2"],
    "estimatedTime": 30,
    "maxParticipants": 50
  }
}
```

#### Update Task
- **PUT** `/api/task/:id`
- **Description**: Update an existing task
- **Access**: Private (Authenticated users)

#### Complete Task
- **PATCH** `/api/task/:id/complete`
- **Description**: Mark a task as completed
- **Access**: Private (Authenticated users)

#### Delete Task
- **DELETE** `/api/task/:id`
- **Description**: Delete a task (soft delete)
- **Access**: Private (Authenticated users)

#### Get Task Statistics
- **GET** `/api/task/stats`
- **Description**: Get task statistics
- **Access**: Public

#### Mark Expired Tasks
- **POST** `/api/task/expired/mark`
- **Description**: Mark expired tasks (admin only)
- **Access**: Private (Admin only)

## User Points API

### Endpoints

#### Get My Points
- **GET** `/api/user-points/my`
- **Description**: Get current user's points
- **Access**: Private (Authenticated users)

#### Get User Points by ID
- **GET** `/api/user-points/:userId`
- **Description**: Get user points by user ID
- **Access**: Private (Authenticated users)

#### Add Points
- **POST** `/api/user-points/add`
- **Description**: Add points to current user account
- **Access**: Private (Authenticated users)
- **Body**:
```json
{
  "amount": 100,
  "type": "earned|bonus|refund",
  "description": "Points description",
  "taskId": "task-id-optional",
  "reference": "reference-optional",
  "metadata": {
    "category": "category",
    "difficulty": "easy",
    "multiplier": 1.5,
    "reason": "reason"
  }
}
```

#### Spend Points
- **POST** `/api/user-points/spend`
- **Description**: Spend points from current user account
- **Access**: Private (Authenticated users)
- **Body**:
```json
{
  "amount": 50,
  "description": "Purchase description",
  "reference": "purchase-id-optional",
  "metadata": {
    "category": "purchase",
    "reason": "premium_upgrade"
  }
}
```

#### Award Task Points
- **POST** `/api/user-points/award-task`
- **Description**: Award points for completing a task
- **Access**: Private (Authenticated users)
- **Body**:
```json
{
  "taskId": "task-id",
  "points": 100,
  "category": "Cooking",
  "difficulty": "easy"
}
```

#### Get Points History
- **GET** `/api/user-points/:userId/history`
- **Description**: Get user points history
- **Access**: Private (Authenticated users)
- **Query Parameters**:
  - `limit`: Number of records to return (default: 50)
  - `offset`: Number of records to skip (default: 0)

#### Get Leaderboard
- **GET** `/api/user-points/leaderboard`
- **Description**: Get points leaderboard
- **Access**: Public
- **Query Parameters**:
  - `limit`: Number of top users to return (default: 10)

#### Get Points Statistics
- **GET** `/api/user-points/stats`
- **Description**: Get points statistics
- **Access**: Public

#### Initialize User Points
- **POST** `/api/user-points/:userId/initialize`
- **Description**: Initialize user points (admin only)
- **Access**: Private (Admin only)

#### Reset User Points
- **POST** `/api/user-points/:userId/reset`
- **Description**: Reset user points (admin only)
- **Access**: Private (Admin only)

## Data Models

### Task Document
```typescript
interface TaskDocument {
  id: string;
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'completed' | 'expired';
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}
```

### User Points Document
```typescript
interface UserPointsDocument {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  pointsHistory?: PointsTransaction[];
}
```

### Points Transaction
```typescript
interface PointsTransaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund';
  amount: number;
  description: string;
  taskId?: string;
  reference?: string;
  timestamp: Date;
  metadata?: {
    category?: string;
    difficulty?: string;
    multiplier?: number;
    reason?: string;
  };
}
```

## Frontend Integration

The frontend now includes:

1. **TaskService** (`src/services/TaskService.ts`) - Handles all task-related API calls
2. **UserPointsService** (`src/services/UserPointsService.ts`) - Handles all user points-related API calls
3. **Updated HomeScreen** - Now fetches data from API instead of using mock data
4. **Loading states** - Shows loading indicators while fetching data
5. **Error handling** - Displays error messages and retry options
6. **Pull-to-refresh** - Allows users to refresh data by pulling down

## Testing

To populate test data, run:
```bash
cd drr-backend
node populate-test-data.js
```

This will create sample tasks and user points data in Firestore for testing purposes.

## Security

- All endpoints require authentication except for public endpoints (getting tasks, leaderboard, stats)
- User points operations are scoped to the authenticated user
- Admin-only operations require admin role
- All data is validated before processing
- Rate limiting is applied to prevent abuse
