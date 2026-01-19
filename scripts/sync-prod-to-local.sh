#!/bin/bash

# =============================================================================
# Sync Production Database to Local
# =============================================================================
# This script completely replaces local data with production data.
# Schema is synced via Prisma migrations.
# Sessions table is excluded from sync.
# =============================================================================

set -e

# Configuration
LOCAL_DB_URL="postgresql://postgres:postgres@localhost:5432/irl_development"
LOCAL_DB_NAME="irl_development"
PROD_SERVER="root@178.128.11.67"
PROD_ENV_PATH="/var/www/irl/service/.env"
BACKUP_DIR="$(dirname "$0")/db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(dirname "$0")"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")/service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Sync Production Database to Local${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Verify local database connection
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Checking local database connection...${NC}"
if ! psql "$LOCAL_DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to local database${NC}"
    echo "Make sure PostgreSQL is running and the database exists."
    exit 1
fi
echo -e "${GREEN}Local database connection OK${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Verify SSH connection and get production DB credentials
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Checking SSH connection to production...${NC}"
if ! ssh -o ConnectTimeout=10 "$PROD_SERVER" "echo 'connected'" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot SSH to production server${NC}"
    echo "Make sure you have SSH access to $PROD_SERVER"
    exit 1
fi
echo -e "${GREEN}SSH connection OK${NC}"

echo -e "${YELLOW}Reading production database credentials...${NC}"
PROD_DB_URL=$(ssh "$PROD_SERVER" "grep '^DATABASE_URL=' $PROD_ENV_PATH | cut -d'\"' -f2")
if [ -z "$PROD_DB_URL" ]; then
    echo -e "${RED}ERROR: Could not read DATABASE_URL from production .env${NC}"
    exit 1
fi
if [[ ! "$PROD_DB_URL" =~ ^postgres(ql)?:// ]]; then
    echo -e "${RED}ERROR: DATABASE_URL does not appear to be a valid PostgreSQL connection string${NC}"
    exit 1
fi
echo -e "${GREEN}Production credentials retrieved${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 3: Get record counts from both databases
# -----------------------------------------------------------------------------
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Current Record Counts${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

get_counts() {
    local db_url="$1"
    local via_ssh="$2"

    local query="SELECT
        (SELECT COUNT(*) FROM \"User\" WHERE deleted = false) as users,
        (SELECT COUNT(*) FROM \"Person\" WHERE deleted = false) as persons,
        (SELECT COUNT(*) FROM \"Group\" WHERE deleted = false) as groups,
        (SELECT COUNT(*) FROM \"ContactInformation\" WHERE deleted = false) as contacts;"

    if [ "$via_ssh" = "true" ]; then
        ssh "$PROD_SERVER" "psql '$db_url' -t -A -F',' -c \"$query\""
    else
        psql "$db_url" -t -A -F',' -c "$query"
    fi
}

echo -e "${YELLOW}PRODUCTION (source):${NC}"
PROD_COUNTS=$(get_counts "$PROD_DB_URL" "true")
IFS=',' read -r PROD_USERS PROD_PERSONS PROD_GROUPS PROD_CONTACTS <<< "$PROD_COUNTS"
echo "  Users:              $PROD_USERS"
echo "  Persons:            $PROD_PERSONS"
echo "  Groups:             $PROD_GROUPS"
echo "  Contact Information: $PROD_CONTACTS"
echo ""

echo -e "${YELLOW}LOCAL (target - will be replaced):${NC}"
LOCAL_COUNTS=$(get_counts "$LOCAL_DB_URL" "false")
IFS=',' read -r LOCAL_USERS LOCAL_PERSONS LOCAL_GROUPS LOCAL_CONTACTS <<< "$LOCAL_COUNTS"
echo "  Users:              $LOCAL_USERS"
echo "  Persons:            $LOCAL_PERSONS"
echo "  Groups:             $LOCAL_GROUPS"
echo "  Contact Information: $LOCAL_CONTACTS"
echo ""

# -----------------------------------------------------------------------------
# Step 4: Confirmation
# -----------------------------------------------------------------------------
echo -e "${RED}==========================================${NC}"
echo -e "${RED}  WARNING: DESTRUCTIVE OPERATION${NC}"
echo -e "${RED}==========================================${NC}"
echo ""
echo -e "${RED}This will COMPLETELY REPLACE all data in:${NC}"
echo -e "${RED}  Database: ${LOCAL_DB_NAME}${NC}"
echo -e "${RED}  Location: localhost${NC}"
echo ""
echo -e "${YELLOW}A backup will be created before proceeding.${NC}"
echo ""
echo -e "Type ${GREEN}SYNC TO LOCAL${NC} to continue (or anything else to cancel):"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "SYNC TO LOCAL" ]; then
    echo ""
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo ""

# -----------------------------------------------------------------------------
# Step 5: Create backup of local database
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Creating backup of local database...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/local_backup_${TIMESTAMP}.sql"

pg_dump "$LOCAL_DB_URL" --data-only --exclude-table=sessions > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo -e "${GREEN}Backup created: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}ERROR: Backup file is empty${NC}"
    exit 1
fi
echo ""

# -----------------------------------------------------------------------------
# Step 6: Export production data
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Exporting production database...${NC}"
PROD_DUMP_FILE=$(mktemp /tmp/prod_dump.XXXXXX.sql)

ssh "$PROD_SERVER" "pg_dump '$PROD_DB_URL' --data-only --exclude-table=sessions" > "$PROD_DUMP_FILE"

if [ -s "$PROD_DUMP_FILE" ]; then
    DUMP_SIZE=$(ls -lh "$PROD_DUMP_FILE" | awk '{print $5}')
    echo -e "${GREEN}Production data exported ($DUMP_SIZE)${NC}"
else
    echo -e "${RED}ERROR: Export file is empty${NC}"
    exit 1
fi
echo ""

# -----------------------------------------------------------------------------
# Step 7: Clear local data and restore
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Clearing local database...${NC}"

# Generate truncate commands for all tables except sessions and migrations
TRUNCATE_QUERY="DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('sessions', '_prisma_migrations')) LOOP
        EXECUTE 'TRUNCATE TABLE \"' || r.tablename || '\" CASCADE';
    END LOOP;
END \$\$;"

psql "$LOCAL_DB_URL" -c "$TRUNCATE_QUERY"
echo -e "${GREEN}Local data cleared${NC}"

echo -e "${YELLOW}Restoring production data to local...${NC}"
psql "$LOCAL_DB_URL" < "$PROD_DUMP_FILE"
echo -e "${GREEN}Data restored to local${NC}"
echo ""

# Clean up temp file
rm -f "$PROD_DUMP_FILE"

# -----------------------------------------------------------------------------
# Step 8: Run Prisma migrations locally
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Running Prisma migrations locally...${NC}"
(cd "$SERVICE_DIR" && pnpm prisma migrate deploy)
echo -e "${GREEN}Migrations complete${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 9: Verify and show final counts
# -----------------------------------------------------------------------------
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Sync Complete - Final Record Counts${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

echo -e "${GREEN}LOCAL (after sync):${NC}"
FINAL_COUNTS=$(get_counts "$LOCAL_DB_URL" "false")
IFS=',' read -r FINAL_USERS FINAL_PERSONS FINAL_GROUPS FINAL_CONTACTS <<< "$FINAL_COUNTS"
echo "  Users:              $FINAL_USERS"
echo "  Persons:            $FINAL_PERSONS"
echo "  Groups:             $FINAL_GROUPS"
echo "  Contact Information: $FINAL_CONTACTS"
echo ""

# Verify counts match source
if [ "$FINAL_USERS" != "$PROD_USERS" ] || [ "$FINAL_PERSONS" != "$PROD_PERSONS" ] || \
   [ "$FINAL_GROUPS" != "$PROD_GROUPS" ] || [ "$FINAL_CONTACTS" != "$PROD_CONTACTS" ]; then
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}  WARNING: Record count mismatch!${NC}"
    echo -e "${RED}==========================================${NC}"
    echo ""
    echo "Expected (from production):"
    echo "  Users: $PROD_USERS, Persons: $PROD_PERSONS, Groups: $PROD_GROUPS, Contacts: $PROD_CONTACTS"
    echo "Actual (in local):"
    echo "  Users: $FINAL_USERS, Persons: $FINAL_PERSONS, Groups: $FINAL_GROUPS, Contacts: $FINAL_CONTACTS"
    echo ""
    echo -e "Backup saved to: ${YELLOW}$BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  SUCCESS! Production data synced to local${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "Backup saved to: ${YELLOW}$BACKUP_FILE${NC}"
echo ""
