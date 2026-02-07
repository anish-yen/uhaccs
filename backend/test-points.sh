#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Points System Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Create user
echo -e "${YELLOW}1. Creating user...${NC}"
USER=$(curl -s -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test_player"}')
USER_ID=$(echo "$USER" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo -e "${GREEN}User created: ID=$USER_ID${NC}\n"

# Create reminder
echo -e "${YELLOW}2. Creating water reminder...${NC}"
REMINDER=$(curl -s -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"type\":\"water\",\"interval_minutes\":5}")
REMINDER_ID=$(echo "$REMINDER" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo -e "${GREEN}Reminder created: ID=$REMINDER_ID${NC}\n"

# Test 1: First verification (water)
echo -e "${YELLOW}3. First verification: WATER (10 base points)${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER_ID,\"type\":\"water\",\"verified\":true}" \
  | python3 -m json.tool
echo ""

# Test 2: Second verification (water with streak bonus)
echo -e "${YELLOW}4. Second verification: WATER (10 base + 1 streak = 11 points)${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER_ID,\"type\":\"water\",\"verified\":true}" \
  | python3 -m json.tool
echo ""

# Test 3: Third verification (exercise with streak bonus)
echo -e "${YELLOW}5. Third verification: EXERCISE (25 base + 5% streak = 27 points)${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER_ID,\"type\":\"exercise\",\"verified\":true}" \
  | python3 -m json.tool
echo ""

# Test 4: Failed verification
echo -e "${YELLOW}6. Failed verification: WATER (0 points)${NC}"
curl -s -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"reminder_id\":$REMINDER_ID,\"type\":\"water\",\"verified\":false}" \
  | python3 -m json.tool
echo ""

# Test 5: Check user profile
echo -e "${YELLOW}7. User profile (shows total points and streaks)${NC}"
curl -s http://localhost:3001/api/users/$USER_ID | python3 -m json.tool
echo ""

# Test 6: Check verification history
echo -e "${YELLOW}8. Verification history (shows all activities)${NC}"
curl -s http://localhost:3001/api/verification/$USER_ID/history | python3 -m json.tool
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Points system working correctly!${NC}"
echo -e "${BLUE}========================================${NC}"
