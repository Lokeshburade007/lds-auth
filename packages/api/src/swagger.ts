import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "SecurePool API",
    description:
      "Production-grade authentication framework. Supports JWT, OTP, Google SSO, multi-tenancy, session management, and RBAC.",
    version: "1.0.0",
    contact: {
      name: "SecurePool",
    },
  },
  servers: [
    {
      url: "http://localhost:5001",
      description: "Local Development",
    },
  ],
  tags: [
    { name: "Auth", description: "Registration, login, OTP, password management" },
    { name: "Sessions", description: "Device session management" },
    { name: "Health", description: "Server health check" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste your access token here (from login/register response)",
      },
    },
    parameters: {
      TenantId: {
        in: "header",
        name: "x-tenant-id",
        required: true,
        schema: { type: "string", default: "default" },
        description: "Tenant identifier",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Invalid email or password" },
        },
      },
      TokenResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string", example: "eyJhbGciOiJSUzI1NiIs..." },
          refreshToken: { type: "string", example: "bd5ce14f4253c157c81d..." },
        },
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "string", example: "69bfe6bdd7fe5fc5acf93dec" },
          userId: { type: "string", example: "69bfe6b6d7fe5fc5acf93de5" },
          device: { type: "string", example: "Chrome on Mac OS" },
          ip: { type: "string", example: "::1" },
          createdAt: { type: "string", format: "date-time" },
          isActive: { type: "boolean", example: true },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "Server is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },

    // ===== AUTH =====

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register new user",
        description:
          "Validates email uniqueness, hashes password, and sends a 6-digit OTP to the email. **Does NOT create the user yet** — call `/auth/verify-email` with the OTP to complete registration.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", minLength: 8, example: "MyPass@1234" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP sent to email",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "OTP sent to your email. Verify to complete registration." },
                    email: { type: "string", example: "user@example.com" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify email OTP (complete registration)",
        description:
          "Verifies the 6-digit OTP sent during registration. On success, creates the user account and returns JWT tokens.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  code: { type: "string", minLength: 6, maxLength: 6, example: "482910" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User created + tokens", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
          400: { description: "Invalid OTP or expired", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email & password",
        description: "Authenticates user and returns JWT access token + refresh token. Also creates a device session.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", example: "MyPass@1234" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Exchanges a valid refresh token for a new access token + new refresh token (rotation).",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string", example: "bd5ce14f4253c157c81d546017374ee1..." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "New token pair", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
          401: { description: "Invalid or expired refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/otp/request": {
      post: {
        tags: ["Auth"],
        summary: "Request OTP for login",
        description: "Sends a 6-digit OTP to the registered user's email. Use `/auth/otp/verify` to complete login.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "OTP sent to your email" } },
                },
              },
            },
          },
          400: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/otp/verify": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP and login",
        description: "Verifies the OTP code and returns JWT tokens. Also marks unverified users as verified.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  code: { type: "string", minLength: 6, maxLength: 6, example: "482910" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
          401: { description: "Invalid OTP", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Google SSO login",
        description: "Authenticates with a Google ID token. Creates the user if they don't exist.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", description: "Google ID token from Sign-In SDK" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
          401: { description: "Invalid Google token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset OTP",
        description: "Sends a 6-digit OTP to the user's email for password reset. Use `/auth/reset-password` with the OTP.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "OTP sent to your email" } },
                },
              },
            },
          },
          400: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with OTP",
        description: "Verifies the OTP from forgot-password and sets a new password.",
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code", "newPassword"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  code: { type: "string", minLength: 6, maxLength: 6, example: "482910" },
                  newPassword: { type: "string", minLength: 8, example: "NewPass@5678" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "Password reset successfully" } },
                },
              },
            },
          },
          400: { description: "Invalid OTP or user not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password (authenticated)",
        description: "Changes the password for the currently authenticated user. Requires the current password.",
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                  oldPassword: { type: "string", example: "MyPass@1234" },
                  newPassword: { type: "string", minLength: 8, example: "NewPass@5678" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password changed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "Password changed successfully" } },
                },
              },
            },
          },
          400: { description: "Incorrect old password", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ===== SESSIONS =====

    "/sessions": {
      get: {
        tags: ["Sessions"],
        summary: "List active sessions",
        description: "Returns all active sessions for the authenticated user.",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Session list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Session" },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Sessions"],
        summary: "Revoke all sessions",
        description: "Deactivates all sessions for the authenticated user (logout everywhere).",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "All sessions revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "All sessions deactivated" } },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/sessions/{id}": {
      delete: {
        tags: ["Sessions"],
        summary: "Revoke a specific session",
        description: "Deactivates a single session by ID.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Session ID",
          },
        ],
        responses: {
          200: {
            description: "Session revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "Session deactivated" } },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "SecurePool API Docs",
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  // Serve raw JSON spec
  app.get("/docs.json", (_req, res) => {
    res.json(swaggerDocument);
  });
}
