#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Health Reminder Backend - Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}1. Testing health check endpoint...${NC}"
curl -s http://localhost:3001/api/health | python3 -m json.tool
echo ""

# Test 2: Create user
echo -e "${YELLOW}2. Creating test user 'bob'...${NC}"
USER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"bob"}')
echo "$USER_RESPONSE" | python3 -m json.tool
USER_ID=$(echo "$USER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo -e "${GREEN}User ID: $USER_ID${NC}\n"

# Test 3: Create reminders
echo -e "${YELLOW}3. Creating water reminder (1-minute interval)...${NC}"
REMINDER1=$(curl -s -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"type\":\"water\",\"interval_minutes\":1}")
echo "$REMINDER1" | python3 -m json.tool
REMINDER1_ID=$(echo "$REMINDER1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo -e "${GREEN}Reminder ID: $REMINDER1_ID${NC}\n"

echo -e "${YELLOW}4. Creating exercise reminder (2-minute interval)...${NC}"
REMINDER2=$(curl -s -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"type\":\"exercise\",\"interval_minutes\":2}")
echo "$REMINDER2" | python3 -m json.tool
REMINDER2_ID=$(echo "$REMINDER2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo -e "${GREEN}Reminder ID: $REMINDER2_ID${NC}\n"

# Test 4: Get reminders
echo -e "${YELLOW}5. Listing all reminders for user...${NC}"
curl -s "http://localhost:3001/api/reminders/$USER_ID" | python3 -m json.tool
echo ""

# Test 5: Get user profile
echo -e "${YELLOW}6. Getting user profile...${NC}"
curl -s "http://localhost:3001/api/users/$USER_ID" | python3 -m json.tool
echo ""

# Test 6: Log verification activity
echo -e "${YELLOW}7. Logging verification activity (water verified)...${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER1_ID,\"type\":\"water\",\"verified\":true}" | python3 -m json.tool
echo ""

echo -e "${YELLOW}8. Logging verification activity (exercise not verified)...${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER2_ID,\"type\":\"exercise\",\"verified\":false}" | python3 -m json.tool
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}📝 Check the server logs to see:${NC}"
echo -e "  ✅ Scheduler started for both reminders"
echo -e "  ⏰ First notification fires after ~5 seconds"
echo -e "  ⏰ Recurring notifications every 1 and 2 minutes"
echo -e ""
echo -e "${YELLOW}💡 Example server log output:${NC}"
echo -e "  ${GREEN}✅ Scheduler started  → session=reminder-1  interval=1min${NC}"
echo -e "  ${GREEN}✅ Scheduler started  → session=reminder-2  interval=2min${NC}"
echo -e "  ${GREEN}⏰ [reminder-1] First notification (after 5s)${NC}"
echo -e "  ${GREEN}⏰ [reminder-2] First notification (after 5s)${NC}"
echo -e "  ${GREEN}⏰ [reminder-1] Reminder fired (every 1min)${NC}"
echo -e "  ${GREEN}⏰ [reminder-2] Reminder fired (every 2min)${NC}"
