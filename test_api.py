import requests

BASE = "http://127.0.0.1:8000"

def test_full_cycle():
    # 1. Check Profile
    p = requests.get(f"{BASE}/api/profile").json()
    print(f"Profile: {p['username']}, Level: {p['level']}, Coins: {p['coins']}, Streak: {p['streak']}")

    # 2. Fetch Questions
    q_res = requests.get(f"{BASE}/api/questions?mode=quick&count=3").json()
    questions = q_res["questions"]
    print(f"Fetched {len(questions)} questions")
    assert len(questions) == 3

    # 3. Validate Answer
    q0 = questions[0]
    val = requests.post(f"{BASE}/api/validate", json={
        "questionId": q0["questionId"],
        "selectedAnswer": 0,
        "timeSpentSeconds": 5.0,
        "mode": "quick"
    }).json()
    print(f"Validated Q0 ({q0['questionId']}): isCorrect={val['isCorrect']}, points={val['pointsEarned']}, xp={val['xpEarned']}")

    # 4. Finish Session
    fin = requests.post(f"{BASE}/api/session/finish", json={
        "mode": "quick",
        "subject": "Technical & Programming",
        "totalQuestions": 3,
        "correctAnswers": 2,
        "score": 40,
        "xpEarned": 40,
        "coinsEarned": 10,
        "incorrectQuestionIds": [q0["questionId"]] if not val["isCorrect"] else [],
        "completed": True
    }).json()
    print(f"Session finished: newLevel={fin['newLevel']}, currentCoins={fin['currentCoins']}, streak={fin['currentStreak']}")

    # 5. Buy Store Item
    buy = requests.post(f"{BASE}/api/store/buy", json={"itemId": "hint_credits_5"}).json()
    print(f"Store Purchase: {buy['message']}, newBalance={buy['newCoinBalance']}")

    # 6. Check Achievements
    achs = requests.get(f"{BASE}/api/achievements").json()
    unlocked = [a["title"] for a in achs["achievements"] if a["unlocked"]]
    print(f"Unlocked Achievements: {unlocked}")

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_cycle()
