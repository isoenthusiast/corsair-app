"""Kanban API Test — All 4 Roles
Tests: admin CRUD, teacher scope, parent scope, student block, PATCH drag, pagination
"""
import urllib.request, urllib.parse, urllib.error
import http.cookiejar
import json
import sys

BASE = "http://localhost:3200"

USERS = {
    "admin":   ("admin",    "admin123"),
    "teacher": ("teacher1", "teach123"),
    "parent":  ("parent",   "learning123"),
    "student": ("andrew",   "andrew123"),
}

def login(role):
    """Login as role, return opener with session cookie"""
    username, password = USERS[role]
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPRedirectHandler()
    )
    
    # Get CSRF token
    resp = opener.open(f"{BASE}/api/auth/csrf")
    csrf = json.loads(resp.read())["csrfToken"]
    
    # Login
    data = urllib.parse.urlencode({
        "username": username,
        "password": password,
        "redirect": "false",
        "csrfToken": csrf
    }).encode()
    
    resp = opener.open(
        urllib.request.Request(f"{BASE}/api/auth/callback/credentials", data=data),
    )
    
    # Verify session
    resp = opener.open(f"{BASE}/api/auth/session")
    session = json.loads(resp.read())
    if not session or not session.get("user"):
        print(f"  ❌ {role} login FAILED: {session}")
        return None
    
    print(f"  ✅ {role} logged in as {session['user'].get('name', '?')} (role={session['user'].get('role', '?')})")
    return opener

def api(opener, method, path, body=None):
    """Make API request, return (status, data)"""
    url = f"{BASE}{path}"
    if body is not None:
        data = json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
    else:
        req = urllib.request.Request(url, method=method)
    
    try:
        resp = opener.open(req)
        return resp.status, json.loads(resp.read()) if resp.status != 204 else {}
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except:
            body = str(e)
        return e.code, body

def main():
    results = {"total": 0, "passed": 0, "failed": 0}
    
    def test(name, condition):
        results["total"] += 1
        if condition:
            results["passed"] += 1
            print(f"  ✅ {name}")
        else:
            results["failed"] += 1
            print(f"  ❌ {name}")
    
    print("=" * 60)
    print("🏴‍☠️  Kanban API Test — All 4 Roles")
    print("=" * 60)
    
    # ── Login all roles ──
    print("\n── Login ──")
    sessions = {}
    for role in ["admin", "teacher", "parent", "student"]:
        sessions[role] = login(role)
    
    admin = sessions["admin"]
    teacher = sessions["teacher"]
    parent = sessions["parent"]
    student = sessions["student"]
    
    # ── Create test cards as admin ──
    print("\n── K1: Admin CREATE ──")
    created_ids = []
    
    # Card 1: admin-created task
    status, data = api(admin, "POST", "/api/admin/kanban", {
        "title": "Test Task 1: Review AI trials",
        "description": "Check the 3 new AI-generated trials in Sea of Whispers",
        "priority": "High",
        "type": "Task"
    })
    card_id_1 = data.get("card", {}).get("id")
    test("POST create task (High priority)", 
         status == 201 and card_id_1)
    if card_id_1:
        created_ids.append(card_id_1)
    
    # Card 2: support ticket
    status, data = api(admin, "POST", "/api/admin/kanban", {
        "title": "Test Task 2: Support ticket",
        "description": "Parent reported broken link on Map page",
        "priority": "Medium",
        "type": "SupportTicket"
    })
    card_id_2 = data.get("card", {}).get("id")
    test("POST create support ticket (Medium priority)",
         status == 201 and card_id_2)
    if card_id_2:
        created_ids.append(card_id_2)
    
    # Card 3: Low priority
    status, data = api(admin, "POST", "/api/admin/kanban", {
        "title": "Test Task 3: Update docs",
        "description": "Update the ADMIN_PHILOSOPHY.md with new Kanban section",
        "priority": "Low"
    })
    card_id_3 = data.get("card", {}).get("id")
    test("POST create task (Low priority, default Task type)",
         status == 201 and card_id_3)
    if card_id_3:
        created_ids.append(card_id_3)
    
    # ── K2: Admin GET (should see all 3) ──
    print("\n── K2: Admin GET ──")
    status, data = api(admin, "GET", "/api/admin/kanban")
    admin_cards = data.get("cards", [])
    test(f"Admin sees cards (got {len(admin_cards)})", 
         status == 200 and len(admin_cards) >= 3)
    test("Admin sees Backlog column", 
         any(c["status"] == "Backlog" for c in admin_cards))
    
    # ── K3: Teacher GET (scoped, may see 0) ──
    print("\n── K3: Teacher GET ──")
    status, data = api(teacher, "GET", "/api/admin/kanban")
    teacher_cards = data.get("cards", [])
    test(f"Teacher GET returns 200 (got {len(teacher_cards)} cards)",
         status == 200)
    
    # ── K4: Parent GET (scoped, may see 0) ──
    print("\n── K4: Parent GET ──")
    status, data = api(parent, "GET", "/api/admin/kanban")
    parent_cards = data.get("cards", [])
    test(f"Parent GET returns 200 (got {len(parent_cards)} cards)",
         status == 200)
    
    # ── K5: Student GET (should be blocked) ──
    print("\n── K5: Student GET (should be blocked) ──")
    status, data = api(student, "GET", "/api/admin/kanban")
    test(f"Student GET blocked (status={status})",
         status in [401, 403, 302])
    
    # ── K6: PATCH update status (drag-and-drop) ──
    print("\n── K6: Admin PATCH (drag-and-drop) ──")
    if created_ids:
        card_id = created_ids[0]
        # Move from Backlog -> InProgress
        status, data = api(admin, "PATCH", f"/api/admin/kanban/{card_id}", {
            "status": "InProgress"
        })
        test("PATCH Backlog→InProgress", 
             status == 200 and data.get("card", {}).get("status") == "InProgress")
        
        # Move InProgress -> Done
        status, data = api(admin, "PATCH", f"/api/admin/kanban/{card_id}", {
            "status": "Done"
        })
        test("PATCH InProgress→Done",
             status == 200 and data.get("card", {}).get("status") == "Done")
        
        # Move Done -> Archive (should set archivedAt)
        status, data = api(admin, "PATCH", f"/api/admin/kanban/{card_id}", {
            "status": "Archive"
        })
        patched_card = data.get("card", {})
        test("PATCH Done→Archive (sets archivedAt)",
             status == 200 and patched_card.get("status") == "Archive" and patched_card.get("archivedAt") is not None)
    
    # ── K7: Non-admin create attempt ──
    print("\n── K7: Non-admin CREATE attempts ──")
    status, data = api(teacher, "POST", "/api/admin/kanban", {
        "title": "Teacher's task"
    })
    test(f"Teacher can create task (status={status})",
         status in [200, 201])
    
    status, data = api(student, "POST", "/api/admin/kanban", {
        "title": "Student's task"
    })
    test(f"Student cannot create task (status={status})",
         status in [401, 403, 302])
    
    # ── K8: 404 for non-existent card ──
    print("\n── K8: Error handling ──")
    status, data = api(admin, "PATCH", "/api/admin/kanban/nonexistent-id-12345", {
        "status": "InProgress"
    })
    test(f"PATCH non-existent card returns 404 (status={status})",
         status == 404)
    
    status, data = api(admin, "GET", "/api/admin/kanban")
    # The archived card should be filtered out from non-Archive columns
    archived = [c for c in data.get("cards", []) if c["status"] == "Archive"]
    test(f"Archive cards present in GET response ({len(archived)} in Archive column)",
         len(archived) >= 1)
    
    # ── K9: Verify card fields ──
    print("\n── K9: Card field validation ──")
    all_cards = data.get("cards", [])
    if all_cards:
        card = all_cards[0]
        test("Card has id", "id" in card)
        test("Card has title", "title" in card)
        test("Card has type", "type" in card)
        test("Card has status", "status" in card)
        test("Card has priority", "priority" in card)
        test("Card has createdAt", "createdAt" in card)
    
    # ── Summary ──
    print("\n" + "=" * 60)
    print(f"📊 Results: {results['passed']}/{results['total']} passed")
    if results['failed'] > 0:
        print(f"   ❌ {results['failed']} FAILED")
        sys.exit(1)
    else:
        print("   🎉 ALL PASSED!")
    
    return results

if __name__ == "__main__":
    main()
