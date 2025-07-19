# Toll Calculation Service

Node.js app for recording vehicle entries/exits and calculating tolls, with full TypeScript, linting, and unit test support.

## Features

- Secure agent login with JWT (token set as HTTP-only cookie)
- Record vehicle entry and exit at interchanges
- Calculate tolls with distance, weekend, holiday, and number plate discounts
- PostgreSQL database integration (mocked in tests)
- 100% code coverage for core logic and authentication
- ESLint for code quality and formatting

---

## Setup

1. **Clone the repository:**

   ```sh
   git clone https://github.com/jawadzaib/toll-calculation-service
   cd toll-calculation-service
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Create a `.env` file in the project root:**

   ```env
   NODE_ENV=development
   DATABASE_URL=postgres://user:password@db:5432/toll_db
   PORT=3000
   JWT_SECRET=sometoken
   ```

4. **Build using docker compose:**
   You can build and run the app (and a PostgreSQL database) using Docker Compose:

   ```sh
   docker-compose up --build
   ```

5. **Monitor logs:**
   You can monitor app logs after building docker services with this command:

   ```sh
   docker compose logs backend -f
   ```

### Database migrations rollback

- **Automatic migrations:** The backend container will automatically run all pending database migrations before starting the app.
- **Manual rollback:** To rollback the last migration, run:
  ```sh
  docker-compose exec backend npm run migrate:rollback
  ```

---

## API Endpoints

### 1. Public: Get Interchanges

**GET** `/api/interchanges`

- No authentication required.
- **Response:**

```json
[
  { "name": "Zero point", "distance": 0 },
  { "name": "NS Interchange", "distance": 5 },
  ...
]
```

---

### 2. User Registration

**POST** `/api/auth/register`

```json
{
  "username": "agent1",
  "password": "secret",
  "interchange": "NS Interchange"
}
```

- Registers a new agent with a default interchange.
- **Response:** `{ "message": "User registered successfully." }`

---

### 3. User Login (JWT Cookie)

**POST** `/api/auth/login`

```json
{
  "username": "agent1",
  "password": "secret",
  "interchange": "Bahria Interchange" // optional, overrides default for this session
}
```

- On success, sets a secure HTTP-only cookie (`token`) and returns:

```json
{ "message": "Login successful", "interchange": "Bahria Interchange" }
```

- The JWT is sent as a cookie; the frontend does not need to manage the token manually.

---

### 4. Protected: Record Vehicle Entry

**POST** `/api/entry`

- **Requires JWT** (sent as cookie or `Authorization: Bearer ...` header)
- **Request Body:**

```json
{
  "numberPlate": "ABC-123",
  "interchange": "NS Interchange" // optional, will use agent's session interchange if omitted
}
```

- **Response:**

```json
{
  "message": "Vehicle entry recorded successfully.",
  "entry": { ... }
}
```

---

### 5. Protected: Record Vehicle Exit & Calculate Toll

**POST** `/api/exit`

- **Requires JWT** (sent as cookie or `Authorization: Bearer ...` header)
- **Request Body:**

```json
{
  "numberPlate": "ABC-123",
  "interchange": "Bahria Interchange", // optional
  "dateTime": "2023-10-26T11:00:00Z" // optional
}
```

- **Response:**

```json
{
  "baseRate": 20,
  "distanceCost": 5.8,
  "distanceBreakdown": "Distance: 29KM, Rate: 0.2/KM",
  "subTotal": 25.8,
  "discount": 0,
  "totalCharged": 25.8,
  "message": "Toll calculated successfully."
}
```

---

## Linting

ESLint is used for both code quality and formatting. See `.eslintrc` for configuration.

```sh
npm run lint
```

---

## Unit Tests

- **Run all tests:**
  ```sh
  npm test
  ```
- **Run with coverage:**
  ```sh
  npm test -- --coverage
  ```
- Tests are in `src/tests/` and cover all API routes, authentication, and core logic.
