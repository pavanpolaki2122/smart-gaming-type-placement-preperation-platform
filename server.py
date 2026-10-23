import os
import json
import uuid
import random
import csv
import io
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

QUESTIONS_FILE = os.path.join(DATA_DIR, "tcs_nqt_questions.json")
USER_PROFILE_FILE = os.path.join(DATA_DIR, "user_profile.json")

app = FastAPI(title="CodeStreak — The Learning Arena API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Helper Functions -----------------

def load_questions() -> List[Dict[str, Any]]:
    if not os.path.exists(QUESTIONS_FILE):
        return []
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_questions(questions: List[Dict[str, Any]]):
    with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

def get_default_profile() -> Dict[str, Any]:
    today = date.today().isoformat()
    return {
        "username": "CodeWarrior",
        "avatar": "⚡",
        "theme": "cyberpunk",
        "level": 1,
        "xp": 0,
        "xpToNextLevel": 100,
        "coins": 150,
        "streak": 1,
        "maxStreak": 1,
        "lastActiveDate": today,
        "streakFrozen": False,
        "inventory": {
            "streakFreeze": 1,
            "hintCredits": 5,
            "unlockedThemes": ["cyberpunk"],
            "unlockedAvatars": ["⚡", "🥋"]
        },
        "stats": {
            "totalAnswered": 0,
            "totalCorrect": 0,
            "quizzesCompleted": 0,
            "bossesDefeated": 0,
            "survivalBest": 0,
            "timeAttackBest": 0
        },
        "weeklyActivity": {
            # Days of current week (Mon-Sun)
            (date.today() - timedelta(days=i)).isoformat(): (1 if i == 0 else 0)
            for i in range(7)
        },
        "mistakeQuestionIds": [],
        "completedDailyDates": [],
        "achievements": [],
        "inProgressSession": None
    }

def load_profile() -> Dict[str, Any]:
    if not os.path.exists(USER_PROFILE_FILE):
        profile = get_default_profile()
        save_profile(profile)
        return profile
    try:
        with open(USER_PROFILE_FILE, "r", encoding="utf-8") as f:
            profile = json.load(f)
            # Check daily streak continuity
            check_streak_maintenance(profile)
            return profile
    except Exception:
        profile = get_default_profile()
        save_profile(profile)
        return profile

def save_profile(profile: Dict[str, Any]):
    with open(USER_PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)

def check_streak_maintenance(profile: Dict[str, Any]):
    today = date.today()
    last_active_str = profile.get("lastActiveDate")
    if not last_active_str:
        profile["lastActiveDate"] = today.isoformat()
        profile["streak"] = 1
        return

    try:
        last_active = date.fromisoformat(last_active_str)
        delta_days = (today - last_active).days
        if delta_days == 0:
            # Active today, streak stays intact
            pass
        elif delta_days == 1:
            # Streak intact, pending today's activity
            pass
        elif delta_days == 2:
            # Missed exactly one day - check streak freeze
            if profile.get("inventory", {}).get("streakFreeze", 0) > 0:
                profile["inventory"]["streakFreeze"] -= 1
                profile["streakFrozen"] = True
            else:
                profile["streak"] = 1
        elif delta_days > 2:
            profile["streak"] = 1
    except Exception:
        profile["lastActiveDate"] = today.isoformat()

def calculate_level_from_xp(xp: int) -> tuple[int, int, int]:
    # Level formula: Level L requires 100 * L XP
    # Total XP for level L = sum(100 * i for i in 1..L-1) = 50 * L * (L-1)
    lvl = 1
    req = 100
    accum = 0
    while xp >= accum + req:
        accum += req
        lvl += 1
        req = lvl * 100
    current_level_xp = xp - accum
    xp_to_next = req
    return lvl, current_level_xp, xp_to_next

# ----------------- Achievement Definitions -----------------

ACHIEVEMENTS_LIST = [
    {
        "id": "first_blood",
        "title": "First Step",
        "description": "Answer your very first question correctly.",
        "icon": "🎯",
        "rewardXp": 50,
        "rewardCoins": 25
    },
    {
        "id": "tcs_cadet",
        "title": "TCS Cadet",
        "description": "Complete your first challenge in the TCS NQT Arena.",
        "icon": "🎖️",
        "rewardXp": 100,
        "rewardCoins": 50
    },
    {
        "id": "flawless_victory",
        "title": "Flawless Mind",
        "description": "Complete a challenge with 100% accuracy (min 5 questions).",
        "icon": "💎",
        "rewardXp": 150,
        "rewardCoins": 75
    },
    {
        "id": "streak_3",
        "title": "Consistent Striker",
        "description": "Maintain a streak of 3 consecutive days.",
        "icon": "🔥",
        "rewardXp": 100,
        "rewardCoins": 50
    },
    {
        "id": "streak_7",
        "title": "Iron Will",
        "description": "Reach a legendary 7-day streak.",
        "icon": "⚡",
        "rewardXp": 250,
        "rewardCoins": 150
    },
    {
        "id": "time_master",
        "title": "Speed Demon",
        "description": "Score at least 5 correct answers in Time Attack mode.",
        "icon": "⏱️",
        "rewardXp": 120,
        "rewardCoins": 60
    },
    {
        "id": "survivor",
        "title": "Arena Survivor",
        "description": "Answer at least 8 questions in Survival Mode without losing all lives.",
        "icon": "🛡️",
        "rewardXp": 150,
        "rewardCoins": 80
    },
    {
        "id": "boss_slayer",
        "title": "Boss Conqueror",
        "description": "Defeat the TCS Digital Boss Challenge.",
        "icon": "👑",
        "rewardXp": 300,
        "rewardCoins": 200
    },
    {
        "id": "mistake_slayer",
        "title": "Reflective Learner",
        "description": "Review and conquer at least 3 previously missed questions.",
        "icon": "📖",
        "rewardXp": 100,
        "rewardCoins": 50
    },
    {
        "id": "level_5",
        "title": "Arena Veteran",
        "description": "Reach Player Level 5.",
        "icon": "🌟",
        "rewardXp": 200,
        "rewardCoins": 100
    }
]

def check_achievements(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    unlocked_ids = {a["id"] for a in profile.get("achievements", [])}
    newly_unlocked = []
    stats = profile.get("stats", {})

    conditions = {
        "first_blood": stats.get("totalCorrect", 0) >= 1,
        "tcs_cadet": stats.get("quizzesCompleted", 0) >= 1,
        "streak_3": profile.get("streak", 1) >= 3,
        "streak_7": profile.get("streak", 1) >= 7,
        "time_master": stats.get("timeAttackBest", 0) >= 5,
        "survivor": stats.get("survivalBest", 0) >= 8,
        "boss_slayer": stats.get("bossesDefeated", 0) >= 1,
        "level_5": profile.get("level", 1) >= 5,
        "mistake_slayer": stats.get("mistakesReviewed", 0) >= 3
    }

    for ach in ACHIEVEMENTS_LIST:
        aid = ach["id"]
        if aid not in unlocked_ids and conditions.get(aid, False):
            ach_record = {
                "id": aid,
                "title": ach["title"],
                "description": ach["description"],
                "icon": ach["icon"],
                "unlockedAt": datetime.now().isoformat()
            }
            profile["achievements"].append(ach_record)
            profile["xp"] += ach["rewardXp"]
            profile["coins"] += ach["rewardCoins"]
            newly_unlocked.append(ach)

    return newly_unlocked

# ----------------- REST API Models -----------------

class AnswerSubmission(BaseModel):
    questionId: str
    selectedAnswer: int # index
    timeSpentSeconds: Optional[float] = 0
    mode: Optional[str] = "quick"

class SessionFinishRequest(BaseModel):
    mode: str
    subject: str
    totalQuestions: int
    correctAnswers: int
    score: int
    xpEarned: int
    coinsEarned: int
    incorrectQuestionIds: List[str] = []
    completed: bool = True

class StorePurchaseRequest(BaseModel):
    itemId: str # "streak_freeze", "hint_credits_5", "theme_amethyst", "avatar_samurai", etc.

# ----------------- API Endpoints -----------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CodeStreak — The Learning Arena", "timestamp": datetime.now().isoformat()}

@app.get("/api/subjects")
def get_subjects():
    questions = load_questions()
    subjects_map = {}
    for q in questions:
        subj = q.get("subject", "General")
        diff = q.get("difficulty", "Medium")
        topic = q.get("topic", "General")
        
        if subj not in subjects_map:
            subjects_map[subj] = {
                "name": subj,
                "questionCount": 0,
                "topics": set(),
                "difficulties": {"Easy": 0, "Medium": 0, "Hard": 0}
            }
        subjects_map[subj]["questionCount"] += 1
        subjects_map[subj]["topics"].add(topic)
        if diff in subjects_map[subj]["difficulties"]:
            subjects_map[subj]["difficulties"][diff] += 1
        else:
            subjects_map[subj]["difficulties"][diff] = 1

    result = []
    for s_name, data in subjects_map.items():
        result.append({
            "name": s_name,
            "questionCount": data["questionCount"],
            "topics": sorted(list(data["topics"])),
            "difficulties": data["difficulties"]
        })
    return {"subjects": result, "totalQuestions": len(questions)}

@app.get("/api/profile")
def get_user_profile():
    profile = load_profile()
    lvl, curr_xp, next_req = calculate_level_from_xp(profile["xp"])
    profile["level"] = lvl
    profile["currentLevelXp"] = curr_xp
    profile["xpToNextLevel"] = next_req
    save_profile(profile)
    return profile

@app.post("/api/profile/reset")
def reset_profile():
    profile = get_default_profile()
    save_profile(profile)
    return {"message": "Profile reset successfully", "profile": profile}

@app.get("/api/achievements")
def get_achievements():
    profile = load_profile()
    unlocked_map = {a["id"]: a.get("unlockedAt") for a in profile.get("achievements", [])}
    
    result = []
    for ach in ACHIEVEMENTS_LIST:
        is_unlocked = ach["id"] in unlocked_map
        result.append({
            **ach,
            "unlocked": is_unlocked,
            "unlockedAt": unlocked_map.get(ach["id"])
        })
    return {"achievements": result}

@app.get("/api/questions")
def get_game_questions(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    mode: str = "quick",
    count: int = 5,
    shuffle_options: bool = True
):
    all_q = load_questions()
    if not all_q:
        raise HTTPException(status_code=404, detail="No questions available in question bank.")

    pool = all_q

    # Filter by subject
    if subject and subject.lower() != "all":
        pool = [q for q in pool if q.get("subject", "").lower() == subject.lower()]

    # Filter by difficulty
    if difficulty and difficulty.lower() != "all":
        pool = [q for q in pool if q.get("difficulty", "").lower() == difficulty.lower()]

    # Handle special modes
    profile = load_profile()
    if mode == "review_mistakes":
        mistake_ids = set(profile.get("mistakeQuestionIds", []))
        pool = [q for q in all_q if q["questionId"] in mistake_ids]
        if not pool:
            return {
                "questions": [],
                "mode": mode,
                "message": "Great job! You have no recorded mistakes to review right now."
            }
    elif mode == "boss":
        # Boss challenge: Hard questions, Digital & Prime or complex
        pool = [q for q in all_q if q.get("difficulty") == "Hard" or "Digital" in q.get("subject", "")]
        count = min(count, 15)
    elif mode == "daily":
        # Daily challenge: deterministic seed based on today's date
        today_int = int(datetime.now().strftime("%Y%m%d"))
        random.seed(today_int)
        pool = list(all_q)
        random.shuffle(pool)
        count = 5
    else:
        # Random shuffle for variety
        pool = list(pool)
        random.shuffle(pool)

    selected = pool[:count]

    # Clean payload for security:
    # Shuffle options while safely preserving the true correct answer mapping!
    sanitized = []
    for q in selected:
        opts = list(q["options"])
        correct_idx = q["correctAnswer"]
        correct_text = opts[correct_idx] if 0 <= correct_idx < len(opts) else opts[0]

        if shuffle_options and mode != "practice_fixed":
            # Shuffle options
            shuffled_opts = list(opts)
            random.shuffle(shuffled_opts)
            new_correct_idx = shuffled_opts.index(correct_text)
        else:
            shuffled_opts = opts
            new_correct_idx = correct_idx

        # In non-practice modes, DO NOT send correctAnswer or explanation to client!
        item = {
            "questionId": q["questionId"],
            "subject": q.get("subject"),
            "topic": q.get("topic"),
            "difficulty": q.get("difficulty"),
            "questionType": q.get("questionType", "single_choice"),
            "questionText": q["questionText"],
            "options": shuffled_opts,
            "hint": q.get("hint", ""),
            "points": q.get("points", 10),
            "tags": q.get("tags", [])
        }

        # If practice mode, allow client to see explanation if requested
        if mode == "practice":
            item["correctAnswer"] = new_correct_idx
            item["explanation"] = q.get("explanation", "")
        else:
            # We store option mapping in an internal map or we validate with original question text!
            # To make validation seamless across shuffles:
            item["_validation_token"] = f"{q['questionId']}:::correct_text={correct_text}"

        sanitized.append(item)

    return {
        "questions": sanitized,
        "count": len(sanitized),
        "mode": mode,
        "subject": subject or "All Subjects"
    }

@app.post("/api/validate")
def validate_answer(sub: AnswerSubmission):
    all_q = load_questions()
    q_map = {q["questionId"]: q for q in all_q}
    target_q = q_map.get(sub.questionId)

    if not target_q:
        raise HTTPException(status_code=404, detail="Question ID not found")

    correct_idx = target_q["correctAnswer"]
    is_correct = (sub.selectedAnswer == correct_idx)
    
    # Calculate points and XP
    diff_multipliers = {"Easy": 1.0, "Medium": 1.5, "Hard": 2.0}
    mult = diff_multipliers.get(target_q.get("difficulty", "Medium"), 1.0)
    base_pts = target_q.get("points", 10)
    
    pts_awarded = int(base_pts * mult) if is_correct else 0
    xp_awarded = pts_awarded
    coins_awarded = max(1, int(pts_awarded / 4)) if is_correct else 0

    return {
        "isCorrect": is_correct,
        "correctAnswerIndex": correct_idx,
        "correctAnswerText": target_q["options"][correct_idx],
        "explanation": target_q.get("explanation", "Standard answer key for this question."),
        "pointsEarned": pts_awarded,
        "xpEarned": xp_awarded,
        "coinsEarned": coins_awarded
    }

@app.post("/api/session/finish")
def finish_session(req: SessionFinishRequest):
    profile = load_profile()
    today = date.today().isoformat()

    # Update stats
    profile["stats"]["totalAnswered"] += req.totalQuestions
    profile["stats"]["totalCorrect"] += req.correctAnswers
    profile["stats"]["quizzesCompleted"] += 1

    if req.mode == "time_attack":
        profile["stats"]["timeAttackBest"] = max(profile["stats"].get("timeAttackBest", 0), req.correctAnswers)
    elif req.mode == "survival":
        profile["stats"]["survivalBest"] = max(profile["stats"].get("survivalBest", 0), req.correctAnswers)
    elif req.mode == "boss" and req.correctAnswers >= int(req.totalQuestions * 0.7):
        profile["stats"]["bossesDefeated"] = profile["stats"].get("bossesDefeated", 0) + 1

    # Flawless accuracy check for achievements
    if req.totalQuestions >= 5 and req.correctAnswers == req.totalQuestions:
        # Check if flawless achievement unlocked
        if not any(a["id"] == "flawless_victory" for a in profile.get("achievements", [])):
            profile["achievements"].append({
                "id": "flawless_victory",
                "title": "Flawless Mind",
                "description": "Completed a challenge with 100% accuracy!",
                "icon": "💎",
                "unlockedAt": datetime.now().isoformat()
            })
            profile["xp"] += 150
            profile["coins"] += 75

    # Update XP and coins safely
    profile["xp"] += req.xpEarned
    profile["coins"] += req.coinsEarned

    # Daily challenge tracking
    if req.mode == "daily" and req.completed:
        if today not in profile.get("completedDailyDates", []):
            profile["completedDailyDates"].append(today)
            # Daily bonus: +50 XP and +30 Coins
            profile["xp"] += 50
            profile["coins"] += 30

    # Streak logic
    last_active = profile.get("lastActiveDate")
    if last_active != today:
        try:
            prev_date = date.fromisoformat(last_active)
            if (date.today() - prev_date).days == 1:
                profile["streak"] += 1
            else:
                profile["streak"] = 1
        except Exception:
            profile["streak"] = 1
        profile["lastActiveDate"] = today

    profile["maxStreak"] = max(profile.get("maxStreak", 1), profile["streak"])
    profile["weeklyActivity"][today] = profile["weeklyActivity"].get(today, 0) + 1

    # Mistakes tracking
    mistake_set = set(profile.get("mistakeQuestionIds", []))
    for mid in req.incorrectQuestionIds:
        mistake_set.add(mid)
    
    # If reviewing mistakes and got some right, remove from mistake queue
    if req.mode == "review_mistakes":
        profile["stats"]["mistakesReviewed"] = profile["stats"].get("mistakesReviewed", 0) + req.correctAnswers

    profile["mistakeQuestionIds"] = list(mistake_set)

    # Recalculate Level
    lvl, curr_xp, next_req = calculate_level_from_xp(profile["xp"])
    leveled_up = lvl > profile.get("level", 1)
    profile["level"] = lvl
    profile["currentLevelXp"] = curr_xp
    profile["xpToNextLevel"] = next_req

    # Check new achievements
    new_achievements = check_achievements(profile)

    # Clear in-progress session
    profile["inProgressSession"] = None
    save_profile(profile)

    return {
        "success": True,
        "newLevel": lvl,
        "leveledUp": leveled_up,
        "newAchievements": new_achievements,
        "currentXp": profile["xp"],
        "currentCoins": profile["coins"],
        "currentStreak": profile["streak"],
        "mistakesRemaining": len(profile["mistakeQuestionIds"])
    }

@app.post("/api/store/buy")
def buy_store_item(req: StorePurchaseRequest):
    profile = load_profile()
    coins = profile.get("coins", 0)

    CATALOG = {
        "streak_freeze": {"name": "Streak Freeze", "price": 100, "type": "consumable"},
        "hint_credits_5": {"name": "5 Hint Tokens", "price": 50, "type": "consumable"},
        "theme_amethyst": {"name": "Royal Amethyst Theme", "price": 150, "type": "theme", "value": "amethyst"},
        "theme_emerald": {"name": "Emerald Cyber Theme", "price": 150, "type": "theme", "value": "emerald"},
        "avatar_samurai": {"name": "Cyber Samurai Avatar", "price": 120, "type": "avatar", "value": "🥷"},
        "avatar_wizard": {"name": "Code Archmage Avatar", "price": 120, "type": "avatar", "value": "🧙‍♂️"},
        "avatar_dragon": {"name": "Byte Dragon Avatar", "price": 200, "type": "avatar", "value": "🐉"}
    }

    item = CATALOG.get(req.itemId)
    if not item:
        raise HTTPException(status_code=400, detail="Unknown store item")

    if coins < item["price"]:
        raise HTTPException(status_code=400, detail=f"Insufficient coins. You have {coins}, needed {item['price']}.")

    profile["coins"] -= item["price"]

    if req.itemId == "streak_freeze":
        profile["inventory"]["streakFreeze"] = profile["inventory"].get("streakFreeze", 0) + 1
    elif req.itemId == "hint_credits_5":
        profile["inventory"]["hintCredits"] = profile["inventory"].get("hintCredits", 0) + 5
    elif item["type"] == "theme":
        if item["value"] not in profile["inventory"]["unlockedThemes"]:
            profile["inventory"]["unlockedThemes"].append(item["value"])
        profile["theme"] = item["value"]
    elif item["type"] == "avatar":
        if item["value"] not in profile["inventory"]["unlockedAvatars"]:
            profile["inventory"]["unlockedAvatars"].append(item["value"])
        profile["avatar"] = item["value"]

    save_profile(profile)
    return {
        "success": True,
        "message": f"Successfully purchased {item['name']}!",
        "newCoinBalance": profile["coins"],
        "inventory": profile["inventory"],
        "equippedTheme": profile.get("theme"),
        "equippedAvatar": profile.get("avatar")
    }

@app.post("/api/profile/equip")
def equip_customization(theme: Optional[str] = None, avatar: Optional[str] = None):
    profile = load_profile()
    if theme:
        if theme in profile["inventory"]["unlockedThemes"]:
            profile["theme"] = theme
        else:
            raise HTTPException(status_code=400, detail="Theme is locked.")
    if avatar:
        if avatar in profile["inventory"]["unlockedAvatars"]:
            profile["avatar"] = avatar
        else:
            raise HTTPException(status_code=400, detail="Avatar is locked.")
    save_profile(profile)
    return {"success": True, "theme": profile["theme"], "avatar": profile["avatar"]}

@app.post("/api/questions/upload")
async def upload_questions_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content_bytes = await file.read()
    
    existing = load_questions()
    existing_ids = {q["questionId"] for q in existing}
    
    new_questions = []
    errors = []

    if filename.endswith(".json"):
        try:
            data = json.loads(content_bytes.decode("utf-8"))
            if not isinstance(data, list):
                raise ValueError("JSON root must be an array of questions.")
            
            for idx, item in enumerate(data):
                qid = item.get("questionId") or f"UPLOAD-{uuid.uuid4().hex[:6]}"
                if qid in existing_ids:
                    errors.append(f"Skipped duplicate questionId: {qid}")
                    continue

                # Validation of required fields
                qtext = item.get("questionText")
                options = item.get("options")
                correct = item.get("correctAnswer")

                if not qtext or not options or not isinstance(options, list) or len(options) < 2:
                    errors.append(f"Item #{idx+1} invalid: missing questionText or has less than 2 options.")
                    continue
                
                if not isinstance(correct, int) or correct < 0 or correct >= len(options):
                    errors.append(f"Item #{idx+1} ({qid}): correctAnswer index out of range for options.")
                    continue

                new_questions.append({
                    "questionId": qid,
                    "subject": item.get("subject", "Custom Uploads"),
                    "topic": item.get("topic", "General"),
                    "difficulty": item.get("difficulty", "Medium"),
                    "questionType": item.get("questionType", "single_choice"),
                    "questionText": qtext,
                    "options": options,
                    "correctAnswer": correct,
                    "explanation": item.get("explanation", ""),
                    "hint": item.get("hint", ""),
                    "points": item.get("points", 10),
                    "tags": item.get("tags", ["uploaded"])
                })
                existing_ids.add(qid)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse JSON: {str(e)}")

    elif filename.endswith(".csv"):
        try:
            text = content_bytes.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            for idx, row in enumerate(reader):
                qid = row.get("questionId") or f"CSV-{uuid.uuid4().hex[:6]}"
                if qid in existing_ids:
                    errors.append(f"Skipped duplicate questionId: {qid}")
                    continue

                qtext = row.get("questionText")
                # Parse options from opt1, opt2, opt3, opt4 or comma-separated options column
                options = []
                for k in ["optionA", "optionB", "optionC", "optionD"]:
                    if row.get(k):
                        options.append(row[k])
                if not options and row.get("options"):
                    options = [o.strip() for o in row["options"].split("|")]

                if not qtext or len(options) < 2:
                    errors.append(f"Row #{idx+1} missing questionText or options.")
                    continue

                correct_str = str(row.get("correctAnswer", "0")).strip().upper()
                letter_map = {"A": 0, "B": 1, "C": 2, "D": 3}
                correct_idx = letter_map.get(correct_str, 0)
                if correct_str.isdigit():
                    correct_idx = int(correct_str)

                new_questions.append({
                    "questionId": qid,
                    "subject": row.get("subject", "Custom Uploads"),
                    "topic": row.get("topic", "General"),
                    "difficulty": row.get("difficulty", "Medium"),
                    "questionType": "single_choice",
                    "questionText": qtext,
                    "options": options,
                    "correctAnswer": min(correct_idx, len(options) - 1),
                    "explanation": row.get("explanation", ""),
                    "hint": row.get("hint", ""),
                    "points": int(row.get("points", 10)),
                    "tags": [t.strip() for t in row.get("tags", "uploaded").split(",")]
                })
                existing_ids.add(qid)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .json or .csv.")

    if not new_questions and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors[:5]))

    # Combine and save
    all_combined = existing + new_questions
    save_questions(all_combined)

    return {
        "success": True,
        "questionsImported": len(new_questions),
        "totalQuestionsNow": len(all_combined),
        "errors": errors[:5]
    }

# ----------------- Serve Static Files -----------------
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "CodeStreak — The Learning Arena is running. Frontend loading..."}

if __name__ == "__main__":
    import uvicorn
    print("Starting CodeStreak Server on http://localhost:8000 ...")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
