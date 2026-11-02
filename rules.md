# Express TypeScript Backend Rules

## 1. General Principles

- Use **TypeScript** for all backend source code.
- Use **Express** for the HTTP/API layer.
- Prefer simple, readable, maintainable code over clever abstractions.
- Follow existing project conventions before introducing new patterns.
- Do not introduce a new library when the existing stack can solve the problem.
- Do not rewrite working code unnecessarily.
- Keep business logic separate from HTTP concerns.
- Keep functions small and focused on one responsibility.
- Avoid duplicated logic.
- Do not use `any` unless there is a documented and justified reason.
- Prefer explicit types over implicit `any`.
- Do not silently ignore TypeScript errors.

---

# 2. Project Architecture

Use a layered architecture.

Recommended structure:

```text
src/
├── config/
├── controllers/
├── middleware/
├── routes/
├── services/
├── repositories/
├── types/
├── utils/
├── validators/
├── app.ts
└── server.ts
```

Responsibilities:

### Routes

Routes should only define HTTP endpoints and connect them to controllers.

```ts
router.get("/users/:id", userController.getUser);
```

Do not put business logic inside routes.

### Controllers

Controllers handle HTTP concerns:

- Read request parameters
- Read request body
- Call services
- Return HTTP responses
- Pass errors to error middleware

Controllers should not contain complex business logic.

### Services

Services contain business logic.

Example:

```ts
const user = await userService.createUser(data);
```

Business rules should primarily live in services rather than controllers.

### Repositories

Repositories handle database operations.

Example:

```ts
const user = await userRepository.findById(id);
```

Do not put database queries directly inside controllers.

### Middleware

Middleware should handle cross-cutting HTTP concerns such as:

- Authentication
- Authorization
- Validation
- Logging
- Rate limiting
- Error handling

---

# 3. TypeScript Rules

Use strict TypeScript.

`tsconfig.json` should enable strict checking:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Prefer:

```ts
const userId: number = Number(req.params.id);
```

instead of unnecessary loose typing.

Avoid:

```ts
const user: any = ...
```

Prefer interfaces or type aliases:

```ts
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}
```

Use `unknown` instead of `any` when the type is genuinely unknown.

Handle unknown errors safely:

```ts
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

---

# 4. Async/Await

Use `async/await` for asynchronous operations.

Prefer:

```ts
const user = await userService.getUserById(id);
```

Avoid unnecessary promise chains:

```ts
userService.getUserById(id)
  .then(...)
  .catch(...);
```

Do not forget to await promises when the result is required.

Avoid unhandled promises.

For independent asynchronous operations, use `Promise.all()` when appropriate:

```ts
const [user, bookings] = await Promise.all([
  userService.getUser(id),
  bookingService.getUserBookings(id),
]);
```

Do not use `Promise.all()` when operations depend on each other.

---

# 5. Express Controllers

Controllers should remain thin.

Good:

```ts
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
```

Avoid putting database queries, password hashing, complex validation, or business rules directly inside controllers.

---

# 6. Error Handling

Use centralized error handling.

Do not repeatedly send manually formatted errors from every layer.

Use a consistent response format.

Example:

```ts
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND"
  }
}
```

Use appropriate HTTP status codes:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Never expose:

- Stack traces
- Database errors
- Passwords
- Tokens
- Secrets
- Internal file paths

in production responses.

Log detailed errors internally when appropriate.

---

# 7. Validation

Never trust client input.

Validate:

- Request body
- Query parameters
- URL parameters
- Headers when necessary

Use a validation library such as Zod when the project uses it.

Example:

```ts
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});
```

Validate input before passing it into business logic.

Do not rely only on frontend validation.

The backend must always validate independently.

---

# 8. Database Rules

Keep database access inside repositories or the project's established data-access layer.

Do not write database queries directly inside routes.

Bad:

```ts
router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
```

Prefer:

```ts
router.get("/users", userController.getUsers);
```

Then:

```ts
const users = await userService.getUsers();
```

And:

```ts
const users = await userRepository.findAll();
```

Use transactions when multiple database operations must succeed or fail together.

Do not expose database models directly if the API requires a different response structure.

---

# 9. Environment Variables

Never hardcode secrets.

Bad:

```ts
const password = "my-secret-password";
```

Use environment variables:

```ts
const databaseUrl = process.env.DATABASE_URL;
```

Required environment variables should be validated when the application starts.

Examples:

```text
DATABASE_URL
JWT_SECRET
PORT
CORS_ORIGIN
```

Never commit `.env` files containing secrets.

Use `.env.example` for documentation.

---

# 10. Authentication

Authentication and authorization are different concerns.

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What is the user allowed to do?
```

Do not assume that an authenticated user has permission to access every resource.

Always verify ownership or permissions where required.

Example:

```text
GET /users/:id
```

should not automatically allow every authenticated user to access every user's private information.

---

# 11. Passwords

Never store plaintext passwords.

Passwords must be hashed using an appropriate password-hashing algorithm.

Never log:

```ts
console.log(password);
```

Never return passwords in API responses.

When returning user objects, explicitly remove sensitive fields.

---

# 12. API Design

Use consistent REST-style endpoints.

Prefer:

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

Avoid unnecessarily action-oriented endpoints such as:

```text
GET /getAllUsers
POST /createUser
POST /deleteUser
```

Use plural resource names.

Keep API versioning consistent if the project requires it:

```text
/api/v1/users
/api/v1/bookings
```

---

# 13. HTTP Status Codes

Do not return `200 OK` for every situation.

Examples:

```ts
res.status(200).json(data);
```

Successful creation:

```ts
res.status(201).json(data);
```

Successful deletion with no response:

```ts
res.status(204).send();
```

Resource not found:

```ts
res.status(404).json(...);
```

Validation failure:

```ts
res.status(400).json(...);
```

Authentication failure:

```ts
res.status(401).json(...);
```

Authorization failure:

```ts
res.status(403).json(...);
```

---

# 14. Security

Follow secure backend practices.

Use:

- Helmet
- CORS configuration
- Rate limiting where appropriate
- Input validation
- Secure cookies when cookies are used
- Proper authentication
- Password hashing
- Parameterized database queries / ORM protections

Never trust:

```text
req.body
req.params
req.query
req.headers
```

without validation.

Do not expose sensitive server information through error responses.

---

# 15. Logging

Use a proper logger for production applications when the project requires one.

Avoid excessive debugging logs.

Do not log:

- Passwords
- JWTs
- API keys
- Session tokens
- Credit card information
- Sensitive personal information

Development logs should be useful for debugging but should not become permanent noise.

---

# 16. Configuration

Keep configuration separate from application logic.

Example:

```text
src/config/
├── env.ts
├── database.ts
└── cors.ts
```

Do not repeatedly access environment variables throughout the application.

Prefer centralized configuration.

---

# 17. Response Structure

Use consistent API responses.

Success:

```ts
{
  success: true,
  data: user
}
```

Collection:

```ts
{
  success: true,
  data: users,
  meta: {
    total: users.length
  }
}
```

Error:

```ts
{
  success: false,
  error: {
    message: "User not found",
    code: "USER_NOT_FOUND"
  }
}
```

Do not randomly change response formats between endpoints.

---

# 18. Naming Conventions

Use descriptive names.

Prefer:

```ts
getUserById();
createBooking();
updateBookingStatus();
```

Avoid:

```ts
getData();
doThing();
process();
handleStuff();
```

Use camelCase for variables and functions.

Use PascalCase for classes, interfaces, and types when appropriate.

Use clear route names.

---

# 19. Imports

Keep imports organized.

Prefer:

```ts
import express from "express";
import { userRouter } from "./routes/user.routes";
import { errorHandler } from "./middleware/error.middleware";
```

Avoid unnecessary imports.

Remove unused imports.

Do not introduce circular dependencies.

---

# 20. Utility Functions

Only create utilities when logic is genuinely reusable.

Avoid creating a utility for one trivial operation.

Bad:

```ts
export const add = (a: number, b: number) => a + b;
```

unless it has a meaningful reason to exist in the project.

Good candidates:

```text
JWT utilities
Password utilities
Date utilities
Pagination utilities
File utilities
Response utilities
```

---

# 21. Comments

Write comments to explain **why**, not obvious syntax.

Bad:

```ts
// Increment counter by one
counter++;
```

Good:

```ts
// Prevent duplicate booking requests from creating multiple reservations.
```

Do not add comments everywhere.

Prefer readable code over excessive comments.

---

# 22. Testing

Business-critical functionality should have tests.

Prioritize tests for:

- Authentication
- Authorization
- Booking creation
- Booking cancellation
- Payment-related logic
- Validation
- Database operations
- Important business rules

Tests should verify behavior rather than implementation details.

Do not modify production code simply to make a poorly designed test pass.

---

# 23. Debugging Rules

When debugging:

1. Reproduce the problem.
2. Read the complete error message.
3. Identify the layer where the error originates.
4. Check the relevant types.
5. Check the inputs.
6. Check the database if applicable.
7. Make the smallest appropriate change.
8. Run the application again.
9. Run type checking.
10. Run relevant tests.

Do not immediately rewrite large sections of the application.

Do not blindly apply AI-generated fixes.

Understand the cause of the problem before changing the architecture.

---

# 24. AI-Assisted Development

AI can help with:

- Explaining errors
- Explaining unfamiliar APIs
- Suggesting solutions
- Reviewing code
- Generating tests
- Finding edge cases
- Explaining TypeScript errors

AI should not replace understanding.

When generating code:

1. Explain what the code is doing.
2. Explain why the approach is appropriate.
3. Identify important tradeoffs.
4. Keep the implementation consistent with the existing architecture.
5. Do not introduce unnecessary dependencies.

When fixing an error, prefer understanding the root cause over applying a random workaround.

Do not blindly copy generated code.

---

# 25. Dependency Rules

Before installing a package:

- Check whether the functionality already exists.
- Check whether the package is actively maintained.
- Check compatibility with the current Node.js and TypeScript versions.
- Avoid unnecessary dependencies.
- Prefer established packages for security-sensitive functionality.

Do not downgrade a dependency simply because an old tutorial requires it.

If two dependencies are incompatible, determine which package needs to be replaced or upgraded.

---

# 26. Type Checking

Before considering backend code complete, run:

```bash
pnpm exec tsc --noEmit
```

The project should have zero TypeScript errors.

Development execution and type checking are separate concerns.

For example:

```bash
pnpm dev
```

runs the application.

```bash
pnpm exec tsc --noEmit
```

checks the TypeScript project.

Both are important.

---

# 27. Production Rules

Development configuration must not automatically be used in production.

Before production deployment:

- Validate environment variables.
- Disable verbose debugging.
- Configure CORS correctly.
- Configure secure cookies when applicable.
- Use production database credentials.
- Ensure secrets are not committed.
- Run type checking.
- Run tests.
- Review logging.
- Review error responses.

---

# 28. Change Management

When modifying an existing feature:

- Understand the existing implementation first.
- Avoid unrelated refactoring.
- Preserve existing behavior unless the requirement changes it.
- Update types when changing data structures.
- Update validation when changing inputs.
- Update tests when changing behavior.
- Check dependent routes/services after changing shared functionality.

Keep changes focused.

---

# 29. Before Writing New Code

Before implementing a feature, determine:

```text
1. What endpoint is needed?
2. What input does it receive?
3. How should the input be validated?
4. What business logic is required?
5. What database operations are required?
6. What authentication is required?
7. What authorization is required?
8. What response should be returned?
9. What errors can occur?
10. What tests are needed?
```

Do not start writing code until the existing architecture and requirements are understood.

---

# 30. Final Rule

The backend should be:

```text
Type-safe
Secure
Testable
Maintainable
Predictable
Simple
Consistent
```

Do not optimize for writing the most code.

Optimize for writing the **smallest amount of correct code that clearly solves the problem**.
