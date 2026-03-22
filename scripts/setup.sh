#!/bin/bash

# =============================================
# SecurePool - One-Command Setup Script
# =============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_step() {
  echo ""
  echo -e "${BLUE}${BOLD}[$1/8]${NC} ${GREEN}$2${NC}"
  echo "─────────────────────────────────────"
}

print_success() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "  ${RED}✗${NC} $1"
}

# =============================================
# Step 1: Check Prerequisites
# =============================================
print_step 1 "Checking prerequisites"

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  print_success "Node.js $NODE_VERSION"
else
  print_error "Node.js not found. Install with: brew install node"
  exit 1
fi

# npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  print_success "npm $NPM_VERSION"
else
  print_error "npm not found"
  exit 1
fi

# OpenSSL
if command -v openssl &> /dev/null; then
  print_success "OpenSSL available"
else
  print_error "OpenSSL not found"
  exit 1
fi

# MongoDB
if command -v mongosh &> /dev/null; then
  print_success "mongosh available"
else
  print_warn "mongosh not found. Install with: brew install mongodb-community"
  print_warn "Skipping MongoDB setup - you'll need to configure DB_URL manually"
fi

# =============================================
# Step 2: Install Dependencies
# =============================================
print_step 2 "Installing dependencies"

npm install --silent 2>&1 | tail -1
print_success "All packages installed"

# =============================================
# Step 3: Generate RSA Keys
# =============================================
print_step 3 "Setting up JWT RSA keys"

if [ -f "$ROOT_DIR/private.pem" ] && [ -f "$ROOT_DIR/public.pem" ]; then
  print_success "RSA keys already exist (private.pem, public.pem)"
else
  openssl genrsa -out "$ROOT_DIR/private.pem" 2048 2>/dev/null
  openssl rsa -in "$ROOT_DIR/private.pem" -pubout -out "$ROOT_DIR/public.pem" 2>/dev/null
  print_success "Generated new RSA key pair"
fi

# =============================================
# Step 4: Setup MongoDB
# =============================================
print_step 4 "Setting up MongoDB"

MONGO_RUNNING=false
DB_URL=""

# Check if MongoDB is running
if mongosh --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null | grep -q "ok"; then
  MONGO_RUNNING=true
  print_success "MongoDB is running"
else
  # Try to start MongoDB
  if command -v brew &> /dev/null; then
    print_warn "MongoDB not running. Attempting to start..."
    brew services start mongodb-community 2>/dev/null || true
    sleep 2
    if mongosh --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null | grep -q "ok"; then
      MONGO_RUNNING=true
      print_success "MongoDB started via brew"
    fi
  fi
fi

if [ "$MONGO_RUNNING" = true ]; then
  # Ask about authentication setup
  echo ""
  echo -e "  ${YELLOW}Choose MongoDB setup:${NC}"
  echo "  1) Simple (no auth) - recommended for quick start"
  echo "  2) With authentication - production-like setup"
  echo ""
  read -p "  Enter choice [1]: " MONGO_CHOICE
  MONGO_CHOICE=${MONGO_CHOICE:-1}

  if [ "$MONGO_CHOICE" = "2" ]; then
    echo ""
    read -p "  DB username [securepool-user]: " DB_USER
    DB_USER=${DB_USER:-securepool-user}
    read -p "  DB password [SecurePool@123]: " DB_PASS
    DB_PASS=${DB_PASS:-SecurePool@123}
    DB_NAME="securepool"

    # Create user in MongoDB
    mongosh --quiet --eval "
      use $DB_NAME;
      try {
        db.createUser({
          user: '$DB_USER',
          pwd: '$DB_PASS',
          roles: [{ role: 'readWrite', db: '$DB_NAME' }]
        });
        print('User created successfully');
      } catch(e) {
        if (e.codeName === 'DuplicateKey' || e.code === 11000) {
          print('User already exists - skipping');
        } else {
          print('Note: ' + e.message);
        }
      }
    " 2>/dev/null || true

    # URL-encode the password (replace @ with %40)
    DB_PASS_ENCODED=$(echo "$DB_PASS" | sed 's/@/%40/g')
    DB_URL="mongodb://${DB_USER}:${DB_PASS_ENCODED}@localhost:27017/${DB_NAME}?authSource=${DB_NAME}"
    print_success "MongoDB user '${DB_USER}' configured"
  else
    DB_URL="mongodb://localhost:27017/securepool"
    print_success "Using MongoDB without authentication"
  fi
else
  print_warn "MongoDB not available. Using default URL (update .env manually)"
  DB_URL="mongodb://localhost:27017/securepool"
fi

# =============================================
# Step 5: Setup Email (Optional)
# =============================================
print_step 5 "Email configuration (for OTP)"

echo ""
echo -e "  ${YELLOW}Email is needed for OTP verification.${NC}"
echo "  You can skip this and add it later to .env"
echo ""
read -p "  Setup email now? [y/N]: " SETUP_EMAIL
SETUP_EMAIL=${SETUP_EMAIL:-N}

EMAIL_HOST=""
EMAIL_PORT=""
EMAIL_SECURE=""
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM=""

if [[ "$SETUP_EMAIL" =~ ^[Yy]$ ]]; then
  echo ""
  echo "  Using Gmail SMTP (most common):"
  echo "  1. Go to https://myaccount.google.com/apppasswords"
  echo "  2. Generate an App Password"
  echo ""
  read -p "  Gmail address: " EMAIL_USER
  read -p "  App Password (16 chars): " EMAIL_PASS

  if [ -n "$EMAIL_USER" ] && [ -n "$EMAIL_PASS" ]; then
    EMAIL_HOST="smtp.gmail.com"
    EMAIL_PORT="587"
    EMAIL_SECURE="false"
    EMAIL_FROM="$EMAIL_USER"
    print_success "Email configured: $EMAIL_USER"
  else
    print_warn "Email skipped (empty input)"
  fi
else
  print_warn "Email skipped - OTP emails won't be sent"
fi

# =============================================
# Step 6: Create .env File
# =============================================
print_step 6 "Creating .env file"

ENV_FILE="$ROOT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  read -p "  .env already exists. Overwrite? [y/N]: " OVERWRITE
  OVERWRITE=${OVERWRITE:-N}
  if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
    print_warn "Keeping existing .env file"
  else
    WRITE_ENV=true
  fi
else
  WRITE_ENV=true
fi

if [ "$WRITE_ENV" = true ]; then
  cat > "$ENV_FILE" << ENVEOF
# Database
DB_TYPE=mongo
DB_URL=$DB_URL

# JWT
JWT_PRIVATE_KEY_PATH=./private.pem
JWT_PUBLIC_KEY_PATH=./public.pem

# Email (Gmail SMTP)
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_SECURE=$EMAIL_SECURE
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
EMAIL_FROM=$EMAIL_FROM

# Server
PORT=5001

# Security
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=*
ENVEOF
  print_success ".env file created"
fi

# =============================================
# Step 7: Build All Packages
# =============================================
print_step 7 "Building all packages"

npx turbo run build --filter='@securepool/*' 2>&1 | grep -E "(successful|Failed|cached)" | tail -1
print_success "All packages built"

# =============================================
# Step 8: Verify Setup
# =============================================
print_step 8 "Verifying setup"

# Check all dist folders exist
PACKAGES_OK=true
for pkg in core application infrastructure persistence api react-sdk; do
  if [ -d "$ROOT_DIR/packages/$pkg/dist" ]; then
    print_success "@securepool/$pkg built"
  else
    print_error "@securepool/$pkg - dist missing!"
    PACKAGES_OK=false
  fi
done

# =============================================
# Done!
# =============================================
echo ""
echo "═══════════════════════════════════════════"
echo -e "${GREEN}${BOLD}  SecurePool setup complete!${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo -e "  ${BOLD}Start backend:${NC}"
echo "    cd apps/demo-backend"
echo "    npx ts-node src/index.ts"
echo ""
echo -e "  ${BOLD}Start frontend:${NC} (new terminal)"
echo "    cd apps/demo-frontend"
echo "    npx vite"
echo ""
echo -e "  ${BOLD}API Docs:${NC}"
echo "    http://localhost:5001/docs"
echo ""
echo -e "  ${BOLD}Frontend:${NC}"
echo "    http://localhost:5173"
echo ""
echo -e "  ${BOLD}Health check:${NC}"
echo "    curl http://localhost:5001/health"
echo ""
